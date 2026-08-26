import { Before } from "@cucumber/cucumber";
import type { Agente1World } from "./world";

/** Reinicia el estado del World antes de cada escenario. */
Before(function (this: Agente1World) {
  this.fetchCalls = [];
  this.resultado = undefined;
  this.error = undefined;
});
