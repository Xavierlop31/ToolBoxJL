import { World as CucumberWorld, setWorldConstructor } from "@cucumber/cucumber";
import type { Agente1RunResult } from "../../../src/agente-1/route-scheduler-agent";

/**
 * World de Cucumber para el escenario "Batch nocturno genera y publica
 * rutas optimizadas" (`features/08_agente_ruteo.feature`, @Epica8). Guarda
 * las URLs/métodos con las que se llamó al `fetch` mockeado (para verificar
 * que el agente de verdad usó GET /logistics/pending-orders y
 * POST /logistics/assign-routes) y el resultado (o error) del batch.
 */
export class Agente1World extends CucumberWorld {
  fetchCalls: { url: string; method: string }[] = [];
  resultado?: Agente1RunResult;
  error?: Error;
}

setWorldConstructor(Agente1World);
