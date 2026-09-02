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
  const t = TRANSLATIONS[user.language];
  const reloadLineChartsRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let activeSubscriptions: (() => void)[] = [];

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
        let initialLiveData = {};

        Object.keys(cachedState).forEach(topic => {
          const payload = cachedState[topic];
          initialLiveData = { ...initialLiveData, ...payload };
        });
        setLiveData(initialLiveData);

        // Collect all unique topics
        const uniqueTopics = new Set<string>();
        fetchedWidgets.forEach((w: Widget) => uniqueTopics.add(w.mqttTopic));

        uniqueTopics.forEach(topic => {
          const unsub = mqttService.subscribe((data: any) => {
            setLiveData(prev => ({ ...prev, ...data }));
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
          setHistoryData((prev) => ({ ...prev, [w.id]: history }));
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
      {widgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr mb-12">
          {widgets.map((widget, index) => {
             const val = liveData[widget.variableName] !== undefined ? liveData[widget.variableName] : undefined;
             const isLarge = isWideWidget(widget);
             
             // Merge history and live data for charts
             const range = timeRanges[widget.id] || '1';
             const history = historyData[widget.id] || [];
             const hours = parseInt(range, 10) || 1;
             const lineSeries =
               widget.widgetType === ReadingWidgetType.LINE_CHART
                 ? buildLineChartSeries(history, val, hours)
                 : undefined;

             return (
               <div key={widget.id} className={widgetSpanClass(isLarge)}>
                 <WidgetRenderer
                   widget={widget}
                   language={user.language}
                   colorIndex={index}
                   currentData={val}
                   historyData={
                     widget.widgetType === ReadingWidgetType.LINE_CHART ? lineSeries : undefined
                   }
                   timeRange={range}
                   onRangeChange={(r: string) => handleRangeChange(widget.id, r)}
                   isPreview={false}
                 />
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientControls;