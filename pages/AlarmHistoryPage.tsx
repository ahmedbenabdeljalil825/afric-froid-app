import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Alarm, Profile } from '../types';
import { AlertCircle, CheckCircle2, Clock, Filter, Trash2 } from 'lucide-react';

const AlarmHistoryPage: React.FC = () => {
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                fetchAlarms(session.user.id);
            }
        };
        fetchSession();
    }, []);

    const fetchAlarms = async (userId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('alarms')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAlarms(data.map((a: any) => ({
                id: a.id,
                userId: a.user_id,
                widgetId: a.widget_id,
                variableName: a.variable_name,
                triggerValue: a.trigger_value,
                thresholdValue: a.threshold_value,
                alarmType: a.alarm_type,
                severity: a.severity,
                status: a.status,
                createdAt: a.created_at,
                resolvedAt: a.resolved_at,
                acknowledgedAt: a.acknowledged_at
            })));
        }
        setLoading(false);
    };

    const deleteHistory = async () => {
        if (!confirm('Are you sure you want to clear your alarm history?')) return;

        const { error } = await supabase
            .from('alarms')
            .delete()
            .eq('user_id', currentUser.id)
            .neq('status', 'ACTIVE'); // Keep active alarms

        if (!error) {
            fetchAlarms(currentUser.id);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <AlertCircle className="text-red-500" />;
            case 'ACKNOWLEDGED': return <Clock className="text-amber-500" />;
            case 'RESOLVED': return <CheckCircle2 className="text-emerald-500" />;
            default: return null;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            ACTIVE: 'bg-red-100 text-red-700',
            ACKNOWLEDGED: 'bg-amber-100 text-amber-700',
            RESOLVED: 'bg-emerald-100 text-emerald-700'
        }[status] || 'bg-slate-100 text-slate-700';

        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${styles}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/60 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-[#002060] tracking-tight mb-2">Alarm History</h2>
                    <p className="text-slate-500 font-medium italic">Audit log of system anomalies and alerts</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchAlarms(currentUser?.id)}
                        className="p-2 bg-white text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        title="Refresh"
                    >
                        <Clock size={20} />
                    </button>
                    <button
                        onClick={deleteHistory}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition-colors font-bold text-sm"
                    >
                        <Trash2 size={16} />
                        Clear History
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-frost-100 border-t-frost-500 rounded-full animate-spin"></div>
                </div>
            ) : alarms.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-100">
                    <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500 opacity-20" />
                    <p className="text-slate-400 font-medium text-lg">Your system is running smoothly.</p>
                    <p className="text-slate-300 text-sm mt-1">No alarm history found.</p>
                </div>
            ) : (
                <div className="bg-white rounded-[32px] shadow-xl border border-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alarm</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Threshold</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {alarms.map((alarm) => (
                                    <tr key={alarm.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(alarm.status)}
                                                {getStatusBadge(alarm.status)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{alarm.variableName}</p>
                                                <p className="text-[10px] font-black text-red-500 tracking-wider">CRITICAL {alarm.alarmType}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                                {alarm.triggerValue}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono text-slate-500">
                                                {alarm.thresholdValue}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold text-slate-700">
                                                    {new Date(alarm.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {new Date(alarm.createdAt).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-500 italic max-w-xs truncate">
                                                {alarm.status === 'RESOLVED'
                                                    ? `Auto-resolved at ${new Date(alarm.resolvedAt!).toLocaleTimeString()}`
                                                    : alarm.status === 'ACKNOWLEDGED'
                                                        ? `Acknowledged at ${new Date(alarm.acknowledgedAt!).toLocaleTimeString()}`
                                                        : 'Currently active and monitoring'}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlarmHistoryPage;
