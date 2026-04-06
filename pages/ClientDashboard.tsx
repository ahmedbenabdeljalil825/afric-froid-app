import React, { useEffect, useState, useRef } from 'react';
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

        const allMapped: Widget[] = (data || []).map(mapDbWidget);
        mqttService.setMonitoredWidgets(allMapped);

        const fetchedWidgets = allMapped.filter((w: Widget) => w.category === WidgetCategory.READING);
        setWidgets(fetchedWidgets);

        // Pre-populate with last known data from cache
        const cachedState = mqttService.getCurrentState();
        let initialLiveData = {};

        Object.keys(cachedState).forEach(topic => {
          const payload = cachedState[topic];
          initialLiveData = { ...initialLiveData, ...payload };
        });

        setLiveData(initialLiveData);

        // Subscribe to all unique topics used by widgets
        const uniqueTopics = new Set<string>();
        fetchedWidgets.forEach(w => uniqueTopics.add(w.mqttTopic));

        // Also add global telemetry if not in widgets
        if (user.mqttConfig?.topics.telemetry) {
          uniqueTopics.add(user.mqttConfig.topics.telemetry);
        }

        uniqueTopics.forEach(topic => {
          const unsub = mqttService.subscribe((data: any) => {
            setLiveData(prev => ({ ...prev, ...data }));
          }, topic);
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          {widgets.map((widget, index) => {
            const val = liveData[widget.variableName];
            const isAlarm = widget.alarmEnabled && val !== undefined && (
              (widget.alarmMin !== undefined && val < widget.alarmMin) ||
              (widget.alarmMax !== undefined && val > widget.alarmMax)
            );

            const range = timeRanges[widget.id] || '1';
            const hours = parseInt(range, 10) || 1;
            const chartSeries =
              widget.widgetType === ReadingWidgetType.LINE_CHART
                ? buildLineChartSeries(
                    historicalFetchData[widget.id],
                    val,
                    hours
                  )
                : undefined;

            return (
              <div key={widget.id} className={widgetSpanClass(isWideWidget(widget))}>
                <WidgetRenderer
                  widget={widget}
                  language={user.language}
                  colorIndex={index}
                  currentData={val}
                  historyData={
                    widget.widgetType === ReadingWidgetType.LINE_CHART ? chartSeries : undefined
                  }
                  isAlarm={isAlarm}
                  isOffline={mqttStatus !== 'connected'}
                  timeRange={range}
                  onRangeChange={(r) => setTimeRanges((prev) => ({ ...prev, [widget.id]: r }))}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;