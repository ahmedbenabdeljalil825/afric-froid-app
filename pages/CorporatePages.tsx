import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Info, FileText, Globe, Mail, MapPin, Cpu, Database, Server, Lock, Activity, Users, Zap } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

// ── Shared Page Wrapper ──
const CorporatePageLayout: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 border-b border-slate-200/60 pb-6">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-[#009fe3]">
                {icon}
            </div>
            <div>
                <h2 className="text-3xl font-black text-[#002060] tracking-tight">{title}</h2>
                <div className="h-1 w-12 bg-[#009fe3] rounded-full mt-1"></div>
            </div>
        </div>
        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full -mr-32 -mt-32 blur-3xl -z-10"></div>
            {children}
        </div>
    </div>
);

// ── 1. ABOUT PAGE ──
export const AboutPage: React.FC = () => {
    const language = (localStorage.getItem('AFRIC_FROID_LANG') as 'en' | 'fr') || 'fr';
    const t = TRANSLATIONS[language];
    return (
        <CorporatePageLayout title={t.aboutPlatform} icon={<Info size={28} />}>
            <div className="space-y-12">
                {/* Product Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 text-[#002060]">
                        <Activity size={20} className="text-[#009fe3]" />
                        <h3 className="text-xl font-bold uppercase tracking-wider">{t.productInfo}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.appName}</span>
                            <p className="text-lg font-bold text-slate-900">Afric Froid IIoT Cloud</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.appDescription}</span>
                            <p className="text-sm font-medium text-slate-600">{t.appDescriptionText}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.versionBuild}</span>
                            <p className="text-slate-900 font-mono font-bold">1.1.0 <span className="text-slate-300 mx-2">|</span> 2026.02.14-REV1</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.releaseDate}</span>
                            <p className="text-slate-900 font-bold font-medium">February 14, 2026 (Alarm System Release)</p>
                        </div>
                    </div>
                </section>

                <hr className="border-slate-100" />

                {/* Technical Specs */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 text-[#002060]">
                        <Cpu size={20} className="text-[#009fe3]" />
                        <h3 className="text-xl font-bold uppercase tracking-wider">{t.techSpecs}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { label: t.specMqtt, val: 'v3.1.1 / v5', icon: <Globe size={16} /> },
                            { label: t.specSecurity, val: 'TLS/SSL Encryption', icon: <Lock size={16} /> },
                            { label: t.specCapacity, val: 'Multi-broker Ready', icon: <Users size={16} /> },
                            { label: t.specArchitecture, val: 'Real-time State-Persistent', icon: <Activity size={16} /> },
                            { label: t.specDatabase, val: 'PostgreSQL (Supabase)', icon: <Database size={16} /> },
                            { label: t.specHosting, val: 'Dedicated Cloud', icon: <Server size={16} /> },
                        ].map((spec, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                <div className="text-[#009fe3]">{spec.icon}</div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{spec.label}</p>
                                    <p className="text-xs font-bold text-slate-700">{spec.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <hr className="border-slate-100" />

                {/* Company & Credits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-[#002060]">
                            <Globe size={20} className="text-[#009fe3]" />
                            <h3 className="text-xl font-bold uppercase tracking-wider">{t.companyInfo}</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <MapPin size={18} className="text-slate-400 mt-1" />
                                <div>
                                    <p className="font-bold text-slate-900">{t.addressInfo}</p>
                                    <p className="text-sm text-slate-500">4 rue Hamouda Pacha, ZI Ksar Said<br />2086 Tunisia</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Mail size={18} className="text-slate-400" />
                                <a href="mailto:be.conception02@frigoindus.net" className="text-sm font-bold text-[#009fe3] hover:underline">be.conception02@frigoindus.net</a>
                            </div>
                            <div className="flex items-center gap-4">
                                <Globe size={18} className="text-slate-400" />
                                <a href="https://www.frigoindus.net" target="_blank" rel="noreferrer noopener" className="text-sm font-bold text-slate-700 hover:text-[#009fe3]">www.frigoindus.net</a>
                            </div>
                            <p className="text-[10px] font-bold text-slate-300 mt-4 italic">{t.allRightsReserved}</p>
                        </div>
                    </section>

                    <section className="space-y-8 p-10 bg-slate-900 rounded-[28px] text-white shadow-2xl relative overflow-hidden self-start border border-slate-800">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#009fe3]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#002060]/30 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                        
                        {/* Main "Powered By" Focus */}
                        <div className="relative z-10 flex flex-col items-center text-center gap-4 border-b border-slate-700/50 pb-8">
                            <div className="p-4 bg-slate-800/80 rounded-2xl text-[#009fe3] ring-1 ring-white/5 shadow-inner">
                                <Zap size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t.poweredBy}</p>
                                <h2 className="text-4xl font-black tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                    Afric Froid
                                </h2>
                            </div>
                        </div>
                        
                        {/* Subtle Developer Footnote */}
                        <div className="relative z-10 flex flex-col items-center text-center pt-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                {t.architectureLead}
                            </p>
                            <p className="text-xs font-medium text-slate-400">Ben AbdelJelil Ahmed</p>
                        </div>
                    </section>
                </div>

                <hr className="border-slate-100" />

                {/* Legal Links Footer */}
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <Link to="/terms" className="hover:text-[#009fe3] transition-colors">{t.terms}</Link>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <Link to="/privacy" className="hover:text-[#009fe3] transition-colors">{t.privacy}</Link>
                </div>
            </div>
        </CorporatePageLayout>
    );
}


// ── 2. TERMS OF SERVICE ──
export const TermsOfService: React.FC = () => {
    return (
        <CorporatePageLayout title="Terms of Service" icon={<FileText size={28} />}>
            <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
                <p className="text-sm italic">Last Updated: February 14, 2026</p>

                <section className="space-y-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase">1. Acceptance of Terms</h4>
                    <p>By accessing or using the Afric Froid IIoT Cloud Platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.</p>
                </section>

                <section className="space-y-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase">2. Authorized Use</h4>
                    <p>This platform is intended exclusively for industrial monitoring and remote control purposes. Users are responsible for maintaining the confidentiality of their credentials and all activities under their account.</p>
                </section>

                <section className="space-y-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase">3. Industrial Safety Warning</h4>
                    <p className="bg-amber-50 p-4 border-l-4 border-amber-400 font-medium text-amber-900 rounded-r-xl">
                        Remote control of refrigeration systems involves physical hardware. Afric Froid is not liable for data latency or system failures resulting in hardware damage. Local safety interlocks on the PLC must always remain the primary safety mechanism.
                    </p>
                </section>

                <section className="space-y-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase">4. Service Availability</h4>
                    <p>While we strive for 24/7 availability, server maintenance and cloud infrastructure updates may cause temporary outages. Afric Froid does not guarantee uninterrupted service.</p>
                </section>

                <section className="space-y-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase">5. Termination</h4>
                    <p>Afric Froid reserves the right to terminate access for any account violating security protocols or acceptable use policies.</p>
                </section>

                <hr className="border-slate-100 !my-8" />

                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                    <Link to="/about" className="text-[#009fe3] hover:underline">Back to About</Link>
                    <span className="text-slate-200">|</span>
                    <Link to="/privacy" className="text-slate-400 hover:text-[#009fe3]">Privacy Policy</Link>
                </div>
            </div>
        </CorporatePageLayout>
    );
}

// ── 3. PRIVACY POLICY ──
export const PrivacyPolicy: React.FC = () => {
    return (
        <CorporatePageLayout title="Privacy Policy" icon={<ShieldCheck size={28} />}>
            <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
                <p className="text-sm italic">Last Updated: February 14, 2026</p>

                <section className="space-y-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase">1. Data Collection</h4>
                    <p>We collect system telemetry data (temperature, setpoints, status) transmitted via MQTT. We also store minimal user information (name, email) for authentication and access control.</p>
                </section>

                <section className="space-y-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase">2. Purpose of Processing</h4>
                    <p>Data is used solely to provide real-time dashboards, historical trend analysis, and remote control capabilities. We do not sell or share industrial telemetry with third parties.</p>
                </section>

                <section className="space-y-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase">3. Security</h4>
                    <p>Messages are protected via SSL/TLS encryption during transit. Database storage is managed by enterprise-grade infrastructure (Supabase) with Row Level Security (RLS) policies implemented.</p>
                </section>

                <section className="space-y-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase">4. Your Rights</h4>
                    <p>Users can request a copy of their stored data or account deletion by contacting our support team at commercial@frigoindus.net.</p>
                </section>

                <hr className="border-slate-100 !my-8" />

                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                    <Link to="/about" className="text-[#009fe3] hover:underline">Back to About</Link>
                    <span className="text-slate-200">|</span>
                    <Link to="/terms" className="text-slate-400 hover:text-[#009fe3]">Terms of Service</Link>
                </div>
            </div>
        </CorporatePageLayout>
    );
}
