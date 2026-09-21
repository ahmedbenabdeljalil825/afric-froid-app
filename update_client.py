import re

with open('pages/ClientDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'isOffline={mqttStatus !== \'connected\'}',
    'isOffline={mqttStatus !== \'connected\'}\n                  isClient={true}'
)

with open('pages/ClientDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("ClientDashboard replaced")
