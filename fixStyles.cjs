const fs = require('fs');
const path = 'components/WidgetRenderer.tsx';
let content = fs.readFileSync(path, 'utf8');

// ButtonWidget
content = content.replace(
    /className=\{"w-full py-4 px-6 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg active:scale-95 active:shadow-inner text-white " \+ color\.gradient\}/g,
    `className="w-full py-4 px-6 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg active:scale-95 active:shadow-inner text-white" style={{ backgroundColor: color.primary }}`
);

// ToggleWidget pill
content = content.replace(
    /className=\{"px-2 py-0\.5 rounded-full text-\[9px\] font-black tracking-widest text-white " \+ \(actualIsOn \? color\.gradient : 'bg-slate-300'\)\}/g,
    `className={"px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white " + (actualIsOn ? '' : 'bg-slate-300')} style={actualIsOn ? { backgroundColor: color.primary } : {}}`
);

// SliderWidget pill
content = content.replace(
    /className=\{"px-2 py-0\.5 rounded-full text-\[9px\] font-black tracking-widest text-white " \+ color\.gradient\}/g,
    `className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white" style={{ backgroundColor: color.primary }}`
);

// TextInputWidget / ComboBoxWidget button
content = content.replace(
    /className=\{"px-4 rounded-xl text-white flex items-center justify-center " \+ color\.gradient\}/g,
    `className="px-4 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: color.primary }}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed styles.');
