// Fix: Implement the Gemini API service to analyze the portfolio. This file contains the logic to call the Gemini API with the user's PDF and risk profile, using a structured schema for the JSON response.
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResultData, RiskProfile } from '../types';

// Helper function to convert file to base64
const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                resolve('');
            }
        };
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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


export const analyzePortfolio = async (pdfFile: File, riskProfile: RiskProfile): Promise<AnalysisResultData> => {
    const model = 'gemini-2.5-flash';
    const pdfPart = await fileToGenerativePart(pdfFile);

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

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [pdfPart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });
    
    const jsonText = response.text.trim();
    
    try {
        const result = JSON.parse(jsonText);
        return result as AnalysisResultData;
    } catch (e) {
        console.error("Failed to parse Gemini response:", jsonText);
        throw new Error("A resposta da IA não estava no formato JSON esperado.");
    }
};
