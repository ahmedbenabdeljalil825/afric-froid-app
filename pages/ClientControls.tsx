import React, { useState, useEffect } from 'react';
import { User, PLCTelemetry } from '../types';
import { mqttService } from '../services/mockMqttService';
import { Power, Thermometer, AlertTriangle, Save, RefreshCw, Sliders } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface ClientControlsProps {
  user: User;
}

const ClientControls: React.FC<ClientControlsProps> = ({ user }) => {
  const [telemetry, setTelemetry] = useState<PLCTelemetry | null>(null);
  const [targetSetpoint, setTargetSetpoint] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const t = TRANSLATIONS[user.language];

  useEffect(() => {
    const unsubscribe = mqttService.subscribe((data) => {
      setTelemetry(data);
      if (targetSetpoint === '') {
        setTargetSetpoint(data.setpoint.toString());
      }
    });
    return () => unsubscribe();
  }, [targetSetpoint]);

  const handleSetpointChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSetpoint) return;
    
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      mqttService.publishControl('setpoint', targetSetpoint);
      setLoading(false);
    }, 800);
  };

  const togglePower = () => {
    if (!user.config.allowPowerControl) return;
    const newState = telemetry?.status === 'RUNNING' ? 'OFF' : 'ON';
    mqttService.publishControl('power', newState);
  };

  if (!telemetry) {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Setpoint Control Card */}
        {user.config.allowSetpointControl && (
          <div className="bg-white rounded-[30px] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-cyan-50 rounded-2xl ring-4 ring-cyan-50/50">
                  <Thermometer className="text-[#009fe3]" size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Temperature Setpoint</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Current Target</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 font-bold text-xs">{telemetry.setpoint}°C</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSetpointChange} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 ml-1">
                    New Target Temperature (°C)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={targetSetpoint}
                      onChange={(e) => setTargetSetpoint(e.target.value)}
                      className="w-full px-6 py-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-[#009fe3] focus:bg-white focus:ring-4 focus:ring-[#009fe3]/10 outline-none transition-all text-2xl font-bold text-slate-900 placeholder:text-slate-300"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Sliders className="text-slate-300" size={24} />
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#002060] to-[#009fe3] hover:from-[#003080] hover:to-[#00b0f0] text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/10 hover:shadow-blue-900/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />}
                  <span>{t.save}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* System Power Card */}
        <div className="bg-white rounded-[30px] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 relative overflow-hidden group">
           <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[100px] -mr-8 -mt-8 transition-colors duration-500 ${telemetry.status === 'RUNNING' ? 'bg-emerald-50' : 'bg-slate-100'}`}></div>

           <div className="relative z-10 flex flex-col h-full justify-between">
             <div>
                <div className="flex items-center gap-4 mb-8">
                  <div className={`p-4 rounded-2xl ring-4 transition-colors duration-500 ${
                    telemetry.status === 'RUNNING' ? 'bg-emerald-50 text-emerald-600 ring-emerald-50/50' : 'bg-slate-100 text-slate-500 ring-slate-100/50'
                  }`}>
                    <Power size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">System Power</h3>
                    <p className="text-slate-500 text-sm font-medium">Main Contactor Status</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Operational State</span>
                    <span className={`text-xl font-black ${
                      telemetry.status === 'RUNNING' ? 'text-emerald-600' : 'text-slate-500'
                    }`}>
                      {telemetry.status}
                    </span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    telemetry.status === 'RUNNING' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  }`}></div>
                </div>
              </div>

               {user.config.allowPowerControl ? (
                 <button
                  onClick={togglePower}
                  className={`w-full py-5 rounded-2xl font-bold text-lg text-white transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 ${
                    telemetry.status === 'RUNNING' 
                      ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-red-500/20' 
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-emerald-500/20'
                  }`}
                >
                  {telemetry.status === 'RUNNING' ? 'STOP SYSTEM' : 'START SYSTEM'}
                </button>
               ) : (
                 <div className="flex items-start gap-4 p-5 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100">
                   <AlertTriangle size={24} className="shrink-0" />
                   <div>
                     <p className="font-bold mb-1">Access Restricted</p>
                     <p className="text-sm opacity-90">Power control is currently disabled by your administrator.</p>
                   </div>
                 </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ClientControls;