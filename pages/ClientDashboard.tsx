import React, { useEffect, useState } from 'react';
import { StatCard, LiveChart } from '../components/DashboardWidgets';
import { Thermometer, Zap, Gauge, Activity, Radio } from 'lucide-react';
import { User, PLCTelemetry } from '../types';
import { mqttService } from '../services/mqttService';
import { TRANSLATIONS } from '../constants';

interface ClientDashboardProps {
  user: User;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ user }) => {
  const [telemetry, setTelemetry] = useState<PLCTelemetry | null>(null);
  const [history, setHistory] = useState<PLCTelemetry[]>([]);
  const t = TRANSLATIONS[user.language];

  useEffect(() => {
    // Note: In a real app, history would come from an API endpoint initially
    // Here we build it up from the live stream for demo purposes
    const unsubscribe = mqttService.subscribe((data) => {
      setTelemetry(data);
      setHistory(prev => {
        const newHistory = [...prev, data];
        return newHistory.slice(-20); // Keep last 20 points
      });
    });
    return () => unsubscribe();
  }, []);

  if (!telemetry) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-12 h-12 border-4 border-[#009fe3]/30 border-t-[#009fe3] rounded-full animate-spin"></div>
        <p className="font-medium animate-pulse">Connecting to System Broker...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-3xl font-black text-[#002060] tracking-tight mb-2">{t.dashboard}</h2>
          <p className="text-slate-500 font-medium">Monitoring Unit: <span className="text-[#009fe3] font-bold">REF-2024-A</span></p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <span className="text-sm font-bold text-slate-700">PLC ONLINE</span>
          <span className="text-xs text-slate-400 font-mono border-l pl-3 ml-1">Ping: 24ms</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t.temperature}
          value={telemetry.temperature.toFixed(1)}
          unit="°C"
          icon={Thermometer}
          color="cyan" // Brand Light Blue theme
          trend="down"
        />
        <StatCard
          title={t.pressure}
          value={telemetry.pressure}
          unit="PSI"
          icon={Gauge}
          color="indigo" // Brand Dark Blue theme
          trend="neutral"
        />
        <StatCard
          title="Power Usage"
          value={telemetry.powerUsage}
          unit="kW"
          icon={Zap}
          color="amber"
          trend="up"
        />
        <StatCard
          title="System Status"
          value={telemetry.status}
          unit=""
          icon={Activity}
          color={telemetry.status === 'RUNNING' ? 'emerald' : 'blue'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {user.config.showTemperatureChart && (
          <LiveChart
            title="Temperature Trends"
            data={history}
            dataKey="temperature"
            color="#009fe3" // Brand Light Blue
            unit="°C"
          />
        )}

        {user.config.showPressureChart && (
          <LiveChart
            title="Suction Pressure"
            data={history}
            dataKey="pressure"
            color="#002060" // Brand Dark Blue
            unit="PSI"
          />
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;