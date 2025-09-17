// Fix: Implement the main App component to manage state, orchestrate UI components, and handle the portfolio analysis workflow.
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import PdfUploader from './components/PdfUploader';
import RiskProfileSelector from './components/RiskProfileSelector';
import Loader from './components/Loader';
import AnalysisResult from './components/AnalysisResult';
import History from './components/History';
import { RiskProfile, AnalysisResultData, HistoricAnalysis } from './types';
import { analyzePortfolio } from './services/geminiService';

const App: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [riskProfile, setRiskProfile] = useState<RiskProfile>(RiskProfile.Moderado);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoricAnalysis[]>([]);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('analysisHistory');
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (e) {
            console.error("Failed to load history from localStorage", e);
            setHistory([]);
        }
    }, []);

    const addToHistory = (result: AnalysisResultData) => {
        if (!selectedFile) return;
        const newEntry: HistoricAnalysis = {
            id: new Date().toISOString(),
            fileName: selectedFile.name,
            riskProfile: riskProfile,
            timestamp: Date.now(),
            analysis: result,
        };
        
        setHistory(prevHistory => {
            const updatedHistory = [newEntry, ...prevHistory];
            try {
                 localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
            } catch (e) {
                console.error("Failed to save history to localStorage", e);
            }
            return updatedHistory;
        });
    };
    
    const handleClearHistory = () => {
        try {
            localStorage.removeItem('analysisHistory');
            setHistory([]);
        } catch (e) {
            console.error("Failed to clear history in localStorage", e);
        }
    }

    const handleAnalyzeClick = useCallback(async () => {
        if (!selectedFile) {
            setError("Por favor, envie um arquivo PDF.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const result = await analyzePortfolio(selectedFile, riskProfile);
            setAnalysisResult(result);
            addToHistory(result);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a análise.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedFile, riskProfile]);
    
    const handleLoadFromHistory = (analysis: AnalysisResultData) => {
        setAnalysisResult(analysis);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const handleNewAnalysis = () => {
        setAnalysisResult(null);
        setSelectedFile(null);
        setError(null);
        setRiskProfile(RiskProfile.Moderado);
    }

    const isAnalyzeButtonDisabled = !selectedFile || isLoading;

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <Header />
            <main className="container mx-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {!analysisResult && !isLoading && (
                        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 space-y-6 animate-fade-in">
                            <PdfUploader onFileSelect={setSelectedFile} />
                            <RiskProfileSelector selectedProfile={riskProfile} onProfileChange={setRiskProfile} />
                             <button
                                onClick={handleAnalyzeClick}
                                disabled={isAnalyzeButtonDisabled}
                                className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300
                                    ${isAnalyzeButtonDisabled
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
                                    }`}
                            >
                                {isLoading ? 'Analisando...' : 'Analisar Carteira'}
                            </button>
                            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                        </div>
                    )}

                    {isLoading && <Loader />}

                    {analysisResult && (
                         <div className="space-y-8">
                             <AnalysisResult data={analysisResult} />
                             <div className="text-center">
                                <button
                                     onClick={handleNewAnalysis}
                                     className="text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 bg-blue-600 hover:bg-blue-700"
                                >
                                     Fazer Nova Análise
                                </button>
                             </div>
                         </div>
                    )}
                    
                    {history.length > 0 && !isLoading && (
                        <History history={history} onLoadAnalysis={handleLoadFromHistory} onClearHistory={handleClearHistory} />
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;