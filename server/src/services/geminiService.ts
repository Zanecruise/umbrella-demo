import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import type { GoogleAuthOptions } from "google-auth-library";
import { AnalysisResultData, RiskProfile } from '../types';

// Helper function to convert buffer to generative part
const bufferToGenerativePart = (buffer: Buffer, mimeType: string) => {
    return {
        inlineData: { data: buffer.toString("base64"), mimeType },
    };
};

let ai: GoogleGenAI;
let resolvedProjectId: string | undefined;
let resolvedLocation: string | undefined;
let cachedGoogleAuthOptions: GoogleAuthOptions | undefined;
let cachedCredentials: ServiceAccountCredentials | undefined;
let cacheResolved = false;
let hasExplicitServiceAccount = false;

const SERVICE_ACCOUNT_ENV_HINTS = [
    "GOOGLE_SERVICE_ACCOUNT_JSON",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON",
    "GOOGLE_APPLICATION_CREDENTIALS_BASE64",
    "GOOGLE_APPLICATION_CREDENTIALS",
] as const;

type ServiceAccountCredentials = {
    client_email: string;
    private_key: string;
    project_id?: string;
};

const readProjectIdFromEnv = () => {
    return process.env.GOOGLE_CLOUD_PROJECT
        ?? process.env.GCP_PROJECT
        ?? process.env.GOOGLE_PROJECT_ID
        ?? process.env.PROJECT_ID
        ?? process.env.GCLOUD_PROJECT
        ?? undefined;
};

const readLocationFromEnv = () => {
    return process.env.GOOGLE_CLOUD_LOCATION
        ?? process.env.GOOGLE_GENAI_LOCATION
        ?? process.env.GCP_REGION
        ?? process.env.GOOGLE_REGION
        ?? "us-central1";
};

const decodeBase64IfNeeded = (value: string) => {
    const trimmed = value.trim();

    // Quick heuristic: treat as base64 if it only contains base64 charset and decodes to JSON.
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)) {
        try {
            const decoded = Buffer.from(trimmed, "base64").toString("utf8");
            if (decoded.trim().startsWith("{")) {
                return decoded;
            }
        } catch {
            // Not base64; ignore.
        }
    }

    return value;
};

const resolveCredentialFilePath = (inputPath: string): string | undefined => {
    if (!inputPath) {
        return undefined;
    }

    if (path.isAbsolute(inputPath)) {
        return fs.existsSync(inputPath) ? inputPath : undefined;
    }

    const candidateBases = [
        process.cwd(),
        path.resolve(__dirname),
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "../.."),
        path.resolve(__dirname, "../../.."),
        path.resolve(__dirname, "../../../.."),
    ];

    for (const base of candidateBases) {
        const candidate = path.resolve(base, inputPath);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return undefined;
};

const tryParseJson = (raw: string): ServiceAccountCredentials | undefined => {
    try {
        return JSON.parse(raw) as ServiceAccountCredentials;
    } catch {
        return undefined;
    }
};

const loadServiceAccount = (): {
    credentials?: ServiceAccountCredentials;
    googleAuthOptions?: GoogleAuthOptions;
    hasExplicitServiceAccount: boolean;
} => {
    if (cacheResolved) {
        return {
            credentials: cachedCredentials,
            googleAuthOptions: cachedGoogleAuthOptions,
            hasExplicitServiceAccount,
        };
    }

    for (const envName of SERVICE_ACCOUNT_ENV_HINTS) {
        const rawValue = process.env[envName];
        if (!rawValue) {
            continue;
        }

        const decodedValue = decodeBase64IfNeeded(rawValue);

        if (decodedValue.trim().startsWith("{")) {
            const credentials = tryParseJson(decodedValue);
            if (credentials) {
                cachedCredentials = credentials;
                cachedGoogleAuthOptions = { credentials };
                hasExplicitServiceAccount = true;
                resolvedProjectId = process.env.GOOGLE_CLOUD_PROJECT
                    ?? process.env.GOOGLE_PROJECT_ID
                    ?? credentials.project_id;
                resolvedLocation = process.env.GOOGLE_CLOUD_LOCATION
                    ?? process.env.GOOGLE_GENAI_LOCATION
                    ?? "us-central1";
                cacheResolved = true;
                return {
                    credentials: cachedCredentials,
                    googleAuthOptions: cachedGoogleAuthOptions,
                    hasExplicitServiceAccount,
                };
            }
        } else {
            // Treat as file path
            const resolvedFilePath = resolveCredentialFilePath(decodedValue);

            if (!resolvedFilePath) {
                const defaultPath = path.isAbsolute(decodedValue)
                    ? decodedValue
                    : path.resolve(process.cwd(), decodedValue);
                console.warn(`Service account file path from ${envName} does not exist: ${defaultPath}`);
                continue;
            }

            try {
                const fileContents = fs.readFileSync(resolvedFilePath, "utf8");
                const credentials = tryParseJson(fileContents);
                if (credentials) {
                    cachedCredentials = credentials;
                    cachedGoogleAuthOptions = { keyFilename: resolvedFilePath };
                    hasExplicitServiceAccount = true;
                    resolvedProjectId = process.env.GOOGLE_CLOUD_PROJECT
                        ?? process.env.GOOGLE_PROJECT_ID
                        ?? credentials.project_id;
                    resolvedLocation = process.env.GOOGLE_CLOUD_LOCATION
                        ?? process.env.GOOGLE_GENAI_LOCATION
                        ?? "us-central1";
                    cacheResolved = true;
                    return {
                        credentials: cachedCredentials,
                        googleAuthOptions: cachedGoogleAuthOptions,
                        hasExplicitServiceAccount,
                    };
                }
            } catch (error) {
                console.error(`Failed to read service account file from ${resolvedFilePath}:`, error);
            }
        }
    }

    resolvedProjectId = resolvedProjectId ?? readProjectIdFromEnv();
    resolvedLocation = resolvedLocation ?? readLocationFromEnv();

    cacheResolved = true;

    // Leave cachedGoogleAuthOptions undefined so Application Default Credentials can be used if available.
    return {
        credentials: cachedCredentials,
        googleAuthOptions: cachedGoogleAuthOptions,
        hasExplicitServiceAccount,
    };
};

// Lazy initialization of the GoogleGenAI client
const getAiClient = () => {
    if (ai) {
        return ai;
    }

    const { googleAuthOptions, hasExplicitServiceAccount } = loadServiceAccount();
    const projectId = resolvedProjectId ?? readProjectIdFromEnv();
    const location = resolvedLocation ?? readLocationFromEnv();

    if (projectId && !resolvedProjectId) {
        resolvedProjectId = projectId;
    }
    if (location && !resolvedLocation) {
        resolvedLocation = location;
    }

    const runningOnGcp = Boolean(
        process.env.K_SERVICE
        || process.env.GCP_PROJECT
        || process.env.GOOGLE_CLOUD_PROJECT
        || process.env.CLOUD_RUN_JOB
    );
    const forceVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";

    const createVertexClient = (project: string) => {
        const config: Record<string, unknown> = {
            vertexai: true,
            project,
            location,
        };

        if (googleAuthOptions) {
            config.googleAuthOptions = googleAuthOptions;
        }

        return new GoogleGenAI(config);
    };

    const shouldTryVertex = hasExplicitServiceAccount || forceVertex || runningOnGcp;

    if (shouldTryVertex) {
        if (!projectId) {
            if (hasExplicitServiceAccount || forceVertex) {
                throw new Error(
                    "Gemini configuration error: missing Google Cloud project ID. Set GOOGLE_PROJECT_ID or GOOGLE_CLOUD_PROJECT."
                );
            }
        } else {
            try {
                ai = createVertexClient(projectId);
                return ai;
            } catch (error) {
                console.error("Failed to initialize Gemini Vertex AI client:", error);
                if (hasExplicitServiceAccount || forceVertex) {
                    throw error;
                }
            }
        }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        ai = new GoogleGenAI({ apiKey });
        return ai;
    }

    if (projectId) {
        try {
            ai = createVertexClient(projectId);
            return ai;
        } catch (error) {
            console.error("Fallback Vertex AI initialization failed:", error);
        }
    }

    throw new Error(
        "Gemini configuration error: define GEMINI_API_KEY or provide Google Cloud credentials (service account or Cloud Run default) alongside GOOGLE_PROJECT_ID / GOOGLE_CLOUD_PROJECT."
    );
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
const MODEL_SEQUENCE = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

export const analyzeWithGemini = async (file: Express.Multer.File, riskProfile: RiskProfile): Promise<AnalysisResultData> => {
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

    for (const model of MODEL_SEQUENCE) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const client = getAiClient();
                const response = await client.models.generateContent({
                    model,
                    contents: [
                        {
                            role: "user",
                            parts: [pdfPart, { text: prompt }],
                        },
                    ],
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    },
                });

                const jsonText = (response.text ?? '').trim();

                if (!jsonText) {
                    console.error(`Gemini response is empty on attempt ${attempt} for model ${model}. This might be due to content filtering or other safety reasons.`);
                    throw new Error("A resposta da IA estava vazia. Verifique os logs do servidor para mais detalhes.");
                }
                
                const result = JSON.parse(jsonText);
                return result as AnalysisResultData;
            } catch (e: any) {
                lastError = e;
                console.error(`Attempt ${attempt} with model ${model} failed:`, e.message);

                if (e.message && e.message.includes("503") && attempt < MAX_RETRIES) {
                    console.log(`Service unavailable (503) with model ${model}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    continue;
                }

                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    continue;
                }
            }
        }

        if (model !== MODEL_SEQUENCE[MODEL_SEQUENCE.length - 1]) {
            console.warn(`Switching to fallback model after failures with ${model}.`);
        }
    }

    // If the loop finished without returning, it means all retries failed.
    console.error("Error during call to Gemini API after all retries:", lastError);
    throw new Error("Falha ao processar a análise com o Gemini. Verifique os logs do servidor.");
};
