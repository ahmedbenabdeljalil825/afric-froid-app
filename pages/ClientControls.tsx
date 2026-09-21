import React, { useState, useEffect, useRef } from 'react';
import { User, Widget, ReadingWidgetType, WidgetCategory } from '../types';
import { mqttService } from '../services/mqttService';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../services/supabase';
import { WidgetRenderer } from '../components/WidgetRenderer';
import { buildLineChartSeries, downsampleSeries } from '../utils/chartSeries';

const MAX_POINTS_PER_CHART = 700;
const isWideWidget = (widget: Widget): boolean => {
  const cfg = (widget.config || {}) as any;
  return cfg?.layoutWidth === 'wide' || cfg?.large === true;
};
const widgetSpanClass = (wide: boolean): string => (wide ? 'md:col-span-2 lg:col-span-4' : 'lg:col-span-2');

function mapDbWidget(w: any): Widget {
  return {
    id: w.id,
    userId: w.user_id,
    name: w.name,
    category: w.category as WidgetCategory,
    widgetType: w.widget_type,
    mqttTopic: w.mqtt_topic,
    mqttAction: w.mqtt_action,
    qos: w.qos,
    retain: w.retain,
    variableName: w.variable_name,
    dataLabel: w.data_label,
    config: w.config,
    position: w.position,
    isActive: w.is_active,
    alarmEnabled: w.alarm_enabled,
    alarmMin: w.alarm_min,
    alarmMax: w.alarm_max,
    historyInterval: w.history_interval ?? 10,
    controllerName: w.config?.controllerName || '',
    systemName: w.config?.systemName || '',
  };
}

interface ClientControlsProps {
  user: User;
}

const ClientControls: React.FC<ClientControlsProps> = ({ user }) => {
  // Dynamic widgets state
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [liveData, setLiveData] = useState<Record<string, any>>({});
  const [historyData, setHistoryData] = useState<Record<string, any[]>>({});
  const [timeRanges, setTimeRanges] = useState<Record<string, string>>({});
  const [loadingWidgets, setLoadingWidgets] = useState(true);
  const [openControllers, setOpenControllers] = useState<Record<string, boolean>>({});
  const [openSystems, setOpenSystems] = useState<Record<string, boolean>>({});
  const t = TRANSLATIONS[user.language];
  const reloadLineChartsRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let activeSubscriptions: (() => void)[] = [];
    let isCancelled = false;

    const fetchAndSubscribe = async () => {
      try {
        // Fetch Control Widgets
        const { data, error } = await supabase
          .from('widgets')
          .select('id, user_id, name, category, widget_type, mqtt_topic, mqtt_action, qos, retain, variable_name, data_label, config, position, is_active, alarm_enabled, alarm_min, alarm_max, history_interval')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('category', ['READING', 'CONTROLLING'])
          .order('position', { ascending: true });

        if (error) throw error;

        const allMapped: Widget[] = (data || []).map(mapDbWidget);
        mqttService.setMonitoredWidgets(allMapped);

        const fetchedWidgets = allMapped.filter((w: Widget) => w.category === WidgetCategory.CONTROLLING);
        setWidgets(fetchedWidgets);

        // Pre-populate with last known data from cache
        const cachedState = mqttService.getCurrentState();
        let initialLiveData: Record<string, any> = {};

        Object.keys(cachedState).forEach(topic => {
          const payload = cachedState[topic];
          initialLiveData[topic] = payload;
        });
        setLiveData(initialLiveData);

        // Collect all unique topics
        const uniqueTopics = new Set<string>();
        fetchedWidgets.forEach((w: Widget) => { uniqueTopics.add(w.mqttTopic); if ((w.config as any)?.readTopic) uniqueTopics.add((w.config as any).readTopic); });

        uniqueTopics.forEach(topic => {
          const unsub = mqttService.subscribe((data: any) => {
            setLiveData(prev => ({ ...prev, [topic]: { ...(prev[topic] || {}), ...data } }));
          }, topic);
          activeSubscriptions.push(unsub);
        });

      } catch (err) {
        console.error('Error fetching controls:', err);
      } finally {
        setLoadingWidgets(false);
      }
    };

    fetchAndSubscribe();

    return () => {
      isCancelled = true;
      activeSubscriptions.forEach(unsub => unsub());
    };
  }, [user.id, user.mqttConfig?.topics.telemetry]);

  // --- Persistence & History Logic ---

  // Helper to fetch history from Supabase
  const fetchWidgetHistory = async (widget: Widget, rangeHours: number) => {
    try {
      const startTime = new Date(Date.now() - rangeHours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('telemetry_readings')
        .select('value, created_at')
        .eq('widget_id', widget.id)
        .eq('variable_name', widget.variableName)
        .gte('created_at', startTime)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const pts = (data || []).map((row: any) => ({
        timestamp: new Date(row.created_at).getTime(),
        value: row.value,
      }));
      return downsampleSeries(pts, MAX_POINTS_PER_CHART);
    } catch (err) {
      console.error(`Error fetching history for ${widget.name}:`, err);
      return [];
    }
  };

  const handleRangeChange = (widgetId: string, range: string) => {
    setTimeRanges((prev) => ({ ...prev, [widgetId]: range }));
  };

  useEffect(() => {
    if (widgets.length === 0) {
      reloadLineChartsRef.current = null;
      return;
    }
    let cancelled = false;

    const load = async () => {
      for (const w of widgets) {
        if (w.widgetType !== ReadingWidgetType.LINE_CHART) continue;
        const range = timeRanges[w.id] || '1';
        const hours = parseInt(range, 10) || 1;
        const history = await fetchWidgetHistory(w, hours);
        if (!cancelled) {
          setHistoryData((prev) => ({ ...prev, [w.id]: history as any[] }));
        }
      }
    };

    reloadLineChartsRef.current = load;
    load();
    const id = setInterval(load, 45_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [widgets, timeRanges]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefetch = () => {
      if (document.visibilityState !== 'visible') return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        void reloadLineChartsRef.current?.();
      }, 350);
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) scheduleRefetch();
    };

    document.addEventListener('visibilitychange', scheduleRefetch);
    window.addEventListener('focus', scheduleRefetch);
    window.addEventListener('pageshow', onPageShow as EventListener);

    return () => {
      if (debounce) clearTimeout(debounce);
      document.removeEventListener('visibilitychange', scheduleRefetch);
      window.removeEventListener('focus', scheduleRefetch);
      window.removeEventListener('pageshow', onPageShow as EventListener);
    };
  }, []);

  if (loadingWidgets) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-12 h-12 border-4 border-[#009fe3]/30 border-t-[#009fe3] rounded-full animate-spin"></div>
        <p className="font-medium animate-pulse">Loading Control Interface...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-slate-200/60 pb-6">
        <h2 className="text-3xl font-black text-[#002060] tracking-tight mb-2">{t.controls}</h2>
        <p className="text-slate-500 font-medium">Remote operation & Configuration</p>
      </div>

      {/* Dynamic Widgets Rendered Here */}
      {widgets.length > 0 && (() => {
        const renderWidgetGrid = (widgetList: Widget[], globalOffset: number) => (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr mb-12">
            {widgetList.map((widget, index) => {
              const rTopic = (widget.config as any)?.readTopic || widget.mqttTopic;
              const rVar = (widget.config as any)?.readVariableName || widget.variableName;
              const val = liveData[rTopic] && liveData[rTopic][rVar] !== undefined ? liveData[rTopic][rVar] : undefined;
              const range = timeRanges[widget.id] || '1';
              const history = historyData[widget.id] || [];
              const hours = parseInt(range, 10) || 1;
              const lineSeries = widget.widgetType === ReadingWidgetType.LINE_CHART
                ? buildLineChartSeries(history, val, hours)
                : undefined;
              return (
                <div key={widget.id} className={widgetSpanClass(isWideWidget(widget))}>
                  <WidgetRenderer
                    widget={widget}
                    language={user.language}
                    colorIndex={globalOffset + index}
                    currentData={val}
                    historyData={widget.widgetType === ReadingWidgetType.LINE_CHART ? lineSeries : undefined}
                    timeRange={range}
                    onRangeChange={(r: string) => handleRangeChange(widget.id, r)}
                    isPreview={false}
                  />
                </div>
              );
            })}
          </div>
        );

        const hasGrouping = widgets.some(w => w.controllerName || w.systemName);
        if (!hasGrouping) return renderWidgetGrid(widgets, 0);

        const grouped: Record<string, Record<string, Widget[]>> = {};
        widgets.forEach(w => {
          const ctrl = w.controllerName || 'General';
          const sys = w.systemName || 'General';
          if (!grouped[ctrl]) grouped[ctrl] = {};
          if (!grouped[ctrl][sys]) grouped[ctrl][sys] = [];
          grouped[ctrl][sys].push(w);
        });

        const controllerNames = Object.keys(grouped);

        let globalColorOffset = 0;
        return (
          <div className="space-y-4 mb-12">
            {controllerNames.map(ctrl => {
              const isCtrlOpen = openControllers[ctrl] === true || (openControllers[ctrl] === undefined && ctrl === controllerNames[0]);
              const systemNames = Object.keys(grouped[ctrl]);
              return (
                <div key={ctrl} className="rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors"
                    onClick={() => setOpenControllers(prev => ({ ...prev, [ctrl]: !prev[ctrl] }))}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#009fe3]" />
                      <span className="font-black text-[#002060] text-base tracking-tight">{ctrl}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
                        {systemNames.length} {systemNames.length === 1 ? 'system' : 'systems'}
                      </span>
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCtrlOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isCtrlOpen && (
                    <div className="px-6 pb-6 space-y-5 border-t border-slate-100">
                      {systemNames.map(sys => {
                        const sysKey = `${ctrl}::${sys}`;
                        const isSysOpen = openSystems[sysKey] === true || (openSystems[sysKey] === undefined && sys === systemNames[0] && ctrl === controllerNames[0]);
                        const sysWidgets = grouped[ctrl][sys];
                        const offset = globalColorOffset;
                        globalColorOffset += sysWidgets.length;
                        return (
                          <div key={sys} className="pt-4">
                            <button
                              className="flex items-center gap-2 mb-3 group w-full text-left"
                              onClick={() => setOpenSystems(prev => ({ ...prev, [sysKey]: !prev[sysKey] }))}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span className="text-sm font-bold text-slate-700 group-hover:text-[#002060] transition-colors">{sys}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({sysWidgets.length} {sysWidgets.length === 1 ? 'widget' : 'widgets'})
                              </span>
                              <svg className={`w-3 h-3 text-slate-300 ml-auto transition-transform duration-200 ${isSysOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isSysOpen && renderWidgetGrid(sysWidgets, offset)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};

export default ClientControls;






