import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { AlarmEvent } from './AlarmManager';
import { User } from '../types';
import { TRANSLATIONS } from '../constants';

export function AlarmHistoryTable({ user }: { user: User }) {
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);
  const t = TRANSLATIONS[user.language];

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('alarm_events')
        .select('*')
        .eq('user_id', user.id)
        .order('triggered_at', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setAlarms(data as AlarmEvent[]);
      }
    };
    fetchHistory();

    const channel = supabase.channel('alarm_history_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alarm_events' },
        (payload: any) => {
          fetchHistory(); // Easiest way to keep history perfectly synced
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  if (alarms.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 shadow-xl overflow-hidden p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium text-lg">{t.noAlarmHistory}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 shadow-xl overflow-hidden p-8">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-2xl font-black text-[#002060] tracking-tight">{t.alarmHistory}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">{t.time}</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">{t.message}</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">{t.variable}</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">{t.status}</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">{t.acknowledge}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alarms.map(alarm => (
              <tr key={alarm.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-sm font-medium text-slate-700">
                  {new Date(alarm.triggered_at).toLocaleString(user.language === 'fr' ? 'fr-FR' : 'en-US')}
                </td>
                <td className="py-3 px-4 font-bold text-slate-800">
                  {alarm.custom_message}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-slate-500">
                  {alarm.variable_name}
                </td>
                <td className="py-3 px-4">
                  {alarm.is_resolved ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md">{t.resolvedStatus}</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md animate-pulse">{t.activeStatus}</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {alarm.is_acknowledged ? (
                    <span className="text-slate-400 text-sm italic">{t.ackd}</span>
                  ) : (
                    <span className="text-red-500 text-sm font-bold">{t.pending}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
