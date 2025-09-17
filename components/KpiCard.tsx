import React from 'react';
import { KpiData } from '../types';

const KpiCard: React.FC<{ kpis: KpiData }> = ({ kpis }) => {
    return (
        <div className="bg-gray-800 text-white rounded-lg p-4 mt-8">
            <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">Métricas de Performance (KPIs)</h3>
            <div className="flex justify-around items-center">
                <div className="text-center">
                    <p className="text-sm text-gray-400">Servidor Utilizado</p>
                    <p className="text-xl font-bold text-cyan-400 uppercase">{kpis.server}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-400">Tempo de Resposta</p>
                    <p className="text-xl font-bold text-cyan-400">{kpis.duration}</p>
                </div>
            </div>
        </div>
    );
};

export default KpiCard;
