import React, { useEffect, useState } from 'react';
import { User, Widget, ReadingWidgetType } from '../types';
import { mqttService } from '../services/mqttService';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../services/supabase';
import { WidgetRenderer } from '../components/WidgetRenderer';

interface ClientDashboardProps {
  user: User;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ user }) => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [liveData, setLiveData] = useState<Record<string, any>>({});
  const [historyData, setHistoryData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const t = TRANSLATIONS[user.language];

  useEffect(() => {
    let activeSubscriptions: (() => void)[] = [];

    const fetchAndSubscribe = async () => {
      try {
        const { data, error } = await supabase
          .from('widgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (error) throw error;

        const fetchedWidgets: Widget[] = (data || []).map((w: any) => ({
          id: w.id,
          userId: w.user_id,
          name: w.name,
          category: w.category,
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
          alarmMax: w.alarm_max
        }));

        setWidgets(fetchedWidgets);
        mqttService.setMonitoredWidgets(fetchedWidgets);

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

            // Only update history for the main dashboard feed or explicitly tracked variables
            // For now, any numeric value gets historical tracking
            setHistoryData(prev => {
              const nextHistory = { ...prev };
              Object.keys(data).forEach(key => {
                const value = data[key];
                if (typeof value === 'number') {
                  const timestamp = new Date().toLocaleTimeString();
                  const point = { time: timestamp, value };
                  if (!nextHistory[key]) nextHistory[key] = [];
                  nextHistory[key] = [...nextHistory[key], point].slice(-20);
                }
              });
              return nextHistory;
            });
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
        <div className="w-12 h-12 border-4 border-[#009fe3]/30 border-t-[#009fe3] rounded-full animate-spin"></div>
        <p className="font-medium animate-pulse">Loading Dashboard Architecture...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-3xl font-black text-[#002060] tracking-tight mb-2">{t.dashboard}</h2>
          <p className="text-slate-500 font-medium">Monitoring Unit: <span className="text-[#009fe3] font-bold">{user.name}</span></p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <span className="text-sm font-bold text-slate-700">PLC ONLINE</span>
          <span className="text-xs text-slate-400 font-mono border-l pl-3 ml-1">Live Feed</span>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-100">
          <p className="text-slate-400 font-medium">No widgets configured for this dashboard yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          {widgets.map((widget, index) => {
            const val = liveData[widget.variableName];
            const isAlarm = widget.alarmEnabled && val !== undefined && (
              (widget.alarmMin !== undefined && val < widget.alarmMin) ||
              (widget.alarmMax !== undefined && val > widget.alarmMax)
            );

            return (
              <div
                key={widget.id}
                className={
                  widget.widgetType === ReadingWidgetType.LINE_CHART ||
                    widget.widgetType === ReadingWidgetType.BAR_CHART ||
                    widget.widgetType === ReadingWidgetType.TEXT_LOG
                    ? 'md:col-span-2'
                    : ''
                }
              >
                <WidgetRenderer
                  widget={widget}
                  colorIndex={index}
                  currentData={val}
                  historyData={historyData[widget.variableName]}
                  isAlarm={isAlarm}
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