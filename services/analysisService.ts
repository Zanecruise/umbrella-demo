import { AnalysisResultData, RiskProfile } from '../types';
import { Model } from '../components/ModelSelector';

// Le a URL da API a partir das variaveis de ambiente
const API_URL = import.meta.env.VITE_API_URL;

const resolveAnalyzeEndpoint = () => {
    const baseUrl = API_URL?.trim();
    if (!baseUrl) {
        throw new Error('A URL da API nao esta configurada. Verifique a variavel de ambiente VITE_API_URL.');
    }

    const normalizedBase = baseUrl.endsWith('/analyze')
        ? baseUrl
        : `${baseUrl.replace(/\/+$/, '')}/analyze`;

    if (!normalizedBase) {
        throw new Error('A URL da API configurada e invalida.');
    }

    return normalizedBase;
};

export const analyzePortfolio = async (
    pdfFile: File,
    riskProfile: RiskProfile,
    model: Model
): Promise<AnalysisResultData> => {
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('riskProfile', riskProfile);
    formData.append('model', model);

    const endpoint = resolveAnalyzeEndpoint();
    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Request failed with status ${response.status}`);
    }

    return response.json();
};
