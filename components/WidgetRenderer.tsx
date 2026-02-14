import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Activity, Zap, ToggleLeft, ToggleRight, Send, Type, Hash, SlidersHorizontal, AlertTriangle
} from 'lucide-react';
import { Widget, ReadingWidgetType, ControllingWidgetType, GaugeConfig, ButtonConfig, MultiStateConfig } from '../types';
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
const LineChartWidget: React.FC<{ widget: Widget; colorIndex: number; liveData?: any[] }> = ({ widget, colorIndex, liveData }) => {
    const data = liveData || [];
    const color = getColor(colorIndex);

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{widget.dataLabel || widget.variableName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${color.bg} ${color.text}`}>
                        Live
                    </div>
                    <InfoTooltip
                        title="Configuration"
                        content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                    />
                </div>
            </div>
            <div className="h-[180px]">
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
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px', fontSize: '11px' }}
                            labelFormatter={(ts) => new Date(ts as number).toLocaleTimeString()}
                        />
                        <Area type="monotone" dataKey="value" stroke={color.primary} strokeWidth={2.5} fillOpacity={1} fill={`url(#gradient-${widget.id})`} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ── Bar Chart Widget ──
const BarChartWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: number }> = ({ widget, colorIndex, currentValue }) => {
    const data = [{ name: 'Current', value: currentValue || 0 }];
    const color = getColor(colorIndex);

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{widget.dataLabel || widget.variableName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${color.bg} ${color.text}`}>
                        Live
                    </div>
                    <InfoTooltip
                        title="Configuration"
                        content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                    />
                </div>
            </div>
            <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#cbd5e1" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px', fontSize: '11px' }}
                        />
                        <Bar dataKey="value" fill={color.primary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ── Gauge Widget (SVG) ──
const GaugeWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: number }> = ({ widget, colorIndex, currentValue }) => {
    const color = getColor(colorIndex);
    const value = currentValue || 0;
    const config = widget.config as GaugeConfig;
    const min = config?.min ?? 0;
    const max = config?.max ?? 100;
    const percentage = ((value - min) / (max - min)) * 100;
    const angle = -135 + (percentage / 100) * 270; // -135 to +135 degrees

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-3">{widget.dataLabel || widget.variableName}</p>
            <div className="relative w-[160px] h-[100px]">
                <svg viewBox="0 0 200 120" className="w-full h-full">
                    {/* Background arc */}
                    <path
                        d="M 20 110 A 80 80 0 1 1 180 110"
                        fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round"
                    />
                    {/* Value arc */}
                    <path
                        d="M 20 110 A 80 80 0 1 1 180 110"
                        fill="none" stroke={color.primary} strokeWidth="16" strokeLinecap="round"
                        strokeDasharray={`${percentage * 2.83} 283`}
                        className="transition-all duration-1000 ease-in-out"
                    />
                    {/* Needle */}
                    <g className="transition-transform duration-1000 ease-in-out origin-center">
                        <line
                            x1="100" y1="110" x2="100" y2="40"
                            stroke="#1e293b" strokeWidth="3" strokeLinecap="round"
                            transform={`rotate(${angle} 100 110)`}
                        />
                    </g>
                    {/* Center circle */}
                    <circle cx="100" cy="110" r="8" fill="#1e293b" />
                    <circle cx="100" cy="110" r="4" fill="white" />
                </svg>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                    <span className="text-2xl font-black text-slate-900">{value}</span>
                    <span className="text-xs text-slate-400 ml-1">{config?.unit || ''}</span>
                </div>
            </div>
            <div className="flex justify-between w-full mt-2 px-2">
                <span className="text-[10px] text-slate-400 font-bold">{min}</span>
                <span className="text-[10px] text-slate-400 font-bold">{max}</span>
            </div>
        </div>
    );
};

// ── LED Indicator Widget ──
const LEDIndicatorWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any }> = ({ widget, colorIndex, currentValue }) => {
    const color = getColor(colorIndex);
    const status = currentValue === true || currentValue === '1' || currentValue === 'on' || currentValue === 'RUNNING';

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div className={`w-12 h-12 rounded-full shadow-inner relative ${status ? 'bg-emerald-500 shadow-emerald-400/50' : 'bg-slate-200'}`}>
                {status && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-20" />
                )}
                <div className={`absolute top-1 left-3 w-3 h-1.5 bg-white/40 rounded-full blur-[1px]`} />
            </div>
            <p className={`mt-4 text-xs font-black tracking-widest ${status ? 'text-emerald-600' : 'text-slate-400'}`}>
                {status ? 'ACTIVE' : 'INACTIVE'}
            </p>
        </div>
    );
};

// ── Progress Bar Widget ──
const ProgressBarWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: number }> = ({ widget, colorIndex, currentValue }) => {
    const color = getColor(colorIndex);
    const config = widget.config as GaugeConfig;
    const value = currentValue || 0;
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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full flex flex-col justify-center">
            <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                        <p className="text-[10px] text-slate-400">{widget.dataLabel || widget.variableName}</p>
                    </div>
                    <InfoTooltip
                        title="Configuration"
                        content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                    />
                </div>
                <div className="text-right">
                    <span className="text-xl font-black text-slate-900">{value}</span>
                    <span className="text-[10px] text-slate-400 ml-1">{config?.unit}</span>
                </div>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                    ref={barRef}
                    className={`h-full bg-gradient-to-r ${color.gradient} transition-all duration-1000`}
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
const TextLogWidget: React.FC<{ widget: Widget; colorIndex: number; liveLogs?: any[] }> = ({ widget, colorIndex, liveLogs }) => {
    const logs = liveLogs || [
        { time: new Date().toLocaleTimeString(), msg: 'Awaiting data...' }
    ];

    return (
        <div className="bg-slate-900 rounded-2xl p-4 shadow-xl border border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">{widget.name}</h4>
                </div>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[11px]">
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-3 text-slate-400">
                        <span className="text-slate-600 shrink-0">[{log.time}]</span>
                        <span className={log.msg?.includes('Warning') || log.msg?.includes('ALARM') ? 'text-amber-400' : 'text-slate-300'}>{log.msg}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Multi-State Indicator Widget ──
const MultiStateIndicatorWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any }> = ({ widget, colorIndex, currentValue }) => {
    const config = widget.config as MultiStateConfig;
    const states = config?.states || [
        { value: '0', label: 'OFF', color: '#64748b' },
        { value: '1', label: 'RUNNING', color: '#10b981' },
        { value: '2', label: 'ERROR', color: '#ef4444' }
    ];
    const value = currentValue?.toString() || '0';
    const currentState = states.find(s => s.value === value) || states[0];
    const indicatorRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (indicatorRef.current) {
            indicatorRef.current.style.backgroundColor = currentState.color;
        }
    }, [currentState.color]);

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div
                ref={indicatorRef}
                className="px-6 py-3 rounded-xl font-black text-white shadow-lg transition-colors duration-500"
            >
                {currentState.label}
            </div>
            <p className="mt-4 text-[10px] text-slate-400 font-mono">Value: {value}</p>
        </div>
    );
};

// ── Circular Progress Widget ──
const CircularProgressWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: number }> = ({ widget, colorIndex, currentValue }) => {
    const color = getColor(colorIndex);
    const config = widget.config as GaugeConfig;
    const value = currentValue || 0;
    const min = config?.min ?? 0;
    const max = config?.max ?? 100;
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                    <circle
                        cx="56" cy="56" r={radius}
                        fill="none" stroke="#f1f5f9" strokeWidth="8"
                    />
                    <circle
                        cx="56" cy="56" r={radius}
                        fill="none" stroke={color.primary} strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900">{value}</span>
                    <span className="text-[10px] text-slate-400">{config?.unit}</span>
                </div>
            </div>
        </div>
    );
};


// ── Text Display Widget ──
const TextDisplayWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any }> = ({ widget, colorIndex, currentValue }) => {
    const color = getColor(colorIndex);

    return (
        <div className={`bg-gradient-to-br from-white to-slate-50 rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full relative overflow-hidden group`}>
            {/* Glow effect */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${color.gradient} opacity-5 blur-3xl group-hover:opacity-10 transition-all`} />
            <div className="relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{widget.name}</p>
                        <InfoTooltip
                            title="Configuration"
                            content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                        />
                    </div>
                    <div className={`p-2 rounded-xl ${color.bg} ${color.ring} ring-4`}>
                        <Activity size={16} className={color.text} />
                    </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">{currentValue ?? '---'}</h3>
                    <span className="text-sm font-bold text-slate-400">{widget.dataLabel || 'units'}</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 mt-2">{widget.mqttTopic} → {widget.variableName}</p>
            </div>
        </div>
    );
};

// ── Status Indicator Widget ──
const StatusIndicatorWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any }> = ({ widget, colorIndex, currentValue }) => {
    const color = getColor(colorIndex);
    const [blinking, setBlinking] = useState(true);
    const status = currentValue || 'OFFLINE';

    useEffect(() => {
        const interval = setInterval(() => setBlinking(b => !b), 1200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}${widget.variableName ? `\nVariable: ${widget.variableName}` : ''}`}
                />
            </div>
            <div className="relative mb-3">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${color.gradient} flex items-center justify-center shadow-lg`}>
                    <Zap size={28} className="text-white" />
                </div>
                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${status === 'ONLINE' || status === 'RUNNING' ? 'bg-emerald-500' : 'bg-slate-400'} border-2 border-white transition-opacity ${blinking ? 'opacity-100' : 'opacity-40'}`} />
            </div>
            <p className={`text-lg font-black ${status === 'ONLINE' || status === 'RUNNING' ? 'text-emerald-600' : 'text-slate-400'}`}>{status}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">{widget.dataLabel || widget.variableName}</p>
        </div>
    );
};

// ══════════════════════════════════════════════════════════
//  CONTROLLING WIDGETS
// ══════════════════════════════════════════════════════════

// ── Button Widget ──
const ButtonWidget: React.FC<{ widget: Widget; colorIndex: number; isPreview: boolean; currentValue?: any }> = ({ widget, colorIndex, isPreview, currentValue }) => {
    const color = getColor(colorIndex);
    const [pressed, setPressed] = useState(false);
    const config = widget.config as ButtonConfig;

    const handleAction = () => {
        if (isPreview) {
            setPressed(true);
            setTimeout(() => setPressed(false), 300);
            return;
        }

        // Use the Read-Modify-Write pattern if a variableName is set
        if (widget.variableName) {
            mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, config?.payload || 'TRIGGER');
        } else {
            // Fallback for simple commands
            mqttService.publishRaw(widget.mqttTopic, config?.payload || 'TRIGGER');
        }

        setPressed(true);
        setTimeout(() => setPressed(false), 300);
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}\nAction: ${widget.mqttAction}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-4">{widget.dataLabel || widget.variableName}</p>
            <div className="flex-1 flex items-center justify-center">
                <button
                    onClick={handleAction}
                    className={`w-full py-4 rounded-2xl font-bold text-white text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all bg-gradient-to-r ${color.gradient} ${pressed ? 'scale-95' : 'scale-100'}`}
                >
                    <Send size={16} className="inline mr-2" />
                    {config?.label || 'SEND COMMAND'}
                </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3 font-mono">→ {widget.mqttTopic}</p>
        </div>
    );
};

// ── Toggle Widget ──
const ToggleWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any }> = ({ widget, colorIndex, currentValue }) => {
    const [isOn, setIsOn] = useState(false);
    const color = getColor(colorIndex);

    // Sync with live data
    useEffect(() => {
        if (currentValue !== undefined) {
            const val = String(currentValue).toLowerCase();
            setIsOn(val === 'true' || val === '1' || val === 'on' || val === 'active');
        }
    }, [currentValue]);

    const handleToggle = () => {
        const nextState = !isOn;
        setIsOn(nextState);
        mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, nextState);
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-5">{widget.dataLabel || widget.variableName}</p>

            <button
                onClick={handleToggle}
                className="relative focus:outline-none mb-3 group"
                title="Toggle switch"
            >
                {isOn ? (
                    <ToggleRight size={64} className={`${color.text} transition-colors drop-shadow-sm`} />
                ) : (
                    <ToggleLeft size={64} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                )}
            </button>

            <div className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isOn ? `bg-gradient-to-r ${color.gradient} text-white shadow-md` : 'bg-slate-100 text-slate-500'
                }`}>
                {isOn ? 'ON' : 'OFF'}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-mono">→ {widget.mqttTopic}</p>
        </div>
    );
};

// ── Slider Widget ──
const SliderWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any }> = ({ widget, colorIndex, currentValue }) => {
    const [value, setValue] = useState(50);
    const color = getColor(colorIndex);
    const config = widget.config as GaugeConfig;
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
            sliderRef.current.style.background = `linear-gradient(to right, ${color.primary} 0%, ${color.primary} ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
        }
    }, [value, min, max, color.primary]);

    const handlePublish = (val: number) => {
        mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, val);
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-4">{widget.dataLabel || widget.variableName}</p>

            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <div className="text-3xl font-black text-slate-900">{value}</div>

                <div className="w-full relative mt-2">
                    <input
                        ref={sliderRef}
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => setValue(Number(e.target.value))}
                        onMouseUp={(e) => handlePublish(Number((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => handlePublish(Number((e.target as HTMLInputElement).value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        title="Slider control"
                    />
                </div>

                <div className="flex justify-between w-full text-[10px] text-slate-400 font-bold">
                    <span>{min}</span>
                    <span>{max}</span>
                </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3 font-mono">→ {widget.mqttTopic}</p>
        </div>
    );
};

// ── Text Input Widget ──
const TextInputWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any }> = ({ widget, colorIndex, currentValue }) => {
    const [text, setText] = useState('');
    const color = getColor(colorIndex);

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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Type size={14} className={color.text} />
                    <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                </div>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-4">{widget.dataLabel || widget.variableName}</p>

            <div className="flex-1 flex flex-col justify-center gap-3">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter value..."
                    className={`w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:${color.border} focus:ring-4 ${color.ring} outline-none text-sm font-medium transition-all`}
                />
                <button
                    onClick={handlePublish}
                    className={`w-full py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r ${color.gradient} shadow-md hover:shadow-lg transition-all`}
                >
                    <Send size={14} className="inline mr-2" />
                    Publish
                </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3 font-mono">→ {widget.mqttTopic}</p>
        </div>
    );
};

// ── Number Input Widget ──
const NumberInputWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any }> = ({ widget, colorIndex, currentValue }) => {
    const [num, setNum] = useState(0);
    const color = getColor(colorIndex);

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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Hash size={14} className={color.text} />
                    <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                </div>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-4">{widget.dataLabel || widget.variableName}</p>

            <div className="flex-1 flex flex-col justify-center gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const n = num - 1;
                            setNum(n);
                            mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, n);
                        }}
                        className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xl font-bold text-slate-600"
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
                        className="flex-1 text-center px-4 py-3 rounded-xl border-2 border-slate-200 outline-none text-lg font-bold text-slate-900"
                    />
                    <button
                        onClick={() => {
                            const n = num + 1;
                            setNum(n);
                            mqttService.publishVariableUpdate(widget.mqttTopic, widget.variableName, n);
                        }}
                        className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xl font-bold text-slate-600"
                    >
                        +
                    </button>
                </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3 font-mono">→ {widget.mqttTopic}</p>
        </div>
    );
};
// ── Color Picker Widget ──
const ColorPickerWidget: React.FC<{ widget: Widget; colorIndex: number }> = ({ widget, colorIndex }) => {
    const [color, setColor] = useState('#6366f1');
    const chipRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chipRef.current) {
            chipRef.current.style.backgroundColor = color;
        }
    }, [color]);

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-4">{widget.mqttTopic}</p>
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div
                    ref={chipRef}
                    className="w-16 h-16 rounded-2xl shadow-lg border-4 border-white transition-colors duration-300"
                />
                <input
                    type="color"
                    title="Choose color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 rounded-lg cursor-pointer border-none bg-transparent"
                />
            </div>
        </div>
    );
};

// ── Time Picker Widget ──
const TimePickerWidget: React.FC<{ widget: Widget; colorIndex: number }> = ({ widget, colorIndex }) => {
    const [time, setTime] = useState('12:00');

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-4">{widget.mqttTopic}</p>
            <div className="flex-1 flex items-center justify-center gap-2">
                <input
                    type="time"
                    title="Set time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-frost-500"
                />
            </div>
        </div>
    );
};

// ── Combo Box Widget ──
const ComboBoxWidget: React.FC<{ widget: Widget; colorIndex: number }> = ({ widget, colorIndex }) => {
    const [selected, setSelected] = useState('Option 1');

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-4">{widget.mqttTopic}</p>
            <div className="flex-1 flex items-center justify-center">
                <select
                    title="Select option"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-frost-500 bg-white"
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
    onSelect: () => void
}> = ({ opt, id, selected, primaryColor, onSelect }) => {
    const outerRef = React.useRef<HTMLDivElement>(null);
    const innerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (outerRef.current) {
            outerRef.current.style.borderColor = selected ? primaryColor : '';
        }
        if (innerRef.current && selected) {
            innerRef.current.style.backgroundColor = primaryColor;
        }
    }, [selected, primaryColor]);

    return (
        <label className="flex items-center gap-3 cursor-pointer group">
            <input
                type="radio"
                name={`radio-${id}`}
                checked={selected}
                onChange={onSelect}
                className="hidden"
            />
            <div
                ref={outerRef}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected ? '' : 'border-slate-200'}`}
            >
                {selected && <div ref={innerRef} className="w-2.5 h-2.5 rounded-full" />}
            </div>
            <span className={`text-sm font-bold transition-colors ${selected ? 'text-slate-900' : 'text-slate-500'}`}>Option {opt}</span>
        </label>
    );
};

const RadioButtonsWidget: React.FC<{ widget: Widget; colorIndex: number }> = ({ widget, colorIndex }) => {
    const [selected, setSelected] = useState('1');
    const color = getColor(colorIndex);

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-800">{widget.name}</h4>
                <InfoTooltip
                    title="Configuration"
                    content={`Topic: ${widget.mqttTopic}`}
                />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-3">
                {['1', '2', '3'].map(opt => (
                    <RadioButtonOption
                        key={opt}
                        opt={opt}
                        id={widget.id}
                        selected={selected === opt}
                        primaryColor={color.primary}
                        onSelect={() => setSelected(opt)}
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
    colorIndex?: number;
    isPreview?: boolean;  // true when in admin designer preview mode
    currentData?: any;    // The current data for this widget (extracted from MQTT)
    historyData?: any[];  // Historical data for charts
    isAlarm?: boolean;    // true if the current value is out of bounds
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
    widget,
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
        switch (widget.widgetType) {
            // Reading widgets
            case ReadingWidgetType.LINE_CHART:
                return <LineChartWidget widget={widget} colorIndex={colorIndex} liveData={displayHistory} />;
            case ReadingWidgetType.BAR_CHART:
                return <BarChartWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ReadingWidgetType.GAUGE:
                return <GaugeWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ReadingWidgetType.TEXT_DISPLAY:
                return <TextDisplayWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ReadingWidgetType.LED_INDICATOR:
                return <LEDIndicatorWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ReadingWidgetType.MULTI_STATE_INDICATOR:
                return <MultiStateIndicatorWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ReadingWidgetType.PROGRESS_BAR:
                return <ProgressBarWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ReadingWidgetType.CIRCULAR_PROGRESS:
                return <CircularProgressWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ReadingWidgetType.TEXT_LOG:
                return <TextLogWidget widget={widget} colorIndex={colorIndex} liveLogs={displayHistory} />;
            case ReadingWidgetType.STATUS_INDICATOR:
                return <StatusIndicatorWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;

            // Controlling widgets
            case ControllingWidgetType.BUTTON:
                return <ButtonWidget widget={widget} colorIndex={colorIndex} isPreview={isPreview} currentValue={displayValue} />;
            case ControllingWidgetType.TOGGLE:
                return <ToggleWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ControllingWidgetType.SLIDER:
                return <SliderWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ControllingWidgetType.TEXT_INPUT:
                return <TextInputWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ControllingWidgetType.NUMBER_INPUT:
                return <NumberInputWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} />;
            case ControllingWidgetType.COLOR_PICKER:
                return <ColorPickerWidget widget={widget} colorIndex={colorIndex} />;
            case ControllingWidgetType.COMBO_BOX:
                return <ComboBoxWidget widget={widget} colorIndex={colorIndex} />;
            case ControllingWidgetType.RADIO_BUTTONS:
                return <RadioButtonsWidget widget={widget} colorIndex={colorIndex} />;
            case ControllingWidgetType.TIME_PICKER:
                return <TimePickerWidget widget={widget} colorIndex={colorIndex} />;

        }
    };

    return (
        <div className={`relative h-full transition-all duration-500 ${isAlarm ? 'ring-4 ring-red-500/50 rounded-2xl animate-pulse ring-offset-2' : ''}`}>
            {isAlarm && (
                <div className="absolute -top-3 -right-3 z-20 bg-red-600 text-white p-1.5 rounded-full shadow-lg animate-bounce border-2 border-white">
                    <AlertTriangle size={16} />
                </div>
            )}
            {renderWidget()}
        </div>
    );
};

export default WidgetRenderer;
