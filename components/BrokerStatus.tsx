import React from 'react';
import { Database } from 'lucide-react';
import { User } from '../types';
import { TRANSLATIONS } from '../constants';

interface BrokerStatusProps {
    user: User;
}

export const BrokerStatus: React.FC<BrokerStatusProps> = ({ user }) => {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 transition-all duration-300 shadow-sm shadow-black/5">
            <Database size={14} />
            <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
                    SECURE LIVE FEED
                </span>
            </div>
        </div>
    );
};
