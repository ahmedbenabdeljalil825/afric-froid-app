import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
    Activity, Zap, ToggleLeft, ToggleRight, Send, Type, Hash, SlidersHorizontal, AlertTriangle, Info, Clock, Download
} from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { TELEMETRY_RETENTION_DAYS } from '../constants';
import { Widget, ReadingWidgetType, ControllingWidgetType, GaugeConfig, ButtonConfig, MultiStateConfig, Language, ComboBoxConfig, RadioButtonsConfig, Translation } from '../types';
import InfoTooltip from './InfoTooltip';
import { mqttService } from '../services/mqttService';
import {
    fetchAllTelemetryForWidget,
    telemetryRowsToCsv,
    triggerBrowserDownload,
    safeFileSegment,
} from '../services/telemetryExport';

const WIDGET_COLORS = [
    { primary: '#009fe3', gradient: 'bg-gradient-to-r from-cyan-500 to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', ring: 'ring-cyan-100' },
    { primary: '#6366f1', gradient: 'bg-gradient-to-r from-indigo-500 to-purple-600', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', ring: 'ring-indigo-100' },
    { primary: '#f59e0b', gradient: 'bg-gradient-to-r from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'ring-amber-100' },
    { primary: '#10b981', gradient: 'bg-gradient-to-r from-emerald-400 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-100' },
    { primary: '#ef4444', gradient: 'bg-gradient-to-r from-red-400 to-rose-600', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', ring: 'ring-red-100' },
];

const isWideLayout = (widget: Widget): boolean => {
    const cfg = (widget.config || {}) as any;
    return cfg?.layoutWidth === 'wide' || cfg?.large === true;
};

const isTallLayout = (widget: Widget): boolean => {
    const cfg = (widget.config || {}) as any;
    // Preserve legacy behavior: "large" makes charts taller.
    // The new "layoutWidth: wide" should affect width only.
    return cfg?.large === true;
};

function getColor(index: number) {
    return WIDGET_COLORS[index % WIDGET_COLORS.length];
}

function mqttTopicVariableTooltip(t: Translation, widget: Pick<Widget, 'mqttTopic' | 'variableName' | 'category' | 'config'>): string {
    let s = `${t.widgetConfigTopic}: ${widget.mqttTopic}`;
    if (widget.variableName) s += `\n${t.widgetConfigVariable}: ${widget.variableName}`;
    
    const config = widget.config as any;
    if (widget.category === 'CONTROLLING' && (config?.readTopic || config?.readVariableName)) {
        s += `\n\n-- READ (SUBSCRIBE) --`;
        if (config.readTopic) s += `\n${t.widgetConfigTopic}: ${config.readTopic}`;
        if (config.readVariableName) s += `\n${t.widgetConfigVariable}: ${config.readVariableName}`;
    }
    
    return s;
}

// ── Range Selection Buttons ──
const TimeRangeButtons: React.FC<{ activeRange: string; onChange: (range: string) => void; language: Language }> = ({ activeRange, onChange, language }) => {
    const t = TRANSLATIONS[language];
    const ranges = [
        { label: t.chartRange1h, value: '1' },
        { label: t.chartRange6h, value: '6' },
        { label: t.chartRange12h, value: '12' },
        { label: t.chartRange24h, value: '24' },
    ];

    return (
        <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/40">
            {ranges.map((r) => (
                <button
                    key={r.value}
                    onClick={() => onChange(r.value)}
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${
                        activeRange === r.value
                            ? 'bg-white shadow-sm text-slate-900 border border-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {r.label}
                </button>
            ))}
        </div>
    );
};

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
//  HELPER COMPONENTS
// ══════════════════════════════════════════════════════════

const IndustrialTooltip = ({ active, payload, label, unit, widgetName, locale }: { active?: boolean; payload?: any[]; label?: number | string; unit?: string; widgetName: string; locale: string }) => {
    if (active && payload && payload.length) {
        const labelNum = label != null && label !== '' ? Number(label) : NaN;
        const date = Number.isFinite(labelNum) ? new Date(labelNum) : null;
        return (
            <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/40 ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{widgetName}</p>
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                        {typeof payload[0].value === 'number' ? payload[0].value.toFixed(4) : payload[0].value}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{unit}</span>
                </div>
                {date && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase border-t border-slate-100 pt-2">
                        <Clock size={10} />
                        <span>
                            {date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}{' '}
                            {date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

// ══════════════════════════════════════════════════════════
//  READING WIDGETS
// ══════════════════════════════════════════════════════════
const LineChartWidget: React.FC<{ 
    widget: Widget; 
    colorIndex: number; 
    historyData?: any[];
    timeRange?: string;
    onRangeChange?: (range: string) => void;
    language: Language;
    showExportButton?: boolean;
}> = ({ widget, colorIndex, historyData, timeRange = '1', onRangeChange, language, showExportButton = true }) => {
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];
    const [exporting, setExporting] = useState(false);
    const [exportBanner, setExportBanner] = useState<null | { kind: 'info' | 'success' | 'error'; text: string }>(null);
    const config = widget.config as any; 
    const isLarge = isTallLayout(widget);
    const hours = parseInt(timeRange, 10) || 1;

    const chartData = useMemo(() => {
        const raw = [...(historyData || [])] as { timestamp: number; value: number }[];
        return raw
            .filter((p) => p && typeof p.timestamp === 'number' && typeof p.value === 'number' && !Number.isNaN(p.value))
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [historyData]);

    const xDomain = useMemo(() => {
        const end = Date.now();
        return [end - hours * 3600 * 1000, end] as [number, number];
    }, [hours, chartData.length, chartData[chartData.length - 1]?.timestamp]);

    const yDomain = useMemo((): [number, number] => {
        const ymin = config?.yMin;
        const ymax = config?.yMax;
        if (typeof ymin === 'number' && typeof ymax === 'number' && ymax > ymin) {
            return [ymin, ymax];
        }
        const vals = chartData.map((d) => d.value);
        if (vals.length === 0) return [0, 1];
        let lo = Math.min(...vals);
        let hi = Math.max(...vals);
        if (hi <= lo) {
            lo -= 1;
            hi += 1;
        }
        const pad = Math.max((hi - lo) * 0.12, Math.max(Math.abs(hi), Math.abs(lo), 1) * 0.02);
        return [lo - pad, hi + pad];
    }, [chartData, config?.yMin, config?.yMax]);

    const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : undefined;
    const isCritical = config?.thresholdCritical !== undefined && latestValue !== undefined && latestValue >= config.thresholdCritical;
    const isWarning = config?.thresholdWarning !== undefined && latestValue !== undefined && latestValue >= config.thresholdWarning && !isCritical;
    const activeColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : color.primary;

    const sampleSec = widget.historyInterval ?? 10;
    const dbHint = t.chartSavedEverySeconds.replace('{seconds}', String(sampleSec));
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';

    const handleExportCsv = useCallback(async () => {
        const tr = TRANSLATIONS[language];
        setExporting(true);
        setExportBanner({ kind: 'info', text: tr.exportTelemetryDownloading });
        try {
            const rows = await fetchAllTelemetryForWidget(widget.id);
            if (rows.length === 0) {
                setExportBanner({ kind: 'error', text: tr.exportTelemetryEmpty });
                return;
            }
            const csv = telemetryRowsToCsv(rows, {
                time: tr.exportCsvTimestamp,
                value: tr.exportCsvValue,
                variable: tr.exportCsvVariable,
                unit: tr.exportCsvUnit,
            });
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            triggerBrowserDownload(`telemetry_${safeFileSegment(widget.name)}_${stamp}.csv`, csv);
            setExportBanner({ kind: 'success', text: tr.exportTelemetryDownloaded });
        } catch {
            setExportBanner({ kind: 'error', text: tr.exportTelemetryError });
        } finally {
            setExporting(false);
        }
    }, [widget.id, widget.name, language]);

    useEffect(() => {
        if (!exportBanner) return;
        const id = setTimeout(() => setExportBanner(null), exportBanner.kind === 'info' ? 8000 : 3500);
        return () => clearTimeout(id);
    }, [exportBanner]);

    return (
        <div className={`bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 flex flex-col group ${isLarge ? 'min-h-[420px]' : 'h-full'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex items-center gap-2">
                        <Activity size={16} className={color.text} />
                        {widget.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-tight">
                        {t.chartDataFromDatabase} · {dbHint}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {onRangeChange && (
                        <TimeRangeButtons activeRange={timeRange} onChange={onRangeChange} language={language} />
                    )}
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                        {showExportButton && (
                            <button
                                type="button"
                                onClick={() => void handleExportCsv()}
                                disabled={exporting}
                                title={t.downloadWidgetDataTooltip.replace('{days}', String(TELEMETRY_RETENTION_DAYS))}
                                className="p-2 rounded-xl text-slate-500 hover:text-[#009fe3] hover:bg-[#009fe3]/10 border border-transparent hover:border-[#009fe3]/20 transition-all disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009fe3]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60"
                                aria-label={t.downloadWidgetData}
                            >
                                <Download size={18} className={exporting ? 'animate-pulse' : ''} />
                            </button>
                        )}
                        {exportBanner && (
                            <div
                                className={`ml-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                    exportBanner.kind === 'success'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : exportBanner.kind === 'error'
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                                role="status"
                                aria-live="polite"
                            >
                                {exportBanner.text}
                            </div>
                        )}
                        <InfoTooltip
                            title={t.configuration}
                            content={`${mqttTopicVariableTooltip(t, widget)}\n${dbHint}`}
                        />
                    </div>
                </div>
            </div>
            <div
                className={`w-full transition-opacity duration-300 ${!chartData.length ? 'opacity-40' : 'opacity-100'}`}
                style={{ height: isLarge ? 320 : 240 }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                        <defs>
                            <linearGradient id={`gradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={activeColor} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={activeColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical stroke="#e2e8f0" strokeOpacity={0.6} />
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={xDomain}
                            allowDataOverflow
                            tickCount={hours <= 2 ? 6 : 5}
                            minTickGap={24}
                            tickFormatter={(ts) => {
                                const date = new Date(ts);
                                if (hours <= 1) return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                                if (hours <= 6) return date.toLocaleString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
                                return date.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            }}
                            stroke="#64748b"
                            fontSize={10}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={{ stroke: '#cbd5e1' }}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={10}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={{ stroke: '#cbd5e1' }}
                            domain={yDomain}
                            width={44}
                            tickFormatter={(v) => (typeof v === 'number' ? v.toFixed(v >= 100 || Math.abs(v) < 0.01 ? 0 : 1) : String(v))}
                        />
                        <Tooltip
                            content={<IndustrialTooltip unit={config?.unit} widgetName={widget.name} locale={locale} />}
                            cursor={{ stroke: activeColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        {config?.thresholdWarning !== undefined && (
                            <ReferenceLine y={config.thresholdWarning} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                        )}
                        {config?.thresholdCritical !== undefined && (
                            <ReferenceLine y={config.thresholdCritical} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
                        )}
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={activeColor}
                            strokeWidth={2}
                            fillOpacity={1}
                            connectNulls
                            fill={`url(#gradient-${widget.id})`}
                            isAnimationActive={false}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 0, fill: activeColor }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            {!chartData.length && (
                <p className="text-center text-xs text-slate-400 font-medium mt-2">{t.awaitingData}</p>
            )}
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
                    <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-tighter uppercase">{t.live} {t.plcliveFeed}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${color.bg} ${color.text} shadow-sm border ${color.border}/50`}>
                        {t.live.toUpperCase()}
                    </div>
                    <InfoTooltip
                        title={t.configuration}
                        content={mqttTopicVariableTooltip(t, widget)}
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

    let activeColor = color.primary;
    if (config?.zones && config.zones.length > 0) {
        const sortedZones = [...config.zones].sort((a, b) => a.value - b.value);
        for (const zone of sortedZones) {
            if (value >= zone.value) {
                activeColor = zone.color;
            }
        }
    }

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center group text-center">
            <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={mqttTopicVariableTooltip(t, widget)}
                />
            </div>
            <p className="text-[10px] text-slate-500 font-bold font-mono mb-4 uppercase tracking-tighter opacity-100">
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
                        fill="none" stroke={activeColor} strokeWidth="16" strokeLinecap="round"
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
                    <span className="text-sm text-slate-500 ml-1 font-bold">{config?.unit || ''}</span>
                </div>
            </div>
            
            <div className="flex justify-between w-full mt-4 px-2">
                <span className="text-[10px] text-slate-500 font-black">{min}</span>
                <span className="text-[10px] text-slate-500 font-black">{max}</span>
            </div>
        </div>
    );
};

// ── LED Indicator Widget ──
const LEDIndicatorWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const config = (widget.config || {}) as any;
    const t = TRANSLATIONS[language];
    
    let status = false;
    if (currentValue !== undefined && currentValue !== null) {
        if (config.onPayload !== undefined && config.onPayload !== '') {
            try {
                if (currentValue === JSON.parse(config.onPayload)) status = true;
            } catch (e) {
                if (String(currentValue) === String(config.onPayload)) status = true;
            }
        } else {
            // Default parsing
            const s = String(currentValue).toLowerCase();
            status = s === 'true' || s === '1' || s === 'on' || s === 'running' || s === 'active';
        }
    }

    const activeColorStr = config.activeColor || 'emerald';
    let bgColorClass = 'bg-emerald-500 shadow-emerald-400/50';
    let pingColorClass = 'bg-emerald-400';
    let textColorClass = 'text-emerald-600';
    
    if (activeColorStr === 'red') {
        bgColorClass = 'bg-red-500 shadow-red-400/50';
        pingColorClass = 'bg-red-400';
        textColorClass = 'text-red-600';
    } else if (activeColorStr === 'blue') {
        bgColorClass = 'bg-blue-500 shadow-blue-400/50';
        pingColorClass = 'bg-blue-400';
        textColorClass = 'text-blue-600';
    } else if (activeColorStr === 'amber') {
        bgColorClass = 'bg-amber-500 shadow-amber-400/50';
        pingColorClass = 'bg-amber-400';
        textColorClass = 'text-amber-600';
    }

    const activeLabel = config.activeLabel || t.active;
    const inactiveLabel = config.inactiveLabel || t.inactive;

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center text-center group">
            <div className="flex items-center gap-2 mb-6">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={mqttTopicVariableTooltip(t, widget)}
                />
            </div>
            <div className={`w-20 h-20 rounded-full shadow-2xl relative transition-all duration-700 ${status ? `${bgColorClass} scale-110` : 'bg-slate-200 shadow-inner scale-100'}`}>
                {status && (
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${pingColorClass}`} />
                )}
                <div className="absolute top-3 left-5 w-5 h-2.5 bg-white/30 rounded-full blur-[1.5px]" />
            </div>
            <p className={`mt-6 text-xs font-black tracking-[0.2em] transition-colors duration-500 ${status ? textColorClass : 'text-slate-500'}`}>
                {status ? activeLabel.toUpperCase() : inactiveLabel.toUpperCase()}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{widget.dataLabel || widget.variableName}</p>
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

    let activeColor = color.primary;
    if (config?.zones && config.zones.length > 0) {
        const sortedZones = [...config.zones].sort((a, b) => a.value - b.value);
        for (const zone of sortedZones) {
            if (value >= zone.value) {
                activeColor = zone.color;
            }
        }
    }

    useEffect(() => {
        if (barRef.current) {
            barRef.current.style.width = `${pct}%`;
            barRef.current.style.backgroundColor = activeColor;
        }
    }, [pct, activeColor]);

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col justify-center group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                        <InfoTooltip
                            title={t.configuration}
                            content={mqttTopicVariableTooltip(t, widget)}
                        />
                    </div>
                    <p className="text-[10px] text-slate-600 font-bold font-mono mt-1 opacity-100 tracking-tight">{widget.dataLabel || widget.variableName}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                    <span className="text-2xl font-black text-slate-900">{value}</span>
                    <span className="text-xs text-slate-500 ml-1 font-bold">{config?.unit}</span>
                    <p className="text-[10px] text-slate-500 font-bold">{Math.round(pct)}%</p>
                </div>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                    ref={barRef}
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ backgroundColor: activeColor }}
                />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-500">
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
                    content={mqttTopicVariableTooltip(t, widget)}
                />
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[11px] custom-scrollbar pr-2">
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-4 p-2 rounded-xl hover:bg-white/5 transition-colors group/item">
                        <span className="text-slate-400 font-bold shrink-0 opacity-100">[{log.time}]</span>
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
    const currentState = states.find(s => s.value === value) || states[0];

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center text-center group">
            <div className="flex items-center gap-2 mb-6">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={mqttTopicVariableTooltip(t, widget)}
                />
            </div>
            <div
                style={{ backgroundColor: currentState.color }}
                className="px-8 py-4 rounded-[1.5rem] font-black text-white shadow-2xl transition-all duration-500 text-lg tracking-[0.2em] transform group-hover:scale-105"
            >
                {currentState.label.toUpperCase()}
            </div>
            <p className="mt-6 text-[10px] text-slate-500 font-black tracking-widest opacity-100 uppercase">
                {t.value}: <span className="text-slate-700">{value}</span>
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

    let activeColor = color.primary;
    if (config?.zones && config.zones.length > 0) {
        const sortedZones = [...config.zones].sort((a, b) => a.value - b.value);
        for (const zone of sortedZones) {
            if (value >= zone.value) {
                activeColor = zone.color;
            }
        }
    }

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center text-center group">
            <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                <InfoTooltip
                    title={t.configuration}
                    content={mqttTopicVariableTooltip(t, widget)}
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
                        fill="none" stroke={activeColor} strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-900 leading-tight">{value}</span>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{config?.unit}</span>
                </div>
            </div>
            <p className="text-[10px] text-slate-500 font-black font-mono mt-4 uppercase tracking-tighter opacity-100">
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
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-5 blur-3xl group-hover:opacity-10 transition-all" style={{ backgroundColor: color.primary }} />
            <div className="relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity size={16} className={color.text} />
                        <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
                    </div>
                    <InfoTooltip
                        title={t.configuration}
                        content={mqttTopicVariableTooltip(t, widget)}
                    />
                </div>
                <div className="mt-8 flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{currentValue ?? '---'}</h3>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{widget.dataLabel || t.units}</span>
                </div>
                <p className="text-[10px] font-black font-mono text-slate-500 mt-4 uppercase tracking-tighter opacity-100">
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
                    content={mqttTopicVariableTooltip(t, widget)}
                />
            </div>
            <div className="relative mb-6 transform transition-transform duration-700 group-hover:scale-110">
                <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl relative z-10" style={{ backgroundColor: color.primary }}>
                    <Zap size={32} className="text-white" />
                </div>
                <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${status === 'ONLINE' || status === 'RUNNING' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'bg-slate-400'} border-4 border-white z-20 transition-opacity duration-500 ${blinking ? 'opacity-100' : 'opacity-40'}`} />
            </div>
            <p className={`text-xl font-black tracking-widest transition-colors duration-500 ${status === 'ONLINE' || status === 'RUNNING' ? 'text-emerald-600' : 'text-slate-500'}`}>
                {status}
            </p>
            <p className="text-[10px] text-slate-500 font-black font-mono mt-2 uppercase tracking-tighter opacity-100">
                {widget.dataLabel || widget.variableName}
            </p>
        </div>
    );
};

// ══════════════════════════════════════════════════════════
//  CONTROLLING WIDGETS
// ══════════════════════════════════════════════════════════

// ── Button Widget ──
// Universal helper to get the publish topic and variable
const getPublishTopic = (widget: Widget) => widget.mqttTopic;
const getPublishVar = (widget: Widget) => widget.variableName;

const ButtonWidget: React.FC<{ widget: Widget; colorIndex: number; isPreview?: boolean; currentValue?: any; language: Language }> = ({ widget, colorIndex, isPreview, currentValue, language }) => {
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);

    const handlePress = () => {
        if (isPreview) return;
        const config = widget.config as any;
        let payload = config?.payload || 'PRESS';
        try { payload = JSON.parse(payload); } catch (e) { }
        mqttService.publishVariableUpdate(pubTopic, pubVar, payload);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col justify-between group">
            <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className={color.text} />
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
            </div>
            
            <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between mb-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Actual State</span>
                <span className="text-xs font-black text-[#002060]">{currentValue !== undefined ? String(currentValue) : '--'}</span>
            </div>

            <button
                onClick={handlePress}
                className="w-full py-4 px-6 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg active:scale-95 active:shadow-inner text-white" style={{ backgroundColor: color.primary }}
            >
                {(widget.config as any).buttonText || 'ACTIVATE'}
            </button>
        </div>
    );
};

const ToggleWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);
    const activeLabel = (widget.config as any)?.activeLabel || t.on;
    const inactiveLabel = (widget.config as any)?.inactiveLabel || t.off;

    const parseValue = (val: any): boolean => {
        if (val === undefined || val === null) return false;
        const config = widget.config as any;
        if (config?.onPayload !== undefined && config?.offPayload !== undefined && config.onPayload !== '' && config.offPayload !== '') {
            try {
                if (val === JSON.parse(config.onPayload)) return true;
                if (val === JSON.parse(config.offPayload)) return false;
            } catch (e) {
                if (String(val) === String(config.onPayload)) return true;
                if (String(val) === String(config.offPayload)) return false;
            }
        }
        const s = String(val).toLowerCase();
        return s === 'true' || s === '1' || s === 'on' || s === 'active' || s === 'running';
    };

    const actualIsOn = parseValue(currentValue);
    const [draftIsOn, setDraftIsOn] = useState(actualIsOn);

    useEffect(() => {
        setDraftIsOn(actualIsOn);
    }, [actualIsOn]);

    const handleSubmit = () => {
        let targetPayload: any = draftIsOn;
        const config = widget.config as any;
        if (config?.onPayload !== undefined && config?.offPayload !== undefined && config.onPayload !== '' && config.offPayload !== '') {
            const raw = draftIsOn ? config.onPayload : config.offPayload;
            try { targetPayload = JSON.parse(raw); } catch (e) { targetPayload = raw; }
        }
        mqttService.publishVariableUpdate(pubTopic, pubVar, targetPayload, widget.qos || 0, widget.retain || false);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ToggleLeft size={16} className={color.text} />
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                </div>
                <div className={"px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white " + (actualIsOn ? '' : 'bg-slate-300')} style={actualIsOn ? { backgroundColor: color.primary } : {}}>
                    STATE: {actualIsOn ? activeLabel.toUpperCase() : inactiveLabel.toUpperCase()}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-4 mt-2">
                <button
                    onClick={() => setDraftIsOn(!draftIsOn)}
                    className="relative focus:outline-none transform transition-transform hover:scale-105 active:scale-95"
                >
                    {draftIsOn ? (
                        <ToggleRight size={56} className={color.text + " drop-shadow-md"} />
                    ) : (
                        <ToggleLeft size={56} className="text-slate-200" />
                    )}
                </button>
                <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors">
                    <Send size={12} /> Send Command
                </button>
            </div>
        </div>
    );
};

const SliderWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState<number>(0);
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);

    useEffect(() => {
        if (currentValue !== undefined && !isNaN(Number(currentValue))) {
            setDraftVal(Number(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    const config = widget.config as any;
    const min = config?.min ?? 0;
    const max = config?.max ?? 100;

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className={color.text} />
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                </div>
                <div className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white" style={{ backgroundColor: color.primary }}>
                    STATE: {currentValue !== undefined ? Number(currentValue).toFixed(1) : '--'}
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-4">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={config?.step || 1}
                    value={draftVal}
                    onChange={(e) => setDraftVal(Number(e.target.value))}
                    className="w-full accent-slate-900 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-bold text-slate-500">{draftVal}</span>
                    <button onClick={handleSubmit} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800">
                        <Send size={12} /> Send
                    </button>
                </div>
            </div>
        </div>
    );
};

const TextInputWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState('');
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);

    useEffect(() => {
        if (currentValue !== undefined) {
            setDraftVal(String(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Type size={16} className={color.text} />
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                </div>
                <div className="text-[10px] text-slate-400 font-bold max-w-[100px] truncate" title={String(currentValue)}>
                    STATE: {currentValue !== undefined ? String(currentValue) : '--'}
                </div>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={draftVal}
                    onChange={(e) => setDraftVal(e.target.value)}
                    className="flex-1 w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-slate-500 outline-none font-medium"
                    placeholder="Enter text..."
                />
                <button onClick={handleSubmit} className="px-4 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: color.primary }}>
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
};

const NumberInputWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState<number>(0);
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);

    useEffect(() => {
        if (currentValue !== undefined && !isNaN(Number(currentValue))) {
            setDraftVal(Number(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center gap-2 mb-4">
                <Hash size={16} className={color.text} />
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
            </div>

            <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex items-center justify-between mb-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Actual</span>
                <span className="text-sm font-black text-[#002060]">{currentValue !== undefined ? Number(currentValue) : '--'}</span>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={() => setDraftVal(draftVal - 1)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl font-bold hover:bg-slate-200">-</button>
                <input
                    type="number"
                    value={draftVal}
                    onChange={(e) => setDraftVal(Number(e.target.value))}
                    className="flex-1 w-full px-2 py-2 text-center text-lg font-black rounded-xl border border-slate-200 outline-none"
                />
                <button onClick={() => setDraftVal(draftVal + 1)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl font-bold hover:bg-slate-200">+</button>
            </div>
            <button onClick={handleSubmit} className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800">
                <Send size={12} /> Send Update
            </button>
        </div>
    );
};

const ColorPickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {
    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 h-full flex flex-col items-center justify-center text-slate-500">
            <Info size={32} className="mb-2 opacity-30" />
            <span className="text-xs font-bold uppercase tracking-widest">Color Picker (Pending Split UI)</span>
        </div>
    );
};

const TimePickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {
    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 h-full flex flex-col items-center justify-center text-slate-500">
            <Clock size={32} className="mb-2 opacity-30" />
            <span className="text-xs font-bold uppercase tracking-widest">Time Picker (Pending Split UI)</span>
        </div>
    );
};

const ComboBoxWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState<string>('');
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);
    const config = widget.config as ComboBoxConfig;

    useEffect(() => {
        if (currentValue !== undefined) {
            setDraftVal(String(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                <div className="text-[10px] text-slate-400 font-bold max-w-[100px] truncate" title={String(currentValue)}>
                    STATE: {currentValue !== undefined ? String(currentValue) : '--'}
                </div>
            </div>

            <div className="flex gap-2">
                <select
                    value={draftVal}
                    onChange={(e) => setDraftVal(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none"
                >
                    {config?.options?.map((opt, i) => (
                        <option key={i} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <button onClick={handleSubmit} className="px-4 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: color.primary }}>
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
};

const RadioButtonsWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState<string>('');
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);
    const config = widget.config as RadioButtonsConfig;

    useEffect(() => {
        if (currentValue !== undefined) {
            setDraftVal(String(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                <div className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white" style={{ backgroundColor: color.primary }}>
                    STATE: {currentValue !== undefined ? String(currentValue) : '--'}
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2 mb-4">
                {config?.options?.map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name={"radio_" + widget.id}
                            value={opt.value}
                            checked={draftVal === String(opt.value)}
                            onChange={(e) => setDraftVal(e.target.value)}
                            className="accent-slate-900"
                        />
                        <span className="text-sm font-bold text-slate-600">{opt.label}</span>
                    </label>
                ))}
            </div>
            
            <button onClick={handleSubmit} className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800">
                <Send size={12} /> Send Command
            </button>
        </div>
    );
};

export interface WidgetRendererProps {
    widget: Widget;
    language?: Language;
    colorIndex?: number;
    isPreview?: boolean;
    currentData?: any;
    historyData?: any[];
    timeRange?: string;
    onRangeChange?: (range: string) => void;
    isOffline?: boolean;
}
export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
    widget,
    language = 'fr',
    colorIndex = 0,
    isPreview = false,
    currentData,
    historyData,
    timeRange,
    onRangeChange,
    isOffline = false
}) => {
    const displayValue = isPreview ? (ReadingWidgetType.GAUGE ? 67 : 24.5) : currentData;
    const displayHistory = isPreview ? generateDemoTimeSeries() : (historyData || []);

    const renderWidget = () => {
        const t = TRANSLATIONS[language];
        switch (widget.widgetType) {
            // Reading widgets
            case ReadingWidgetType.LINE_CHART:
                return (
                    <LineChartWidget 
                        widget={widget} 
                        colorIndex={colorIndex} 
                        historyData={historyData}
                        timeRange={timeRange}
                        onRangeChange={onRangeChange}
                        language={language}
                        showExportButton={!isPreview}
                    />
                );
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
                return <ComboBoxWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;
            case ControllingWidgetType.RADIO_BUTTONS:
                return <RadioButtonsWidget widget={widget} colorIndex={colorIndex} currentValue={displayValue} language={language} />;

            default:
                return (
                    <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-500">
                        <Info size={32} className="mb-2 opacity-30" />
                        <p className="text-xs font-black uppercase tracking-widest">{t?.unsupportedWidget || 'Unsupported Widget'}</p>
                    </div>
                );
        }
    };

    return (
        <div className={`relative h-full transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${isOffline ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
            {renderWidget()}
        </div>
    );
};

export default WidgetRenderer;








