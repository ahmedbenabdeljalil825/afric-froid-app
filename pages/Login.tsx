import React, { useState, useId } from 'react';
import { ArrowRight, Building2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (companyId: string) => boolean;
}

// Complete Vertical Logo (Icon + Text) matching the brand image geometry
const BrandLogoVertical = ({ className = "" }: { className?: string }) => {
  const filterId = useId(); 
  
  return (
    <svg 
      viewBox="0 0 260 220" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AFRIC FROID Logo"
      style={{ overflow: 'visible' }}
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
        <g transform="translate(95, 165)" fill="#002060" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="28" style={{fontStyle: 'italic'}}>
           <text x="0" y="0">AFRIC</text>
           <text x="0" y="30">FROID</text>
        </g>
      </g>
    </svg>
  );
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [companyId, setCompanyId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      if (onLogin(companyId)) {
        setError('');
      } else {
        setError('Invalid Company ID or password.');
        setLoading(false);
      }
    }, 800);
  };

  // Custom style for the entrance animation
  const animationStyle = `
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-enter {
      opacity: 0;
      animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 lg:p-8 font-sans">
      <style>{animationStyle}</style>
      <div className="w-full max-w-6xl h-auto lg:h-[650px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row ring-1 ring-slate-900/5 transition-all duration-500 hover:shadow-3xl">
        
        {/* Left Side - Visual & Branding (Desktop) */}
        <div className="hidden lg:flex w-5/12 relative flex-col justify-between p-12 text-white overflow-hidden group">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80" 
              alt="Industrial Cooling" 
              className="w-full h-full object-cover scale-110 transition-transform duration-[20s] group-hover:scale-100 ease-linear"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#002060]/90 via-[#004080]/80 to-[#009fe3]/70 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#001033] via-transparent to-transparent opacity-80"></div>
          </div>

          <div className="relative z-10 pt-4 pl-4 animate-enter" style={{ animationDelay: '100ms' }}>
             <div className="bg-white/95 backdrop-blur-sm p-6 rounded-[30px] shadow-2xl inline-block transform transition-transform duration-500 group-hover:scale-105 origin-top-left border border-white/50">
               <div className="w-48 h-48">
                 <BrandLogoVertical className="w-full h-full" />
               </div>
             </div>
          </div>

          <div className="relative z-10 animate-enter" style={{ animationDelay: '200ms' }}>
            <p className="text-xl font-light leading-relaxed text-blue-50/90 italic border-l-4 border-[#009fe3] pl-6 py-2 backdrop-blur-sm bg-white/10 rounded-r-xl transition-colors hover:bg-white/20">
              "Le spécialiste du froid industriel et commercial. Nous vous accompagnons de l'étude à la réalisation."
            </p>
            <div className="mt-8 flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-blue-200/80">
              <span className="w-2 h-2 rounded-full bg-[#009fe3] animate-pulse"></span>
              System Operational
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-7/12 p-8 lg:p-20 flex flex-col justify-center bg-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-[100px] opacity-50 pointer-events-none"></div>

          <div className="max-w-md mx-auto w-full space-y-8">
            
            <div className="lg:hidden flex flex-col items-center mb-8 animate-enter">
               <div className="w-40 h-40">
                  <BrandLogoVertical className="w-full h-full" />
               </div>
            </div>

            <div className="space-y-2 text-center lg:text-left animate-enter" style={{ animationDelay: '0ms' }}>
              <h3 className="text-3xl font-bold text-[#002060]">Client Portal</h3>
              <p className="text-slate-500 text-lg">Secure access for industrial partners.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                
                {/* Company ID */}
                <div className="space-y-2 group animate-enter" style={{ animationDelay: '100ms' }}>
                  <label className="text-sm font-bold text-slate-700 ml-1 uppercase tracking-wide transition-colors duration-300 group-focus-within:text-[#009fe3]">Company ID</label>
                  <div className="relative transform transition-all duration-300 group-focus-within:scale-[1.02] group-focus-within:-translate-y-0.5">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#009fe3] transition-colors duration-300">
                      <Building2 size={22} />
                    </div>
                    <input
                      type="text"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#009fe3] focus:bg-white focus:ring-4 focus:ring-[#009fe3]/10 transition-all duration-300 shadow-sm group-hover:bg-white group-hover:border-slate-200"
                      placeholder="Enter assigned ID"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2 group animate-enter" style={{ animationDelay: '200ms' }}>
                  <label className="text-sm font-bold text-slate-700 ml-1 uppercase tracking-wide transition-colors duration-300 group-focus-within:text-[#009fe3]">Password</label>
                  <div className="relative transform transition-all duration-300 group-focus-within:scale-[1.02] group-focus-within:-translate-y-0.5">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#009fe3] transition-colors duration-300">
                      <Lock size={22} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#009fe3] focus:bg-white focus:ring-4 focus:ring-[#009fe3]/10 transition-all duration-300 shadow-sm group-hover:bg-white group-hover:border-slate-200"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#002060] transition-colors p-2 rounded-full hover:bg-slate-100 active:scale-90"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center animate-enter" style={{ animationDelay: '300ms' }}>
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ease-out ${rememberMe ? 'bg-[#009fe3] border-[#009fe3] scale-110' : 'border-slate-300 bg-white group-hover:border-[#009fe3]'}`}>
                    {rememberMe && <CheckCircle2 size={16} className="text-white animate-in zoom-in duration-200" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Remember this device</span>
                </label>
              </div>

              {error && (
                <div className="animate-enter p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium flex items-center gap-3 border border-red-100 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                  {error}
                </div>
              )}

              <div className="animate-enter" style={{ animationDelay: '400ms' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full overflow-hidden bg-gradient-to-r from-[#002060] to-[#009fe3] hover:from-[#003080] hover:to-[#00b0f0] text-white text-lg font-bold py-5 rounded-2xl transition-all duration-300 shadow-xl shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                  
                  {loading ? (
                     <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span className="relative">Access Dashboard</span>
                      <ArrowRight size={22} className="relative group-hover:translate-x-1.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-6 border-t border-slate-100 text-center animate-enter" style={{ animationDelay: '500ms' }}>
               <a href="https://www.frigoindus.net" target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-400 hover:text-[#009fe3] transition-colors inline-flex items-center gap-1 group">
                 Visit frigoindus.net
                 <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
               </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;