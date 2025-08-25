
/* FF Utility Panel — Foundry v13 + dnd5e 5.1.2
 * Features: HP/Status, GM Notes, Conditions, Active Effects, Luxon Blessing, optional V2 sheets, Macro seeder
 */
const MOD_ID = "foundryvtt-ff-utility-panel";
const NS = "FFUtil";

function hasMidi(){ return !!game.modules.get("midi-qol")?.active; }

// ---------- Macro seeder ----------
async function seedMacros(){
  try{
    let folder = game.folders?.getName("Wildemount Macros");
    if(!folder) folder = await Folder.create({name:"Wildemount Macros", type:"Macro", color:"#6ba4ff"});
    const macros = [
      {name:"Apri Pannello FF (DM)", command:`${NS}.api.openPanel();`, img:"icons/magic/control/buff-flight-wings-runes-blue.webp"},
      {name:"Cura Selezionato (GM)", command:`${NS}.api.healSelectedGM(10);`, img:"icons/magic/life/heart-cross-strong-flame-green.webp"},
      {name:"Prono (toggle)", command:`(async()=>{const t=canvas.tokens?.controlled[0]; if(!t?.actor) return ui.notifications?.warn('Seleziona un token.'); const fn=t.actor.toggleCondition; if(typeof fn==='function') return fn.call(t.actor,'prone'); await t.actor.setFlag('${MOD_ID}','cond.prone',!(t.actor.getFlag('${MOD_ID}','cond.prone')));})();`, img:"icons/magic/control/fear-fright-white.webp"},
      {name:"Toggle Condizione (prompt)", command:`(async()=>{const t=canvas.tokens?.controlled[0]; if(!t?.actor) return ui.notifications?.warn('Seleziona un token.'); const dnd=CONFIG?.DND5E; const choices=dnd?.conditions?Object.keys(dnd.conditions):['prone','blinded','grappled','frightened']; const key=await Dialog.prompt({title:'Condizione', content:\`<p>Quale condizione?</p><select id='c'>\${choices.map(c=>\`<option>\${c}</option>\`).join('')}</select>\`, label:'OK', callback: html=>html.find('#c').val()}); if(!key) return; const fn=t.actor.toggleCondition; if(typeof fn==='function') return fn.call(t.actor, key); await t.actor.setFlag('${MOD_ID}',\`cond.\${key}\`,!t.actor.getFlag('${MOD_ID}',\`cond.\${key}\`));})();`, img:"icons/magic/control/debuff-energy-snare-purple.webp"},
      // Export mod versions - Collection-safe (v13)
      {name:"Export Mod Versions (v13)", command:`(function(){const list=game.modules.map(m=>{const a=m?.authors?.length?m.authors.map(x=>x?.name??x).join(', '):(m?.author??'');const c=m?.compatibility??{};const min=c.minimum??'';const ver=c.verified??'';return{ id:m.id??'', title:m.title??m.id??'', version:m.version??'', active:!!m.active, compatible:(min||ver)?\`\${min||'?'}–\${ver||'?'}\`:'', authors:a, manifest:m.manifest??'', url:m.url??''};}).sort((a,b)=>a.id.localeCompare(b.id));const core=game?.version??(game?.release?.generation? \`V\${game.release.generation}.\${game.release.build??''}\`:'unknown');const sys={id:game.system?.id??'',title:game.system?.title??'',version:game.system?.version??''};const header=\`# Modules (Foundry \${core}) — System \${sys.id} \${sys.version}\n\`;const lines=list.map(m=>\`\${m.id}@\${m.version} — \${m.title}\${m.active?' [ACTIVE]':''}\`);const txt=header+lines.join('\\n')+'\\n';const esc=s=>'"'+String(s??'').replaceAll('"','""')+'"';const csvHeader=['id','title','version','active','compatible','authors','manifest','url'].join(',');const csv=[csvHeader].concat(list.map(m=>[m.id,m.title,m.version,m.active,m.compatible,m.authors,m.manifest,m.url].map(esc).join(','))).join('\\n');const json=JSON.stringify({coreVersion:core, system:sys, count:list.length, modules:list},null,2);const stamp=new Date().toISOString().replace(/[:.]/g,'-');foundry.utils.saveDataToFile(txt,'text/plain',\`modules-\${stamp}.txt\`);foundry.utils.saveDataToFile(csv,'text/csv',\`modules-\${stamp}.csv\`);foundry.utils.saveDataToFile(json,'application/json',\`modules-\${stamp}.json\`);(async()=>{try{await navigator.clipboard.writeText(txt);ui.notifications?.info('Lista moduli copiata negli appunti (+ file scaricati).');}catch{new Dialog({title:'Copia Lista Moduli',content:\`<textarea style="width:100%;height:300px">\${foundry.utils.escapeHTML(txt)}</textarea>\`,buttons:{ok:{label:'OK'}}}).render(true);ui.notifications?.info('Impossibile usare il clipboard API; aperto box per copiare.');}})();})()`, img:"icons/tools/scribal/ink-quill-pink.webp"}
    ];
    for(const def of macros){
      const existing = game.macros?.getName(def.name);
      if(!existing) await Macro.create({name:def.name, type:"script", img:def.img || "icons/svg/dice-target.svg", command:def.command, folder: folder?.id});
    }
    ui.notifications?.info(`${MOD_ID}: Macro seed ok.`);
  }catch(e){ console.error(e); ui.notifications?.error("Macro seed failed"); }
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

// ---------- Panel ----------
class FFPanel extends foundry.applications.api.ApplicationV2{
  static DEFAULT_OPTIONS = {
    id: "ff-utility-panel",
    window: { title: "FF Utility Panel (DM)", icon: "fas fa-hat-wizard", resizable: true },
    position: { width: 640, height: 650 }
  };

  #noteScopeKey = null;

  async _renderContext(){
    const dnd = CONFIG?.DND5E ?? {};
    const conds = dnd?.conditions ? Object.entries(dnd.conditions).map(([k,v])=>({key:k,label:v})) : [
      { key:"prone", label:"Prono" },{ key:"blinded", label:"Accecato" },
      { key:"grappled", label:"Afferrato" },{ key:"frightened", label:"Spaventato" }
    ];
    const t = canvas.tokens?.controlled[0];
    const actor = t?.actor ?? null;

    // Read GM Note
    let gmNote = "";
    this.#noteScopeKey = null;
    if(t){
      const f1 = t.getFlag("gm-notes","notes");
      const f2 = t.getFlag("gm-notes","gmNote");
      if (typeof f1 === "string"){ gmNote = f1; this.#noteScopeKey = {scope:"gm-notes", key:"notes"}; }
      else if (typeof f2 === "string"){ gmNote = f2; this.#noteScopeKey = {scope:"gm-notes", key:"gmNote"}; }
      else {
        const f3 = t.getFlag("world","gmnote");
        if (typeof f3 === "string"){ gmNote = f3; this.#noteScopeKey = {scope:"world", key:"gmnote"}; }
        else { gmNote = ""; this.#noteScopeKey = {scope:"world", key:"gmnote"}; }
      }
    }

    // active effects
    const effects = actor?.effects ? actor.effects.map(e => ({
      id: e.id, name: e.name, icon: e.icon,
      disabled: e.disabled,
      remaining: (()=>{
        const dur = e.duration ?? {}; if (!dur?.seconds) return "";
        const start = dur.startTime ?? 0; const now = game.time.worldTime ?? 0;
        const left = Math.max(0, (dur.seconds + start) - now);
        return `${Math.ceil(left)}s`;
      })(),
      changes: (e.changes ?? []).map(c => `${c.key} ${["","ADD","MULTIPLY","DOWNGRADE","UPGRADE","OVERRIDE","CUSTOM"][c.mode||0]||""} ${c.value}`)
    })) : [];

    // hp data
    const hp = actor ? {
      value: getProperty(actor, "system.attributes.hp.value") ?? 0,
      max:   getProperty(actor, "system.attributes.hp.max") ?? 0,
      temp:  getProperty(actor, "system.attributes.hp.temp") ?? 0
    } : null;

    return { user: game.user?.name ?? "Unknown", conds, actor, token: t, gmNote, effects, hp };
  }

  async _renderHTML(ctx){
    const root = document.createElement("section");
    root.classList.add("ffp-panel");
    root.innerHTML = `
      <h2>Ciao ${foundry.utils.escapeHTML(ctx.user)}</h2>
      <div class="ffp-row">Token selezionato: <b>${ctx.token?.name ?? "—"}</b></div>

      <div class="ffp-section">Gestione HP / Status</div>
      <div class="ffp-actions">
        <button class="ffp-btn" data-op="hpDelta" data-amt="1">+1</button>
        <button class="ffp-btn" data-op="hpDelta" data-amt="5">+5</button>
        <button class="ffp-btn" data-op="hpDelta" data-amt="-1">−1</button>
        <button class="ffp-btn" data-op="hpDelta" data-amt="-5">−5</button>
        <button class="ffp-btn" data-op="hpFull">Full Heal</button>
        <button class="ffp-btn" data-op="hpKill">Kill (0 HP)</button>
        <button class="ffp-btn" data-op="hpSet">Imposta HP…</button>
        <span class="ffp-chip">HP: ${ctx.hp ? `${ctx.hp.value}/${ctx.hp.max}` : "—"}</span>
      </div>
      <div class="ffp-actions">
        <button class="ffp-btn" data-op="tempDelta" data-amt="1">Temp +1</button>
        <button class="ffp-btn" data-op="tempDelta" data-amt="5">Temp +5</button>
        <button class="ffp-btn" data-op="tempDelta" data-amt="-1">Temp −1</button>
        <button class="ffp-btn" data-op="tempDelta" data-amt="-5">Temp −5</button>
        <button class="ffp-btn" data-op="tempSet">Set Temp…</button>
        <span class="ffp-chip">Temp: ${ctx.hp ? `${ctx.hp.temp}` : "—"}</span>
      </div>
      <div class="ffp-actions">
        <button class="ffp-btn" data-op="toggleDefeated">Toggle Defeated</button>
        <button class="ffp-btn luxon">Benedizione di Luxon</button>
      </div>

      <div class="ffp-section">Note rapide del DM (Token)</div>
      <textarea class="ffp-note" placeholder="Note visibili solo al GM…">${foundry.utils.escapeHTML(ctx.gmNote ?? "")}</textarea>
      <div class="ffp-actions">
        <button class="ffp-btn" data-op="saveGMNote">Salva sul Token</button>
      </div>

      <div class="ffp-section">Condizioni</div>
      <div class="ffp-grid cond-grid"></div>

      <div class="ffp-section">Effetti Attivi</div>
      <div class="ffp-grid eff-grid"></div>
    `;

    // actions
    root.querySelectorAll(".ffp-actions .ffp-btn").forEach(btn => {
      btn.addEventListener("click", async ev => {
        const op = btn.getAttribute("data-op");
        if (op === "hpDelta") return this.#doSocket(op, { amt: Number(btn.getAttribute("data-amt")||0) });
        if (op === "hpFull")  return this.#doSocket(op, {});
        if (op === "hpKill")  return this.#doSocket(op, {});
        if (op === "hpSet")   return this.#doSocket(op, { to: await this.#promptNumber("Imposta HP a:", ctx.hp?.value ?? 0) });
        if (op === "tempDelta") return this.#doSocket(op, { amt: Number(btn.getAttribute("data-amt")||0) });
        if (op === "tempSet")   return this.#doSocket(op, { to: await this.#promptNumber("Imposta Temp HP a:", ctx.hp?.temp ?? 0) });
        if (op === "toggleDefeated") return this.#doSocket(op, {});
        if (op === "saveGMNote"){
          const ta = root.querySelector(".ffp-note");
          await this.#saveGMNote(String(ta?.value ?? ""), ctx.token);
          return;
        }
      });
    });

    // luxon
    root.querySelector(".ffp-btn.luxon")?.addEventListener("click", () => applyLuxonBlessing(60));

    // conditions
    const grid = root.querySelector(".cond-grid");
    for(const c of (ctx.conds||[])){
      const b = document.createElement("button");
      b.type="button"; b.className="ffp-btn";
      b.innerHTML = `<i class="fas fa-circle"></i> ${c.label} <small style="opacity:.6">(${c.key})</small>`;
      b.addEventListener("click", ()=> this.#toggleCondition(c.key));
      grid.appendChild(b);
    }

    // effects
    const egrid = root.querySelector(".eff-grid");
    for(const e of (ctx.effects||[])){
      const row = document.createElement("div");
      row.className = "ffp-eff";
      row.innerHTML = `
        <img src="${e.icon || "icons/svg/aura.svg"}"/>
        <div style="flex:1">
          <div><b>${foundry.utils.escapeHTML(e.name||"")}</b> ${e.remaining?`<span class="ffp-chip">${e.remaining}</span>`:""}</div>
          <div style="font-size:.85em;opacity:.8">${e.changes?.slice(0,3).join("; ") || ""}</div>
        </div>
        <button class="ffp-btn" data-eff="${e.id}" data-op="toggle">${e.disabled?"Enable":"Disable"}</button>
        <button class="ffp-btn" data-eff="${e.id}" data-op="delete">Delete</button>
      `;
      row.querySelectorAll("button").forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          const id = btn.getAttribute("data-eff");
          const op = btn.getAttribute("data-op");
          const t = canvas.tokens?.controlled[0];
          const actor = t?.actor;
          if(!actor) return;
          const eff = actor.effects.get(id);
          if(!eff) return;
          if(op==="toggle"){ await eff.update({disabled: !eff.disabled}); this.render(true); }
          if(op==="delete"){ await eff.delete(); this.render(true); }
        });
      });
      egrid.appendChild(row);
    }

    return root;
  }

  async #promptNumber(title, def=0){
    return await Dialog.prompt({
      title, label:"OK", callback: html => Number(html.find("input")[0].value||def),
      content: `<p>${foundry.utils.escapeHTML(title)}</p><input type="number" value="${def}"/>`
    });
  }

  async #toggleCondition(key){
    const t = canvas.tokens?.controlled[0]; const actor = t?.actor;
    if (!actor) return ui.notifications?.warn("Seleziona un token.");
    const fn = actor?.toggleCondition;
    if (typeof fn === "function") return fn.call(actor, key);
    const curr = await actor.getFlag(MOD_ID, `cond.${key}`);
    await actor.setFlag(MOD_ID, `cond.${key}`, !curr);
    this.render(true);
  }

  async #saveGMNote(text, token){
    if(!token) return ui.notifications?.warn("Nessun token selezionato.");
    const scope = this.#noteScopeKey?.scope || "world";
    const key = this.#noteScopeKey?.key || "gmnote";
    await token.setFlag(scope, key, text);
    ui.notifications?.info("Note GM salvate sul token.");
  }

  async #doSocket(op, data){
    const t = canvas.tokens?.controlled[0];
    const actorUuid = t?.actor?.uuid;
    if(!actorUuid) return ui.notifications?.warn("Seleziona un token.");
    await game.socket?.emit(`module.${MOD_ID}`, { op, actorUuid, ...data });
  }
}

// ---------- Optional Sheets ----------
class FFActorSheet extends foundry.applications.api.DocumentSheetV2 {
  static DEFAULT_OPTIONS = {
    id: "ff-actor-sheet",
    window: { title: "FF Actor (V2)", icon: "fas fa-user" },
    position: { width: 640, height: 540 },
    actions: { save: this.submit }
  };
  static PARTS = { form: { template: null } };
  #form;

  async _renderContext(){
    const a = this.document;
    const hp = getProperty(a, "system.attributes.hp.value") ?? 0;
    const max= getProperty(a, "system.attributes.hp.max") ?? 0;
    const dnd = CONFIG?.DND5E ?? {};
    const weaponDict = dnd.weaponProficiencies ?? dnd.weaponProficienciesMap ?? {};
    const armorDict  = dnd.armorProficiencies ?? dnd.armorProficienciesMap ?? {};
    const wp = getProperty(a,"system.traits.weaponProf.value") ?? getProperty(a,"system.traits.weapons.value") ?? [];
    const ap = getProperty(a,"system.traits.armorProf.value")  ?? getProperty(a,"system.traits.armor.value")   ?? [];
    const wlist = Object.keys(weaponDict).map(k=>({key:k,label:weaponDict[k]??k,on:wp?.includes(k)}));
    const alist = Object.keys(armorDict).map(k=>({key:k,label:armorDict[k]??k,on:ap?.includes(k)}));
    return { name:a.name, hp, max, wlist, alist };
  }
  async _renderHTML(ctx){
    const root = document.createElement("form"); root.classList.add("ffp-panel");
    root.innerHTML = `
      <h2>${foundry.utils.escapeHTML(ctx.name)}</h2>
      <div class="ffp-actions">
        <label>HP <input type="number" name="system.attributes.hp.value" value="${ctx.hp}"/></label>
        <span>/</span>
        <label>Max <input type="number" name="system.attributes.hp.max" value="${ctx.max}"/></label>
        <button type="submit" class="ffp-btn" data-action="save">Salva</button>
      </div>
      <div class="ffp-section">Competenze Armi</div>
      <div class="ffp-grid ffp-w"></div>
      <div class="ffp-section">Competenze Armature</div>
      <div class="ffp-grid ffp-a"></div>
    `;
    const w = root.querySelector(".ffp-w"); ctx.wlist.forEach(x=>{
      const l=document.createElement("label"); l.className="ffp-btn";
      l.innerHTML = `<input type="checkbox" name="__wp" value="${x.key}" ${x.on?"checked":""}/> ${x.label} <small>(${x.key})</small>`;
      w.appendChild(l);
    });
    const a = root.querySelector(".ffp-a"); ctx.alist.forEach(x=>{
      const l=document.createElement("label"); l.className="ffp-btn";
      l.innerHTML = `<input type="checkbox" name="__ap" value="${x.key}" ${x.on?"checked":""}/> ${x.label} <small>(${x.key})</small>`;
      a.appendChild(l);
    });
    this.#form = root;
    return root;
  }
  static async submit(event){
    event.preventDefault();
    const fd = new FormData(this.#form); const upd = {};
    for(const [k,v] of fd.entries()){ if(k==="__wp"||k==="__ap") continue; upd[k]=v; }
    const wp = Array.from(this.#form.querySelectorAll('input[name="__wp"]:checked')).map(i=>i.value);
    const ap = Array.from(this.#form.querySelectorAll('input[name="__ap"]:checked')).map(i=>i.value);
    if (getProperty(this.document,"system.traits.weaponProf")!==undefined) upd["system.traits.weaponProf.value"]=wp; else upd["system.traits.weapons.value"]=wp;
    if (getProperty(this.document,"system.traits.armorProf") !==undefined) upd["system.traits.armorProf.value"]=ap; else upd["system.traits.armor.value"]=ap;
    await this.document.update(upd);
    ui.notifications?.info("Actor aggiornato.");
  }
}
class FFItemSheet extends foundry.applications.api.DocumentSheetV2 {
  static DEFAULT_OPTIONS = {
    id: "ff-item-sheet",
    window: { title: "FF Item (V2)", icon: "fas fa-suitcase" },
    position: { width: 420, height: 360 },
    actions: { save: this.submit }
  };
  static PARTS = { form: { template: null } };
  #form;
  async _renderContext(){ const d=this.document; return { name:d.name, rarity: getProperty(d,"system.rarity") ?? ""}; }
  async _renderHTML(ctx){
    const root = document.createElement("form"); root.classList.add("ffp-panel");
    root.innerHTML = `
      <h2>${foundry.utils.escapeHTML(ctx.name)}</h2>
      <div class="ffp-actions">
        <label>Nome <input type="text" name="name" value="${foundry.utils.escapeHTML(ctx.name)}"/></label>
      </div>
      <div class="ffp-actions">
        <label>Rarità <input type="text" name="system.rarity" value="${foundry.utils.escapeHTML(ctx.rarity)}"/></label>
        <button type="submit" class="ffp-btn" data-action="save">Salva</button>
      </div>`;
    this.#form=root; return root;
  }
  static async submit(e){ e.preventDefault(); const fd = new FormData(this.#form); const upd={}; for(const [k,v] of fd.entries()) upd[k]=v; await this.document.update(upd); ui.notifications?.info("Item aggiornato."); }
}

// ---------- API + sockets ----------
Hooks.once("init", () => {
  console.log(`${MOD_ID} | init`);
  DocumentSheetConfig.registerSheet(Actor, MOD_ID, FFActorSheet, {label:"FF Actor Sheet (V2)", makeDefault:false, types:["character","npc"]});
  DocumentSheetConfig.registerSheet(Item,  MOD_ID, FFItemSheet,  {label:"FF Item Sheet (V2)",  makeDefault:false});
});

Hooks.once("ready", async () => {
  console.log(`${MOD_ID} | ready`);
  const api = {
    openPanel: () => new FFPanel().render(true),
    healSelectedGM: async (hp) => {
      const t = canvas.tokens?.controlled[0]; const actorUuid = t?.actor?.uuid;
      if(!actorUuid) return ui.notifications?.warn("Seleziona un token.");
      await game.socket?.emit(`module.${MOD_ID}`, { op:"hpSet", actorUuid, to: hp });
    },
    seedMacros: () => seedMacros()
  };
  globalThis[NS] = { api };

  // socket GM
  game.socket?.on(`module.${MOD_ID}`, async (payload)=>{
    if (!game.user?.isGM) return;
    const { op, actorUuid } = payload||{};
    try{
      const actor = await fromUuid(actorUuid);
      if (!actor || !actor.isOwner) return;
      const path = "system.attributes.hp";
      const hp = foundry.utils.duplicate(getProperty(actor, path) ?? {});
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
    }catch(e){ console.error(e); ui.notifications?.error("Operazione fallita."); }
  });

  // macro seed una tantum per mondo
  const setting = "macrosSeeded";
  if (!game.settings.settings.has(`${MOD_ID}.${setting}`)) {
    game.settings.register(MOD_ID, setting, {
      name: "Macros seeded",
      scope: "world",
      config: false,
      type: Boolean,
      default: false
    });
  }
  const seeded = game.settings.get(MOD_ID, setting);
  if (!seeded) {
    await seedMacros();
    await game.settings.set(MOD_ID, setting, true);
  }
});
