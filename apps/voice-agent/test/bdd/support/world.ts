import { World as CucumberWorld, setWorldConstructor } from "@cucumber/cucumber";
import type Anthropic from "@anthropic-ai/sdk";
import type { Agente3TurnoResultado } from "../../../src/agente-3/voice-turn-agent";

/**
 * World de Cucumber del Agente 3 (`10_agente_conserje_voz.feature`, Sprint
 * 9, Issues #26/#27). Guarda el estado que los steps necesitan compartir
 * entre "Dado"/"Cuando"/"Entonces": el historial de conversación (para el
 * flujo multi-turno del escenario 2, que depende del escenario 1), las
 * llamadas HTTP mockeadas, y la latencia medida del turno mockeado (ver
 * comentario en los steps sobre qué NO mide esta latencia).
 */
export class Agente3World extends CucumberWorld {
  fetchCalls: { url: string; method: string }[] = [];
  mensajesPrevios: Anthropic.MessageParam[] = [];
  resultado?: Agente3TurnoResultado;
  latenciaMedidaMs?: number;
  error?: Error;

  /** JWT simulado del cliente (extraído de metadata en el flujo real, ver metadata.ts) — fijo en los tests, no se ejercita LiveKit real. */
  jwtCliente = "jwt-cliente-fake-para-bdd";
}

setWorldConstructor(Agente3World);
