import React from 'react';

export type Model = 'gemini' | 'nvidia';

interface ModelSelectorProps {
    selectedModel: Model;
    onModelChange: (model: Model) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Escolha o Modelo de Análise</h2>
            <div className="flex flex-col md:flex-row gap-4">
                <button
                    onClick={() => onModelChange('gemini')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all duration-200 
                        ${selectedModel === 'gemini' 
                            ? 'bg-blue-50 border-blue-500 shadow-lg'
                            : 'bg-white hover:bg-gray-50 border-gray-200'}`
                    }
                >
                    <h3 className="text-lg font-bold text-gray-900">Gemini</h3>
                    <p className="text-gray-600 mt-2">Análise detalhada e avançada do Google.</p>
                </button>
                <button
                    onClick={() => onModelChange('nvidia')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all duration-200 
                        ${selectedModel === 'nvidia' 
                            ? 'bg-green-50 border-green-500 shadow-lg'
                            : 'bg-white hover:bg-gray-50 border-gray-200'}`
                    }
                >
                    <h3 className="text-lg font-bold text-gray-900">NVIDIA</h3>
                    <p className="text-gray-600 mt-2">Análise de alta performance da NVIDIA.</p>
                </button>
            </div>
        </div>
    );
};

export default ModelSelector;
