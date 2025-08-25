
export class MyActorSheet extends foundry.applications.api.DocumentSheetV2<Actor> {
  static DEFAULT_OPTIONS = {
    id: "wmff-actor-sheet",
    window: { title: "Wildemount Actor", icon: "fas fa-user" },
    position: { width: 640, height: 540 },
    actions: { save: this.submit, rollInit: this.rollInit }
  };
  static PARTS = { form: { template: null } };
  #form;
  async _renderContext(){
    const a = this.document;
    const hp = getProperty(a,"system.attributes.hp.value") ?? 0;
    const max = getProperty(a,"system.attributes.hp.max") ?? 0;
    const dnd = CONFIG?.DND5E ?? {};
    const weaponDict = dnd.weaponProficiencies ?? dnd.weaponProficienciesMap ?? {};
    const armorDict  = dnd.armorProficiencies ?? dnd.armorProficienciesMap ?? {};
    const wp = getProperty(a,"system.traits.weaponProf.value") ?? getProperty(a,"system.traits.weapons.value") ?? [];
    const ap = getProperty(a,"system.traits.armorProf.value")  ?? getProperty(a,"system.traits.armor.value") ?? [];
    const wList = Object.keys(weaponDict).map(k=>({key:k,label:weaponDict[k]??k,on: wp?.includes(k)}));
    const aList = Object.keys(armorDict).map(k=>({key:k,label:armorDict[k]??k,on: ap?.includes(k)}));
    return { name:a.name, hp, max, wList, aList };
  }
  async _renderHTML(ctx){
    const root = document.createElement("form");
    root.className = "wm-sheet";
    root.innerHTML = `
      <h2>${ctx.name}</h2>
      <fieldset>
        <legend>Dati Rapidi</legend>
        <div class="wm-field"><label>Nome</label><input type="text" name="name" value="${ctx.name}"/></div>
        <div class="wm-field"><label>HP</label>
          <input type="number" name="system.attributes.hp.value" value="${ctx.hp}"/> /
          <input type="number" name="system.attributes.hp.max" value="${ctx.max}"/>
        </div>
        <div class="wm-field">
          <button type="submit" data-action="save"><i class="fas fa-save"></i> Salva</button>
          <button type="button" data-action="rollInit"><i class="fas fa-dice-d20"></i> Iniziativa</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Competenze Armi</legend>
        <div class="wm-profs wm-w"></div>
      </fieldset>
      <fieldset>
        <legend>Competenze Armature</legend>
        <div class="wm-profs wm-a"></div>
      </fieldset>
    `;
    const wWrap = root.querySelector(".wm-w"); const aWrap = root.querySelector(".wm-a");
    for (const w of ctx.wList){
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="checkbox" name="__wp" value="${w.key}" ${w.on?"checked":""}/> ${w.label} <small>(${w.key})</small>`;
      wWrap.appendChild(lab);
    }
    for (const a of ctx.aList){
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="checkbox" name="__ap" value="${a.key}" ${a.on?"checked":""}/> ${a.label} <small>(${a.key})</small>`;
      aWrap.appendChild(lab);
    }
    this.#form = root;
    return root;
  }
  static async submit(this: MyActorSheet, ev){
    ev.preventDefault();
    const fd = new FormData(this.#form);
    const update:any = {};
    for (const [k,v] of fd.entries()){
      if (k==="__wp" || k==="__ap") continue;
      update[k]=v;
    }
    const wp = Array.from(this.#form.querySelectorAll('input[name="__wp"]:checked')).map((i:any)=>i.value);
    const ap = Array.from(this.#form.querySelectorAll('input[name="__ap"]:checked')).map((i:any)=>i.value);
    if (getProperty(this.document,"system.traits.weaponProf") !== undefined) update["system.traits.weaponProf.value"]=wp;
    else update["system.traits.weapons.value"]=wp;
    if (getProperty(this.document,"system.traits.armorProf") !== undefined) update["system.traits.armorProf.value"]=ap;
    else update["system.traits.armor.value"]=ap;
    await this.document.update(update);
    ui.notifications?.info("Actor aggiornato.");
  }
  static async rollInit(this: MyActorSheet){
    try{
      const a:any = this.document;
      if (a.rollInitiative) await a.rollInitiative({ createCombatants:true });
      else {
        const r = await (new Roll("1d20")).roll({async:true});
        ChatMessage.create({ content: `${a.name} tira iniziativa: ${r.total}` });
      }
    } catch(e){ console.error(e); }
  }
}
