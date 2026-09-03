const fs = require('fs');

const path = 'components/WidgetRenderer.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the start and end of the Controlling Widgets section
const startPattern = /\/\/ --- Controlling Widgets ---\r?\nconst ButtonWidget/s;
const endPattern = /export const WidgetRenderer/s;

const matchStart = content.search(startPattern);
const matchEnd = content.search(endPattern);

if (matchStart === -1 || matchEnd === -1) {
    console.error('Could not find boundaries');
    process.exit(1);
}

const before = content.substring(0, matchStart);
const after = content.substring(matchEnd);

const newWidgets = `// --- Controlling Widgets ---
// Universal helper to get the publish topic and variable
const getPublishTopic = (widget: Widget) => (widget.config as any)?.publishTopic || widget.mqttTopic;
const getPublishVar = (widget: Widget) => (widget.config as any)?.publishVariableName || widget.variableName;

const ButtonWidget: React.FC<{ widget: Widget; colorIndex: number; isPreview?: boolean; currentValue?: any; language: Language }> = ({ widget, colorIndex, isPreview, currentValue, language }) => {
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);

    const handlePress = () => {
        if (isPreview) return;
        const config = widget.config as any;
        let payload = config?.payload || 'PRESS';
        try { payload = JSON.parse(payload); } catch (e) { }
        mqttService.publishVariableUpdate(pubTopic, pubVar, payload);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col justify-between group">
            <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className={color.text} />
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest">{widget.name}</h4>
            </div>
            
            <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between mb-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Actual State</span>
                <span className="text-xs font-black text-[#002060]">{currentValue !== undefined ? String(currentValue) : '--'}</span>
            </div>

            <button
                onClick={handlePress}
                className={"w-full py-4 px-6 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg active:scale-95 active:shadow-inner text-white " + color.gradient}
            >
                {(widget.config as ButtonConfig).buttonText || t.activate}
            </button>
        </div>
    );
};

const ToggleWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const t = TRANSLATIONS[language];
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);

    const parseValue = (val: any): boolean => {
        if (val === undefined || val === null) return false;
        const config = widget.config as any;
        if (config?.onPayload !== undefined && config?.offPayload !== undefined && config.onPayload !== '' && config.offPayload !== '') {
            try {
                if (val === JSON.parse(config.onPayload)) return true;
                if (val === JSON.parse(config.offPayload)) return false;
            } catch (e) {
                if (String(val) === String(config.onPayload)) return true;
                if (String(val) === String(config.offPayload)) return false;
            }
        }
        const s = String(val).toLowerCase();
        return s === 'true' || s === '1' || s === 'on' || s === 'active' || s === 'running';
    };

    const actualIsOn = parseValue(currentValue);
    const [draftIsOn, setDraftIsOn] = useState(actualIsOn);

    useEffect(() => {
        setDraftIsOn(actualIsOn);
    }, [actualIsOn]);

    const handleSubmit = () => {
        let targetPayload: any = draftIsOn;
        const config = widget.config as any;
        if (config?.onPayload !== undefined && config?.offPayload !== undefined && config.onPayload !== '' && config.offPayload !== '') {
            const raw = draftIsOn ? config.onPayload : config.offPayload;
            try { targetPayload = JSON.parse(raw); } catch (e) { targetPayload = raw; }
        }
        mqttService.publishVariableUpdate(pubTopic, pubVar, targetPayload);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ToggleLeft size={16} className={color.text} />
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                </div>
                <div className={"px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white " + (actualIsOn ? color.gradient : 'bg-slate-300')}>
                    ACTUAL: {actualIsOn ? t.on.toUpperCase() : t.off.toUpperCase()}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-4 mt-2">
                <button
                    onClick={() => setDraftIsOn(!draftIsOn)}
                    className="relative focus:outline-none transform transition-transform hover:scale-105 active:scale-95"
                >
                    {draftIsOn ? (
                        <ToggleRight size={56} className={color.text + " drop-shadow-md"} />
                    ) : (
                        <ToggleLeft size={56} className="text-slate-200" />
                    )}
                </button>
                <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors">
                    <Send size={12} /> Send Command
                </button>
            </div>
        </div>
    );
};

const SliderWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState<number>(0);
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);

    useEffect(() => {
        if (currentValue !== undefined && !isNaN(Number(currentValue))) {
            setDraftVal(Number(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    const config = widget.config as any;
    const min = config?.min ?? 0;
    const max = config?.max ?? 100;

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className={color.text} />
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                </div>
                <div className={"px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white " + color.gradient}>
                    ACTUAL: {currentValue !== undefined ? Number(currentValue).toFixed(1) : '--'}
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-4">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={config?.step || 1}
                    value={draftVal}
                    onChange={(e) => setDraftVal(Number(e.target.value))}
                    className="w-full accent-slate-900 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-bold text-slate-500">{draftVal}</span>
                    <button onClick={handleSubmit} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800">
                        <Send size={12} /> Send
                    </button>
                </div>
            </div>
        </div>
    );
};

const TextInputWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState('');
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);

    useEffect(() => {
        if (currentValue !== undefined) {
            setDraftVal(String(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Type size={16} className={color.text} />
                    <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                </div>
                <div className="text-[10px] text-slate-400 font-bold max-w-[100px] truncate" title={String(currentValue)}>
                    Actual: {currentValue !== undefined ? String(currentValue) : '--'}
                </div>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={draftVal}
                    onChange={(e) => setDraftVal(e.target.value)}
                    className="flex-1 w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-slate-500 outline-none font-medium"
                    placeholder="Enter text..."
                />
                <button onClick={handleSubmit} className={"px-4 rounded-xl text-white flex items-center justify-center " + color.gradient}>
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
};

const NumberInputWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState<number>(0);
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);

    useEffect(() => {
        if (currentValue !== undefined && !isNaN(Number(currentValue))) {
            setDraftVal(Number(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center gap-2 mb-4">
                <Hash size={16} className={color.text} />
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
            </div>

            <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex items-center justify-between mb-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Actual</span>
                <span className="text-sm font-black text-[#002060]">{currentValue !== undefined ? Number(currentValue) : '--'}</span>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={() => setDraftVal(draftVal - 1)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl font-bold hover:bg-slate-200">-</button>
                <input
                    type="number"
                    value={draftVal}
                    onChange={(e) => setDraftVal(Number(e.target.value))}
                    className="flex-1 w-full px-2 py-2 text-center text-lg font-black rounded-xl border border-slate-200 outline-none"
                />
                <button onClick={() => setDraftVal(draftVal + 1)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl font-bold hover:bg-slate-200">+</button>
            </div>
            <button onClick={handleSubmit} className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800">
                <Send size={12} /> Send Update
            </button>
        </div>
    );
};

const ColorPickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {
    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 h-full flex flex-col items-center justify-center text-slate-500">
            <Info size={32} className="mb-2 opacity-30" />
            <span className="text-xs font-bold uppercase tracking-widest">Color Picker (Pending Split UI)</span>
        </div>
    );
};

const TimePickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {
    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 h-full flex flex-col items-center justify-center text-slate-500">
            <Clock size={32} className="mb-2 opacity-30" />
            <span className="text-xs font-bold uppercase tracking-widest">Time Picker (Pending Split UI)</span>
        </div>
    );
};

const ComboBoxWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState<string>('');
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);
    const config = widget.config as ComboBoxConfig;

    useEffect(() => {
        if (currentValue !== undefined) {
            setDraftVal(String(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                <div className="text-[10px] text-slate-400 font-bold max-w-[100px] truncate" title={String(currentValue)}>
                    Actual: {currentValue !== undefined ? String(currentValue) : '--'}
                </div>
            </div>

            <div className="flex gap-2">
                <select
                    value={draftVal}
                    onChange={(e) => setDraftVal(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none"
                >
                    {config?.options?.map((opt, i) => (
                        <option key={i} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <button onClick={handleSubmit} className={"px-4 rounded-xl text-white flex items-center justify-center " + color.gradient}>
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
};

const RadioButtonsWidget: React.FC<{ widget: Widget; colorIndex: number; currentValue?: any; language: Language }> = ({ widget, colorIndex, currentValue, language }) => {
    const color = getColor(colorIndex);
    const [draftVal, setDraftVal] = useState<string>('');
    const pubTopic = getPublishTopic(widget);
    const pubVar = getPublishVar(widget);
    const config = widget.config as RadioButtonsConfig;

    useEffect(() => {
        if (currentValue !== undefined) {
            setDraftVal(String(currentValue));
        }
    }, [currentValue]);

    const handleSubmit = () => {
        mqttService.publishVariableUpdate(pubTopic, pubVar, draftVal);
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-[#002060] uppercase tracking-widest flex-1 truncate">{widget.name}</h4>
                <div className={"px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white " + color.gradient}>
                    ACTUAL: {currentValue !== undefined ? String(currentValue) : '--'}
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2 mb-4">
                {config?.options?.map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name={"radio_" + widget.id}
                            value={opt.value}
                            checked={draftVal === String(opt.value)}
                            onChange={(e) => setDraftVal(e.target.value)}
                            className="accent-slate-900"
                        />
                        <span className="text-sm font-bold text-slate-600">{opt.label}</span>
                    </label>
                ))}
            </div>
            
            <button onClick={handleSubmit} className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800">
                <Send size={12} /> Send Command
            </button>
        </div>
    );
};

`

const newContent = before + newWidgets + after;
fs.writeFileSync(path, newContent, 'utf8');
console.log('Widgets rewritten successfully');
