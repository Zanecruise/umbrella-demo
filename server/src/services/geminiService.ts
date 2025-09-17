import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResultData, RiskProfile } from '../types';

// Helper function to convert buffer to generative part
const bufferToGenerativePart = (buffer: Buffer, mimeType: string) => {
    return {
        inlineData: { data: buffer.toString("base64"), mimeType },
    };
};

let ai: GoogleGenAI;

// Lazy initialization of the GoogleGenAI client
const getAiClient = () => {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    }
    return ai;
};

const schema = {
    type: Type.OBJECT,
    properties: {
        scores: {
            type: Type.OBJECT,
            properties: {
                positioning: { type: Type.NUMBER, description: "Pontuação de 0 a 100 para o posicionamento da carteira." },
                riskAlignment: { type: Type.NUMBER, description: "Pontuação de 0 a 100 para o alinhamento da carteira com o perfil de risco." },
                overall: { type: Type.NUMBER, description: "Pontuação geral de 0 a 100 para a carteira." },
            },
        },
        summary: { type: Type.STRING, description: "Um resumo executivo da análise da carteira." },
        positiveFlags: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    flag: { type: Type.STRING, description: "O título do ponto positivo." },
                    explanation: { type: Type.STRING, description: "A explicação detalhada do ponto positivo." },
                },
                required: ['flag', 'explanation'],
            },
        },
        negativeFlags: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    flag: { type: Type.STRING, description: "O título do ponto de atenção/negativo." },
                    explanation: { type: Type.STRING, description: "A explicação detalhada do ponto de atenção/negativo." },
                },
                required: ['flag', 'explanation'],
            },
        },
        portfolioBreakdown: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Nome do ativo." },
                    category: { type: Type.STRING, description: "Categoria do ativo (ex: Ações, Renda Fixa, FII)." },
                    participation: { type: Type.STRING, description: "Percentual de participação do ativo na carteira (ex: '15%')." },
                },
                required: ['name', 'category', 'participation'],
            },
        },
        assetAnalysis: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Nome do ativo." },
                    analysis: { type: Type.STRING, description: "Análise detalhada do ativo em relação ao cenário econômico brasileiro atual." },
                },
                required: ['name', 'analysis'],
            },
        },
    },
    required: ['scores', 'summary', 'positiveFlags', 'negativeFlags', 'portfolioBreakdown', 'assetAnalysis']
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds

export const analyzeWithGemini = async (file: Express.Multer.File, riskProfile: RiskProfile): Promise<AnalysisResultData> => {
    const model = 'gemini-1.5-flash';
    const pdfPart = bufferToGenerativePart(file.buffer, file.mimetype);

    const prompt = `
        Analise a carteira de investimentos contida neste documento PDF. O perfil de risco do investidor é '${riskProfile}'.

        Siga estas instruções para a análise:
        1.  **Extraia os ativos**: Identifique todos os ativos na carteira, suas categorias e a participação percentual de cada um.
        2.  **Avalie o alinhamento com o perfil de risco**: Compare a composição da carteira com o perfil de risco '${riskProfile}'.
            -   **Conservador**: Deve priorizar segurança e liquidez, com alta concentração em Renda Fixa de baixo risco.
            -   **Moderado**: Deve buscar um equilíbrio entre segurança e rentabilidade, com uma mistura de Renda Fixa, Ações e outros ativos.
            -   **Agressivo**: Deve focar em maximizar a rentabilidade, aceitando maior volatilidade, com maior exposição a Ações e outros ativos de risco.
        3.  **Analise o posicionamento**: Avalie a qualidade dos ativos e a diversificação da carteira frente ao cenário econômico atual do Brasil.
        4.  **Gere pontuações**: Atribua pontuações de 0 a 100 para "Posicionamento", "Alinhamento de Risco" e uma pontuação "Geral".
        5.  **Identifique pontos positivos e de atenção**: Liste os principais pontos fortes (positiveFlags) e fracos/de atenção (negativeFlags) da carteira.
        6.  **Escreva um resumo executivo**: Forneça um parágrafo conciso resumindo a análise.
        7.  **Analise cada ativo individualmente**: Forneça uma breve análise para cada ativo principal, considerando o cenário brasileiro.

        Retorne a análise estritamente no formato JSON especificado.
    `;

    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const client = getAiClient();
            const response = await client.models.generateContent({
                model: model,
                contents: { parts: [pdfPart, { text: prompt }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const jsonText = (response.text ?? '').trim();

            if (!jsonText) {
                console.error(`Gemini response is empty on attempt ${attempt}. This might be due to content filtering or other safety reasons.`);
                throw new Error("A resposta da IA estava vazia. Verifique os logs do servidor para mais detalhes.");
            }
            
            const result = JSON.parse(jsonText);
            return result as AnalysisResultData;
        } catch (e: any) {
            lastError = e;
            console.error(`Attempt ${attempt} failed:`, e.message);

            // Check if the error is a 503 Service Unavailable error
            if (e.message && e.message.includes("503")) {
                if (attempt < MAX_RETRIES) {
                    console.log(`Service unavailable (503). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    continue; // Continue to the next attempt
                }
            }
            
            // For non-retryable errors or after the last retry, break the loop.
            break;
        }
    }

    // If the loop finished without returning, it means all retries failed.
    console.error("Error during call to Gemini API after all retries:", lastError);
    throw new Error("Falha ao processar a análise com o Gemini. Verifique os logs do servidor.");
};