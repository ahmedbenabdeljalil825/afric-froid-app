import re

with open('components/WidgetRenderer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const ColorPickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {\n    const isClient = React.useContext(ClientContext);',
    'const ColorPickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {\n    const isClient = React.useContext(ClientContext);\n    const t = TRANSLATIONS[language];'
)

content = content.replace(
    'const TimePickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {\n    const isClient = React.useContext(ClientContext);',
    'const TimePickerWidget: React.FC<{ widget: Widget; colorIndex: number; language: Language }> = ({ widget, colorIndex, language }) => {\n    const isClient = React.useContext(ClientContext);\n    const t = TRANSLATIONS[language];'
)

with open('components/WidgetRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added t")
