# FF Utility Panel

Pannello Utility per FoundryVTT v13.347 + dnd5e 5.1.2.

## Funzionalità principali
- **Gestione HP/Status rapida**: ±1/±5, Full Heal, Kill, Set HP, Temp HP, Toggle Defeated (via socket lato GM).
- **Note rapide del DM (Token)**: legge/scrive note prioritarie su `gm-notes` e fallback `flags.world.gmnote`.
- **Picker condizioni**: dalla config di dnd5e; toggle veloce di condizioni sul token selezionato.
- **Widget Effetti Attivi**: elenco con icone, durata residua, enable/disable, delete.
- **Benedizione di Luxon**: con Midi‑QoL aggiunge `+1d4` a tiri d'attacco e TS; senza Midi fallback +1 ai checks abilità.
- **Actor/Item Sheet V2 (opzionali)**: griglie competenze armi/armature.
- **Macro seeder**: crea cartella “Wildemount Macros” con macro utili (inclusa “Export Mod Versions (v13)” corretta per Collection).

## Installazione via Manifest (GitHub)
URL manifest (versione 1.0.0):
```
https://raw.githubusercontent.com/ingferrini/foundryvtt-ff-utility-panel/v1.0.0/module.json
```

### The Forge
- Bazaar → Install from Manifest URL → incolla l’URL sopra.
- Poi abilita il modulo in **Manage Modules** nel tuo mondo.

## Sviluppo / Build
Questo modulo non richiede build tools: i file sono già in `dist/`.
- Script principale: `dist/module.js`
- Stili: `dist/module.css`

## Licenza
MIT
