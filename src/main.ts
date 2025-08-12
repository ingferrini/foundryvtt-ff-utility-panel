import "./styles/module.css";
import { MyPanel } from "./app/MyPanel";
import { MyActorSheet } from "./sheets/MyActorSheet";
import { MyItemSheet } from "./sheets/MyItemSheet";
import { seedMacros } from "./macro-seed";

const MODULE_ID = "wildemount-starter";

declare global { interface Window { Wildemount?: any; } }

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);
  game.settings.register(MODULE_ID, "greeting", {
    name: "Messaggio di benvenuto",
    hint: "Stringa mostrata a tutti gli utenti al ready.",
    scope: "world",
    config: true,
    type: String,
    default: "Ciao da Wildemount Starter!"
  });

  DocumentSheetConfig.registerSheet(Actor, MODULE_ID, MyActorSheet, {
    label: "Wildemount Actor Sheet (V2)",
    makeDefault: false,
    types: ["character","npc"]
  });
  DocumentSheetConfig.registerSheet(Item, MODULE_ID, MyItemSheet, {
    label: "Wildemount Item Sheet (V2)",
    makeDefault: false
  });
});

Hooks.once("ready", async () => {
  console.log(`${MODULE_ID} | ready`);
  const api = {
    openPanel: () => new MyPanel().render(true),
    healSelectedGM: async (hp: number) => {
      const token = canvas.tokens?.controlled[0];
      if (!token?.actor) return ui.notifications?.warn("Seleziona un token.");
      await game.socket?.emit(`module.${MODULE_ID}`, { op: "heal", actorUuid: token.actor.uuid, to: hp });
    },
    seedMacros: () => seedMacros()
  };
  window.Wildemount = { api };

  ui.notifications?.info(game.settings.get(MODULE_ID, "greeting") as string);

  game.socket?.on(`module.${MODULE_ID}`, async (payload: any) => {
    if (!game.user?.isGM) return;
    if (payload?.op === "heal") {
      try {
        const actor = await fromUuid(payload.actorUuid);
        if (actor && actor.isOwner) {
          const path = "system.attributes.hp.value";
          await (actor as any).update({ [path]: payload.to });
          ui.notifications?.info(`HP impostati a ${payload.to}`);
        }
      } catch (err) {
        console.error(err);
        ui.notifications?.error("Impossibile curare il bersaglio.");
      }
    }
  });

  const flagKey = "macrosSeeded";
  const seeded = game.settings.get(MODULE_ID, flagKey) as boolean | undefined;
  if (!seeded) {
    await seedMacros();
    await game.settings.set(MODULE_ID, flagKey, true);
  }
});
