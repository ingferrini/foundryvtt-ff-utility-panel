const MODULE_ID = "wildemount-starter-ff";
function hasMidi(){ return game.modules.get("midi-qol")?.active; }
async function toggleConditionForSelected(key){
  const t = canvas.tokens?.controlled[0]; const actor = t?.actor;
  if(!actor) return ui.notifications?.warn("Seleziona un token.");
  const fn = actor?.toggleCondition; if (typeof fn === "function") return fn.call(actor, key);
  const curr = await actor.getFlag(MODULE_ID, `cond.${key}`);
  await actor.setFlag(MODULE_ID, `cond.${key}`, !curr);
  ui.notifications?.info(`${key} ${!curr ? "applicata" : "rimossa"} (fallback).`);
}
async function createLuxonBlessing(durationSec=60){
  const t = canvas.tokens?.controlled[0]; const actor = t?.actor;
  if(!actor) return ui.notifications?.warn("Seleziona un token.");
  const changes = [];
  if (hasMidi()){
    changes.push(
      { key:"flags.midi-qol.bonusAttackRoll", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value:"+1d4", priority:20 },
      { key:"flags.midi-qol.bonusSavingThrow", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value:"+1d4", priority:20 }
    );
  } else {
    changes.push({ key:"system.bonuses.abilities.check", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value:"+1", priority:20 });
  }
  await ActiveEffect.create({ name:"Benedizione di Luxon", icon:"icons/magic/holy/angel-wings-prayer-blue.webp", origin: actor.uuid, disabled:false, duration:{ seconds: durationSec, startTime: game.time.worldTime }, changes }, { parent: actor });
}
function fmtChange(ch){ const symbol = ch.mode===CONST.ACTIVE_EFFECT_MODES.ADD?"+=": ch.mode===CONST.ACTIVE_EFFECT_MODES.MULTIPLY?"×=": ch.mode===CONST.ACTIVE_EFFECT_MODES.OVERRIDE?"→":"="; return `${ch.key} ${symbol} ${ch.value}`; }
function timeLeftStr(eff){ const d = eff.duration; if (!d?.seconds || !d?.startTime) return ""; const now = game.time.worldTime ?? 0; const end = d.startTime + d.seconds; const left = Math.max(0, end - now); if (!left) return "0s"; const m = Math.floor(left/60); const s = Math.floor(left%60); return m? `${m}m ${s}s` : `${s}s`; }
export class MyPanel extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = { id: "wmff-panel", window: { title: "Wildemount Panel", icon: "fas fa-dragon", resizable:true }, position: { width: 560, height: 560 } };
  #counter = 0;
  async _renderContext(){
    const dnd = CONFIG?.DND5E;
    const conds = dnd?.conditions ? Object.entries(dnd.conditions).map(([k,v])=>({key:k,label:v})) : [{key:"prone",label:"Prono"},{key:"blinded",label:"Accecato"},{key:"grappled",label:"Afferrato"}];
    const t = canvas.tokens?.controlled[0]; const actor = t?.actor;
    let effects = [];
    if (actor){ effects = actor.effects.map(e=> ({ id:e.id, name:e.name, icon:e.icon, disabled:e.disabled, changes:e.changes ?? [], left: timeLeftStr(e) })); }
    return { user: game.user?.name ?? "?", counter: this.#counter, system: game.system.id, conds, effects };
  }
  async _renderHTML(ctx){
    const root = document.createElement("section"); root.className = "wmff-panel";
    root.innerHTML = `<h2>Ciao ${ctx.user}</h2>
      <div class="wmff-row">Sistema: <b>${game.system.id}</b> — Midi-QoL: <b>${hasMidi()?"ON":"OFF"}</b></div>
      <div class="wmff-row">
        <button class="wm-inc"><i class="fas fa-plus"></i> Aumenta</button>
        <button class="wm-heal"><i class="fas fa-heart"></i> Cura selezionato (GM)</button>
        <button class="wm-luxon"><i class="fas fa-sun"></i> Benedizione di Luxon</button>
      </div>
      <h3 style="margin:.6rem 0 .2rem">Condizioni</h3>
      <div class="wm-conditions"></div>
      <div class="wm-ae"><h3 style="margin:.6rem 0 .2rem">Effetti Attivi sul selezionato</h3><div class="wm-ae-list"></div></div>`;
    root.querySelector(".wm-inc")?.addEventListener("click", ()=>{ this.#counter++; this.render(true); });
    root.querySelector(".wm-heal")?.addEventListener("click", async ()=>{ const t = canvas.tokens?.controlled[0]; if(!t?.actor) return ui.notifications?.warn("Seleziona un token."); await game.socket?.emit(`module.${MODULE_ID}`, { op:"heal", actorUuid:t.actor.uuid, to:10 }); });
    root.querySelector(".wm-luxon")?.addEventListener("click", ()=> createLuxonBlessing(60));
    const grid = root.querySelector(".wm-conditions");
    for (const c of ctx.conds){ const b=document.createElement("button"); b.type="button"; b.className="wm-cond"; b.innerHTML=`<i class="fas fa-circle"></i> ${c.label} <small>(${c.key})</small>`; b.addEventListener("click", ()=> toggleConditionForSelected(c.key)); grid.appendChild(b); }
    const list = root.querySelector(".wm-ae-list");
    for (const e of ctx.effects){
      const row = document.createElement("div"); row.className="wm-ae-item";
      row.innerHTML = `<img src="${e.icon||"icons/svg/aura.svg"}"><div style="flex:1"><div><b>${e.name}</b> ${e.left?`<small style="opacity:.7">(${e.left})</small>`:""}</div><div style="font-size:.85em;opacity:.8">${e.changes.map(fmtChange).join("; ")}</div></div><button data-act="toggle" data-id="${e.id}">${e.disabled?"Enable":"Disable"}</button><button data-act="delete" data-id="${e.id}">Del</button>`;
      list.appendChild(row);
    }
    list?.addEventListener("click", async ev=>{
      const btn = ev.target.closest("button"); if (!btn) return; const act=btn.dataset.act; const id=btn.dataset.id;
      const t = canvas.tokens?.controlled[0]; const actor = t?.actor; if (!actor) return;
      const eff = actor.effects.get(id); if (!eff) return;
      if (act==="toggle") await eff.update({ disabled: !eff.disabled });
      if (act==="delete") await eff.delete();
      this.render(true);
    });
    return root;
  }
}
