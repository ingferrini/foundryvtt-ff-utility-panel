const MODULE_ID = "wildemount-starter";
function hasMidi(){return game.modules.get("midi-qol")?.active}

async function toggleConditionForSelected(key: string) {
  const t = canvas.tokens?.controlled[0];
  const actor = t?.actor;
  if (!actor) return ui.notifications?.warn("Seleziona un token.");
  const fn = (actor as any)?.toggleCondition;
  if (typeof fn === "function") return fn.call(actor, key);
  const curr = t.actor.getFlag(MODULE_ID, `cond.${key}`);
  await t.actor.setFlag(MODULE_ID, `cond.${key}`, !curr);
  ui.notifications?.info(`${key} ${!curr ? "applicata" : "rimossa"} (fallback).`);
}

function formatRemaining(e: ActiveEffect): string {
  const now = game.time.worldTime ?? 0;
  const dur = e.duration;
  if (!dur?.seconds) return e.disabled ? "disattivo" : "—";
  const start = dur.startTime ?? now;
  const left = Math.max(0, (start + dur.seconds) - now);
  return `${Math.ceil(left)}s`;
}

function summarizeChange(ch: any): string {
  return `${ch.key} ${ch.mode === CONST.ACTIVE_EFFECT_MODES.ADD ? "+=" : ""}${ch.value}`;
}

async function createLuxonBlessing(durationSec=60){
  const t = canvas.tokens?.controlled[0];
  const actor = t?.actor;
  if (!actor) return ui.notifications?.warn("Seleziona un token.");
  const changes:any[] = hasMidi()
    ? [
        { key:"flags.midi-qol.bonusAttackRoll", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value:"+1d4", priority:20 },
        { key:"flags.midi-qol.bonusSavingThrow", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value:"+1d4", priority:20 }
      ]
    : [{ key:"system.bonuses.abilities.check", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value:"+1", priority:20 }];
  await ActiveEffect.create({
    name:"Benedizione di Luxon",
    icon:"icons/magic/holy/angel-wings-prayer-blue.webp",
    origin: actor.uuid,
    disabled:false,
    duration:{ seconds: durationSec, startTime: game.time.worldTime },
    changes
  }, { parent: actor });
}

async function toggleEffectDisabled(effectId: string) {
  const t = canvas.tokens?.controlled[0];
  const actor = t?.actor;
  if (!actor) return;
  const ef = actor.effects.get(effectId);
  if (!ef) return;
  await ef.update({ disabled: !ef.disabled });
}

async function deleteEffect(effectId: string) {
  const t = canvas.tokens?.controlled[0];
  const actor = t?.actor;
  if (!actor) return;
  await actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
}

export class MyPanel extends foundry.applications.api.ApplicationV2 {
  static override DEFAULT_OPTIONS = {
    id: "wildemount-panel",
    window: { title: "Pannello Wildemount", icon: "fas fa-dragon", resizable: true },
    position: { width: 560, height: 560 }
  };

  #counter = 0;

  async _renderContext(): Promise<any> {
    const dnd = (CONFIG as any)?.DND5E;
    const conds = dnd?.conditions ? Object.entries(dnd.conditions).map(([k,v])=>({key:k,label:v})) : [
      { key:"prone", label:"Prono" }, { key:"blinded", label:"Accecato" },
      { key:"grappled", label:"Afferrato" }, { key:"frightened", label:"Spaventato" }
    ];

    // Effetti attivi del token selezionato
    const t = canvas.tokens?.controlled[0];
    const actor = t?.actor;
    const effects = actor ? Array.from(actor.effects).map(e => ({
      id: e.id, name: e.name, icon: e.icon, disabled: e.disabled,
      remaining: formatRemaining(e),
      changes: e.changes?.map(summarizeChange) ?? []
    })) : [];

    return { counter:this.#counter, user: game.user?.name ?? "Unknown", system: game.system.id, conds, effects };
  }

  async _renderHTML(context: any): Promise<HTMLElement> {
    const root = document.createElement("section");
    root.classList.add("wildemount-panel");
    root.innerHTML = `
      <h2>Benvenuto, ${context.user}</h2>
      <div class="wm-row">Sistema: <b>${context.system}</b></div>
      <div class="wm-row">Contatore: <b>${context.counter}</b></div>
      <div class="wm-row">
        <button class="wm-btn-increase"><i class="fas fa-plus"></i> Aumenta</button>
        <button class="wm-btn-heal-selected"><i class="fas fa-heart"></i> Cura selezionato (GM)</button>
        <button class="wm-btn-luxon"><i class="fas fa-sun"></i> Benedizione di Luxon</button>
      </div>

      <h3 style="margin-top:.6rem">Condizioni (clic per togglare sul selezionato)</h3>
      <div class="wm-conditions"></div>

      <div class="wm-effects">
        <h3>Effetti Attivi sul selezionato</h3>
        <div class="wm-effects-list"></div>
      </div>
    `;

    root.querySelector(".wm-btn-increase")?.addEventListener("click", () => { this.#counter++; this.render(true); });
    root.querySelector(".wm-btn-heal-selected")?.addEventListener("click", async () => {
      const token = canvas.tokens?.controlled[0];
      if (!token?.actor) return ui.notifications?.warn("Seleziona un token.");
      await game.socket?.emit(`module.${MODULE_ID}`, { op:"heal", actorUuid: token.actor.uuid, to: 10 });
    });
    root.querySelector(".wm-btn-luxon")?.addEventListener("click", async () => { await createLuxonBlessing(60); this.render(true); });

    const grid = root.querySelector(".wm-conditions") as HTMLElement;
    for (const c of context.conds) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wm-cond";
      b.innerHTML = `<i class="fas fa-circle"></i> ${c.label} <small style="opacity:.7">(${c.key})</small>`;
      b.addEventListener("click", async () => { await toggleConditionForSelected(c.key); this.render(true); });
      grid.appendChild(b);
    }

    const list = root.querySelector(".wm-effects-list") as HTMLElement;
    if (!context.effects?.length) {
      list.innerHTML = `<p style="opacity:.7">Nessun effetto attivo trovato (seleziona un token).</p>`;
    } else {
      for (const ef of context.effects) {
        const row = document.createElement("div");
        row.className = "wm-eff";
        row.innerHTML = `
          <div class="info">
            <div class="name"><img src="${ef.icon ?? 'icons/svg/aura.svg'}" width="20" height="20" style="vertical-align:middle;margin-right:.35rem"/> ${ef.name}</div>
            <div class="meta">${ef.remaining}${ef.disabled ? " • <i>disattivo</i>" : ""}</div>
            <div class="meta" style="margin-top:.15rem">${ef.changes.map((c:string)=>`<code>${c}</code>`).join(" ")}</div>
          </div>
          <div class="actions">
            <button type="button" data-id="${ef.id}" data-act="toggle"><i class="fas fa-power-off"></i></button>
            <button type="button" data-id="${ef.id}" data-act="delete"><i class="fas fa-trash"></i></button>
          </div>
        `;
        row.querySelector('[data-act="toggle"]')?.addEventListener("click", async (ev)=>{
          await toggleEffectDisabled(ef.id);
          this.render(true);
        });
        row.querySelector('[data-act="delete"]')?.addEventListener("click", async (ev)=>{
          await deleteEffect(ef.id);
          this.render(true);
        });
        list.appendChild(row);
      }
    }

    return root;
  }
}
