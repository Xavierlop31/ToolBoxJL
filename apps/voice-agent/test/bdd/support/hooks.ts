import { Before } from "@cucumber/cucumber";
import type { Agente3World } from "./world";

/** Reinicia el estado del World antes de cada escenario. */
Before(function (this: Agente3World) {
  this.fetchCalls = [];
  this.mensajesPrevios = [];
  this.resultado = undefined;
  this.latenciaMedidaMs = undefined;
  this.error = undefined;
});
