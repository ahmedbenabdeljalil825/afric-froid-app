import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { AlarmEvent } from './AlarmManager';

export function AlarmHistoryTable({ userId }: { userId: string }) {
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('alarm_events')
        .select('*')
        .eq('user_id', userId)
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
  }, [userId]);

  if (alarms.length === 0) return null;

  return (
    <div className="mt-12 bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 shadow-xl overflow-hidden p-8">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-2xl font-black text-[#002060] tracking-tight">System Alarm History</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Time</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Message</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Variable</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Status</th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Acknowledge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alarms.map(alarm => (
              <tr key={alarm.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-sm font-medium text-slate-700">
                  {new Date(alarm.triggered_at).toLocaleString()}
                </td>
                <td className="py-3 px-4 font-bold text-slate-800">
                  {alarm.custom_message}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-slate-500">
                  {alarm.variable_name}
                </td>
                <td className="py-3 px-4">
                  {alarm.is_resolved ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md">Resolved</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md animate-pulse">Active</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {alarm.is_acknowledged ? (
                    <span className="text-slate-400 text-sm italic">Ack'd</span>
                  ) : (
                    <span className="text-red-500 text-sm font-bold">Pending</span>
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

