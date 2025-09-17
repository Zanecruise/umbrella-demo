import { AnalysisResultData, RiskProfile } from '../types';
import { Model } from '../components/ModelSelector';

// Lê a URL da API a partir das variáveis de ambiente
const API_URL = import.meta.env.VITE_API_URL;

export const analyzePortfolio = async (
    pdfFile: File,
    riskProfile: RiskProfile,
    model: Model
): Promise<AnalysisResultData> => {
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('riskProfile', riskProfile);
    formData.append('model', model);

    // Garante que a API_URL foi definida
    if (!API_URL) {
        throw new Error('A URL da API não está configurada. Verifique a variável de ambiente VITE_API_URL.');
    }

    const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Request failed with status ${response.status}`);
    }

    return response.json();
};
