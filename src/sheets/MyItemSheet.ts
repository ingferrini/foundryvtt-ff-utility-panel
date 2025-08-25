
export class MyItemSheet extends foundry.applications.api.DocumentSheetV2<Item> {
  static DEFAULT_OPTIONS = {
    id: "wmff-item-sheet",
    window: { title: "Wildemount Item", icon: "fas fa-suitcase" },
    position: { width: 440, height: 360 },
    actions: { save: this.submit }
  };
  static PARTS = { form: { template: null } };
  #form;
  async _renderContext(){ const d = this.document; const rarity = getProperty(d,"system.rarity") ?? ""; return { name: d.name, rarity }; }
  async _renderHTML(ctx){
    const root = document.createElement("form");
    root.className="wm-sheet";
    root.innerHTML = `<h2>${ctx.name}</h2>
      <div class="wm-field"><label>Nome</label><input type="text" name="name" value="${ctx.name}"/></div>
      <div class="wm-field"><label>Rarità</label><input type="text" name="system.rarity" value="${ctx.rarity}"/></div>
      <div class="wm-field"><button type="submit" data-action="save"><i class="fas fa-save"></i> Salva</button></div>`;
    this.#form = root; return root;
  }
  static async submit(this: MyItemSheet, ev){
    ev.preventDefault(); const fd = new FormData(this.#form); const update:any = {};
    for (const [k,v] of fd.entries()) update[k]=v;
    await this.document.update(update); ui.notifications?.info("Item aggiornato.");
  }
}
