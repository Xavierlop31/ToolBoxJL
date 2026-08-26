import { World as CucumberWorld, setWorldConstructor } from "@cucumber/cucumber";
import type { Agente1RunResult } from "../../../src/agente-1/route-scheduler-agent";
import type { OrdenParaRecordatorio } from "../../../src/agente-2/reminder-candidates";

/**
 * World de Cucumber COMPARTIDO por los jobs standalone de `apps/workers`
 * (Cucumber solo permite un `setWorldConstructor` por proceso de test — ver
 * `apps/workers/cucumber.cjs`). Originalmente solo para el escenario
 * "Batch nocturno genera y publica rutas optimizadas" (Agente 1,
 * `08_agente_ruteo.feature`, @Epica8); desde Sprint 8 también sirve al
 * escenario "Recordatorio de voz 24 horas antes del vencimiento" (Agente 2,
 * `09_agente_whatsapp.feature`, @HU-9.1) — de ahí los campos separados por
 * agente en vez de renombrar la clase (bajo riesgo, cambio mínimo).
 */
export class Agente1World extends CucumberWorld {
  fetchCalls: { url: string; method: string }[] = [];
  resultado?: Agente1RunResult;
  error?: Error;

  /** Campos del escenario del Agente 2 (WhatsAppReminderJob, HU-9.1). */
  ordenParaRecordatorio?: OrdenParaRecordatorio;
  notasDeVozEnviadasAgente2: { telefono: string; audio: Buffer }[] = [];
  enviadosAgente2?: number;
  errorAgente2?: Error;
}

setWorldConstructor(Agente1World);
