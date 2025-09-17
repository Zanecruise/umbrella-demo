import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import PdfUploader from './components/PdfUploader';
import RiskProfileSelector from './components/RiskProfileSelector';
import ModelSelector, { Model } from './components/ModelSelector';
import Loader from './components/Loader';
import AnalysisResult from './components/AnalysisResult';
import History from './components/History';
import { RiskProfile, ApiResponse, HistoricAnalysis } from './types'; // Updated import
import { analyzePortfolio } from './services/analysisService';

const App: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [riskProfile, setRiskProfile] = useState<RiskProfile>(RiskProfile.Moderado);
    const [selectedModel, setSelectedModel] = useState<Model>('gemini');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // State now holds the entire ApiResponse
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
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

    // Updated to handle the full ApiResponse
    const addToHistory = (response: ApiResponse) => {
        if (!selectedFile) return;
        const newEntry: HistoricAnalysis = {
            id: new Date().toISOString(),
            fileName: selectedFile.name,
            riskProfile: riskProfile,
            timestamp: Date.now(),
            apiResponse: response, // Store the full response
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
        setApiResponse(null);

        try {
            // The service now returns the full ApiResponse
            const result = await analyzePortfolio(selectedFile, riskProfile, selectedModel);
            setApiResponse(result);
            addToHistory(result);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a análise.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedFile, riskProfile, selectedModel]);
    
    // Updated to load the full response from history
    const handleLoadFromHistory = (historicEntry: HistoricAnalysis) => {
        setApiResponse(historicEntry.apiResponse);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const handleNewAnalysis = () => {
        setApiResponse(null);
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
                    {!apiResponse && !isLoading && (
                        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 space-y-6 animate-fade-in">
                            <PdfUploader onFileSelect={setSelectedFile} />
                            <RiskProfileSelector selectedProfile={riskProfile} onProfileChange={setRiskProfile} />
                            <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
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

                    {apiResponse && (
                         <div className="space-y-8">
                             {/* Pass the correct parts of the response to the component */}
                             <AnalysisResult data={apiResponse.analysis} kpis={apiResponse.kpis} />
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
