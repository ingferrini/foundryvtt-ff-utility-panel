/* FF Utility Panel — v1.0.5 (render robusto) */
const MOD_ID = "foundryvtt-ff-utility-panel";
const NS = "FFUtil";
const gp = (...a)=> foundry?.utils?.getProperty?.(...a);

function hasMidi(){ return !!game.modules.get("midi-qol")?.active; }

// -------- Helpers --------
function ensureContainer(inst){
    const el = inst?.element;
    if (!el) return null;
    let wc = el.querySelector("section.window-content");
    if (!wc) {
        wc = document.createElement("section");
        wc.className = "window-content";
        const handle = el.querySelector(".window-resize-handle");
        el.insertBefore(wc, handle || null);
    }
    return wc;
}

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
            changes: (e.changes ?? []).map(c => `${c.key} ${c.value}`)
        })) : [];

        // hp data
        const hp = actor ? {
            value: gp(actor, "system.attributes.hp.value") ?? 0,
            max:   gp(actor, "system.attributes.hp.max") ?? 0,
            temp:  gp(actor, "system.attributes.hp.temp") ?? 0
        } : null;

        return { user: game.user?.name ?? "Unknown", conds, actor, token: t, gmNote, effects, hp };
    }

    async _renderHTML(ctx){
        const safeUser = foundry.utils.escapeHTML(ctx?.user ?? "");
        const safeTok  = ctx?.token?.name ?? "—";
        const root = document.createElement("section");
        root.classList.add("ffp-panel");
        root.innerHTML = `
      <h2>Ciao ${safeUser}</h2>
      <div class="ffp-row">Token selezionato: <b>${safeTok}</b></div>

      <div class="ffp-section">Gestione HP / Status</div>
      <div class="ffp-actions">
        <button class="ffp-btn" data-op="hpDelta" data-amt="1">+1</button>
        <button class="ffp-btn" data-op="hpDelta" data-amt="5">+5</button>
        <button class="ffp-btn" data-op="hpDelta" data-amt="-1">−1</button>
        <button class="ffp-btn" data-op="hpDelta" data-amt="-5">−5</button>
        <button class="ffp-btn" data-op="hpFull">Full Heal</button>
        <button class="ffp-btn" data-op="hpKill">Kill (0 HP)</button>
        <button class="ffp-btn" data-op="hpSet">Imposta HP…</button>
        <span class="ffp-chip">HP: ${ctx?.hp ? `${ctx.hp.value}/${ctx.hp.max}` : "—"}</span>
      </div>
      <div class="ffp-actions">
        <button class="ffp-btn" data-op="tempDelta" data-amt="1">Temp +1</button>
        <button class="ffp-btn" data-op="tempDelta" data-amt="5">Temp +5</button>
        <button class="ffp-btn" data-op="tempDelta" data-amt="-1">Temp −1</button>
        <button class="ffp-btn" data-op="tempDelta" data-amt="-5">Temp −5</button>
        <button class="ffp-btn" data-op="tempSet">Set Temp…</button>
        <span class="ffp-chip">Temp: ${ctx?.hp ? `${ctx.hp.temp}` : "—"}</span>
      </div>
      <div class="ffp-actions">
        <button class="ffp-btn" data-op="toggleDefeated">Toggle Defeated</button>
        <button class="ffp-btn luxon">Benedizione di Luxon</button>
      </div>

      <div class="ffp-section">Condizioni</div>
      <div class="ffp-grid cond-grid"></div>

      <div class="ffp-section">Effetti Attivi</div>
      <div class="ffp-grid eff-grid"></div>

      <div class="ffp-section">Note rapide del DM (Token)</div>
      <textarea class="ffp-note" placeholder="Note visibili solo al GM…">${foundry.utils.escapeHTML(ctx?.gmNote ?? "")}</textarea>
      <div class="ffp-actions">
        <button class="ffp-btn" data-op="saveGMNote">Salva sul Token</button>
      </div>
    `;

        // actions
        root.querySelectorAll(".ffp-actions .ffp-btn").forEach(btn => {
            btn.addEventListener("click", async ev => {
                const op = btn.getAttribute("data-op");
                if (op === "hpDelta") return this.#doSocket(op, { amt: Number(btn.getAttribute("data-amt")||0) });
                if (op === "hpFull")  return this.#doSocket(op, {});
                if (op === "hpKill")  return this.#doSocket(op, {});
                if (op === "hpSet")   return this.#doSocket(op, { to: await this.#promptNumber("Imposta HP a:", ctx?.hp?.value ?? 0) });
                if (op === "tempDelta") return this.#doSocket(op, { amt: Number(btn.getAttribute("data-amt")||0) });
                if (op === "tempSet")   return this.#doSocket(op, { to: await this.#promptNumber("Imposta Temp HP a:", ctx?.hp?.temp ?? 0) });
                if (op === "toggleDefeated") return this.#doSocket(op, {});
                if (op === "saveGMNote"){
                    const ta = root.querySelector(".ffp-note");
                    await this.#saveGMNote(String(ta?.value ?? ""), ctx?.token);
                    return;
                }
            });
        });

        // luxon
        root.querySelector(".ffp-btn.luxon")?.addEventListener("click", () => applyLuxonBlessing(60));

        // conditions
        const grid = root.querySelector(".cond-grid");
        const entries = CONFIG?.DND5E?.conditions ? Object.entries(CONFIG.DND5E.conditions) : [["prone","Prono"],["blinded","Accecato"]];
        for(const [key,label] of entries){
            const b = document.createElement("button");
            b.type="button"; b.className="ffp-btn"; b.textContent = `${label} (${key})`;
            b.addEventListener("click", ()=> this.#toggleCondition(key));
            grid.appendChild(b);
        }

        // effects
        const egrid = root.querySelector(".eff-grid");
        for(const e of (ctx?.effects||[])){
            const row = document.createElement("div");
            row.className = "ffp-eff";
            row.innerHTML = `
        <img src="${e.icon || "icons/svg/aura.svg"}"/>
        <div style="flex:1">
          <div><b>${foundry.utils.escapeHTML(e.name||"")}</b> ${e.remaining?`<span class="ffp-chip">${e.remaining}</span>`:""}</div>
          <div style="font-size:.85em;opacity:.8">${(e.changes||[]).slice(0,3).join("; ")}</div>
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

	async _replaceHTML(element, html) {
	// Target sicuro: crea/ottieni il contenitore window-content
		const target = ensureContainer(this) ?? element;

		// Evita HierarchyRequestError: se il nuovo nodo contiene il target (o viceversa) clona
		let node = html;
		try {
		  if (node && node.contains && node.contains(target)) {
			node = node.cloneNode(true);
		  }
		} catch(e) {
		  // ignore
		}

		// Alternativa robusta: usare un DocumentFragment
		const frag = document.createDocumentFragment();
		frag.append(node);

		// Svuota e monta
		while (target.firstChild) target.removeChild(target.firstChild);
		target.appendChild(frag);
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

// ---------- API + sockets ----------
Hooks.once("init", () => {
    console.log(`${MOD_ID} | init`);
});

Hooks.once("ready", async () => {
    console.log(`${MOD_ID} | ready`);
    const api = {
        openPanel: async () => {
            const app = new FFPanel();
            const r = await app.render(true);
            const wc = ensureContainer(app);
            if (wc && !wc.firstElementChild) wc.innerHTML = `<div style="padding:8px;color:#fff">Caricamento…</div>`;
            return app;
        },
        seedMacros: () => seedMacros()
    };
    globalThis[NS] = { api };

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
        }catch(e){ console.error(e); ui.notifications?.error("Operazione fallita."); }
    });

    // Macro seed una tantum
    const setting = "macrosSeeded";
    if (!game.settings.settings.has(`${MOD_ID}.${setting}`)) {
        game.settings.register(MOD_ID, setting, { name: "Macros seeded", scope: "world", config: false, type: Boolean, default: false });
    }
    const seeded = game.settings.get(MOD_ID, setting);
    if (!seeded) {
        await seedMacros();
        await game.settings.set(MOD_ID, setting, true);
    }
});

// Quick access button in Scene Controls (left toolbar)
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
