export class MyItemSheet extends foundry.applications.api.DocumentSheetV2<Item> {
  static override DEFAULT_OPTIONS = {
    id: "wildemount-item-sheet",
    window: { title: "Wildemount Item", icon: "fas fa-suitcase" },
    position: { width: 420, height: 360 },
    actions: { save: this.submit }
  };

  static override PARTS = { form: { template: null } };
  #form!: HTMLFormElement;

  override async _renderContext(): Promise<any> {
    const data = this.document;
    const type = data.type;
    const rarity = getProperty(data, "system.rarity") ?? "";
    return { name: data.name, type, rarity };
  }

  override async _renderHTML(context: any): Promise<HTMLElement> {
    const root = document.createElement("form");
    root.classList.add("wm-sheet");
    root.innerHTML = `
      <h2>${context.name}</h2>
      <div class="wm-field">
        <label>Nome</label>
        <input type="text" name="name" value="${context.name}"/>
      </div>
      <div class="wm-field">
        <label>Rarità</label>
        <input type="text" name="system.rarity" value="${context.rarity}"/>
      </div>
      <div class="wm-actions">
        <button type="submit" data-action="save"><i class="fas fa-save"></i> Salva</button>
      </div>
    `;
    this.#form = root;
    return root;
  }

  static async submit(this: MyItemSheet, event: Event) {
    event.preventDefault();
    const fd = new FormData(this.#form);
    const update: any = {};
    for (const [k, v] of fd.entries()) update[k] = v;
    await this.document.update(update);
    ui.notifications?.info("Item aggiornato.");
  }
}
