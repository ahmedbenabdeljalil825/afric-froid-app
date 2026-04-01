import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Activity, Zap, ToggleLeft, ToggleRight, Send, Type, Hash, SlidersHorizontal, AlertTriangle, Info
} from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { Widget, ReadingWidgetType, ControllingWidgetType, GaugeConfig, ButtonConfig, MultiStateConfig, Language } from '../types';
import InfoTooltip from './InfoTooltip';
import { mqttService } from '../services/mqttService';

// ── Color palettes for widgets ──
const WIDGET_COLORS = [
    { primary: '#009fe3', gradient: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', ring: 'ring-cyan-100' },
    { primary: '#6366f1', gradient: 'from-indigo-500 to-purple-600', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', ring: 'ring-indigo-100' },
    { primary: '#f59e0b', gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'ring-amber-100' },
    { primary: '#10b981', gradient: 'from-emerald-400 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-100' },
    { primary: '#ef4444', gradient: 'from-red-400 to-rose-600', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', ring: 'ring-red-100' },
];

function getColor(index: number) {
    return WIDGET_COLORS[index % WIDGET_COLORS.length];
}

// ── Generate demo data ──
function generateDemoTimeSeries(points: number = 12) {
    const now = Date.now();
    return Array.from({ length: points }, (_, i) => ({
        timestamp: now - (points - 1 - i) * 60000,
        value: 20 + Math.sin(i * 0.5) * 8 + Math.random() * 4,
    }));
}

function generateDemoBarData(points: number = 6) {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return labels.slice(0, points).map((label) => ({
        name: label,
        value: 30 + Math.random() * 60,
    }));
}

// ══════════════════════════════════════════════════════════
//  READING WIDGETS
// ══════════════════════════════════════════════════════════

// ── Line Chart Widget ──
const LineChartWidget: React.FC<{ widget: Widget; colorIndex: number; liveData?: any[]; language: Language }> = ({ widget, colorIndex, liveData, language }) => {
    const data = liveData || [];
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex items-center gap-2">
                        <Activity size={16} className={color.text} />
                        {widget.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tighter uppercase">{t.live} {t.plcliveFeed}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${color.bg} ${color.text} shadow-sm border ${color.border}/50`}>
                        {t.live.toUpperCase()}
                    </div>
                    <InfoTooltip
                        title={t.configuration}
                        content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                    />
                </div>
            </div>
            <div className="h-[180px] mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`gradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color.primary} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={color.primary} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="timestamp"
                            tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            stroke="#cbd5e1" fontSize={9} tickLine={false} axisLine={false}
                        />
                        <YAxis stroke="#cbd5e1" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: '12px', fontSize: '11px' }}
                            labelFormatter={(ts) => new Date(ts as number).toLocaleTimeString()}
                        />
                        <Area type="monotone" dataKey="value" stroke={color.primary} strokeWidth={3} fillOpacity={1} fill={`url(#gradient-${widget.id})`} animationDuration={1500} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ── Bar Chart Widget ──
const BarChartWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: number; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const data = [{ name: TRANSLATIONS[language].live, value: currentValue || 0 }];
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex items-center gap-2">
                        <Zap size={16} className={color.text} />
                        {widget.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tighter uppercase">{t.live} {t.plcliveFeed}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${color.bg} ${color.text} shadow-sm border ${color.border}/50`}>
                        {t.live.toUpperCase()}
                    </div>
                    <InfoTooltip
                        title={t.configuration}
                        content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                    />
                </div>
            </div>
            <div className="h-[180px] mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#cbd5e1" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: '12px', fontSize: '11px' }}
                        />
                        <Bar dataKey="value" fill={color.primary} radius={[10, 10, 0, 0]} animationDuration={1500} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ── Gauge Widget (SVG) ──
const GaugeWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: number; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const value = currentValue || 0;
    const config = widget.config as GaugeConfig;
    const t = TRANSLATIONS[language];
    const min = config?.min ?? 0;
    const max = config?.max ?? 100;
    
    // Bounded value to ensure needle and arc stay within bounds
    const boundedValue = Math.min(Math.max(value, min), max);
    const percentage = ((boundedValue - min) / (max - min)) * 100;
    
    // For a semi-circle (180 degrees), angle goes from -90 to +90
    const angle = -90 + (percentage / 100) * 180;
    
    // Arc length for semi-circle with radius 80 = pi * r = ~251.32
    const arcLength = 251.32;
    // Stroke offset calculates how much of the stroke should be hidden
    const dashOffset = arcLength - (percentage / 100) * arcLength;

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center group text-center">
            <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-bold font-mono mb-4 uppercase tracking-tighter opacity-70">
                {widget.dataLabel || widget.variableName}
            </p>
            
            <div className="w-[160px] h-[90px] mt-2 relative">
                <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
                    {/* Background arc */}
                    <path
                        d="M 20 110 A 80 80 0 0 1 180 110"
                        fill="none" stroke="#f1f5f9" strokeWidth="16" strokeLinecap="round"
                    />
                    {/* Value arc */}
                    <path
                        d="M 20 110 A 80 80 0 0 1 180 110"
                        fill="none" stroke={color.primary} strokeWidth="16" strokeLinecap="round"
                        strokeDasharray={arcLength}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-1000 ease-in-out"
                    />
                    {/* Needle */}
                    <g className="transition-transform duration-1000 ease-in-out origin-[100px_110px]">
                        <line
                            x1="100" y1="110" x2="100" y2="40"
                            stroke="#002060" strokeWidth="4" strokeLinecap="round"
                            transform={`rotate(${angle} 100 110)`}
                        />
                    </g>
                    {/* Center circle */}
                    <circle cx="100" cy="110" r="10" fill="#002060" />
                    <circle cx="100" cy="110" r="4" fill="white" />
                </svg>
            </div>
            
            <div className="mt-1 flex flex-col items-center justify-center text-center">
                <div>
                    <span className="text-3xl font-black text-slate-900 leading-tight">{value}</span>
                    <span className="text-sm text-slate-400 ml-1 font-bold">{config?.unit || ''}</span>
                </div>
            </div>
            
            <div className="flex justify-between w-full mt-4 px-2">
                <span className="text-[10px] text-slate-400 font-black">{min}</span>
                <span className="text-[10px] text-slate-400 font-black">{max}</span>
            </div>
        </div>
    );
};

// ── LED Indicator Widget ──
const LEDIndicatorWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const status = currentValue === true || currentValue === '1' || currentValue === 'on' || currentValue === 'RUNNING';
    const t = TRANSLATIONS[language];

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center text-center group">
            <div className="flex items-center gap-2 mb-6">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div className={`w-20 h-20 rounded-full shadow-2xl relative transition-all duration-700 ${status ? 'bg-emerald-500 shadow-emerald-400/50 scale-110' : 'bg-slate-200 shadow-inner scale-100'}`}>
                {status && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-20" />
                )}
                <div className="absolute top-3 left-5 w-5 h-2.5 bg-white/30 rounded-full blur-[1.5px]" />
            </div>
            <p className={`mt-6 text-xs font-black tracking-[0.2em] transition-colors duration-500 ${status ? 'text-emerald-600' : 'text-slate-400'}`}>
                {status ? t.active.toUpperCase() : t.inactive.toUpperCase()}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">{widget.dataLabel || widget.variableName}</p>
        </div>
    );
};

// ── Progress Bar Widget ──
const ProgressBarWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: number; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const config = widget.config as GaugeConfig;
    const value = currentValue || 0;
    const t = TRANSLATIONS[language];
    const min = config?.min ?? 0;
    const max = config?.max ?? 100;
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const barRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (barRef.current) {
            barRef.current.style.width = `${pct}%`;
        }
    }, [pct]);

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col justify-center group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                        <InfoTooltip
                            title={t.configuration}
                            content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold font-mono mt-1 opacity-70 tracking-tight">{widget.dataLabel || widget.variableName}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                    <span className="text-2xl font-black text-slate-900">{value}</span>
                    <span className="text-xs text-slate-400 ml-1 font-bold">{config?.unit}</span>
                    <p className="text-[10px] text-slate-400 font-bold">{Math.round(pct)}%</p>
                </div>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                    ref={barRef}
                    className={`h-full bg-gradient-to-r ${color.gradient} rounded-full transition-all duration-1000`}
                />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );
};

// ── Text Log Widget ──
const TextLogWidget: React.FC<{ widget: Widget; colorIndex: number; liveLogs?: any[]; language: Language }> = ({ widget, colorIndex, liveLogs, language }) => {
    const logs = liveLogs || [
        { time: new Date().toLocaleTimeString(), msg: TRANSLATIONS[language].awaitingData }
    ];
    const t = TRANSLATIONS[language];

    return (
        <div className="bg-[#002060]/95 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl border border-white/10 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">{widget.name}</h4>
                </div>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[11px] custom-scrollbar pr-2">
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-4 p-2 rounded-xl hover:bg-white/5 transition-colors group/item">
                        <span className="text-slate-500 font-bold shrink-0 opacity-70">[{log.time}]</span>
                        <span className={`font-medium ${log.msg?.includes('Warning') || log.msg?.includes('ALARM') ? 'text-amber-400' : 'text-slate-200'}`}>
                            {log.msg}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Multi-State Indicator Widget ──
const MultiStateIndicatorWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const config = widget.config as MultiStateConfig;
    const t = TRANSLATIONS[language];
    const states = config?.states || [
        { value: '0', label: t.off, color: '#64748b' },
        { value: '1', label: t.active, color: '#10b981' },
        { value: '2', label: 'ERROR', color: '#ef4444' }
    ];
    const value = currentValue?.toString() || '0';
    const bgRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bgRef.current) {
            bgRef.current.style.backgroundColor = currentState.color;
        }
    }, [currentState.color]);

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center text-center group">
            <div className="flex items-center gap-2 mb-6">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div
                ref={bgRef}
                className="px-8 py-4 rounded-[1.5rem] font-black text-white shadow-2xl transition-all duration-500 text-lg tracking-[0.2em] transform group-hover:scale-105"
            >
                {currentState.label.toUpperCase()}
            </div>
            <p className="mt-6 text-[10px] text-slate-400 font-black tracking-widest opacity-70 uppercase">
                {t.value}: <span className="text-slate-600">{value}</span>
            </p>
        </div>
    );
};

// ── Circular Progress Widget ──
const CircularProgressWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: number; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const config = widget.config as GaugeConfig;
    const value = currentValue || 0;
    const t = TRANSLATIONS[language];
    const min = config?.min ?? 0;
    const max = config?.max ?? 100;
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center text-center group">
            <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div className="relative w-32 h-32 transform transition-transform duration-700 group-hover:scale-110">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle
                        cx="60" cy="60" r={radius}
                        fill="none" stroke="#f1f5f9" strokeWidth="12"
                    />
                    <circle
                        cx="60" cy="60" r={radius}
                        fill="none" stroke={color.primary} strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-900 leading-tight">{value}</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{config?.unit}</span>
                </div>
            </div>
            <p className="text-[10px] text-slate-400 font-black font-mono mt-4 uppercase tracking-tighter opacity-70">
                {widget.dataLabel || widget.variableName}
            </p>
        </div>
    );
};


// ── Text Display Widget ──
const TextDisplayWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full relative overflow-hidden group">
            {/* Glow effect */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${color.gradient} opacity-5 blur-3xl group-hover:opacity-10 transition-all`} />
            <div className="relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity size={16} className={color.text} />
                        <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                    </div>
                    <InfoTooltip
                        title={t.configuration}
                        content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                    />
                </div>
                <div className="mt-8 flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{currentValue ?? '---'}</h3>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{widget.dataLabel || t.units}</span>
                </div>
                <p className="text-[10px] font-black font-mono text-slate-400 mt-4 uppercase tracking-tighter opacity-70">
                    {widget.mqttTopic} → {widget.variableName}
                </p>
            </div>
        </div>
    );
};

// ── Status Indicator Widget ──
const StatusIndicatorWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [blinking, setBlinking] = useState(true);
    const status = currentValue || 'OFFLINE';
    const t = TRANSLATIONS[language];

    useEffect(() => {
        const interval = setInterval(() => setBlinking(b => !b), 1200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center text-center group">
            <div className="flex items-center gap-2 mb-6">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div className="relative mb-6 transform transition-transform duration-700 group-hover:scale-110">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${color.gradient} flex items-center justify-center shadow-2xl relative z-10`}>
                    <Zap size={32} className="text-white" />
                </div>
                <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${status === 'ONLINE' || status === 'RUNNING' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'bg-slate-400'} border-4 border-white z-20 transition-opacity duration-500 ${blinking ? 'opacity-100' : 'opacity-40'}`} />
            </div>
            <p className={`text-xl font-black tracking-widest transition-colors duration-500 ${status === 'ONLINE' || status === 'RUNNING' ? 'text-emerald-600' : 'text-slate-400'}`}>
                {status}
            </p>
            <p className="text-[10px] text-slate-400 font-black font-mono mt-2 uppercase tracking-tighter opacity-70">
                {widget.dataLabel || widget.variableName}
            </p>
        </div>
    );
};

// ══════════════════════════════════════════════════════════
//  CONTROLLING WIDGETS
// ══════════════════════════════════════════════════════════

// ── Button Widget ──
const ButtonWidget: React.FC<{ widget: Widget; colorIndex: number; isPreview: boolean; currentValue?: any; language: Language }> = ({ widget, colorIndex, isPreview, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [pressed, setPressed] = useState(false);
    const config = widget.config as ButtonConfig;
    const t = TRANSLATIONS[language];

    const handleAction = () => {
        if (isPreview) {
            setPressed(true);
            setTimeout(() => setPressed(false), 300);
            return;
        }

        if (widget.variableName) {
            mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, config?.payload || 'TRIGGER');
        } else {
            mqttService.publishRaw(widget.mqttTopic, config?.payload || 'TRIGGER');
        }

        setPressed(true);
        setTimeout(() => setPressed(false), 300);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}\nAction: ${widget.mqttAction}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-black font-mono mb-6 uppercase tracking-tighter opacity-70">
                {widget.dataLabel || widget.variableName}
            </p>
            <div className="flex-1 flex items-center justify-center">
                <button
                    onClick={handleAction}
                    className={`w-full py-5 rounded-2xl font-black text-white text-xs tracking-[0.2em] shadow-2xl hover:shadow-3xl transform transition-all duration-300 bg-gradient-to-r ${color.gradient} ${pressed ? 'scale-95 brightness-90' : 'scale-100 hover:-translate-y-1'}`}
                >
                    <Send size={14} className="inline mr-3 -translate-y-0.5" />
                    {(config?.label || t.sendCommand).toUpperCase()}
                </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-6 font-black font-mono tracking-tighter opacity-50 italic">
                → {widget.mqttTopic}
            </p>
        </div>
    );
};

// ── Toggle Widget ──
const ToggleWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const [isOn, setIsOn] = useState(false);
    const [locked, setLocked] = useState(false);
    const lockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];

    const parseValue = (val: any): boolean => {
        if (val === undefined || val === null) return false;
        const s = String(val).toLowerCase();
        return s === 'true' || s === '1' || s === 'on' || s === 'active';
    };

    // Sync with live MQTT data — but only when NOT locked (user just clicked)
    useEffect(() => {
        if (locked) return;
        if (currentValue !== undefined) {
            setIsOn(parseValue(currentValue));
        }
    }, [currentValue, locked]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => { if (lockTimerRef.current) clearTimeout(lockTimerRef.current); };
    }, []);

    const handleToggle = () => {
        const nextState = !isOn;
        setIsOn(nextState);
        // Lock for 2 s so MQTT subscription echo cannot revert the optimistic state
        setLocked(true);
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        lockTimerRef.current = setTimeout(() => {
            setLocked(false);
        }, 2000);
        mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, nextState);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center text-center group">
            <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-black font-mono mb-6 uppercase tracking-tighter opacity-70">
                {widget.dataLabel || widget.variableName}
            </p>

            <button
                onClick={handleToggle}
                className="relative focus:outline-none mb-4 group transform transition-transform duration-500 hover:scale-110 active:scale-95"
                title="Toggle switch"
            >
                {isOn ? (
                    <ToggleRight size={72} className={`${color.text} transition-colors drop-shadow-2xl`} />
                ) : (
                    <ToggleLeft size={72} className="text-slate-200 group-hover:text-slate-300 transition-colors" />
                )}
            </button>

            <div className={`px-6 py-2 rounded-full text-xs font-black tracking-[0.2em] transition-all duration-500 ${isOn ? `bg-gradient-to-r ${color.gradient} text-white shadow-lg` : 'bg-slate-100 text-slate-400'}`}>
                {isOn ? t.on.toUpperCase() : t.off.toUpperCase()}
            </div>
            <p className="text-[10px] text-slate-400 mt-6 font-black font-mono tracking-tighter opacity-50 italic">
                → {widget.mqttTopic}
            </p>
        </div>
    );
};

// ── Slider Widget ──
const SliderWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const [value, setValue] = useState(50);
    const color = getColor(colorIndex);
    const config = widget.config as GaugeConfig;
    const t = TRANSLATIONS[language];
    const min = config?.min ?? 0;
    const max = config?.max ?? 100;
    const sliderRef = React.useRef<HTMLInputElement>(null);

    // Sync with live data
    useEffect(() => {
        if (currentValue !== undefined && !isNaN(Number(currentValue))) {
            setValue(Number(currentValue));
        }
    }, [currentValue]);

    useEffect(() => {
        if (sliderRef.current) {
            const pct = ((value - min) / (max - min)) * 100;
            sliderRef.current.style.background = `linear-gradient(to right, ${color.primary} 0%, ${color.primary} ${pct}%, #f1f5f9 ${pct}%, #f1f5f9 100%)`;
        }
    }, [value, min, max, color.primary]);

    const handlePublish = (val: number) => {
        mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, val);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-black font-mono mb-4 uppercase tracking-tighter opacity-70">
                {widget.dataLabel || widget.variableName}
            </p>

            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="text-4xl font-black text-slate-900 leading-none transform transition-transform duration-500 group-hover:scale-110 tracking-tighter">{value}</div>

                <div className="w-full relative mt-4">
                    <input
                        ref={sliderRef}
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => setValue(Number(e.target.value))}
                        onMouseUp={(e) => handlePublish(Number((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => handlePublish(Number((e.target as HTMLInputElement).value))}
                        className="w-full h-3 rounded-full appearance-none cursor-pointer shadow-inner"
                        title="Slider control"
                    />
                </div>

                <div className="flex justify-between w-full text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    <span>{min}</span>
                    <span>{max}</span>
                </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-6 font-black font-mono tracking-tighter opacity-50 italic">
                → {widget.mqttTopic}
            </p>
        </div>
    );
};

// ── Text Input Widget ──
const TextInputWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const [text, setText] = useState('');
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];

    // Sync with live data
    useEffect(() => {
        if (currentValue !== undefined) {
            setText(String(currentValue));
        }
    }, [currentValue]);

    const handlePublish = () => {
        mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, text);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Type size={16} className={color.text} />
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                </div>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-black font-mono mb-6 uppercase tracking-tighter opacity-70">
                {widget.dataLabel || widget.variableName}
            </p>

            <div className="flex-1 flex flex-col justify-center gap-4">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`${t.enterValue}...`}
                    className="w-full px-5 py-4 rounded-2xl bg-white/50 border-2 border-slate-100 focus:border-[#002060] focus:ring-4 focus:ring-slate-100 outline-none text-sm font-black transition-all duration-300 placeholder:text-slate-300 text-slate-900 shadow-inner"
                />
                <button
                    onClick={handlePublish}
                    className={`w-full py-4 rounded-2xl font-black text-white text-xs tracking-[0.2em] shadow-2xl hover:shadow-3xl transform transition-all duration-300 bg-gradient-to-r ${color.gradient} hover:-translate-y-1 active:scale-95`}
                >
                    <Send size={14} className="inline mr-3 -translate-y-0.5" />
                    {t.publish.toUpperCase()}
                </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-6 font-black font-mono tracking-tighter opacity-50 italic">
                → {widget.mqttTopic}
            </p>
        </div>
    );
};

// ── Number Input Widget ──
const NumberInputWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const [num, setNum] = useState(0);
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];

    // Sync with live data
    useEffect(() => {
        if (currentValue !== undefined && !isNaN(Number(currentValue))) {
            setNum(Number(currentValue));
        }
    }, [currentValue]);

    const handlePublish = () => {
        mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, num);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Hash size={16} className={color.text} />
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                </div>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-black font-mono mb-6 uppercase tracking-tighter opacity-70">
                {widget.dataLabel || widget.variableName}
            </p>

            <div className="flex-1 flex flex-col justify-center gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            const n = num - 1;
                            setNum(n);
                            mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, n);
                        }}
                        className="w-14 h-14 rounded-2xl bg-white/50 border-2 border-slate-100 hover:border-[#002060] hover:bg-white text-[#002060] transition-all duration-300 text-2xl font-black shadow-lg flex items-center justify-center active:scale-90"
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={num}
                        onChange={(e) => setNum(Number(e.target.value))}
                        onBlur={handlePublish}
                        onKeyDown={(e) => e.key === 'Enter' && handlePublish()}
                        title="Number value"
                        className="flex-1 text-center px-4 py-4 rounded-2xl bg-white/50 border-2 border-slate-100 outline-none text-2xl font-black text-slate-900 shadow-inner focus:border-[#002060] transition-all"
                    />
                    <button
                        onClick={() => {
                            const n = num + 1;
                            setNum(n);
                            mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, n);
                        }}
                        className="w-14 h-14 rounded-2xl bg-white/50 border-2 border-slate-100 hover:border-[#002060] hover:bg-white text-[#002060] transition-all duration-300 text-2xl font-black shadow-lg flex items-center justify-center active:scale-90"
                    >
                        +
                    </button>
                </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-6 font-black font-mono tracking-tighter opacity-50 italic">
                → {widget.mqttTopic}
            </p>
        </div>
    );
};
// ── Color Picker Widget ──
const ColorPickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {
    const [colorValue, setColorValue] = useState('#002060');
    const t = TRANSLATIONS[language];
    const bgRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bgRef.current) {
            bgRef.current.style.backgroundColor = colorValue;
        }
    }, [colorValue]);

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-black font-mono mb-6 uppercase tracking-tighter opacity-70">
                {widget.mqttTopic}
            </p>
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div
                    ref={bgRef}
                    className="w-24 h-24 rounded-[2rem] shadow-2xl border-4 border-white transition-all duration-500 transform group-hover:scale-110"
                />
                <input
                    type="color"
                    title="Choose color"
                    value={colorValue}
                    onChange={(e) => {
                        setColorValue(e.target.value);
                        mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, e.target.value);
                    }}
                    className="w-full h-14 rounded-2xl cursor-pointer border-none bg-white/50 p-1 shadow-inner overflow-hidden"
                />
            </div>
        </div>
    );
};

// ── Time Picker Widget ──
const TimePickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {
    const [time, setTime] = useState('12:00');
    const t = TRANSLATIONS[language];

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-black font-mono mb-6 uppercase tracking-tighter opacity-70">
                {widget.mqttTopic}
            </p>
            <div className="flex-1 flex items-center justify-center">
                <input
                    type="time"
                    title="Set time"
                    value={time}
                    onChange={(e) => {
                        setTime(e.target.value);
                        mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, e.target.value);
                    }}
                    className="px-8 py-4 rounded-2xl bg-white/50 border-2 border-slate-100 font-black text-2xl text-[#002060] outline-none focus:border-[#002060] focus:ring-4 focus:ring-slate-100 transition-all shadow-inner"
                />
            </div>
        </div>
    );
};

// ── Combo Box Widget ──
const ComboBoxWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {
    const [selected, setSelected] = useState('Option 1');
    const t = TRANSLATIONS[language];

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-black font-mono mb-6 uppercase tracking-tighter opacity-70">
                {widget.mqttTopic}
            </p>
            <div className="flex-1 flex items-center justify-center">
                <select
                    title="Select option"
                    value={selected}
                    onChange={(e) => {
                        setSelected(e.target.value);
                        mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, e.target.value);
                    }}
                    className="w-full px-6 py-4 rounded-2xl bg-white/50 border-2 border-slate-100 font-black text-slate-900 outline-none focus:border-[#002060] focus:ring-4 focus:ring-slate-100 transition-all shadow-inner appearance-none relative"
                >
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                </select>
            </div>
        </div>
    );
};

// ── Radio Buttons Widget ──
const RadioButtonOption: React.FC<{
    opt: string,
    id: string,
    selected: boolean,
    primaryColor: string,
    borderClass: string,
    onSelect: () => void
}> = ({ opt, id, selected, primaryColor, borderClass, onSelect }) => {
    const dotRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (dotRef.current) {
            dotRef.current.style.backgroundColor = primaryColor;
        }
    }, [primaryColor, selected]);

    return (
        <label className="flex items-center gap-4 cursor-pointer group">
            <input
                type="radio"
                name={`radio-${id}`}
                checked={selected}
                onChange={onSelect}
                className="hidden"
            />
            <div
                className={`w-7 h-7 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${selected ? `${borderClass} scale-110 shadow-lg` : 'border-slate-100 bg-slate-50'}`}
            >
                {selected && <div ref={dotRef} className="w-3.5 h-3.5 rounded-full shadow-inner animate-in fade-in zoom-in duration-500" />}
            </div>
            <span className={`text-sm font-black uppercase tracking-widest transition-all duration-300 ${selected ? 'text-[#002060] translate-x-2' : 'text-slate-400'}`}>Option {opt}</span>
        </label>
    );
};

const RadioButtonsWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {
    const [selected, setSelected] = useState('1');
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-5">
                {['1', '2', '3'].map(opt => (
                    <RadioButtonOption
                        key={opt}
                        opt={opt}
                        id={widget.id}
                        selected={selected === opt}
                        primaryColor={color.primary}
                        borderClass={color.border.replace('border-', 'border-')} // just using the class from color object
                        onSelect={() => {
                            setSelected(opt);
                            mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, opt);
                        }}
                    />
                ))}
            </div>
        </div>
    );
};


// ══════════════════════════════════════════════════════════
//  MAIN WIDGET RENDERER
// ══════════════════════════════════════════════════════════
interface WidgetRendererProps {
    widget: Widget;
    language?: Language;
    colorIndex?: number;
    isPreview?: boolean;  // true when in admin designer preview mode
    currentData?: any;    // The current data for this widget (extracted from MQTT)
    historyData?: any[];  // Historical data for charts
    isAlarm?: boolean;    // true if the current value is out of bounds
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
    widget,
    language = 'fr',
    colorIndex = 0,
    isPreview = false,
    currentData,
    historyData,
    isAlarm = false
}) => {
    // If in preview, we use demo data since MQTT is not active
    const displayValue = isPreview ? (ReadingWidgetType.GAUGE ? 67 : 24.5) : currentData;
    const displayHistory = isPreview ? generateDemoTimeSeries() : historyData;

    const renderWidget = () => {
        const t = TRANSLATIONS[language];
        switch (widget.widgetType) {
            // Reading widgets
            case ReadingWidgetType.LINE_CHART:
                return <LineChartWidget widget={widget} colorIndex={colorIndex} liveData={displayHistory} language={language} />;
            case ReadingWidgetType.BAR_CHART:
                return <BarChartWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ReadingWidgetType.GAUGE:
                return <GaugeWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ReadingWidgetType.TEXT_DISPLAY:
                return <TextDisplayWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ReadingWidgetType.LED_INDICATOR:
                return <LEDIndicatorWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ReadingWidgetType.MULTI_STATE_INDICATOR:
                return <MultiStateIndicatorWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ReadingWidgetType.PROGRESS_BAR:
                return <ProgressBarWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ReadingWidgetType.CIRCULAR_PROGRESS:
                return <CircularProgressWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ReadingWidgetType.TEXT_LOG:
                return <TextLogWidget widget={widget} colorIndex={colorIndex} liveLogs={displayHistory} language={language} />;
            case ReadingWidgetType.STATUS_INDICATOR:
                return <StatusIndicatorWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;

            // Controlling widgets
            case ControllingWidgetType.BUTTON:
                return <ButtonWidget widget={widget} colorIndex={colorIndex} isPreview={isPreview} currentValue={displayValue} language={language} />;
            case ControllingWidgetType.TOGGLE:
                return <ToggleWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ControllingWidgetType.SLIDER:
                return <SliderWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ControllingWidgetType.TEXT_INPUT:
                return <TextInputWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ControllingWidgetType.NUMBER_INPUT:
                return <NumberInputWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ControllingWidgetType.COLOR_PICKER:
                return <ColorPickerWidget widget={widget} colorIndex={colorIndex} language={language} />;
            case ControllingWidgetType.TIME_PICKER:
                return <TimePickerWidget widget={widget} colorIndex={colorIndex} language={language} />;
            case ControllingWidgetType.COMBO_BOX:
                return <ComboBoxWidget widget={widget} colorIndex={colorIndex} language={language} />;
            case ControllingWidgetType.RADIO_BUTTONS:
                return <RadioButtonsWidget widget={widget} colorIndex={colorIndex} language={language} />;

            default:
                return (
                    <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <Info size={32} className="mb-2 opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest">{t?.unsupportedWidget || 'Unsupported Widget'}</p>
                    </div>
                );
        }
    };

    return (
        <div className={`relative h-full transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${isAlarm ? 'ring-2 ring-red-500/40 rounded-2xl ring-offset-1 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}>
            {isAlarm && (
                <div className="absolute -top-2 -right-2 z-20 bg-red-600 text-white p-1.5 rounded-full shadow-lg animate-bounce border-2 border-white">
                    <AlertTriangle size={14} />
                </div>
            )}
            {renderWidget()}
        </div>
    );
};

export default WidgetRenderer;
