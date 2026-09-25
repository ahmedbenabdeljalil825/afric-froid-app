import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Widget, ReadingWidgetType, WidgetCategory } from '../types';
import { mqttService } from '../services/mqttService';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../services/supabase';
import { WidgetRenderer } from '../components/WidgetRenderer';
import { buildLineChartSeries, downsampleSeries } from '../utils/chartSeries';

const CHART_HISTORY_REFRESH_MS = 45_000;
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

interface ClientDashboardProps {
  user: User;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ user }) => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [liveData, setLiveData] = useState<Record<string, any>>({});
  const [historicalFetchData, setHistoricalFetchData] = useState<Record<string, any[]>>({});
  const [timeRanges, setTimeRanges] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mqttStatus, setMqttStatus] = useState(mqttService.status);
  const [openControllers, setOpenControllers] = useState<Record<string, boolean>>({});
  const [openSystems, setOpenSystems] = useState<Record<string, boolean>>({});
  const t = TRANSLATIONS[user.language];
  const refetchChartHistoryRef = useRef<(() => Promise<void>) | null>(null);

  // Subscribe to real-time MQTT connection status
  useEffect(() => {
    const unsub = mqttService.onStatusChange(setMqttStatus);
    return () => unsub();
  }, []);

  // Line charts: load telemetry from DB per widget_id (correct when the same variable exists on multiple charts)
  useEffect(() => {
    const lineWidgets = widgets.filter((w) => w.widgetType === ReadingWidgetType.LINE_CHART);
    const lineIds = lineWidgets.map((w) => w.id);

    const fetchHistory = async () => {
      if (lineIds.length === 0) {
        setHistoricalFetchData({});
        return;
      }
      try {
        const byHours = new Map<number, string[]>();
        for (const w of lineWidgets) {
          const range = timeRanges[w.id] || '1';
          const hours = parseInt(range, 10) || 1;
          const prev = byHours.get(hours) || [];
          prev.push(w.id);
          byHours.set(hours, prev);
        }

        const processed: Record<string, { timestamp: number; value: number }[]> = {};
        lineIds.forEach((id) => (processed[id] = []));

        for (const [hours, ids] of byHours.entries()) {
          const startTime = new Date(Date.now() - hours * 3600 * 1000).toISOString();
          const { data, error } = await supabase
            .from('telemetry_readings')
            .select('widget_id, value, created_at')
            .in('widget_id', ids)
            .gte('created_at', startTime)
            .order('created_at', { ascending: true });

          if (error) throw error;

          data?.forEach((row: any) => {
            const wid = row.widget_id;
            if (!processed[wid]) processed[wid] = [];
            processed[wid].push({
              timestamp: new Date(row.created_at).getTime(),
              value: row.value,
            });
          });
        }

        for (const id of lineIds) {
          processed[id] = downsampleSeries(processed[id], MAX_POINTS_PER_CHART);
        }

        setHistoricalFetchData(processed);
      } catch (err) {
        console.error('Error fetching historical data:', err);
      }
    };

    refetchChartHistoryRef.current = fetchHistory;
    fetchHistory();
    const intervalId = setInterval(fetchHistory, CHART_HISTORY_REFRESH_MS);
    return () => clearInterval(intervalId);
  }, [widgets, timeRanges]);

  // After the tab was closed or in the background, pull the full window from Supabase again
  // so any rows written while away (other session, gateway, etc.) appear on the chart.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefetch = () => {
      if (document.visibilityState !== 'visible') return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        void refetchChartHistoryRef.current?.();
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

  useEffect(() => {
    let activeSubscriptions: (() => void)[] = [];
    let isCancelled = false;

    const fetchAndSubscribe = async () => {
      try {
        const { data, error } = await supabase
          .from('widgets')
          .select('id, user_id, name, category, widget_type, mqtt_topic, mqtt_action, qos, retain, variable_name, data_label, config, position, is_active, alarm_enabled, alarm_min, alarm_max, history_interval')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('category', ['READING', 'CONTROLLING'])
          .order('position', { ascending: true });

        if (error) throw error;
        if (isCancelled) return;

        const allMapped: Widget[] = (data || []).map(mapDbWidget);
        mqttService.setMonitoredWidgets(allMapped);

        const fetchedWidgets = allMapped.filter((w: Widget) => w.category === WidgetCategory.READING);
        setWidgets(fetchedWidgets);

        // Pre-populate with last known data from cache
        const cachedState = mqttService.getCurrentState();
        let initialLiveData: Record<string, any> = {};

        Object.keys(cachedState).forEach(topic => {
          const payload = cachedState[topic];
          initialLiveData[topic] = payload;
        });

        setLiveData(initialLiveData);

        // Subscribe to all unique topics and resolve maximum QoS for each
        const uniqueTopicsMap = new Map<string, number>();
        
        const addTopic = (topic: string, qos: number) => {
            if (!uniqueTopicsMap.has(topic) || uniqueTopicsMap.get(topic)! < qos) {
                uniqueTopicsMap.set(topic, qos);
            }
        };

        fetchedWidgets.forEach(w => {
            if (w.mqttTopic) addTopic(w.mqttTopic, w.qos || 0);
            if ((w.config as any)?.readTopic) {
                addTopic((w.config as any).readTopic, (w.config as any)?.readQos || 0);
            }
        });

        if (isCancelled) return;
        uniqueTopicsMap.forEach((qos, topic) => {
          const unsub = mqttService.subscribe((data: any) => {
            setLiveData(prev => ({ ...prev, [topic]: { ...(prev[topic] || {}), ...data } }));
          }, topic, qos as 0|1|2);
          activeSubscriptions.push(unsub);
        });

      } catch (err) {
        console.error('Error in fetchAndSubscribe:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndSubscribe();

    return () => {
      isCancelled = true;
      activeSubscriptions.forEach(unsub => unsub());
    };
  }, [user.id, user.mqttConfig?.topics.telemetry]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-12 h-12 border-4 border-[#009fe3]/30 border-t-[#009fe3] rounded-full animate-spin shadow-[0_0_15px_rgba(0,159,227,0.2)]"></div>
        <p className="font-medium animate-pulse tracking-wide text-slate-500">{t.dashboardLoading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/40 pb-6">
        <div>
          <h2 className="text-4xl font-black text-[#002060] tracking-tight mb-2 drop-shadow-sm">{t.dashboard}</h2>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <span className="opacity-70">{t.monitoringUnit}:</span>
            <span className="text-[#009fe3] font-bold px-3 py-0.5 bg-[#009fe3]/5 rounded-lg border border-[#009fe3]/10">{user.name}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/40 shadow-xl shadow-slate-200/40 transition-all hover:shadow-2xl hover:bg-white/80">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              mqttStatus === 'connected' ? 'bg-emerald-400' :
              mqttStatus === 'connecting' ? 'bg-amber-400' :
              mqttStatus === 'error' ? 'bg-red-400' : 'bg-slate-300'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              mqttStatus === 'connected' ? 'bg-emerald-500' :
              mqttStatus === 'connecting' ? 'bg-amber-500' :
              mqttStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
            }`}></span>
          </div>
          <span className="text-sm font-black text-slate-700 tracking-wide">
            {mqttStatus === 'connected' ? t.brokerOnline.toUpperCase() :
             mqttStatus === 'connecting' ? t.brokerConnecting.toUpperCase() :
             mqttStatus === 'error' ? t.brokerError.toUpperCase() : t.brokerOffline.toUpperCase()}
          </span>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t.plcliveFeed}</span>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-16 text-center border border-white/60 shadow-inner">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-slate-400 font-bold text-lg">{t.noWidgets}</p>
        </div>
      ) : (() => {
        // Helper to render a flat widget grid (reused below)
        const renderWidgetGrid = (widgetList: Widget[], globalOffset: number) => (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
            {widgetList.map((widget, index) => {
              const readVarName = (widget.config as any)?.readVariableName || widget.variableName;
              const readTopic = (widget.config as any)?.readTopic || widget.mqttTopic;
              const val = liveData[readTopic] && liveData[readTopic][readVarName] !== undefined ? liveData[readTopic][readVarName] : undefined;
              const range = timeRanges[widget.id] || '1';
              const hours = parseInt(range, 10) || 1;
              const chartSeries = widget.widgetType === ReadingWidgetType.LINE_CHART
                ? buildLineChartSeries(historicalFetchData[widget.id], val, hours)
                : undefined;
              return (
                <div 
                  key={widget.id} 
                  className={`${widgetSpanClass(isWideWidget(widget))} animate-in fade-in slide-in-from-bottom-2`}
                  style={{ animationDelay: `${(index % 8) * 60}ms` }}
                >
                  <WidgetRenderer
                    widget={widget}
                    language={user.language}
                    colorIndex={globalOffset + index}
                    currentData={val}
                    historyData={widget.widgetType === ReadingWidgetType.LINE_CHART ? chartSeries : undefined}
                    isOffline={mqttStatus !== 'connected'}
                    isClient={true}
                    timeRange={range}
                    onRangeChange={(r) => setTimeRanges((prev) => ({ ...prev, [widget.id]: r }))}
                  />
                </div>
              );
            })}
          </div>
        );

        // If no widget has grouping tags → render flat grid as before (backward compat)
        const hasGrouping = widgets.some(w => w.controllerName || w.systemName);
        if (!hasGrouping) return renderWidgetGrid(widgets, 0);

        // Build Controller → System → Widget[] map
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
          <div className="space-y-4">
            {controllerNames.map(ctrl => {
              const isCtrlOpen = openControllers[ctrl] === true || (openControllers[ctrl] === undefined && ctrl === controllerNames[0]);
              const systemNames = Object.keys(grouped[ctrl]);
              return (
                <div key={ctrl} className="rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden transition-all duration-300">
                  {/* Controller Header */}
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

                  {/* Controller Body */}
                  <AnimatePresence initial={false}>
                    {isCtrlOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 space-y-5 border-t border-slate-100">
                          {systemNames.map(sys => {
                            const sysKey = `${ctrl}::${sys}`;
                            const isSysOpen = openSystems[sysKey] === true || (openSystems[sysKey] === undefined && sys === systemNames[0] && ctrl === controllerNames[0]);
                            const sysWidgets = grouped[ctrl][sys];
                            const offset = globalColorOffset;
                            globalColorOffset += sysWidgets.length;
                            return (
                              <div key={sys} className="pt-4">
                                {/* System Sub-header */}
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
                                <AnimatePresence initial={false}>
                                  {isSysOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                                      className="overflow-hidden"
                                    >
                                      {renderWidgetGrid(sysWidgets, offset)}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};

export default ClientDashboard;






