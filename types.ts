export enum RiskProfile {
  Conservador = 'Conservador',
  Moderado = 'Moderado',
  Agressivo = 'Agressivo',
}

export interface AnalysisFlag {
  flag: string;
  explanation: string;
}

export interface Asset {
    name: string;
    category: string;
    participation: string; // e.g., "15%"
}

export interface AssetAnalysis {
    name:string;
    analysis: string;
}

export interface AnalysisResultData {
  scores: {
      positioning: number;
      riskAlignment: number;
      overall: number;
  };
  summary: string;
  positiveFlags: AnalysisFlag[];
  negativeFlags: AnalysisFlag[];
  portfolioBreakdown: Asset[];
  assetAnalysis: AssetAnalysis[];
}

export interface HistoricAnalysis {
  id: string;
  fileName: string;
  riskProfile: RiskProfile;
  timestamp: number;
  analysis: AnalysisResultData;
}
