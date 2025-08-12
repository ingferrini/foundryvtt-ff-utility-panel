# Wildemount Starter v1.2.0 (Foundry v13 + TS)

**Novità**
- Picker **grafico delle condizioni** nel pannello (ApplicationV2)
- **Benedizione di Luxon**: effetto attivo tematico (+1d4 ai tiri d'attacco e TS con **Midi-QoL**; fallback +1 alle prove)
- **Editor competenze** (Armi/Armature) nello **Actor Sheet V2**

## Uso rapido (The Forge)
- `npm install` → `npm run build`
- Zippa `module.json`, `dist/`, `README.md` e caricali nella **Assets Library**
- Abilita il modulo nel mondo → si autoinstallano 6 macro utili

## Come usare
- Pannello: `Wildemount.api.openPanel()` → sezione Condizioni cliccabili + bottone “Benedizione di Luxon”
- Actor Sheet: apri un Actor → **Configure Sheet** → *Wildemount Actor Sheet (V2)* → compila **Competenze Armi/Armature**
- Macro: cartella “Wildemount Macros” (seed automatico)

## Note
- D&D5e: HP path `system.attributes.hp.value`/`max`
- Midi-QoL (opzionale): bonus 1d4 gestito via `flags.midi-qol.*`
