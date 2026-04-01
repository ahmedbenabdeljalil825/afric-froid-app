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
                className={`relative p-2.5 rounded-2xl transition-all duration-500 shadow-lg border ${activeAlarms.length > 0
                    ? 'bg-red-500 text-white animate-pulse shadow-red-200 ring-4 ring-red-50 border-red-400'
                    : 'bg-white/80 backdrop-blur-md text-slate-400 hover:bg-white border-slate-100 hover:text-[#009fe3] hover:shadow-xl hover:-translate-y-0.5'
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
                    <div className="absolute right-0 mt-3 w-85 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
                        <div className="p-5 bg-slate-50/50 border-b border-slate-100/50 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em]">{t.alarms}</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
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
                                <div className="divide-y divide-slate-100/50">
                                    {activeAlarms.map((alarm, index) => (
                                        <div 
                                            key={alarm.id} 
                                            className="p-4 hover:bg-slate-50/80 transition-all cursor-default group animate-in fade-in slide-in-from-right-4 duration-500"
                                            style={{ animationDelay: `${index * 75}ms` }}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1 p-1.5 rounded-lg ${
                                                    alarm.severity === 'CRITICAL' ? 'bg-red-50 text-red-500' :
                                                    alarm.severity === 'HIGH' ? 'bg-orange-50 text-orange-500' :
                                                    'bg-blue-50 text-blue-500'
                                                }`}>
                                                    <AlertCircle size={14} className={alarm.severity === 'CRITICAL' ? 'animate-pulse' : ''} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-sm font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                                                            {alarm.variableName}
                                                        </p>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                                                            alarm.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                                                            alarm.severity === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                                                            'bg-blue-100 text-blue-600'
                                                        }`}>
                                                            {alarm.severity}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {t.value}: <span className="font-bold text-red-600">{alarm.triggerValue}</span>
                                                        <span className="mx-2 opacity-30">|</span>
                                                        {t.limit}: <span className="font-medium">{alarm.thresholdValue}</span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest">
                                                        {new Date(alarm.createdAt).toLocaleTimeString(user.language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50/80 border-t border-slate-100/50 flex gap-2.5">
                            <Link
                                to="/alarms"
                                onClick={() => setIsOpen(false)}
                                className="flex-1 text-center bg-white text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 hover:border-[#009fe3] hover:text-[#009fe3] transition-all shadow-sm"
                            >
                                {t.viewHistory}
                            </Link>
                            {activeAlarms.length > 0 && (
                                <button
                                    onClick={acknowledgeAll}
                                    className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100"
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
