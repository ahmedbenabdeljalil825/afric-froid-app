import React, { useState, useEffect } from 'react';
import { Bell, BellRing, AlertCircle, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Alarm } from '../types';
import { Link, useLocation } from 'react-router-dom';
import { TRANSLATIONS } from '../constants';
import { User } from '../types';
import { initAudio, playSiren } from '../utils/audio';

// Urgent Beeping Sound (Base64 encoded short beep)
const ALARM_BEEP = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18AZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18AZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18AZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18AZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18AZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18AZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18AZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==";
// Actually, let's use a better sounding beep or even better, generated audio to ensure it's "Urgent" as requested.

interface AlarmBellProps {
    user: User;
}

export const AlarmBell: React.FC<AlarmBellProps> = ({ user }) => {
    const [activeAlarms, setActiveAlarms] = useState<Alarm[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasNew, setHasNew] = useState(false);
    const location = useLocation();
    const alarmIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const t = TRANSLATIONS[user.language];

    // Auto-resume AudioContext on first user interaction
    useEffect(() => {
        const handleInteraction = () => {
            initAudio();
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
        document.addEventListener('click', handleInteraction);
        document.addEventListener('keydown', handleInteraction);
        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
    }, []);

    // Stop sound if user navigates to alarms page or opens the bell
    useEffect(() => {
        if (location.pathname === '/alarms' || isOpen) {
            stopAlarm();
        }
    }, [location.pathname, isOpen]);

    // Play/Stop sound based on alarm state and settings
    useEffect(() => {
        if (activeAlarms.length > 0 && hasNew && user.config?.alarmSoundEnabled && !isOpen && location.pathname !== '/alarms') {
            startAlarmSound();
        } else {
            stopAlarm();
        }
    }, [activeAlarms.length, hasNew, user.config?.alarmSoundEnabled, isOpen, location.pathname]);

    const startAlarmSound = async () => {
        if (alarmIntervalRef.current) return; // Already ringing

        try {
            await initAudio();
            
            const triggerChime = () => {
                playSiren(1.0); // Industrial siren wail
            };

            triggerChime(); // Initial ring
            alarmIntervalRef.current = setInterval(triggerChime, 800);
        } catch (err) {
            console.error('Web Audio API error:', err);
        }
    };

    const stopAlarm = () => {
        if (alarmIntervalRef.current) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
        setHasNew(false);
    };

    useEffect(() => {
        fetchActiveAlarms();

        // Subscribe to real-time alarms
        const subscription = supabase
            .channel('public:alarms')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'alarms',
                filter: `user_id=eq.${user.id}`
            }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    const newAlarm = payload.new as Alarm;
                    if (newAlarm.status === 'ACTIVE') {
                        setActiveAlarms(prev => [newAlarm, ...prev]);
                        setHasNew(true);
                        // Play a subtle sound or trigger vibration if supported
                        if ('vibrate' in navigator) navigator.vibrate(200);
                    }
                } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
                    fetchActiveAlarms();
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user.id]);

    const fetchActiveAlarms = async () => {
        const { data, error } = await supabase
            .from('alarms')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setActiveAlarms(data.map((a: any) => ({
                id: a.id,
                userId: a.user_id,
                widgetId: a.widget_id,
                variableName: a.variable_name,
                triggerValue: a.trigger_value,
                thresholdValue: a.threshold_value,
                alarmType: a.alarm_type,
                severity: a.severity,
                status: a.status,
                createdAt: a.created_at
            })));
        }
    };

    const acknowledgeAll = async () => {
        const { error } = await supabase
            .from('alarms')
            .update({ status: 'ACKNOWLEDGED', acknowledged_at: new Date().toISOString(), acknowledged_by: user.id })
            .eq('user_id', user.id)
            .eq('status', 'ACTIVE');

        if (!error) {
            setActiveAlarms([]);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) stopAlarm();
                }}
                className={`relative p-2.5 rounded-2xl transition-all duration-500 shadow-lg ${activeAlarms.length > 0
                    ? 'bg-red-500 text-white animate-pulse shadow-red-200 ring-4 ring-red-50'
                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100 hover:text-[#009fe3]'
                    }`}
                title={activeAlarms.length > 0 ? `${activeAlarms.length} ${t.alarms}` : t.noActiveAlarms}
            >
                {activeAlarms.length > 0 ? (
                    <BellRing size={22} className="animate-bounce" />
                ) : (
                    <Bell size={22} />
                )}

                {activeAlarms.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-white text-red-600 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-red-500 shadow-sm animate-in zoom-in duration-300">
                        {activeAlarms.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">{t.alarms}</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                                title={t.cancel}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {activeAlarms.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm font-medium">{t.noActiveAlarms}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {activeAlarms.map(alarm => (
                                        <div key={alarm.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex gap-3">
                                                <div className="mt-1">
                                                    <AlertCircle size={16} className="text-red-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">
                                                        {alarm.variableName} {alarm.alarmType}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Value: <span className="font-bold text-red-600">{alarm.triggerValue}</span>
                                                        (Limit: {alarm.thresholdValue})
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">
                                                        {new Date(alarm.createdAt).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                            <Link
                                to="/alarms"
                                onClick={() => setIsOpen(false)}
                                className="flex-1 text-center bg-white text-slate-600 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors"
                            >
                                {t.viewHistory}
                            </Link>
                            {activeAlarms.length > 0 && (
                                <button
                                    onClick={acknowledgeAll}
                                    className="flex-1 bg-frost-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-frost-600 transition-colors"
                                >
                                    {t.clearAll}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
