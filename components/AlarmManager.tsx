import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';

export interface AlarmEvent {
  id: string;
  widget_id: string;
  variable_name: string;
  custom_message: string;
  is_resolved: boolean;
  is_acknowledged: boolean;
  triggered_at: string;
  resolved_at: string | null;
}

import { User } from '../types';
import { TRANSLATIONS } from '../constants';

export function AlarmManager({ user }: { user: User }) {
  const [activeAlarms, setActiveAlarms] = useState<AlarmEvent[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userInteracted = useRef(false);
  const pendingPlay = useRef(false);
  const t = TRANSLATIONS[user.language];

  // Track first user interaction so we can unblock autoplay on Android WebView
  useEffect(() => {
    const markInteracted = () => {
      if (userInteracted.current) return;
      userInteracted.current = true;
      // If an alarm was already ringing when the page loaded, start it now
      if (pendingPlay.current && audioRef.current) {
        audioRef.current.play().catch(e => console.warn('Audio play blocked:', e));
        pendingPlay.current = false;
      }
    };
    document.addEventListener('click', markInteracted, { once: true });
    document.addEventListener('touchstart', markInteracted, { once: true });
    return () => {
      document.removeEventListener('click', markInteracted);
      document.removeEventListener('touchstart', markInteracted);
    };
  }, []);

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio('/buzzer.ogg');
    audioRef.current.loop = true;
    
    // Fetch initial active alarms
    const fetchAlarms = async () => {
      const { data, error } = await supabase
        .from('alarm_events')
        .select('*')
        .eq('is_resolved', false);
      
      if (!error && data) {
        setActiveAlarms(data as AlarmEvent[]);
      }
    };
    
    fetchAlarms();

    // Subscribe to realtime changes
    const channel = supabase.channel('alarm_events_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alarm_events' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newAlarm = payload.new as AlarmEvent;
            if (!newAlarm.is_resolved) {
              setActiveAlarms((prev) => [...prev, newAlarm]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedAlarm = payload.new as AlarmEvent;
            setActiveAlarms((prev) => {
              // If it got resolved, remove it from active list
              if (updatedAlarm.is_resolved) {
                return prev.filter(a => a.id !== updatedAlarm.id);
              }
              // Otherwise, update its state (e.g., if it got acknowledged)
              return prev.map(a => a.id === updatedAlarm.id ? updatedAlarm : a);
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedAlarm = payload.old as { id: string };
            setActiveAlarms((prev) => prev.filter(a => a.id !== deletedAlarm.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check if any alarm is unacknowledged and unresolved
  const unacknowledgedAlarms = activeAlarms.filter(a => !a.is_acknowledged && !a.is_resolved);
  const isRinging = unacknowledgedAlarms.length > 0;

  useEffect(() => {
    if (isRinging && audioRef.current) {
      if (userInteracted.current) {
        audioRef.current.play().catch(e => console.warn('Audio play blocked by browser policy:', e));
      } else {
        // Defer until first user interaction (Android WebView autoplay restriction)
        pendingPlay.current = true;
      }
    } else if (!isRinging && audioRef.current) {
      pendingPlay.current = false;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isRinging]);

  const handleAcknowledge = async (alarmId: string) => {
    // Optimistic update
    setActiveAlarms(prev => prev.map(a => a.id === alarmId ? { ...a, is_acknowledged: true } : a));
    
    await supabase
      .from('alarm_events')
      .update({ is_acknowledged: true })
      .eq('id', alarmId);
  };

  const handleAcknowledgeAll = async () => {
    const ids = unacknowledgedAlarms.map(a => a.id);
    if (ids.length === 0) return;
    
    // Optimistic update
    setActiveAlarms(prev => prev.map(a => ({ ...a, is_acknowledged: true })));
    
    await supabase
      .from('alarm_events')
      .update({ is_acknowledged: true })
      .in('id', ids);
  };

  if (!isRinging) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-start pt-20">
      {/* Flashing red background overlay */}
      <div className="absolute inset-0 bg-red-600 opacity-20 animate-pulse mix-blend-multiply"></div>
      
      {/* Alarm Modals */}
      <div className="relative z-10 w-full max-w-2xl px-4 pointer-events-auto flex flex-col gap-4">
        {unacknowledgedAlarms.map((alarm) => (
          <div key={alarm.id} className="bg-red-50 border-l-8 border-red-600 p-6 rounded-lg shadow-2xl flex items-center justify-between animate-bounce shadow-red-900/50">
            <div>
              <h2 className="text-red-800 text-2xl font-black uppercase tracking-wider flex items-center gap-2">
                <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {t.systemAlarm}
              </h2>
              <p className="text-red-900 font-medium text-lg mt-1">{alarm.custom_message}</p>
              <p className="text-red-700 text-sm mt-2 font-mono">{t.variable}: {alarm.variable_name} | {t.triggered}: {new Date(alarm.triggered_at).toLocaleTimeString(user.language === 'fr' ? 'fr-FR' : 'en-US')}</p>
            </div>
            
            <button 
              onClick={() => handleAcknowledge(alarm.id)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition active:scale-95 text-xl"
            >
              {t.silence}
            </button>
          </div>
        ))}

        {unacknowledgedAlarms.length > 1 && (
          <button 
            onClick={handleAcknowledgeAll}
            className="mt-4 bg-slate-900 hover:bg-black text-white font-bold py-3 px-6 rounded-lg shadow-xl mx-auto"
          >
            {t.acknowledgeAll} ({unacknowledgedAlarms.length})
          </button>
        )}
      </div>
    </div>
  );
}

