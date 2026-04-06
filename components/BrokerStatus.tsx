import React, { useState, useEffect } from 'react';
import { mqttService } from '../services/mqttService';
import { Wifi, WifiOff, RefreshCcw, AlertCircle, Database } from 'lucide-react';
import { User } from '../types';
import { TRANSLATIONS } from '../constants';

interface BrokerStatusProps {
    user: User;
}

export const BrokerStatus: React.FC<BrokerStatusProps> = ({ user }) => {
    const [status, setStatus] = useState(mqttService.status);
    const [lastUpdate, setLastUpdate] = useState<number | null>(mqttService.getLastUpdate());
    const [timeAgo, setTimeAgo] = useState<string>('');
    const [lastError, setLastError] = useState<string | null>(mqttService.getLastError());
    const t = TRANSLATIONS[user.language];

    const formatTimeAgo = (timestamp: number | null) => {
        if (!timestamp) return '';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return `${seconds}${t.seconds}`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}${t.minutes}`;
        const hours = Math.floor(minutes / 60);
        return `${hours}${t.hours}`;
    };

    useEffect(() => {
        const unsubscribe = mqttService.onStatusChange((newStatus) => {
            setStatus(newStatus);
            setLastError(mqttService.getLastError());
        });

        // Polling for timestamp updates and time-ago string refresh
        const interval = setInterval(() => {
            const latest = mqttService.getLastUpdate();
            setLastUpdate(latest);
            setLastError(mqttService.getLastError());
            if (latest) {
                setTimeAgo(formatTimeAgo(latest));
            }
        }, 5000); // Update every 5 seconds

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [t]);

    const getStatusConfig = () => {
        switch (status) {
            case 'connected':
                return {
                    label: t.brokerOnline,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-500/20',
                    icon: <Wifi size={14} />,
                    subLabel: null
                };
            case 'connecting':
                return {
                    label: t.brokerConnecting,
                    color: 'text-amber-500',
                    bg: 'bg-amber-500/10',
                    border: 'border-amber-500/20',
                    icon: <RefreshCcw size={14} className="animate-spin" />,
                    subLabel: null
                };
            case 'error':
                return {
                    label: t.brokerError,
                    color: 'text-red-500',
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/20',
                    icon: <AlertCircle size={14} />,
                    subLabel: lastError ? lastError : null
                };
            default:
                // Show blue/gray 'Offline Mode' if using cached data
                return {
                    label: t.brokerOffline,
                    color: 'text-frost-500',
                    bg: 'bg-frost-500/10',
                    border: 'border-frost-500/20',
                    icon: <Database size={14} />,
                    subLabel: timeAgo ? `(${timeAgo} ${t.ago})` : null
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.color} ${config.border} transition-all duration-300 shadow-sm shadow-black/5`}>
            {config.icon}
            <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
                    {config.label}
                </span>
                {config.subLabel && (
                    <span className="text-[8px] opacity-70 font-bold lowercase italic">
                        {config.subLabel}
                    </span>
                )}
            </div>
        </div>
    );
};
