import re

with open('components/WidgetRenderer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. ButtonWidget
content = content.replace(
    '<span className="text-[10px] text-slate-400 font-bold uppercase">Actual State</span>',
    '<span className="text-[10px] text-slate-400 font-bold uppercase">{t.actualState}</span>'
)
content = content.replace(
    '{(widget.config as any).buttonText || \'ACTIVATE\'}',
    '{(widget.config as any).buttonText || t.activate}'
)

# 2. ToggleWidget
content = content.replace(
    'STATE: {actualIsOn ? activeLabel.toUpperCase() : inactiveLabel.toUpperCase()}',
    '{t.state}: {actualIsOn ? activeLabel.toUpperCase() : inactiveLabel.toUpperCase()}'
)
content = content.replace(
    '<Send size={12} /> Send Command',
    '<Send size={12} /> {t.sendCommand}'
)

# 3. SliderWidget
content = content.replace(
    'STATE: {currentValue !== undefined ? Number(currentValue).toFixed(1) : \'--\'}',
    '{t.state}: {currentValue !== undefined ? Number(currentValue).toFixed(1) : \'--\'}'
)
content = content.replace(
    '<Send size={12} /> Send',
    '<Send size={12} /> {t.send}'
)

# 4. TextInputWidget
content = content.replace(
    'STATE: {currentValue !== undefined ? String(currentValue) : \'--\'}',
    '{t.state}: {currentValue !== undefined ? String(currentValue) : \'--\'}'
)
content = content.replace(
    'placeholder="Enter text..."',
    'placeholder={t.enterText}'
)

# 5. NumberInputWidget
content = content.replace(
    '<span className="text-[10px] text-slate-400 font-bold uppercase">Actual</span>',
    '<span className="text-[10px] text-slate-400 font-bold uppercase">{t.actual}</span>'
)
content = content.replace(
    '<Send size={12} /> Send Update',
    '<Send size={12} /> {t.sendUpdate}'
)

# 6. ColorPickerWidget & TimePickerWidget
content = content.replace(
    'Color Picker (Pending Split UI)',
    '{t.colorPickerPending}'
)
content = content.replace(
    'Time Picker (Pending Split UI)',
    '{t.timePickerPending}'
)

with open('components/WidgetRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Hardcoded labels replaced")
