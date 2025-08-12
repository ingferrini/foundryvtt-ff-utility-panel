function getKeys(obj: any): string[] { return obj ? Object.keys(obj) : []; }

export class MyActorSheet extends foundry.applications.api.DocumentSheetV2<Actor> {
  static override DEFAULT_OPTIONS = {
    id: "wildemount-actor-sheet",
    window: { title: "Wildemount Actor", icon: "fas fa-user" },
    position: { width: 640, height: 540 },
    actions: { save: this.submit, rollInit: this.rollInit }
  };

  static override PARTS = { form: { template: null } };
  #form!: HTMLFormElement;

  override async _renderContext(): Promise<any> {
    const a = this.document;
    const hp = getProperty(a, "system.attributes.hp.value") ?? 0;
    const max = getProperty(a, "system.attributes.hp.max") ?? 0;

    const dnd: any = CONFIG?.DND5E ?? {};
    const weaponDict = dnd.weaponProficiencies ?? dnd.weaponProficienciesMap ?? {};
    const armorDict = dnd.armorProficiencies ?? dnd.armorProficienciesMap ?? {};

    // valori attuali dell'attore (versione robusta con fallback)
    const wp = getProperty(a, "system.traits.weaponProf.value") ??
               getProperty(a, "system.traits.weapons.value") ?? [];
    const ap = getProperty(a, "system.traits.armorProf.value") ??
               getProperty(a, "system.traits.armor.value") ?? [];

    return {
      name: a.name, hp, max, type: a.type,
      weaponList: getKeys(weaponDict).map(k => ({ key: k, label: weaponDict[k] ?? k, on: wp?.includes(k) })),
      armorList: getKeys(armorDict).map(k => ({ key: k, label: armorDict[k] ?? k, on: ap?.includes(k) })),
    };
  }

  override async _renderHTML(context: any): Promise<HTMLElement> {
    const root = document.createElement("form");
    root.classList.add("wm-sheet");
    root.innerHTML = `
      <h2>${context.name}</h2>
      <fieldset style="margin-bottom:.5rem">
        <legend>Dati Rapidi</legend>
        <div class="wm-field">
          <label>Nome</label>
          <input type="text" name="name" value="${context.name}"/>
        </div>
        <div class="wm-field">
          <label>HP</label>
          <input type="number" name="system.attributes.hp.value" value="${context.hp}"/>
          <span>/</span>
          <input type="number" name="system.attributes.hp.max" value="${context.max}"/>
        </div>
        <div class="wm-actions">
          <button type="submit" data-action="save"><i class="fas fa-save"></i> Salva</button>
          <button type="button" data-action="rollInit"><i class="fas fa-dice-d20"></i> Iniziativa</button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Competenze Armi</legend>
        <div class="wm-profs wm-profs-weapons"></div>
      </fieldset>

      <fieldset>
        <legend>Competenze Armature</legend>
        <div class="wm-profs wm-profs-armor"></div>
      </fieldset>
    `;
    const wWrap = root.querySelector(".wm-profs-weapons") as HTMLElement;
    for (const w of context.weaponList) {
      const id = `wp_${w.key}`;
      const row = document.createElement("label");
      row.innerHTML = `<input type="checkbox" name="__wp" value="${w.key}" ${w.on ? "checked":""}/> ${w.label} <small style="opacity:.7">(${w.key})</small>`;
      wWrap.appendChild(row);
    }
    const aWrap = root.querySelector(".wm-profs-armor") as HTMLElement;
    for (const a of context.armorList) {
      const row = document.createElement("label");
      row.innerHTML = `<input type="checkbox" name="__ap" value="${a.key}" ${a.on ? "checked":""}/> ${a.label} <small style="opacity:.7">(${a.key})</small>`;
      aWrap.appendChild(row);
    }

    this.#form = root;
    return root;
  }

  static async submit(this: MyActorSheet, event: Event) {
    event.preventDefault();
    const fd = new FormData(this.#form);
    const update: any = {};

    // name & hp
    for (const [k, v] of fd.entries()) {
      if (k === "__wp" || k === "__ap") continue;
      update[k] = v;
    }

    // weapon profs
    const weapon = Array.from(this.#form.querySelectorAll('input[name="__wp"]:checked')).map((i: any) => i.value);
    const armor = Array.from(this.#form.querySelectorAll('input[name="__ap"]:checked')).map((i: any) => i.value);

    // aggiorna in modo compatibile (prova path moderno poi fallback)
    if (getProperty(this.document, "system.traits.weaponProf") !== undefined) {
      update["system.traits.weaponProf.value"] = weapon;
    } else {
      update["system.traits.weapons.value"] = weapon;
    }
    if (getProperty(this.document, "system.traits.armorProf") !== undefined) {
      update["system.traits.armorProf.value"] = armor;
    } else {
      update["system.traits.armor.value"] = armor;
    }

    await this.document.update(update);
    ui.notifications?.info("Actor aggiornato.");
  }

  static async rollInit(this: MyActorSheet) {
    try {
      const actor = this.document;
      if ((actor as any).rollInitiative) await (actor as any).rollInitiative({ createCombatants: true });
      else {
        const r = await (new Roll("1d20")).roll({async:true});
        ChatMessage.create({ content: `${actor.name} tira iniziativa: ${r.total}` });
      }
    } catch (e) { console.error(e); }
  }
}
