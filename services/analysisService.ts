import { AnalysisResultData, RiskProfile } from '../types';
import { Model } from '../components/ModelSelector';

const API_URL = '';

export const analyzePortfolio = async (
    pdfFile: File,
    riskProfile: RiskProfile,
    model: Model
): Promise<AnalysisResultData> => {
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('riskProfile', riskProfile);
    formData.append('model', model);

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
