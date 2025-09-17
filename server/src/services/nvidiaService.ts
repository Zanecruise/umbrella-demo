import { AnalysisResultData, RiskProfile } from '../types';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { Blob } from 'buffer';

// NOTA: A URL base da API RAG deve ser confirmada na página de deploy do seu modelo no NVIDIA Build.
// A URL abaixo é uma suposição comum.
const NVIDIA_RAG_API_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

export const analyzeWithNvidia = async (file: Express.Multer.File, riskProfile: RiskProfile): Promise<AnalysisResultData> => {
    if (!NVIDIA_API_KEY) {
        throw new Error("A chave da API da NVIDIA (NVIDIA_API_KEY) não está configurada nas variáveis de ambiente.");
    }

    const docUploadUrl = `${NVIDIA_RAG_API_BASE_URL}/documents`;
    const headers = { "Authorization": `Bearer ${NVIDIA_API_KEY}` };
    
    let documentId: string | null = null;

    try {
        // --- 1. Upload do Documento ---
        const formData = new FormData();
        // Usa o Blob do módulo 'buffer' do Node.js
        const fileBlob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('file', fileBlob, file.originalname);

        const uploadResponse = await fetch(docUploadUrl, {
            method: 'POST',
            headers: { ...headers, "Accept": "application/json" },
            body: formData as any, // Cast para lidar com tipos de form-data
        });

        if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            console.error("NVIDIA Document Upload Error Body:", errorBody);
            throw new Error(`Falha ao fazer upload do documento para a API da NVIDIA: ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        documentId = uploadResult.id;

        if (!documentId) {
             throw new Error("Não foi possível obter o ID do documento após o upload.");
        }

        // --- 2. Chamada para a API de Retrieval QA ---
        const qaUrl = `${NVIDIA_RAG_API_BASE_URL}/retrieval/qa`;
        const prompt = `
            Analise a carteira de investimentos contida no documento fornecido. O perfil de risco do investidor é '${riskProfile}'.

            Siga estas instruções para a análise:
            1. **Extraia os ativos**: Identifique todos os ativos na carteira, suas categorias e a participação percentual de cada um.
            2. **Avalie o alinhamento com o perfil de risco**: Compare a composição da carteira com o perfil de risco '${riskProfile}'.
            3. **Analise o posicionamento**: Avalie a qualidade dos ativos e a diversificação da carteira frente ao cenário econômico atual do Brasil.
            4. **Gere pontuações**: Atribua pontuações de 0 a 100 para "Posicionamento", "Alinhamento de Risco" e uma pontuação "Geral".
            5. **Identifique pontos positivos e de atenção**: Liste os principais pontos fortes (positiveFlags) e fracos/de atenção (negativeFlags) da carteira.
            6. **Escreva um resumo executivo**: Forneça um parágrafo conciso resumindo a análise.
            7. **Analise cada ativo individualmente**: Forneça uma breve análise para cada ativo principal, considerando o cenário brasileiro.

            Retorne a análise estritamente como um objeto JSON. Não inclua markdown (como \`\`\`json) ou qualquer outro texto fora do objeto JSON.
        `;

        const qaBody = JSON.stringify({
            model: "nvidia/nemotron-4-340b-instruct", // Usando o modelo topo de linha da NVIDIA para máxima qualidade.
            query: prompt,
            documents: [documentId],
        });

        const qaResponse = await fetch(qaUrl, {
            method: 'POST',
            headers: { ...headers, "Accept": "application/json", "Content-Type": "application/json" },
            body: qaBody,
        });

        if (!qaResponse.ok) {
            const errorBody = await qaResponse.text();
            console.error("NVIDIA RAG API Error Body:", errorBody);
            throw new Error(`A requisição à API RAG da NVIDIA falhou com status ${qaResponse.status}`);
        }

        const qaResult = await qaResponse.json();

        // --- 3. Processamento do Resultado ---
        if (qaResult.response) {
            const responseText = qaResult.response;
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
                try {
                    return JSON.parse(jsonString) as AnalysisResultData;
                } catch (e) {
                    console.error("Falha ao parsear a resposta JSON da API RAG:", jsonString);
                    throw new Error("A resposta da IA (RAG) não estava no formato JSON esperado.");
                }
            }
        }

        throw new Error("Formato de resposta inesperado da API RAG da NVIDIA.");

    } catch (error) {
        console.error("Erro ao chamar a API RAG da NVIDIA:", error);
        throw error;
    } finally {
        // --- 4. Limpeza do Documento ---
        if (documentId) {
            try {
                await fetch(`${docUploadUrl}/${documentId}`, { method: 'DELETE', headers });
            } catch (cleanupError) {
                console.error(`Falha ao deletar o documento ${documentId} da NVIDIA:`, cleanupError);
            }
        }
    }
};
