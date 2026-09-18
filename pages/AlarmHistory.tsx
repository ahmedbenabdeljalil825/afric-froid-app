import React from 'react';
import { User } from '../types';
import { AlarmHistoryTable } from '../components/AlarmHistoryTable';
import { TRANSLATIONS } from '../constants';

interface AlarmHistoryProps {
  user: User;
}

const AlarmHistory: React.FC<AlarmHistoryProps> = ({ user }) => {
  const t = TRANSLATIONS[user.language];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/40 pb-6">
        <div>
          <h2 className="text-4xl font-black text-[#002060] tracking-tight mb-2 drop-shadow-sm">{t.alarmHistory}</h2>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <span className="opacity-70">{t.monitoringUnit}:</span>
            <span className="text-[#009fe3] font-bold px-3 py-0.5 bg-[#009fe3]/5 rounded-lg border border-[#009fe3]/10">{user.name}</span>
          </p>
        </div>
      </div>
      
      <AlarmHistoryTable user={user} />
    </div>
  );
};

export default AlarmHistory;
