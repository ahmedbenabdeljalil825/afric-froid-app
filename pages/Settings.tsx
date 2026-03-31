import React, { useState } from 'react';
import { User } from '../types';
import { Lock, CheckCircle2, AlertCircle, Loader2, Bell, Volume2, VolumeX, BellRing } from 'lucide-react';
import { TRANSLATIONS, DEFAULT_USER_CONFIG } from '../constants';
import { supabase } from '../services/supabase';
import { playSiren, initAudio } from '../utils/audio';

interface SettingsProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
  const t = TRANSLATIONS[user.language];
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError(user.language === 'fr' ? 'Le mot de passe doit comporter au moins 6 caractères.' : 'Password must be at least 6 characters.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError(user.language === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        // Also update the password in the public.profiles table for dashboard visibility
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ password: newPassword })
          .eq('id', user.id);

        if (profileError) {
          console.error('Error syncing password to profile table:', profileError);
          // We don't block success if Auth succeeded, but we should know
        }

        setSuccess(true);
        // Sync updated user object back to parent so App state stays fresh
        onUpdateUser(user);
        setNewPassword('');
        setConfirmPassword('');
        // Show success for 5 seconds
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      setError(t.passwordChangeError);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAlarmSound = async () => {
    const newConfig = {
      ...DEFAULT_USER_CONFIG,
      ...(user.config || {}),
      alarmSoundEnabled: !user.config?.alarmSoundEnabled
    };

    const updatedUser = {
      ...user,
      config: newConfig
    };

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ config: newConfig })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating alarm settings:', profileError);
        setError(user.language === 'fr' ? 'Erreur lors de la mise à jour des paramètres.' : 'Error updating settings.');
      } else {
        onUpdateUser(updatedUser);
      }
    } catch (err) {
      console.error('Async error updating alarm settings:', err);
    }
  };

  return (
    <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="mb-10">
          <h2 className="text-4xl font-black text-[#002060] tracking-tight">{t.settings}</h2>
          <p className="text-slate-500 text-lg font-medium">{t.preferences}</p>
        </div>

      <div className="space-y-8">
        {/* Preferences Section */}
        <div className="bg-white rounded-[32px] p-8 lg:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50/50 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-1000 group-hover:scale-150"></div>
           
           <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="p-5 bg-sky-50 rounded-[24px] shadow-inner text-sky-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
              <Bell size={32} />
            </div>
            
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-black text-[#002060] tracking-tight truncate">{t.alarmSound}</h3>
                  <p className="text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {user.config?.alarmSoundEnabled ? t.enableAlarmSound : t.disableAlarmSound}
                  </p>
                </div>
                
                <button 
                  onClick={toggleAlarmSound}
                  aria-label="Toggle Alarm Sound"
                  className={`relative w-20 h-10 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 ${
                    user.config?.alarmSoundEnabled ? 'bg-sky-500' : 'bg-slate-200'
                  }`}
                >
                  <div 
                    className={`absolute left-1 top-1 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md z-10 transition-transform duration-300 ease-in-out ${
                      user.config?.alarmSoundEnabled ? 'translate-x-10' : 'translate-x-0'
                    }`}
                  >
                    {user.config?.alarmSoundEnabled ? (
                      <Volume2 className="size-5 text-sky-500" />
                    ) : (
                      <VolumeX className="size-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Test Sound Button */}
                <button
                  onClick={() => {
                    initAudio(); // Prompt resume on interaction
                    playSiren();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 active:scale-95 transition-all border border-slate-200"
                  title={t.testSound}
                >
                  <BellRing className="size-5 text-[#002060]" />
                  <span>{t.testSound}</span>
                </button>
              </div>
            </div>
           </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-[32px] p-8 lg:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-1000 group-hover:scale-150"></div>
           
           <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
            <div className="p-5 bg-blue-50 rounded-[24px] shadow-inner text-[#009fe3] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
              <Lock size={32} />
            </div>
            
            <div className="flex-1 w-full">
              <div className="mb-8">
                <h3 className="text-2xl font-black text-[#002060] tracking-tight">{t.security}</h3>
                <p className="text-slate-500 font-medium">{t.updatePassword}</p>
              </div>
              
              <form onSubmit={handlePasswordUpdate} className="space-y-5">
                  <div className="space-y-4">
                    <div className="relative group/input">
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t.newPassword}
                        className={`w-full pl-5 pr-5 py-4 rounded-2xl border bg-slate-50/50 focus:bg-white focus:ring-[6px] outline-none transition-all duration-300 font-semibold text-slate-900 placeholder:text-slate-300 ${
                          newPassword && newPassword.length < 6 
                            ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-400/5' 
                            : 'border-slate-200 focus:border-[#009fe3] focus:ring-[#009fe3]/5'
                        }`}
                        disabled={loading}
                      />
                      {newPassword && newPassword.length < 6 && (
                        <p className="mt-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider ml-1">
                          {user.language === 'fr' ? '6 caractères minimum' : '6 characters minimum'}
                        </p>
                      )}
                    </div>
                    
                    <div className="relative group/input">
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t.confirmPassword}
                        className={`w-full pl-5 pr-5 py-4 rounded-2xl border bg-slate-50/50 focus:bg-white focus:ring-[6px] outline-none transition-all duration-300 font-semibold text-slate-900 placeholder:text-slate-300 ${
                          confirmPassword && newPassword !== confirmPassword 
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-400/5' 
                            : confirmPassword && newPassword === confirmPassword
                              ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-400/5'
                              : 'border-slate-200 focus:border-[#009fe3] focus:ring-[#009fe3]/5'
                        }`}
                        disabled={loading}
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="mt-1 text-[10px] font-bold text-red-600 uppercase tracking-wider ml-1">
                          {user.language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match'}
                        </p>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold animate-in fade-in zoom-in-95 duration-300">
                      <AlertCircle size={18} />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 text-sm font-bold animate-in fade-in zoom-in-95 duration-300">
                      <CheckCircle2 size={18} />
                      {t.passwordChangedSuccess}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                     <button 
                        type="submit"
                        disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-[#002060] text-white rounded-2xl font-black hover:bg-[#004080] hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-xl shadow-[#002060]/20 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:transform-none"
                     >
                       {loading ? <Loader2 className="animate-spin" size={20} /> : null}
                       {t.updatePassword}
                     </button>
                  </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
