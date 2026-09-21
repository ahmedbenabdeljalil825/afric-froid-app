import re

with open('components/WidgetRenderer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ClientContext at the top
content = re.sub(
    r'(import React,.*?from \'react\';)',
    r'\1\n\nexport const ClientContext = React.createContext<boolean>(false);',
    content,
    count=1
)

# 2. Add isClient to WidgetRendererProps
content = content.replace(
    'isOffline?: boolean;',
    'isOffline?: boolean;\n    isClient?: boolean;'
)

content = content.replace(
    'isOffline = false',
    'isOffline = false,\n    isClient = false'
)

# 3. Wrap renderWidget with ClientContext
content = content.replace(
    '{renderWidget()}',
    '<ClientContext.Provider value={isClient}>\n            {renderWidget()}\n        </ClientContext.Provider>'
)

# 4. Inject useContext into every widget component (they start with const XXXWidget: React.FC = ...)
# We can use regex to find component definitions and insert the hook
component_pattern = re.compile(r'(const \w+Widget: React\.FC<.*?> = \(\{[^\}]+\}\) => \{)')

def insert_hook(match):
    return match.group(1) + '\n    const isClient = React.useContext(ClientContext);'

content = component_pattern.sub(insert_hook, content)

# 5. Conditionally hide InfoTooltip
content = re.sub(
    r'(<InfoTooltip[^>]*?/>)',
    r'{!isClient && \1}',
    content
)

# 6. Hide variable names and topics 
# For paragraphs containing widget.dataLabel || widget.variableName
p_pattern1 = re.compile(r'(<p className="[^"]*?text-slate-500 font-[^"]*?">)\s*\{widget\.dataLabel \|\| widget\.variableName\}\s*(</p>)', re.DOTALL)
content = p_pattern1.sub(r'{(!isClient || widget.dataLabel) && (\n            \1\n                {widget.dataLabel || widget.variableName}\n            \2\n        )}', content)

# For TextDisplayWidget
p_pattern2 = re.compile(r'(<p className="[^"]*?text-slate-500 mt-4[^"]*?">)\s*\{widget\.mqttTopic\} ? \{widget\.variableName\}\s*(</p>)', re.DOTALL)
content = p_pattern2.sub(r'{!isClient && (\n            \1\n                {widget.mqttTopic} ? {widget.variableName}\n            \2\n        )}', content)

with open('components/WidgetRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement done")
