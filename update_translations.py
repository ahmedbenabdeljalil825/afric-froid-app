# -*- coding: utf-8 -*-
import re

# 1. Update types.ts
with open('types.ts', 'r', encoding='utf-8') as f:
    types_content = f.read()

new_keys = """  actualState: string;
  activate: string;
  state: string;
  sendCommand: string;
  send: string;
  enterText: string;
  actual: string;
  sendUpdate: string;
  colorPickerPending: string;
  timePickerPending: string;"""

types_content = types_content.replace('export interface Translation {', 'export interface Translation {\n' + new_keys)

with open('types.ts', 'w', encoding='utf-8') as f:
    f.write(types_content)

# 2. Update constants.ts
with open('constants.ts', 'r', encoding='utf-8') as f:
    constants_content = f.read()

en_keys = """
      actualState: 'Actual State',
      activate: 'ACTIVATE',
      state: 'STATE',
      sendCommand: 'Send Command',
      send: 'Send',
      enterText: 'Enter text...',
      actual: 'Actual',
      sendUpdate: 'Send Update',
      colorPickerPending: 'Color Picker (Pending Split UI)',
      timePickerPending: 'Time Picker (Pending Split UI)',
"""

fr_keys = """
      actualState: 'État Actuel',
      activate: 'ACTIVER',
      state: 'ÉTAT',
      sendCommand: 'Envoyer Commande',
      send: 'Envoyer',
      enterText: 'Saisir texte...',
      actual: 'Actuel',
      sendUpdate: 'Envoyer Mise à jour',
      colorPickerPending: 'Sélecteur de Couleur (En attente)',
      timePickerPending: 'Sélecteur d\\'Heure (En attente)',
"""

constants_content = constants_content.replace('en: {', 'en: {' + en_keys)
constants_content = constants_content.replace('fr: {', 'fr: {' + fr_keys)

with open('constants.ts', 'w', encoding='utf-8') as f:
    f.write(constants_content)

print("Translations updated")
