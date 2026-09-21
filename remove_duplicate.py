import re

with open('constants.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("      sendCommand: 'Send Command',\n", "")
content = content.replace("      sendCommand: 'Envoyer Commande',\n", "")

with open('constants.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Duplicates removed")
