import React, { useState, useId, useEffect } from 'react';
import { ArrowRight, Building2, Lock, Eye, EyeOff, CheckCircle2, Hash, Globe } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { supabase } from '../services/supabase';

// Complete Vertical Logo (Icon + Text) matching the brand image geometry
const BrandLogoVertical = ({ className = "" }: { className?: string }) => {
  const filterId = useId();

  return (
    <svg
      viewBox="0 0 260 220"
      className={`${className} overflow-visible`}
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      <g transform="translate(20, 20)">
        <path d="M30,170 L90,170 L120,40 L60,40 Z" fill="#002060" filter={`url(#${filterId})`} />
        <path d="M95,130 L155,130 L185,0 L125,0 Z" fill="#009fe3" filter={`url(#${filterId})`} />
        <text x="75" y="125" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="65" fill="white" textAnchor="middle">A</text>
        <text x="140" y="85" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="65" fill="white" textAnchor="middle">F</text>
        <g transform="translate(95, 165)" fill="#002060" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="28" className="italic">
          <text x="0" y="0">AFRIC</text>
          <text x="0" y="30">FROID</text>
        </g>
      </g>
    </svg>
  );
};

const Login: React.FC = () => {
  // Initialize from localStorage or default to 'en'
  const [lang, setLang] = useState<'en' | 'fr'>(() => {
    return (localStorage.getItem('AFRIC_FROID_LANG') as 'en' | 'fr') || 'en';
  });
  
  const t = TRANSLATIONS[lang];

  const [companyId, setCompanyId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Persist language choice to localStorage
  useEffect(() => {
    localStorage.setItem('AFRIC_FROID_LANG', lang);
  }, [lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const syntheticEmail = `${companyId.trim().toLowerCase()}@africfroid.app`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password,
      });

      if (error) {
        setError(error.message);
      } else if (data?.user) {
        // Sync the login language selection to the user's profile
        await supabase
          .from('profiles')
          .update({ language: lang })
          .eq('id', data.user.id);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 lg:p-8 font-sans">
      <div className="w-full max-w-6xl h-auto lg:min-h-[720px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row ring-1 ring-slate-900/5 transition-all duration-500 hover:shadow-3xl relative">
        
        {/* Language Switcher - Floating */}
        <div className="absolute top-8 right-8 z-50 animate-enter delay-700">
          <div className="flex bg-slate-100/80 backdrop-blur-md p-1 rounded-2xl border border-slate-200/50 shadow-sm">
            <button 
              onClick={() => setLang('en')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${lang === 'en' ? 'bg-white text-[#002060] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('fr')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${lang === 'fr' ? 'bg-white text-[#002060] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              FR
            </button>
          </div>
        </div>

        {/* Left Side - Visual & Branding (Desktop) */}
        <div className="hidden lg:flex w-5/12 relative flex-col justify-between p-12 text-white overflow-hidden group">
          <div className="absolute inset-0 z-0">
            <img
              src="/bg-industrial.jpg"
              alt="Industrial Cooling"
              className="w-full h-full object-cover scale-105 transition-transform duration-[20s] group-hover:scale-110 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#002060]/90 via-[#004080]/85 to-[#009fe3]/75 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,16,51,0.4)_100%)]"></div>
          </div>

          <div className="relative z-10 pt-4 pl-4 animate-enter delay-100">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-[32px] shadow-2xl inline-block transform transition-all duration-700 group-hover:scale-105 group-hover:rotate-1 origin-top-left border border-white/20">
              <div className="w-48 h-48 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <BrandLogoVertical className="w-full h-full" />
              </div>
            </div>
          </div>

          <div className="relative z-10 animate-enter delay-200">
            <div className="space-y-4">
              <p className="text-xl font-light leading-relaxed text-blue-50/95 italic border-l-[3px] border-[#009fe3] pl-6 py-2 backdrop-blur-sm bg-white/5 rounded-r-2xl transition-all duration-500 hover:bg-white/15 hover:pl-8">
                "{t.tagline}"
              </p>
              <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase text-[#009fe3] bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-[#009fe3]/20 hover:text-white">
                <span className="w-2 h-2 rounded-full bg-[#009fe3] animate-pulse shadow-[0_0_10px_#009fe3]"></span>
                {t.systemOperational}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-7/12 p-8 lg:p-16 flex flex-col justify-center bg-white relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl opacity-60 pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-slate-50 rounded-full blur-3xl opacity-40 pointer-events-none"></div>

          <div className="max-w-md mx-auto w-full space-y-10 relative z-10">

            <div className="lg:hidden flex flex-col items-center mb-10 animate-enter">
              <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100">
                <div className="w-32 h-32">
                  <BrandLogoVertical className="w-full h-full" />
                </div>
              </div>
            </div>

            <div className="space-y-3 text-center lg:text-left animate-enter delay-0">
              <h3 className="text-4xl font-extrabold text-[#002060] tracking-tight">{t.clientPortal}</h3>
              <p className="text-slate-500 text-lg font-medium leading-relaxed">{t.industrialMonitoring}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">

                {/* Company ID */}
                <div className="space-y-2 group animate-enter delay-100">
                  <label className="text-[11px] font-black text-slate-400 ml-1 uppercase tracking-[0.15em] transition-colors duration-300 group-focus-within:text-[#009fe3]">{t.companyId}</label>
                  <div className="relative transform transition-all duration-500 group-focus-within:translate-x-1">
                    <div className="absolute left-5 inset-y-0 flex items-center justify-center pointer-events-none text-slate-300 group-focus-within:text-[#009fe3] transition-colors duration-300">
                      <Hash size={20} />
                    </div>
                    <input
                      type="text"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full pl-14 pr-4 py-5 bg-slate-50/50 border border-slate-200 rounded-[22px] text-slate-900 placeholder:text-slate-300 font-semibold focus:outline-none focus:border-[#009fe3] focus:bg-white focus:ring-[6px] focus:ring-[#009fe3]/5 transition-all duration-300 shadow-sm group-hover:border-slate-300"
                      placeholder="e.g. AF-XXXX"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2 group animate-enter delay-200">
                  <label className="text-[11px] font-black text-slate-400 ml-1 uppercase tracking-[0.15em] transition-colors duration-300 group-focus-within:text-[#009fe3]">{t.password}</label>
                  <div className="relative transform transition-all duration-500 group-focus-within:translate-x-1">
                    <div className="absolute left-5 inset-y-0 flex items-center justify-center pointer-events-none text-slate-300 group-focus-within:text-[#009fe3] transition-colors duration-300">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-14 pr-14 py-5 bg-slate-50/50 border border-slate-200 rounded-[22px] text-slate-900 placeholder:text-slate-300 font-semibold focus:outline-none focus:border-[#009fe3] focus:bg-white focus:ring-[6px] focus:ring-[#009fe3]/5 transition-all duration-300 shadow-sm group-hover:border-slate-300"
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                    />
                    <div className="absolute right-4 inset-y-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-300 hover:text-[#002060] transition-all p-2 rounded-xl hover:bg-slate-100 active:scale-90"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-end animate-enter delay-300 px-1">
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-bold text-[#009fe3] hover:text-[#002060] transition-colors uppercase tracking-wider"
                >
                  {t.forgotAccess}
                </button>
              </div>

              {error && (
                <div className="animate-enter p-5 rounded-2xl bg-red-50 text-red-600 text-sm font-bold flex items-center gap-4 border border-red-100 shadow-inner">
                  <div className="w-1.5 h-10 rounded-full bg-red-500 shrink-0"></div>
                  {error}
                </div>
              )}

              <div className="animate-enter delay-400 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full overflow-hidden bg-[#002060] text-white text-lg font-black py-5 rounded-[22px] transition-all duration-500 shadow-2xl shadow-[#002060]/20 hover:shadow-[#002060]/40 hover:-translate-y-1.5 active:scale-[0.97] flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {/* Gloss effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>

                  {loading ? (
                    <span className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span className="relative tracking-tight">{t.accessDashboard}</span>
                      <ArrowRight size={22} className="relative group-hover:translate-x-2 transition-transform duration-500" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-8 border-t border-slate-100 text-center animate-enter delay-500">
              <a href="https://www.frigoindus.net" target="_blank" rel="noopener noreferrer" className="text-[11px] font-black text-slate-300 hover:text-[#009fe3] transition-all duration-300 inline-flex items-center gap-2 group uppercase tracking-[0.2em]">
                {t.visitWebsite}
                <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Access Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-[#002060]/40 backdrop-blur-md animate-in fade-in duration-500"
            onClick={() => setShowForgotModal(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out border border-slate-100">
            <div className="p-8 sm:p-12 space-y-8">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <Building2 size={40} className="text-[#009fe3]" />
              </div>
              
              <div className="text-center space-y-4">
                <h4 className="text-3xl font-black text-[#002060] tracking-tight">{t.forgotAccessTitle}</h4>
                <p className="text-slate-500 text-lg leading-relaxed font-medium">
                  {t.forgotAccessDescription}
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <a 
                  href="mailto:be.conception02@frigoindus.net"
                  className="flex items-center justify-center gap-3 w-full py-5 bg-[#002060] text-white font-black rounded-2xl shadow-xl shadow-[#002060]/20 hover:shadow-[#002060]/30 hover:-translate-y-1 transition-all duration-300"
                >
                  <Globe size={20} />
                  {t.contactSupport}
                </a>
                <button 
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-4 text-slate-400 font-bold hover:text-[#002060] transition-colors"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;