import "./styles/module.css";
import { MyPanel } from "./app/MyPanel";
import { MyActorSheet } from "./sheets/MyActorSheet";
import { MyItemSheet } from "./sheets/MyItemSheet";

const MODULE_ID = "wildemount-starter";
declare global { interface Window { Wildemount?: any; } }

Hooks.once("init", ()=>{
  game.settings.register(MODULE_ID, "greeting", {name:"Messaggio", hint:"Messaggio al ready", scope:"world", config:true, type:String, default:"Ciao da Wildemount!"});
  DocumentSheetConfig.registerSheet(Actor, MODULE_ID, MyActorSheet, { label:"Wildemount Actor Sheet (V2)", makeDefault:false, types:["character","npc"] });
  DocumentSheetConfig.registerSheet(Item, MODULE_ID, MyItemSheet, { label:"Wildemount Item Sheet (V2)", makeDefault:false });
});

Hooks.once("ready", ()=>{
  const api = {
    openPanel: () => new MyPanel().render(true),
    healSelectedGM: async (hp:number) => {
      const token = canvas.tokens?.controlled[0];
      if (!token?.actor) return ui.notifications?.warn("Seleziona un token.");
      await game.socket?.emit(`module.${MODULE_ID}`, { op:"heal", actorUuid: token.actor.uuid, to: hp });
    }
  };
  (window as any).Wildemount = { api };
  ui.notifications?.info(game.settings.get(MODULE_ID,"greeting") as string);
  game.socket?.on(`module.${MODULE_ID}`, async (payload:any)=>{
    if (!game.user?.isGM) return;
    if (payload?.op === "heal") {
      try {
        const actor = await fromUuid(payload.actorUuid);
        if (actor && actor.isOwner) await (actor as any).update({ "system.attributes.hp.value": payload.to });
      } catch(e){ console.error(e); }
    }
  });
});
