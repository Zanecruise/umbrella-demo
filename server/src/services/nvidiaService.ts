import fetch from 'node-fetch';
const pdf = require('pdf-parse');
import { AnalysisResultData, RiskProfile } from '../types';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'nvidia/llama-3.1-nemotron-nano-8b-v1'; // This model expects text-only input

const cleanJsonStructure = `
{
    "scores": {
        "positioning": 0,
        "riskAlignment": 0,
        "overall": 0
    },
    "summary": "",
    "positiveFlags": [
        {
            "flag": "",
            "explanation": ""
        }
    ],
    "negativeFlags": [
        {
            "flag": "",
            "explanation": ""
        }
    ],
    "portfolioBreakdown": [
        {
            "name": "",
            "category": "",
            "participation": ""
        }
    ],
    "assetAnalysis": [
        {
            "name": "",
            "analysis": ""
        }
    ]
}
`;

export const analyzeWithNvidia = async (file: Express.Multer.File, riskProfile: RiskProfile): Promise<AnalysisResultData> => {
    // Step 1: Extract text from the PDF file
    const pdfData = await pdf(file.buffer);
    const documentText = pdfData.text;

    // Step 2: Construct the text-based prompt
    const prompt = `
        Você é um especialista em análise de investimentos no mercado financeiro brasileiro.
        O perfil de risco do investidor é '${riskProfile}'.

        A seguir, o conteúdo textual de um documento da carteira de investimentos do cliente:
        --- DOCUMENTO ---
        ${documentText}
        --- FIM DO DOCUMENTO ---

        Siga estas instruções para a análise:
            1. **Extraia os ativos**: Identifique todos os ativos na carteira, suas categorias e a participação percentual de cada um.
            2. **Avalie o alinhamento com o perfil de risco**: Compare a composição da carteira com o perfil de risco '${riskProfile}'.
            3. **Analise o posicionamento**: Avalie a qualidade dos ativos e a diversificação da carteira frente ao cenário econômico atual do Brasil.
            4. **Gere pontuações**: Atribua pontuações NUMÉRICAS de 0 a 100 para "positioning", "riskAlignment" e "overall".
            5. **Identifique pontos positivos e de atenção**: Liste os principais pontos fortes (positiveFlags) e fracos/de atenção (negativeFlags) da carteira.
            6. **Escreva um resumo executivo**: Forneça um parágrafo conciso resumindo a análise.
            7. **Analise cada ativo individualmente**: Forneça uma breve análise para cada ativo principal, considerando o cenário brasileiro.

        IMPORTANTE: Sua resposta DEVE SER APENAS o objeto JSON, sem nenhum texto adicional, comentários, ou formatação de markdown.
        Use esta estrutura JSON exata:
        ${cleanJsonStructure}
    `;

    // Step 3: Construct the text-only payload
    const payload = {
        model: NVIDIA_MODEL,
        messages: [
            {
                role: 'user',
                content: prompt // The content is now a single string
            }
        ],
        temperature: 0.20,
        top_p: 0.70,
        max_tokens: 4096,
        stream: false,
    };

    const response = await fetch(NVIDIA_API_URL, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("NVIDIA API Error:", errorBody);
        throw new Error(`NVIDIA API request failed with status ${response.status}`);
    }

    const data = await response.json() as any;
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        console.error("Invalid NVIDIA API response structure:", data);
        throw new Error("Invalid response structure from NVIDIA API.");
    }
    
    const content = data.choices[0].message.content;

    try {
        // The model should return a clean JSON string.
        return JSON.parse(content);
    } catch (error) {
        // If parsing fails, try to find a JSON block within the content as a fallback.
        console.error("Initial parsing failed, attempting to extract JSON from content:", content);
        try {
            const jsonMatch = content.match(/{\s*[\\s\\S]*?}/);
            if (jsonMatch && jsonMatch[0]) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("No JSON object found in the response.");
        } catch (fallbackError) {
             console.error("Error parsing NVIDIA response content on fallback:", content);
             throw new Error("Failed to parse analysis result from NVIDIA.");
        }
    }
};
