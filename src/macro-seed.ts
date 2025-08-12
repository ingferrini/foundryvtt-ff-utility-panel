const MODULE_ID = "wildemount-starter";
function hasMidi() { return game.modules.get("midi-qol")?.active; }

type MacroDef = { name: string; command: string; img?: string };

const MACROS: MacroDef[] = [
  { name: "Apri Pannello Wildemount", command: "Wildemount.api.openPanel();", img: "icons/magic/control/buff-flight-wings-runes-blue.webp" },
  { name: "Cura Selezionato (GM)", command: "Wildemount.api.healSelectedGM(10);", img: "icons/magic/life/heart-cross-strong-flame-green.webp" },
  { name: "Tiro Iniziativa Party", command: "(async ()=>{ for (const t of canvas.tokens?.controlled ?? []) { const a=t.actor; if (a?.rollInitiative) await a.rollInitiative({createCombatants:true}); } })();", img: "icons/magic/time/hourglass-tilted-purple.webp" },
  // Nuove macro condizioni/effetti
  { name: "Toggle Condizione (prompt)", command:
    "(async()=>{const t=canvas.tokens?.controlled[0]; if(!t?.actor) return ui.notifications?.warn('Seleziona un token.'); const dnd=CONFIG?.DND5E; const choices=dnd?.conditions?Object.keys(dnd.conditions):['prone','blinded','grappled','frightened']; const key=await Dialog.prompt({title:'Condizione', content:`<p>Quale condizione?</p><select id='c'>${choices.map(c=>`<option>${c}</option>`).join('')}</select>`, label:'OK', callback: html=>html.find('#c').val()}); if(!key) return; const fn=t.actor.toggleCondition; if(typeof fn==='function') return fn.call(t.actor, key); await t.actor.setFlag('wildemount-starter',`cond.${key}`, !(t.actor.getFlag('wildemount-starter',`cond.${key}`))); })();" ,
    img: "icons/magic/control/debuff-energy-snare-purple.webp" },
  { name: "Prono (toggle)", command:
    "(async()=>{const t=canvas.tokens?.controlled[0]; if(!t?.actor) return ui.notifications?.warn('Seleziona un token.'); const fn=t.actor.toggleCondition; if(typeof fn==='function') return fn.call(t.actor,'prone'); await t.actor.setFlag('wildemount-starter','cond.prone', !(t.actor.getFlag('wildemount-starter','cond.prone'))); })();",
    img: "icons/magic/control/fear-fright-white.webp" },
  { name: "Benedizione di Luxon", command:
    "(async()=>{const t=canvas.tokens?.controlled[0]; const a=t?.actor; if(!a) return ui.notifications?.warn('Seleziona un token.'); const changes = game.modules.get('midi-qol')?.active ? [{key:'flags.midi-qol.bonusAttackRoll',mode:CONST.ACTIVE_EFFECT_MODES.ADD,value:'+1d4',priority:20},{key:'flags.midi-qol.bonusSavingThrow',mode:CONST.ACTIVE_EFFECT_MODES.ADD,value:'+1d4',priority:20}] : [{key:'system.bonuses.abilities.check',mode:CONST.ACTIVE_EFFECT_MODES.ADD,value:'+1',priority:20}]; await ActiveEffect.create({name:'Benedizione di Luxon', icon:'icons/magic/holy/angel-wings-prayer-blue.webp', origin:a.uuid, disabled:false, duration:{seconds:60,startTime:game.time.worldTime}, changes}, {parent:a}); })();",
    img: "icons/magic/holy/angel-wings-prayer-blue.webp" }
];

export async function seedMacros(folderName = "Wildemount Macros") {
  let folder = game.folders?.getName(folderName);
  if (!folder) folder = await Folder.create({ name: folderName, type: "Macro", color: "#6ba4ff" });
  for (const def of MACROS) {
    const existing = game.macros?.getName(def.name);
    if (existing) continue;
    await Macro.create({ name: def.name, type: "script", img: def.img ?? "icons/svg/dice-target.svg", command: def.command, folder: folder?.id });
  }
  ui.notifications?.info(`${MODULE_ID}: Macro create/aggiornate.`);
}
