import React from 'react';
import { RiskProfile } from '../types';

interface RiskProfileSelectorProps {
    selectedProfile: RiskProfile;
    onProfileChange: (profile: RiskProfile) => void;
}

const profiles = [
    { id: RiskProfile.Conservador, label: 'Conservador', description: 'Prioriza a preservação do capital com risco mínimo.' },
    { id: RiskProfile.Moderado, label: 'Moderado', description: 'Busca um crescimento equilibrado com risco moderado.' },
    { id: RiskProfile.Agressivo, label: 'Agressivo', description: 'Visa o crescimento máximo, aceitando um risco maior.' },
];

const RiskProfileSelector: React.FC<RiskProfileSelectorProps> = ({ selectedProfile, onProfileChange }) => {
    return (
        <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center md:text-left">2. Selecione Seu Perfil de Risco</h3>
            <div className="space-y-3">
                {profiles.map((profile) => (
                    <div
                        key={profile.id}
                        onClick={() => onProfileChange(profile.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 
                            ${selectedProfile === profile.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                    >
                        <div className="flex items-center">
                             <input
                                id={profile.id}
                                name="risk-profile"
                                type="radio"
                                checked={selectedProfile === profile.id}
                                onChange={() => onProfileChange(profile.id)}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <div className="ml-3 text-sm">
                                <label htmlFor={profile.id} className="font-medium text-gray-900">{profile.label}</label>
                                <p className="text-gray-500">{profile.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RiskProfileSelector;