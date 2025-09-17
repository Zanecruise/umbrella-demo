import React from 'react';
import { HistoricAnalysis, AnalysisResultData } from '../types';

interface HistoryProps {
    history: HistoricAnalysis[];
    onLoadAnalysis: (analysis: AnalysisResultData) => void;
    onClearHistory: () => void;
}

const History: React.FC<HistoryProps> = ({ history, onLoadAnalysis, onClearHistory }) => {
    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 animate-fade-in">
            <details>
                <summary className="text-xl font-bold cursor-pointer hover:opacity-80 transition-opacity text-blue-600">
                    Histórico de Análises
                </summary>
                <div className="mt-4">
                    {history.length > 0 ? (
                        <>
                            <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {history.map((item) => (
                                    <li key={item.id}>
                                        <button 
                                            onClick={() => onLoadAnalysis(item.analysis)}
                                            className="w-full text-left p-4 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-all duration-200"
                                        >
                                            <p className="font-semibold text-gray-800 truncate">{item.fileName}</p>
                                            <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                                                <span>Perfil: <span className="font-medium text-gray-700">{item.riskProfile}</span></span>
                                                <span>{new Date(item.timestamp).toLocaleString('pt-BR')}</span>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="text-center mt-6">
                                <button
                                    onClick={onClearHistory}
                                    className="text-sm text-red-600 hover:text-red-500 hover:underline"
                                >
                                    Limpar Histórico
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-400 italic text-center py-4">Nenhuma análise anterior encontrada.</p>
                    )}
                </div>
            </details>
        </div>
    );
};

export default History;