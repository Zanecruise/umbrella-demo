export type RiskProfile = 'Conservador' | 'Moderado' | 'Agressivo';

export interface AnalysisResultData {
    scores: {
        positioning: number;
        riskAlignment: number;
        overall: number;
    };
    summary: string;
    positiveFlags: { flag: string; explanation: string }[];
    negativeFlags: { flag: string; explanation: string }[];
    portfolioBreakdown: { name: string; category: string; participation: string }[];
    assetAnalysis: { name: string; analysis: string }[];
}
