import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

// --- Stat Card ---
interface StatCardProps {
  title: string;
  value: string | number;
  unit: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: any;
  color: 'blue' | 'cyan' | 'indigo' | 'amber' | 'emerald';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, unit, trend, icon: Icon, color }) => {
  // Vibrant color mappings using Tailwind classes
  const styles = {
    blue: {
      wrapper: 'from-blue-50 to-white',
      icon: 'bg-blue-100 text-blue-600',
      text: 'text-blue-900',
      highlight: 'bg-blue-500'
    },
    cyan: {
      wrapper: 'from-cyan-50 to-white',
      icon: 'bg-cyan-100 text-cyan-600',
      text: 'text-cyan-900',
      highlight: 'bg-cyan-500'
    },
    indigo: {
      wrapper: 'from-indigo-50 to-white',
      icon: 'bg-indigo-100 text-indigo-600',
      text: 'text-indigo-900',
      highlight: 'bg-indigo-500'
    },
    amber: {
      wrapper: 'from-amber-50 to-white',
      icon: 'bg-amber-100 text-amber-600',
      text: 'text-amber-900',
      highlight: 'bg-amber-500'
    },
    emerald: {
      wrapper: 'from-emerald-50 to-white',
      icon: 'bg-emerald-100 text-emerald-600',
      text: 'text-emerald-900',
      highlight: 'bg-emerald-500'
    }
  };

  const currentStyle = styles[color] || styles.blue;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${currentStyle.wrapper} rounded-[24px] p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group`}>
      {/* Decorative top accent */}
      <div className={`absolute top-0 left-0 w-full h-1 ${currentStyle.highlight} opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      {/* Background Glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${currentStyle.highlight} opacity-5 blur-3xl group-hover:opacity-10 transition-all duration-500`} />

      <div className="relative z-10 flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <h3 className={`text-3xl font-black ${currentStyle.text} tracking-tight`}>{value}</h3>
            <span className="text-sm font-bold text-slate-400">{unit}</span>
          </div>
        </div>
        <div className={`p-3.5 rounded-2xl ${currentStyle.icon} shadow-sm ring-4 ring-white`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-center gap-2 h-6">
        {trend && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            trend === 'up' ? 'bg-red-50 text-red-600' : 
            trend === 'down' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}>
            {trend === 'up' && <ArrowUp size={12} strokeWidth={3} />}
            {trend === 'down' && <ArrowDown size={12} strokeWidth={3} />}
            <span className="leading-none">{trend === 'up' ? '+2.4%' : trend === 'down' ? '-1.2%' : '0%'}</span>
          </div>
        )}
        {trend && <span className="text-xs font-medium text-slate-400">vs last hour</span>}
      </div>
    </div>
  );
};

// --- Live Chart ---
interface LiveChartProps {
  data: any[];
  dataKey: string;
  color: string;
  unit?: string;
  title: string;
}

export const LiveChart: React.FC<LiveChartProps> = ({ data, dataKey, color, unit, title }) => {
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 h-[400px] hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          {title} 
        </h3>
        {unit && (
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            {unit}
          </span>
        )}
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second: '2-digit' })}
              stroke="#94a3b8"
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
              dy={10}
            />
            <YAxis 
              stroke="#94a3b8"
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)'
              }}
              labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}
              itemStyle={{ color: '#0f172a', fontWeight: 'bold', fontSize: '14px' }}
              labelFormatter={(ts) => new Date(ts).toLocaleTimeString()}
            />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={3}
              fillOpacity={1} 
              fill={`url(#color${dataKey})`} 
              isAnimationActive={true}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};