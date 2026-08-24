import { Before } from "@cucumber/cucumber";
import type { ToolboxWorld } from "./world";

/** Reinicia el TestingModule (y por lo tanto los repos in-memory) antes de cada escenario. */
Before(async function (this: ToolboxWorld) {
  await this.iniciar();
});
