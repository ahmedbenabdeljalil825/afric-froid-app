import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
    title: string;
    content: string;
    children?: React.ReactNode;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, content, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="group relative inline-flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children ? (
                children
            ) : (
                <Info size={14} className="text-slate-400 hover:text-frost-500 cursor-help transition-colors" />
            )}

            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50 animate-tooltip">
                    <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-white/10 origin-bottom">
                        <div className="flex items-center gap-2 mb-1">
                            <Info size={14} className="text-frost-400" />
                            <span className="text-xs font-black uppercase tracking-wider text-frost-300">{title}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-300 font-medium">
                            {content}
                        </p>
                        {/* Triangle Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default InfoTooltip;
