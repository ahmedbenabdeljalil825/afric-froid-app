import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { User, UserRole, MqttConfig, Widget, WidgetCategory, ReadingWidgetType, ControllingWidgetType, MqttQoS } from '../types';
import { WidgetRenderer } from '../components/WidgetRenderer';
import { ChevronLeft, Save, Monitor, MousePointer2, AlertTriangle, Plus, Trash2, GripVertical, X, Settings as SettingsIcon } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';

const AdminUserDesigner: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
    const [editingWidget, setEditingWidget] = useState<Widget | null>(null);

    // Widget form state
    const [widgetForm, setWidgetForm] = useState<Partial<Widget>>({
        name: '',
        category: WidgetCategory.READING,
        widgetType: ReadingWidgetType.LINE_CHART,
        mqttTopic: '',
        mqttAction: 'SUBSCRIBE',
        qos: 0,
        retain: false,
        variableName: '',
        dataLabel: '',
        config: {},
        isActive: true,
        alarmEnabled: false,
        alarmMin: undefined,
        alarmMax: undefined
    });

    useEffect(() => {
        if (userId) {
            fetchUser(userId);
            fetchWidgets(userId);
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
                config: data.config,
                mqttConfig: data.mqtt_config as MqttConfig,
                language: data.language
            });
        }
        setLoading(false);
    };

    const fetchWidgets = async (userId: string) => {
        const { data, error: fetchError } = await supabase
            .from('widgets')
            .select('*')
            .eq('user_id', userId)
            .order('position');

        if (fetchError) {
            console.error('Error fetching widgets:', fetchError);
            setError('Could not load widgets');
        } else if (data) {
            setWidgets(data.map((w: any) => ({
                id: w.id,
                userId: w.user_id,
                name: w.name,
                category: w.category as WidgetCategory,
                widgetType: w.widget_type,
                mqttTopic: w.mqtt_topic,
                mqttAction: w.mqtt_action as 'SUBSCRIBE' | 'PUBLISH',
                qos: w.qos as MqttQoS,
                retain: w.retain,
                variableName: w.variable_name,
                dataLabel: w.data_label,
                config: w.config,
                position: w.position,
                isActive: w.is_active,
                alarmEnabled: w.alarm_enabled,
                alarmMin: w.alarm_min,
                alarmMax: w.alarm_max
            })));
        }
    };

    const openWidgetModal = (widget?: Widget) => {
        if (widget) {
            setEditingWidget(widget);
            setWidgetForm(widget);
        } else {
            setEditingWidget(null);
            setWidgetForm({
                name: '',
                category: WidgetCategory.READING,
                widgetType: ReadingWidgetType.LINE_CHART,
                mqttTopic: user?.mqttConfig?.topics.telemetry || '',
                mqttAction: 'SUBSCRIBE',
                qos: 0,
                retain: false,
                variableName: '',
                dataLabel: '',
                config: {},
                isActive: true,
                alarmEnabled: false,
                alarmMin: undefined,
                alarmMax: undefined
            });
        }
        setIsWidgetModalOpen(true);
    };

    const handleSaveWidget = async () => {
        if (!user || !widgetForm.name || !widgetForm.mqttTopic || !widgetForm.variableName) {
            setError('Please fill all required fields');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            if (editingWidget) {
                // Update existing widget
                const { error: updateError } = await supabase
                    .from('widgets')
                    .update({
                        name: widgetForm.name,
                        category: widgetForm.category,
                        widget_type: widgetForm.widgetType,
                        mqtt_topic: widgetForm.mqttTopic,
                        mqtt_action: widgetForm.mqttAction,
                        qos: widgetForm.qos || 0,
                        retain: widgetForm.retain || false,
                        variable_name: widgetForm.variableName,
                        data_label: widgetForm.dataLabel,
                        config: widgetForm.config,
                        is_active: widgetForm.isActive,
                        alarm_enabled: widgetForm.alarmEnabled,
                        alarm_min: widgetForm.alarmMin,
                        alarm_max: widgetForm.alarmMax
                    })
                    .eq('id', editingWidget.id);

                if (updateError) throw updateError;
            } else {
                // Create new widget
                const { error: insertError } = await supabase
                    .from('widgets')
                    .insert({
                        user_id: user.id,
                        name: widgetForm.name,
                        category: widgetForm.category,
                        widget_type: widgetForm.widgetType,
                        mqtt_topic: widgetForm.mqttTopic,
                        mqtt_action: widgetForm.mqttAction,
                        qos: widgetForm.qos || 0,
                        retain: widgetForm.retain || false,
                        variable_name: widgetForm.variableName,
                        data_label: widgetForm.dataLabel,
                        config: widgetForm.config || {},
                        position: widgets.length,
                        is_active: widgetForm.isActive ?? true,
                        alarm_enabled: widgetForm.alarmEnabled ?? false,
                        alarm_min: widgetForm.alarmMin,
                        alarm_max: widgetForm.alarmMax
                    });

                if (insertError) throw insertError;
            }

            await fetchWidgets(user.id);
            setIsWidgetModalOpen(false);
        } catch (err: any) {
            console.error('Error saving widget:', err);
            setError('Failed to save widget: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWidget = async (widgetId: string) => {
        if (!confirm('Are you sure you want to delete this widget?')) return;

        setSaving(true);
        const { error: deleteError } = await supabase
            .from('widgets')
            .delete()
            .eq('id', widgetId);

        if (deleteError) {
            setError('Failed to delete widget');
        } else {
            await fetchWidgets(user!.id);
        }
        setSaving(false);
    };

    const toggleWidgetActive = async (widget: Widget) => {
        const { error: updateError } = await supabase
            .from('widgets')
            .update({ is_active: !widget.isActive })
            .eq('id', widget.id);

        if (!updateError) {
            await fetchWidgets(user!.id);
        }
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
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Widget Designer</h1>
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
                            {saving ? 'Saving...' : 'Auto-Saved'}
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Widget Management Sidebar */}
                <aside className="w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
                    <div className="p-6 border-b border-slate-100">
                        <button
                            onClick={() => openWidgetModal()}
                            className="w-full flex items-center justify-center gap-2 bg-frost-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-frost-600 transition-colors"
                        >
                            <Plus size={18} />
                            Add New Widget
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                            Widgets ({widgets.length})
                        </h2>
                        {widgets.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <SettingsIcon size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No widgets yet</p>
                                <p className="text-xs mt-1">Click "Add New Widget" to start</p>
                            </div>
                        ) : (
                            widgets.map((widget) => (
                                <div
                                    key={widget.id}
                                    className={`p-4 rounded-xl border-2 transition-all ${widget.isActive
                                        ? 'border-frost-200 bg-frost-50/30'
                                        : 'border-slate-100 bg-slate-50 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <GripVertical size={16} className="text-slate-300 mt-1 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="font-bold text-sm text-slate-900 truncate">{widget.name}</h3>
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={() => openWidgetModal(widget)}
                                                        className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                                                        title="Edit widget"
                                                    >
                                                        <SettingsIcon size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteWidget(widget.id)}
                                                        className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors"
                                                        title="Delete widget"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${widget.category === WidgetCategory.READING
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {widget.category}
                                                    </span>
                                                    <span className="text-slate-500">{widget.widgetType}</span>
                                                </div>
                                                <p className="text-slate-500 font-mono truncate" title={widget.mqttTopic}>
                                                    📡 {widget.mqttTopic}
                                                </p>
                                                <p className="text-slate-500 font-mono truncate" title={widget.variableName}>
                                                    🔍 {widget.variableName}
                                                </p>
                                            </div>
                                            <label className="flex items-center gap-2 mt-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={widget.isActive}
                                                    onChange={() => toggleWidgetActive(widget)}
                                                />
                                                <div className={`w-8 h-5 rounded-full relative transition-colors ${widget.isActive ? 'bg-frost-500' : 'bg-slate-300'
                                                    }`}>
                                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${widget.isActive ? 'translate-x-3' : 'translate-x-0'
                                                        }`} />
                                                </div>
                                                <span className="text-xs text-slate-600 font-medium">
                                                    {widget.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
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
                            <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-slate-900/10 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold text-slate-700">
                                <MousePointer2 size={12} />
                                LIVE PREVIEW MODE
                            </div>

                            {/* Preview content with graphical widgets */}
                            <div className="space-y-10">
                                {widgets.filter(w => w.isActive && w.category === WidgetCategory.READING).length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                            Monitoring
                                            <span className="text-xs font-normal text-slate-400 ml-1">
                                                ({widgets.filter(w => w.isActive && w.category === WidgetCategory.READING).length} widgets)
                                            </span>
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {widgets.filter(w => w.isActive && w.category === WidgetCategory.READING).map((w, i) => (
                                                <div key={w.id} className="min-h-[240px]">
                                                    <WidgetRenderer widget={w} colorIndex={i} isPreview={true} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {widgets.filter(w => w.isActive && w.category === WidgetCategory.CONTROLLING).length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            Controls
                                            <span className="text-xs font-normal text-slate-400 ml-1">
                                                ({widgets.filter(w => w.isActive && w.category === WidgetCategory.CONTROLLING).length} widgets)
                                            </span>
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {widgets.filter(w => w.isActive && w.category === WidgetCategory.CONTROLLING).map((w, i) => (
                                                <div key={w.id} className="min-h-[240px]">
                                                    <WidgetRenderer widget={w} colorIndex={i + 2} isPreview={true} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {widgets.filter(w => w.isActive).length === 0 && (
                                    <div className="text-center py-20 text-slate-400">
                                        <SettingsIcon size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-lg font-bold">No Active Widgets</p>
                                        <p className="text-sm mt-2">Add widgets from the sidebar to see them here</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Widget Modal */}
            {isWidgetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingWidget ? 'Edit Widget' : 'Create New Widget'}
                            </h3>
                            <button onClick={() => setIsWidgetModalOpen(false)} className="text-slate-400 hover:text-slate-600" title="Close modal">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                    Widget Name *
                                    <InfoTooltip title="Widget Name" content="Display name for this widget on the dashboard." />
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none"
                                    placeholder="e.g., Temperature Chart"
                                    value={widgetForm.name || ''}
                                    onChange={e => setWidgetForm({ ...widgetForm, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                        Category *
                                        <InfoTooltip title="Category" content="Reading widgets display data from the device. Controlling widgets send commands to the device." />
                                    </label>
                                    <select
                                        title="Widget category"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none"
                                        value={widgetForm.category}
                                        onChange={e => {
                                            const category = e.target.value as WidgetCategory;
                                            setWidgetForm({
                                                ...widgetForm,
                                                category,
                                                widgetType: category === WidgetCategory.READING ? ReadingWidgetType.LINE_CHART : ControllingWidgetType.BUTTON,
                                                mqttAction: category === WidgetCategory.READING ? 'SUBSCRIBE' : 'PUBLISH'
                                            });
                                        }}
                                    >
                                        <option value={WidgetCategory.READING}>Reading (Display)</option>
                                        <option value={WidgetCategory.CONTROLLING}>Controlling (Input)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                        Type *
                                        <InfoTooltip title="Widget Type" content="Choose how the data or control should be visualized (e.g., Chart, Gauge, Button)." />
                                    </label>
                                    <select
                                        title="Widget type"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none"
                                        value={widgetForm.widgetType}
                                        onChange={e => setWidgetForm({ ...widgetForm, widgetType: e.target.value as ReadingWidgetType | ControllingWidgetType })}
                                    >
                                        {widgetForm.category === WidgetCategory.READING ? (
                                            <>
                                                <option value={ReadingWidgetType.LINE_CHART}>Line Chart</option>
                                                <option value={ReadingWidgetType.BAR_CHART}>Bar Chart</option>
                                                <option value={ReadingWidgetType.GAUGE}>Advanced Gauge</option>
                                                <option value={ReadingWidgetType.TEXT_DISPLAY}>Text Display</option>
                                                <option value={ReadingWidgetType.STATUS_INDICATOR}>Status Indicator</option>
                                                <option value={ReadingWidgetType.LED_INDICATOR}>LED Indicator</option>
                                                <option value={ReadingWidgetType.MULTI_STATE_INDICATOR}>Multi-State Indicator</option>
                                                <option value={ReadingWidgetType.PROGRESS_BAR}>Progress Bar</option>
                                                <option value={ReadingWidgetType.CIRCULAR_PROGRESS}>Circular Progress</option>
                                                <option value={ReadingWidgetType.TEXT_LOG}>Text Log</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value={ControllingWidgetType.BUTTON}>Button</option>
                                                <option value={ControllingWidgetType.TOGGLE}>Toggle Switch</option>
                                                <option value={ControllingWidgetType.SLIDER}>Slider</option>
                                                <option value={ControllingWidgetType.TEXT_INPUT}>Text Input</option>
                                                <option value={ControllingWidgetType.NUMBER_INPUT}>Number Input</option>
                                                <option value={ControllingWidgetType.COLOR_PICKER}>Color Picker</option>
                                                <option value={ControllingWidgetType.COMBO_BOX}>Combo Box</option>
                                                <option value={ControllingWidgetType.TIME_PICKER}>Time Picker</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-sm font-black text-slate-900 mb-4">MQTT Configuration</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                            MQTT Topic *
                                            <InfoTooltip title="MQTT Topic" content="The communication path for this widget. E.g., 'factory/temp' or 'device/1/cmd'." />
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none font-mono text-sm"
                                            placeholder={widgetForm.category === WidgetCategory.READING ? "e.g., device/telemetry" : "e.g., device/command"}
                                            value={widgetForm.mqttTopic || ''}
                                            onChange={e => setWidgetForm({ ...widgetForm, mqttTopic: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Action</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="mqttAction"
                                                    checked={widgetForm.mqttAction === 'SUBSCRIBE'}
                                                    onChange={() => setWidgetForm({ ...widgetForm, mqttAction: 'SUBSCRIBE' })}
                                                    className="text-frost-600"
                                                />
                                                <span className="text-sm">Subscribe</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="mqttAction"
                                                    checked={widgetForm.mqttAction === 'PUBLISH'}
                                                    onChange={() => setWidgetForm({ ...widgetForm, mqttAction: 'PUBLISH' })}
                                                    className="text-frost-600"
                                                />
                                                <span className="text-sm">Publish</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                                QoS
                                                <InfoTooltip title="Quality of Service" content="0: At most once delivery. 1: At least once. 2: Exactly once (Slowest but most reliable)." />
                                            </label>
                                            <select
                                                title="MQTT Quality of Service"
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none text-sm"
                                                value={widgetForm.qos || 0}
                                                onChange={e => setWidgetForm({ ...widgetForm, qos: parseInt(e.target.value) as MqttQoS })}
                                            >
                                                <option value={0}>0 - At most once</option>
                                                <option value={1}>1 - At least once</option>
                                                <option value={2}>2 - Exactly once</option>
                                            </select>
                                        </div>
                                        <div className="flex items-end pb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={widgetForm.retain || false}
                                                    onChange={e => setWidgetForm({ ...widgetForm, retain: e.target.checked })}
                                                    className="w-4 h-4 rounded text-frost-600 border-slate-300"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Retain Message</span>
                                                <InfoTooltip title="Retain Flag" content="If enabled, the MQTT broker stores the last message to show it immediately to new subscribers." />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-sm font-black text-slate-900 mb-4">Widget Configuration</h4>
                                <div className="space-y-4">
                                    {/* Gauge / Slider / Progress Config */}
                                    {(widgetForm.widgetType === ReadingWidgetType.GAUGE ||
                                        widgetForm.widgetType === ReadingWidgetType.PROGRESS_BAR ||
                                        widgetForm.widgetType === ReadingWidgetType.CIRCULAR_PROGRESS ||
                                        widgetForm.widgetType === ControllingWidgetType.SLIDER) && (
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Min Value</label>
                                                    <input
                                                        type="number"
                                                        title="Minimum value"
                                                        placeholder="0"
                                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm"
                                                        value={(widgetForm.config as any)?.min ?? 0}
                                                        onChange={e => setWidgetForm({ ...widgetForm, config: { ...(widgetForm.config as any), min: parseFloat(e.target.value) } })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Max Value</label>
                                                    <input
                                                        type="number"
                                                        title="Maximum value"
                                                        placeholder="100"
                                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm"
                                                        value={(widgetForm.config as any)?.max ?? 100}
                                                        onChange={e => setWidgetForm({ ...widgetForm, config: { ...(widgetForm.config as any), max: parseFloat(e.target.value) } })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Unit</label>
                                                    <input
                                                        type="text"
                                                        title="Measurement unit"
                                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm"
                                                        placeholder="e.g., °C, %"
                                                        value={(widgetForm.config as any)?.unit ?? ''}
                                                        onChange={e => setWidgetForm({ ...widgetForm, config: { ...(widgetForm.config as any), unit: e.target.value } })}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                    {/* Chart Config */}
                                    {(widgetForm.widgetType === ReadingWidgetType.LINE_CHART ||
                                        widgetForm.widgetType === ReadingWidgetType.BAR_CHART) && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Time Window (mins)</label>
                                                    <input
                                                        type="number"
                                                        title="Time window in minutes"
                                                        placeholder="30"
                                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm"
                                                        value={(widgetForm.config as any)?.timeWindow ?? 30}
                                                        onChange={e => setWidgetForm({ ...widgetForm, config: { ...(widgetForm.config as any), timeWindow: parseInt(e.target.value) } })}
                                                    />
                                                </div>
                                                <div className="flex items-end pb-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={(widgetForm.config as any)?.showPoints ?? true}
                                                            onChange={e => setWidgetForm({ ...widgetForm, config: { ...(widgetForm.config as any), showPoints: e.target.checked } })}
                                                            className="w-4 h-4 rounded text-frost-600 border-slate-300"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">Show Points</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                    {/* Button Config */}
                                    {widgetForm.widgetType === ControllingWidgetType.BUTTON && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Button Label</label>
                                                <input
                                                    type="text"
                                                    title="Button label text"
                                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm"
                                                    placeholder="e.g., START PUMP"
                                                    value={(widgetForm.config as any)?.label ?? ''}
                                                    onChange={e => setWidgetForm({ ...widgetForm, config: { ...(widgetForm.config as any), label: e.target.value } })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Payload to Send</label>
                                                <input
                                                    type="text"
                                                    title="MQTT payload to send"
                                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm font-mono"
                                                    placeholder='e.g., {"command": "start"}'
                                                    value={(widgetForm.config as any)?.payload ?? ''}
                                                    onChange={e => setWidgetForm({ ...widgetForm, config: { ...(widgetForm.config as any), payload: e.target.value } })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Log Config */}
                                    {widgetForm.widgetType === ReadingWidgetType.TEXT_LOG && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Max Entries</label>
                                                <input
                                                    type="number"
                                                    title="Maximum log entries"
                                                    placeholder="50"
                                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm"
                                                    value={(widgetForm.config as any)?.maxEntries ?? 50}
                                                    onChange={e => setWidgetForm({ ...widgetForm, config: { ...(widgetForm.config as any), maxEntries: parseInt(e.target.value) } })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Font Size (px)</label>
                                                <input
                                                    type="number"
                                                    title="Log font size"
                                                    placeholder="12"
                                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-sm"
                                                    value={(widgetForm.config as any)?.fontSize ?? 12}
                                                    onChange={e => setWidgetForm({ ...widgetForm, config: { ...(widgetForm.config as any), fontSize: parseInt(e.target.value) } })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-sm font-black text-slate-900 mb-4">Data Extraction</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Variable Name *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none font-mono text-sm"
                                            placeholder="e.g., Temp or setpoint heating"
                                            value={widgetForm.variableName || ''}
                                            onChange={e => setWidgetForm({ ...widgetForm, variableName: e.target.value })}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Enter the exact name of the variable as published by the PLC</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Data Label</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none"
                                            placeholder="e.g., Temperature (°C)"
                                            value={widgetForm.dataLabel || ''}
                                            onChange={e => setWidgetForm({ ...widgetForm, dataLabel: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-black text-slate-900">Alarm Thresholds</h4>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-frost-600 border-slate-300"
                                            checked={widgetForm.alarmEnabled || false}
                                            onChange={e => setWidgetForm({ ...widgetForm, alarmEnabled: e.target.checked })}
                                        />
                                        <span className="text-sm font-bold text-slate-700">Enable Monitoring</span>
                                        <InfoTooltip title="Alarm Monitoring" content="If enabled, the system will track real-time data and trigger an alarm if thresholds are exceeded." />
                                    </label>
                                </div>

                                {widgetForm.alarmEnabled && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Min Threshold</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-red-500 text-sm"
                                                placeholder="Trigger alarm if below..."
                                                value={widgetForm.alarmMin ?? ''}
                                                onChange={e => setWidgetForm({ ...widgetForm, alarmMin: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Max Threshold</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-red-500 text-sm"
                                                placeholder="Trigger alarm if above..."
                                                value={widgetForm.alarmMax ?? ''}
                                                onChange={e => setWidgetForm({ ...widgetForm, alarmMax: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setIsWidgetModalOpen(false)}
                                className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveWidget}
                                disabled={!widgetForm.name || !widgetForm.mqttTopic || !widgetForm.variableName}
                                className="flex-1 px-4 py-2 text-white bg-frost-500 hover:bg-frost-600 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : (editingWidget ? 'Update Widget' : 'Create Widget')}
                            </button>
                        </div>
                    </div >
                </div >
            )}
        </div >
    );
};

export default AdminUserDesigner;
