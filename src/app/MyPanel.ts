const MODULE_ID = "wildemount-starter";

function hasMidi() { return game.modules.get("midi-qol")?.active; }

async function toggleConditionForSelected(key: string) {
  const t = canvas.tokens?.controlled[0];
  const actor = t?.actor;
  if (!actor) return ui.notifications?.warn("Seleziona un token.");
  // DnD5e helper se disponibile
  const fn = (actor as any)?.toggleCondition;
  if (typeof fn === "function") return fn.call(actor, key);
  // Fallback: flag su token (solo dimostrativo)
  const curr = t.actor.getFlag(MODULE_ID, `cond.${key}`);
  await t.actor.setFlag(MODULE_ID, `cond.${key}`, !curr);
  ui.notifications?.info(`${key} ${!curr ? "applicata" : "rimossa"} (fallback).`);
}

async function createLuxonBlessing(durationSec = 60) {
  const t = canvas.tokens?.controlled[0];
  const actor = t?.actor;
  if (!actor) return ui.notifications?.warn("Seleziona un token.");
  const changes: any[] = [];
  if (hasMidi()) {
    changes.push(
      { key: "flags.midi-qol.bonusAttackRoll", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: "+1d4", priority: 20 },
      { key: "flags.midi-qol.bonusSavingThrow", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: "+1d4", priority: 20 }
    );
  } else {
    // Fallback: +1 alle prove come esempio
    changes.push({ key: "system.bonuses.abilities.check", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: "+1", priority: 20 });
  }
  await ActiveEffect.create({
    name: "Benedizione di Luxon",
    icon: "icons/magic/holy/angel-wings-prayer-blue.webp",
    origin: actor.uuid,
    disabled: false,
    duration: { seconds: durationSec, startTime: game.time.worldTime },
    changes
  }, { parent: actor });
  ui.notifications?.info("Benedizione di Luxon applicata.");
}

export class MyPanel extends foundry.applications.api.ApplicationV2 {
  static override DEFAULT_OPTIONS = {
    id: "wildemount-panel",
    window: { title: "Pannello Wildemount", icon: "fas fa-dragon", resizable: true },
    position: { width: 520, height: 520 }
  };

  #counter = 0;

  async _renderContext(): Promise<any> {
    // elenco condizioni dnd5e se presente
    const dnd = (CONFIG as any)?.DND5E;
    const conds = dnd?.conditions ? Object.entries(dnd.conditions).map(([k, v]) => ({ key: k, label: v })) : [
      { key: "prone", label: "Prono" },
      { key: "blinded", label: "Accecato" },
      { key: "grappled", label: "Afferrato" },
      { key: "frightened", label: "Spaventato" }
    ];
    return {
      counter: this.#counter,
      user: game.user?.name ?? "Unknown",
      system: game.system.id,
      conds
    };
  }

  async _renderHTML(context: any): Promise<HTMLElement> {
    const root = document.createElement("section");
    root.classList.add("wildemount-panel");
    root.innerHTML = `
      <h2>Benvenuto, ${context.user}</h2>
      <div class="row">Sistema: <b>${context.system}</b></div>
      <div class="row">Contatore: <b>${context.counter}</b></div>
      <div class="row">
        <button class="wm-btn-increase"><i class="fas fa-plus"></i> Aumenta</button>
        <button class="wm-btn-heal-selected"><i class="fas fa-heart"></i> Cura selezionato (GM)</button>
        <button class="wm-btn-luxon"><i class="fas fa-sun"></i> Benedizione di Luxon</button>
      </div>
      <h3 style="margin-top:.6rem">Condizioni (clic per togglare sul selezionato)</h3>
      <div class="wm-conditions"></div>
    `;
    root.querySelector(".wm-btn-increase")?.addEventListener("click", () => {
      this.#counter++;
      this.render(true);
    });
    root.querySelector(".wm-btn-heal-selected")?.addEventListener("click", async () => {
      const token = canvas.tokens?.controlled[0];
      if (!token?.actor) return ui.notifications?.warn("Seleziona un token.");
      await game.socket?.emit(`module.${MODULE_ID}`, {
        op: "heal",
        actorUuid: token.actor.uuid,
        to: 10
      });
    });
    root.querySelector(".wm-btn-luxon")?.addEventListener("click", async () => {
      await createLuxonBlessing(60);
    });

    const grid = root.querySelector(".wm-conditions") as HTMLElement;
    for (const c of context.conds) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wm-cond";
      b.innerHTML = `<i class="fas fa-circle"></i> ${c.label} <small style="opacity:.7">(${c.key})</small>`;
      b.addEventListener("click", () => toggleConditionForSelected(c.key));
      grid.appendChild(b);
    }

    return root;
  }
}
