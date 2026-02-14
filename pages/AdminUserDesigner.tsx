import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { User, UserRole, UserConfig, MqttConfig } from '../types';
import ClientDashboard from './ClientDashboard';
import ClientControls from './ClientControls';
import { Settings, Layout, ChevronLeft, Save, Monitor, MousePointer2, AlertTriangle } from 'lucide-react';

const AdminUserDesigner: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            fetchUser(userId);
        }
    }, [userId]);

    const fetchUser = async (id: string) => {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('Error fetching user:', fetchError);
            setError('Could not load user profile');
        } else if (data) {
            setUser({
                id: data.id,
                companyId: data.company_id,
                name: data.full_name,
                role: data.role as UserRole,
                isActive: data.is_active,
                config: data.config as UserConfig,
                mqttConfig: data.mqtt_config as MqttConfig,
                language: data.language
            });
        }
        setLoading(false);
    };

    const updateConfig = async (newConfig: UserConfig) => {
        if (!user) return;

        setSaving(true);
        setError(null);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ config: newConfig })
            .eq('id', user.id);

        if (updateError) {
            console.error('Error saving configuration:', updateError);
            setError('Sync failed: ' + updateError.message);
            // Original line: alert('Error saving configuration: ' + error.message); - removed as per instruction to set error
        } else {
            setUser({ ...user, config: newConfig });
        }
        setSaving(false);
    };

    const toggleToggle = (key: keyof UserConfig) => {
        if (!user) return;
        const newConfig = {
            ...user.config,
            [key]: !user.config[key]
        };
        updateConfig(newConfig);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-frost-100 border-t-frost-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading Designer...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
            {/* Designer Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        title="Back to User List"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Dashboard Designer</h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Customizing for <span className="text-frost-600 font-bold">{user.name}</span> ({user.companyId})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {error ? (
                        <div className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-red-100">
                            <AlertTriangle size={14} />
                            {error}
                        </div>
                    ) : (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${saving ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                            <Save size={14} />
                            {saving ? 'Syncing...' : 'Live Synced'}
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Workspace Sidebar */}
                <aside className="w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0 shadow-sm">
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Layout size={14} />
                                Visible Widgets
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { key: 'showTemperatureChart', label: 'Temperature History', description: 'Real-time temperature trend line' },
                                    { key: 'showPressureChart', label: 'Pressure Analysis', description: 'Live suction pressure tracking' },
                                    { key: 'showPowerChart', label: 'Power Consumption', description: 'Energy usage statistics' },
                                ].map((item) => (
                                    <label
                                        key={item.key}
                                        className={`block p-4 rounded-2xl border-2 transition-all cursor-pointer group ${user.config[item.key as keyof UserConfig]
                                            ? 'border-frost-500 bg-frost-50/30'
                                            : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className={`font-bold text-sm ${user.config[item.key as keyof UserConfig] ? 'text-frost-900' : 'text-slate-700'}`}>
                                                    {item.label}
                                                </p>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={!!user.config[item.key as keyof UserConfig]}
                                                onChange={() => toggleToggle(item.key as keyof UserConfig)}
                                            />
                                            <div className={`w-10 h-6 rounded-full relative transition-colors ${user.config[item.key as keyof UserConfig] ? 'bg-frost-500' : 'bg-slate-200'
                                                }`}>
                                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${user.config[item.key as keyof UserConfig] ? 'translate-x-4' : 'translate-x-0'
                                                    }`} />
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Settings size={14} />
                                Access Privileges
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { key: 'allowSetpointControl', label: 'Temperature Setpoints', description: 'Allow client to change target temp' },
                                    { key: 'allowPowerControl', label: 'Main Power Switch', description: 'Remote start/stop bypass' },
                                ].map((item) => (
                                    <label
                                        key={item.key}
                                        className={`block p-4 rounded-2xl border-2 transition-all cursor-pointer group ${user.config[item.key as keyof UserConfig]
                                            ? 'border-emerald-500 bg-emerald-50/30'
                                            : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className={`font-bold text-sm ${user.config[item.key as keyof UserConfig] ? 'text-emerald-900' : 'text-slate-700'}`}>
                                                    {item.label}
                                                </p>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={!!user.config[item.key as keyof UserConfig]}
                                                onChange={() => toggleToggle(item.key as keyof UserConfig)}
                                            />
                                            <div className={`w-10 h-6 rounded-full relative transition-colors ${user.config[item.key as keyof UserConfig] ? 'bg-emerald-500' : 'bg-slate-200'
                                                }`}>
                                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${user.config[item.key as keyof UserConfig] ? 'translate-x-4' : 'translate-x-0'
                                                    }`} />
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </section>
                    </div>
                </aside>

                {/* Live Preview Pane */}
                <main className="flex-1 bg-slate-100/50 p-8 overflow-y-auto">
                    <div className="max-w-6xl mx-auto space-y-6">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                            <Monitor size={14} />
                            Client View Preview
                        </div>

                        <div className="bg-white rounded-[32px] p-10 shadow-xl border border-white relative min-h-[800px]">
                            {/* Interaction Blocker/Overlay - subtly indicating this is a preview */}
                            <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-slate-900/10 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold text-slate-700">
                                <MousePointer2 size={12} />
                                LIVE PREVIEW MODE
                            </div>

                            <div className="space-y-12">
                                <ClientDashboard user={user} />
                                <ClientControls user={user} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminUserDesigner;
