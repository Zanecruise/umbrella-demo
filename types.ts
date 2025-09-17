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

// This remains the same, as it represents the core analysis data
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

// New type for the KPIs
export interface KpiData {
    duration: string;
    server: string;
}

// New type for the full API response
export interface ApiResponse {
    analysis: AnalysisResultData;
    kpis: KpiData;
}

export interface HistoricAnalysis {
  id: string;
  fileName: string;
  riskProfile: RiskProfile;
  timestamp: number;
  // The historic analysis will now also store the full response
  apiResponse: ApiResponse;
}
