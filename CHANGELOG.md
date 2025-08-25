# Changelog

## v1.0.5 — Render robusto (V2)
- Creazione esplicita del contenitore `section.window-content` se assente (fallback sicuro).
- Pipeline ApplicationV2 robusta: `_renderHTML`/`_replaceHTML` safe e fallback in caso di errori.
- CSS di fallback (tema-safe) per garantire visibilità del contenuto.
- Aggiornati `manifest` e `download` alla v1.0.5.

## v1.0.4 — Fix pannello vuoto (getProperty)
- Sostituiti tutti gli usi di `getProperty(...)` con `foundry.utils.getProperty(...)` per compatibilità con Foundry v13.
- Aggiornati `manifest` e `download` nel module.json alla `v1.0.4`.

## v1.0.3 — Fix manifest download
- Corretto il campo `download` in module.json: ora punta all’asset versionato.

## v1.0.2 — UI button in controls
- Bottone nei Scene Controls per aprire rapidamente il pannello.

## v1.0.1 — Fix ApplicationV2 render
- Aggiunto `_replaceHTML` a FFPanel/FFActorSheet/FFItemSheet.
