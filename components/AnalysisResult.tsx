import React from 'react';
import { AnalysisResultData, AnalysisFlag, Asset, AssetAnalysis } from '../types';

const ScoreCard: React.FC<{ title: string; score: number }> = ({ title, score }) => {
    const getColor = (type: 'border' | 'text' | 'bg') => {
        if (score > 75) {
            if (type === 'border') return 'border-green-500';
            if (type === 'text') return 'text-green-600';
            return 'bg-green-100';
        }
        if (score > 50) {
            if (type === 'border') return 'border-yellow-500';
            if (type === 'text') return 'text-yellow-600';
            return 'bg-yellow-100';
        }
        if (type === 'border') return 'border-red-500';
        if (type === 'text') return 'text-red-600';
        return 'bg-red-100';
    };

    return (
        <div className={`flex flex-col items-center justify-center ${getColor('bg')} p-4 rounded-lg border ${getColor('border')}`}>
            <h4 className="text-sm font-semibold text-gray-600 mb-2">{title}</h4>
            <div className={`w-20 h-20 rounded-full border-4 ${getColor('border')} flex items-center justify-center bg-white`}>
                <span className={`text-3xl font-bold ${getColor('text')}`}>{score}</span>
            </div>
        </div>
    );
};


const FlagItem: React.FC<{ flagData: AnalysisFlag, type: 'positive' | 'negative' }> = ({ flagData, type }) => {
    const Icon = type === 'positive' ? (
        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ) : (
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    );
    
    return (
        <li className="flex items-start space-x-3 py-3">
            <div className="flex-shrink-0 mt-1">{Icon}</div>
            <div>
                <p className="font-semibold text-gray-700">{flagData.flag}</p>
                <p className="text-gray-500">{flagData.explanation}</p>
            </div>
        </li>
    );
};

const AnalysisResult: React.FC<{ data: AnalysisResultData }> = ({ data }) => {
    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 animate-fade-in">
            <h2 className="text-3xl font-bold text-center mb-8 text-blue-600">Análise Concluída</h2>
            
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Pontuações da Carteira</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ScoreCard title="Posição" score={data.scores.positioning} />
                    <ScoreCard title="Alinhamento de Risco" score={data.scores.riskAlignment} />
                    <ScoreCard title="Geral" score={data.scores.overall} />
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Resumo Executivo</h3>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-md border border-gray-200">{data.summary}</p>
            </div>

            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold text-green-600 mb-3 flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Pontos Positivos
                    </h3>
                    <ul className="divide-y divide-gray-200">
                        {data.positiveFlags.map((flag, index) => (
                            <FlagItem key={`pos-${index}`} flagData={flag} type="positive" />
                        ))}
                         {data.positiveFlags.length === 0 && <li className="text-gray-400 italic py-3">Nenhum ponto positivo específico identificado.</li>}
                    </ul>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-red-600 mb-3 flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                        Pontos de Atenção
                    </h3>
                    <ul className="divide-y divide-gray-200">
                        {data.negativeFlags.map((flag, index) => (
                            <FlagItem key={`neg-${index}`} flagData={flag} type="negative" />
                        ))}
                         {data.negativeFlags.length === 0 && <li className="text-gray-400 italic py-3">Nenhum ponto de atenção específico identificado.</li>}
                    </ul>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Detalhamento da Carteira</h3>
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ativo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Participação</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.portfolioBreakdown.map((asset, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{asset.participation}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Análise Ativo a Ativo vs Cenário Brasileiro</h3>
                <div className="space-y-4">
                    {data.assetAnalysis.map((asset, index) => (
                         <details key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 cursor-pointer transition-colors hover:bg-gray-100">
                            <summary className="font-semibold text-gray-700">{asset.name}</summary>
                            <p className="mt-2 text-gray-600">{asset.analysis}</p>
                        </details>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnalysisResult;