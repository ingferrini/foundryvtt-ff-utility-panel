# Changelog

## v1.0.4 — Fix pannello vuoto (getProperty)
- Sostituiti tutti gli usi di `getProperty(...)` con `foundry.utils.getProperty(...)` per compatibilità con Foundry v13.
- Aggiornati `manifest` e `download` nel module.json alla `v1.0.4`.
## v1.0.4 — Fix property utils
- Sostituiti tutti i `getProperty` con `foundry.utils.getProperty` per compatibilità con Foundry v13.
- Fix pannello vuoto su apertura.
## v1.0.3 — Fix manifest download
- Corretto il campo `download` in module.json: ora punta a `foundryvtt-ff-utility-panel-1.0.3.zip`.
- Manifest e asset allineati alla release 1.0.3.

## v1.0.2 — UI button in controls
- Aggiunto bottone nel pannello dei Controls (barra sinistra) sotto i controlli Token per aprire rapidamente l'FF Utility Panel.

## v1.0.1 — Fix ApplicationV2 render
- Aggiunto `_replaceHTML` a FFPanel, FFActorSheet, FFItemSheet (compatibilità Foundry v13 ApplicationV2).
