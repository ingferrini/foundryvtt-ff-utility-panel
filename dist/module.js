/* FF Utility Panel — v1.0.7 (AppV2 + Handlebars mixin) */
const MOD_ID = "foundryvtt-ff-utility-panel";
const NS = "FFUtil";
const gp = (...a)=> foundry?.utils?.getProperty?.(...a);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function hasMidi(){ return !!game.modules.get("midi-qol")?.active; }

// ---------- Macro seeder (ridotto) ----------
async function seedMacros(){
  try{
    let folder = game.folders?.getName("Wildemount Macros");
    if(!folder) folder = await Folder.create({name:"Wildemount Macros", type:"Macro", color:"#6ba4ff"});
    const def = {name:"Apri Pannello FF (DM)", command:`${NS}.api.openPanel();`, img:"icons/magic/control/buff-flight-wings-runes-blue.webp"};
    if (!game.macros?.getName(def.name)) await Macro.create({name:def.name, type:"script", img:def.img, command:def.command, folder: folder?.id});
  }catch(e){ console.error(e); }
}

// ---------- Luxon Blessing ----------
async function applyLuxonBlessing(seconds=60){
  const t = canvas.tokens?.controlled[0];
  const actor = t?.actor;
  if(!actor) return ui.notifications?.warn("Seleziona un token.");
  const changes = hasMidi() ? [
    { key:"flags.midi-qol.bonusAttackRoll", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value:"+1d4", priority:20 },
    { key:"flags.midi-qol.bonusSavingThrow", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value:"+1d4", priority:20 }
  ] : [
    { key:"system.bonuses.abilities.check", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value:"+1", priority:20 }
  ];
  await ActiveEffect.create({
    name:"Benedizione di Luxon",
    icon:"icons/magic/holy/angel-wings-prayer-blue.webp",
    origin: actor.uuid,
    disabled:false,
    duration:{ seconds, startTime: game.time.worldTime },
    changes
  }, { parent: actor });
  ui.notifications?.info("Benedizione di Luxon applicata.");
}

// ---------- FFPanel (HandlebarsApplicationMixin + AppV2) ----------
class FFPanel extends HandlebarsApplicationMixin(ApplicationV2){
  static DEFAULT_OPTIONS = {
    id: "ff-utility-panel",
    tag: "section",
    classes: ["ff-utility-panel", "sheet"],
    window: { title: "FF Utility Panel (DM)", icon: "fas fa-hat-wizard", resizable: true },
    position: { width: 640, height: 650 }
  };

  // Un’unica part "body" che usa il template handlebars
  static PARTS = {
    body: { template: `modules/${MOD_ID}/templates/panel.hbs` }
  };

  // Prepara il contesto condiviso per tutte le PARTS
  async _prepareContext(_options){
    const dnd = CONFIG?.DND5E ?? {};
    const conds = dnd?.conditions
      ? Object.entries(dnd.conditions).map(([k,v])=>({key:k,label:v}))
      : [{ key:"prone", label:"Prono" },{ key:"blinded", label:"Accecato" }];

    const t = canvas.tokens?.controlled[0] ?? null;
    const actor = t?.actor ?? null;

    // GM Note (compat: gm-notes o flag world)
    let gmNote = "";
    let noteScopeKey = { scope:"world", key:"gmnote" };
    if(t){
      const f1 = t.getFlag("gm-notes","notes");
      const f2 = t.getFlag("gm-notes","gmNote");
      if (typeof f1 === "string"){ gmNote = f1; noteScopeKey = {scope:"gm-notes", key:"notes"}; }
      else if (typeof f2 === "string"){ gmNote = f2; noteScopeKey = {scope:"gm-notes", key:"gmNote"}; }
      else {
        const f3 = t.getFlag("world","gmnote");
        if (typeof f3 === "string"){ gmNote = f3; noteScopeKey = {scope:"world", key:"gmnote"}; }
      }
    }
    this._noteScopeKey = noteScopeKey;

    // Effects
    const effects = actor?.effects ? actor.effects.map(e => ({
      id: e.id, name: e.name, icon: e.icon,
      disabled: e.disabled,
      remaining: (() => {
        const dur = e.duration ?? {}; if (!dur?.seconds) return "";
        const start = dur.startTime ?? 0; const now = game.time.worldTime ?? 0;
        const left = Math.max(0, (dur.seconds + start) - now);
        return `${Math.ceil(left)}s`;
      })(),
      changesDisplay: (e.changes ?? []).map(c => `${c.key} ${c.value}`).slice(0,3).join("; ")
    })) : [];

    // HP
    const hp = actor ? {
      value: gp(actor, "system.attributes.hp.value") ?? 0,
      max:   gp(actor, "system.attributes.hp.max") ?? 0,
      temp:  gp(actor, "system.attributes.hp.temp") ?? 0
    } : null;

    return {
      user: game.user?.name ?? "Unknown",
      token: t,
      actor,
      conds,
      gmNote,
      effects,
      hp
    };
  }

  // Dopo il render: attacca tutti i listeners sul contenuto
  _onRender(_context, _options){
    const root = this.window?.content?.querySelector(".ffp-panel");
    if (!root) return;

    // Pulsanti HP / Temp / Defeated / Luxon
    root.querySelectorAll(".ffp-actions .ffp-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const op = btn.getAttribute("data-op");
        if (op === "hpDelta") return this.#doSocket(op, { amt: Number(btn.getAttribute("data-amt")||0) });
        if (op === "hpFull")  return this.#doSocket(op, {});
        if (op === "hpKill")  return this.#doSocket(op, {});
        if (op === "hpSet")   return this.#doSocket(op, { to: await this.#promptNumber("Imposta HP a:", _context?.hp?.value ?? 0) });
        if (op === "tempDelta") return this.#doSocket(op, { amt: Number(btn.getAttribute("data-amt")||0) });
        if (op === "tempSet")   return this.#doSocket(op, { to: await this.#promptNumber("Imposta Temp HP a:", _context?.hp?.temp ?? 0) });
        if (op === "toggleDefeated") return this.#doSocket(op, {});
      });
    });
    root.querySelector(".ffp-btn.luxon")?.addEventListener("click", () => applyLuxonBlessing(60));

    // Condizioni
    root.querySelectorAll(".cond-btn").forEach(btn => {
      btn.addEventListener("click", () => this.#toggleCondition(btn.dataset.key));
    });

    // Effetti attivi: enable/disable + delete
    root.querySelectorAll(".ffp-eff .eff-toggle, .ffp-eff .eff-delete").forEach(btn => {
      btn.addEventListener("click", async () => {
        const row = btn.closest(".ffp-eff");
        const id = row?.dataset?.id;
        const t = canvas.tokens?.controlled[0];
        const actor = t?.actor;
        if(!actor || !id) return;
        const eff = actor.effects.get(id);
        if(!eff) return;
        if (btn.classList.contains("eff-toggle")) { await eff.update({disabled: !eff.disabled}); this.render(true); }
        else { await eff.delete(); this.render(true); }
      });
    });

    // Note GM
    root.querySelector(".save-note")?.addEventListener("click", async () => {
      const t = canvas.tokens?.controlled[0];
      if(!t) return ui.notifications?.warn("Nessun token selezionato.");
      const text = String(root.querySelector(".ffp-note")?.value ?? "");
      const {scope, key} = (this._noteScopeKey ?? {scope:"world", key:"gmnote"});
      await t.setFlag(scope, key, text);
      ui.notifications?.info("Note GM salvate sul token.");
    });
  }

  async #promptNumber(title, def=0){
    return await foundry.applications.api.DialogV2.prompt({
      window: { title }, modal: true, content: `<p>${foundry.utils.escapeHTML(title)}</p><input type="number" value="${def}"/>`,
      ok: { label: "OK" },
      rejectClose: true
    }).then(html => {
      const input = (html?.querySelector?.("input") ?? { value: def }).value;
      return Number(input || def);
    });
  }

  async #toggleCondition(key){
    const t = canvas.tokens?.controlled[0]; const actor = t?.actor;
    if (!actor) return ui.notifications?.warn("Seleziona un token.");
    if (typeof actor.toggleCondition === "function") return actor.toggleCondition(key);
    const curr = await actor.getFlag(MOD_ID, `cond.${key}`);
    await actor.setFlag(MOD_ID, `cond.${key}`, !curr);
    this.render(true);
  }

  async #doSocket(op, data){
    const t = canvas.tokens?.controlled[0];
    const actorUuid = t?.actor?.uuid;
    if(!actorUuid) return ui.notifications?.warn("Seleziona un token.");
    await game.socket?.emit(`module.${MOD_ID}`, { op, actorUuid, ...data });
  }
}

// ---------- Hooks / API / Sockets ----------
Hooks.once("init", () => {
  console.log(`${MOD_ID} | init`);
});

Hooks.once("ready", async () => {
  console.log(`${MOD_ID} | ready`);
  const api = {
    openPanel: async () => {
      const app = new FFPanel();
      await app.render({ force: true });
      return app;
    },
    seedMacros: () => seedMacros()
  };
  globalThis[NS] = { api };

  // Socket handler (GM-side)
  game.socket?.on(`module.${MOD_ID}`, async (payload)=>{
    if (!game.user?.isGM) return;
    const { op, actorUuid } = payload||{};
    try{
      const actor = await fromUuid(actorUuid);
      if (!actor || !actor.isOwner) return;
      const path = "system.attributes.hp";
      const hp = foundry.utils.duplicate(gp(actor, path) ?? {});
      switch(op){
        case "hpDelta": hp.value = Math.max(0, (Number(hp.value||0) + Number(payload.amt||0))); await actor.update({[path]: hp}); break;
        case "hpSet":   hp.value = Math.max(0, Number(payload.to||0)); await actor.update({[path]: hp}); break;
        case "hpFull":  hp.value = Number(hp.max||0); await actor.update({[path]: hp}); break;
        case "hpKill":  hp.value = 0; await actor.update({[path]: hp}); break;
        case "tempDelta": hp.temp = Math.max(0, (Number(hp.temp||0) + Number(payload.amt||0))); await actor.update({[path]: hp}); break;
        case "tempSet":   hp.temp = Math.max(0, Number(payload.to||0)); await actor.update({[path]: hp}); break;
        case "toggleDefeated": {
          const t = canvas.tokens?.controlled[0];
          if (t) await t.document.update({ "overlayEffect": t.document.overlayEffect ? null : "icons/svg/skull.svg" });
          break;
        }
      }
    }catch(e){ console.error(e); ui.notifications?.error("Operazione HP fallita."); }
  });

  // Seed macro una tantum
  const setting = "macrosSeeded";
  if (!game.settings.settings.has(`${MOD_ID}.${setting}`)) {
    game.settings.register(MOD_ID, setting, { name: "Macros seeded", scope: "world", config: false, type: Boolean, default: false });
  }
  if (!game.settings.get(MOD_ID, setting)) {
    await seedMacros();
    await game.settings.set(MOD_ID, setting, true);
  }
});

// Bottone nei Scene Controls (toolbar sinistra)
Hooks.on("getSceneControlButtons", (controls) => {
  try {
    const token = controls.find(c => c.name === "token");
    if (!token) return;
    if (token.tools?.some(t => t?.name === "ff-panel")) return;
    token.tools.push({
      name: "ff-panel",
      title: "FF Utility Panel",
      icon: "fas fa-hat-wizard",
      button: true,
      onClick: () => {
        try { FFUtil.api.openPanel(); }
        catch (e) { console.error("[foundryvtt-ff-utility-panel] openPanel failed:", e); ui.notifications?.error("Impossibile aprire FF Utility Panel."); }
      }
    });
  } catch (e) {
    console.error("[foundryvtt-ff-utility-panel] getSceneControlButtons error:", e);
  }
});
