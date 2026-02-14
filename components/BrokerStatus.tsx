import React, { useState, useEffect } from 'react';
import { mqttService } from '../services/mqttService';
import { Wifi, WifiOff, RefreshCcw, AlertCircle } from 'lucide-react';

export const BrokerStatus: React.FC = () => {
    const [status, setStatus] = useState(mqttService.status);

    useEffect(() => {
        const unsubscribe = mqttService.onStatusChange((newStatus) => {
            setStatus(newStatus);
        });
        return unsubscribe;
    }, []);

    const getStatusConfig = () => {
        switch (status) {
            case 'connected':
                return {
                    label: 'Broker Online',
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-500/20',
                    icon: <Wifi size={14} />
                };
            case 'connecting':
                return {
                    label: 'Connecting...',
                    color: 'text-amber-500',
                    bg: 'bg-amber-500/10',
                    border: 'border-amber-500/20',
                    icon: <RefreshCcw size={14} className="animate-spin" />
                };
            case 'error':
                return {
                    label: 'Connection Error',
                    color: 'text-red-500',
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/20',
                    icon: <AlertCircle size={14} />
                };
            default:
                return {
                    label: 'Offline',
                    color: 'text-slate-400',
                    bg: 'bg-slate-400/10',
                    border: 'border-slate-400/20',
                    icon: <WifiOff size={14} />
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.color} ${config.border} transition-all duration-300`}>
            {config.icon}
            <span className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
                {config.label}
            </span>
        </div>
    );
};
