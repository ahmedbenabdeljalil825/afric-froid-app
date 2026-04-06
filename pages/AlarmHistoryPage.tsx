import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Alarm, User } from '../types';
import { AlertCircle, CheckCircle2, Clock, Trash2, RefreshCcw } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmProvider';

interface AlarmHistoryPageProps {
  user: User;
}

const AlarmHistoryPage: React.FC<AlarmHistoryPageProps> = ({ user }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const t = TRANSLATIONS[user.language];
  const { toast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchAlarms(user.id);
  }, [user.id]);

  const fetchAlarms = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('alarms')
      .select('id, user_id, widget_id, variable_name, trigger_value, threshold_value, alarm_type, severity, status, created_at, resolved_at, acknowledged_at, acknowledged_by')
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

  /** PostgREST when the RPC has not been created in the database yet */
  const isRpcMissingError = (err: { message?: string; code?: string; details?: string } | null) => {
    if (!err) return false;
    const code = String(err.code ?? '').toUpperCase();
    const msg = `${err.message ?? ''} ${err.details ?? ''}`.toLowerCase();
    if (code === 'PGRST202') return true;
    if (msg.includes('could not find the function')) return true;
    if (msg.includes('schema cache') && msg.includes('function')) return true;
    return false;
  };

  const deleteHistoryByIdsFallback = async (): Promise<{ ok: boolean; nothingToClear?: boolean }> => {
    // Any non-ACTIVE row is "history" (resolved / acknowledged). Avoid enum/casing mismatches on .in('status', …).
    const { data: rows, error: fetchErr } = await supabase
      .from('alarms')
      .select('id')
      .eq('user_id', user.id)
      .neq('status', 'ACTIVE');

    if (fetchErr) {
      console.error('Failed to list alarms to clear:', fetchErr);
      toast({ kind: 'error', title: t.clearHistoryError, message: fetchErr.message });
      return { ok: false };
    }

    const ids = (rows ?? []).map((r: { id: string }) => r.id).filter(Boolean);
    if (ids.length === 0) {
      return { ok: true, nothingToClear: true };
    }

    const chunkSize = 50;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('alarms')
        .delete()
        .eq('user_id', user.id)
        .in('id', chunk);

      if (error) {
        console.error('Failed to clear alarm history:', error);
        toast({ kind: 'error', title: t.clearHistoryError, message: error.message });
        await fetchAlarms(user.id);
        return { ok: false };
      }
    }
    return { ok: true };
  };

  const deleteHistory = async () => {
    const ok = await confirm({
      title: t.clearHistory,
      message: t.confirmClearHistory,
      confirmText: t.clearHistory,
      cancelText: t.cancel,
      danger: true,
    });
    if (!ok) return;

    const { error: rpcError } = await supabase.rpc('clear_alarm_history');

    if (!rpcError) {
      await fetchAlarms(user.id);
      toast({ kind: 'success', title: t.clearHistory, message: 'Alarm history cleared.' });
      return;
    }

    if (isRpcMissingError(rpcError)) {
      console.warn('clear_alarm_history RPC not available, using client delete:', rpcError.message);
    } else {
      console.warn('clear_alarm_history RPC failed, trying client delete:', rpcError);
    }

    const fallback = await deleteHistoryByIdsFallback();
    if (!fallback.ok) return;

    if (fallback.nothingToClear) {
      toast({ kind: 'info', title: t.clearHistory, message: t.noHistoricalAlarmsToClear });
      return;
    }

    await fetchAlarms(user.id);
    toast({ kind: 'success', title: t.clearHistory, message: 'Alarm history cleared.' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <AlertCircle className="text-red-500 animate-pulse" />;
      case 'ACKNOWLEDGED': return <Clock className="text-amber-500" />;
      case 'RESOLVED': return <CheckCircle2 className="text-emerald-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return t.activeStatus;
      case 'ACKNOWLEDGED': return t.acknowledgedStatus;
      case 'RESOLVED': return t.resolvedStatus;
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-red-500/10 text-red-600 border-red-500/20',
      ACKNOWLEDGED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      RESOLVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    }[status] || 'bg-slate-500/10 text-slate-600 border-slate-500/20';

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const labels: Record<string, string> = {
      LOW: t.lowSeverity,
      MEDIUM: t.mediumSeverity,
      HIGH: t.highSeverity,
      CRITICAL: t.criticalSeverity,
    };

    const styles: Record<string, string> = {
      LOW: 'text-slate-500',
      MEDIUM: 'text-amber-600',
      HIGH: 'text-orange-600',
      CRITICAL: 'text-red-700 font-extrabold',
    };

    return (
      <p className={`text-[10px] font-black tracking-wider uppercase ${styles[severity] || 'text-red-500'}`}>
        {labels[severity] || severity}
      </p>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
        <div>
          <h2 className="text-4xl font-black text-[#002060] tracking-tighter mb-2">
            {t.alarmHistory}
          </h2>
          <p className="text-slate-500 font-medium italic opacity-80">
            {t.alarmAuditLog}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchAlarms(user.id)}
            className="p-3 bg-white/70 backdrop-blur-md text-slate-600 border border-slate-200 rounded-2xl hover:bg-white hover:shadow-lg hover:text-[#009fe3] transition-all active:scale-95 group"
            title={t.refresh}
          >
            <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
          <button
            onClick={deleteHistory}
            className="flex items-center gap-2 px-6 py-3 bg-white/70 backdrop-blur-md text-red-600 border border-red-100 rounded-2xl hover:bg-red-50 hover:shadow-lg transition-all active:scale-95 font-black text-sm uppercase tracking-wider"
          >
            <Trash2 size={16} />
            {t.clearHistory}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#009fe3]/10 border-t-[#009fe3] rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-[#009fe3] text-[10px]">AF</div>
          </div>
        </div>
      ) : alarms.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-xl rounded-[40px] p-24 text-center border-2 border-dashed border-slate-100 shadow-sm animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500/40" />
          </div>
          <p className="text-slate-900 font-black text-2xl tracking-tight">{t.systemRunningSmoothly}</p>
          <p className="text-slate-400 font-medium mt-2">{t.noAlarmHistory}</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-2xl rounded-[40px] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.status}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.alarm}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.value}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.threshold}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.created}</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.details}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alarms.map((alarm, idx) => (
                  <tr 
                    key={alarm.id} 
                    className="hover:bg-[#009fe3]/[0.02] transition-colors group cursor-default"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(alarm.status)}
                        {getStatusBadge(alarm.status)}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div>
                        <p className="font-black text-[#002060] text-base mb-0.5 group-hover:text-[#009fe3] transition-colors">
                          {alarm.variableName}
                        </p>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(alarm.severity)}
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                            {alarm.alarmType}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center px-3 py-1 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-sm shadow-red-500/5">
                        <span className="text-sm font-mono font-black">
                          {alarm.triggerValue}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-mono font-bold text-slate-500">
                        {alarm.thresholdValue}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-[13px] font-black text-slate-700">
                          {new Date(alarm.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-1.5 opacity-60">
                          <Clock size={10} className="text-slate-400" />
                          <p className="text-[10px] text-slate-500 font-bold">
                            {new Date(alarm.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs text-slate-500 font-medium italic leading-relaxed max-w-[200px]">
                        {alarm.status === 'RESOLVED'
                          ? `${t.autoResolvedAt} ${new Date(alarm.resolvedAt!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                          : alarm.status === 'ACKNOWLEDGED'
                            ? `${t.acknowledgedAtLabel} ${new Date(alarm.acknowledgedAt!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                            : t.monitoringActive}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50/50 px-8 py-4 border-t border-slate-100 flex justify-between items-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               {alarms.length} {t.alarms}
             </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlarmHistoryPage;
