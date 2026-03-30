import React, { useState } from 'react';
import { User } from '../types';
import { Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../services/supabase';

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

  return (
    <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="mb-10">
          <h2 className="text-4xl font-black text-[#002060] tracking-tight">{t.settings}</h2>
          <p className="text-slate-500 text-lg font-medium">{t.preferences}</p>
        </div>

      <div className="space-y-8">
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
                        className="w-full pl-5 pr-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:border-[#009fe3] focus:bg-white focus:ring-[6px] focus:ring-[#009fe3]/5 outline-none transition-all duration-300 font-semibold text-slate-900 placeholder:text-slate-300"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="relative group/input">
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t.confirmPassword}
                        className="w-full pl-5 pr-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:border-[#009fe3] focus:bg-white focus:ring-[6px] focus:ring-[#009fe3]/5 outline-none transition-all duration-300 font-semibold text-slate-900 placeholder:text-slate-300"
                        disabled={loading}
                      />
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
                        disabled={loading || !newPassword}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-[#002060] text-white rounded-2xl font-black hover:bg-[#004080] hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-xl shadow-[#002060]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
