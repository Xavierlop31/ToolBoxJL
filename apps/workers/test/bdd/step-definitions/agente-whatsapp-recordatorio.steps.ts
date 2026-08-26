import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { filtrarCandidatosRecordatorio, type OrdenParaRecordatorio } from "../../../src/agente-2/reminder-candidates";
import { construirMensajeRecordatorio } from "../../../src/agente-2/reminder-message";
import { sintetizarVoz } from "../../../src/agente-2/text-to-speech";
import { enviarNotaDeVoz } from "../../../src/agente-2/whatsapp-send-client";
import type { Agente1World } from "../support/world";

/**
 * Step definitions del escenario "Recordatorio de voz 24 horas antes del
 * vencimiento" (`features/09_agente_whatsapp.feature`, @HU-9.1 — Issue #24).
 *
 * *** Por qué NO llama a `ejecutarWhatsAppReminderJob` directamente ***: esa
 * función recibe un `PrismaClient` real (consulta el mismo Postgres que
 * `apps/api`, mismo criterio que `MoraCalculatorJob` — ver el comentario de
 * cabecera de `reminder-job.ts`) — mismo motivo por el que el escenario
 * Gherkin de RF-4.3 (`05_devoluciones_inspeccion_mora.feature`, Sprint 5)
 * tampoco ejercita `MoraCalculatorJob` en su BDD, sino la lógica de negocio
 * equivalente sin Prisma de por medio. Acá se compone manualmente la MISMA
 * secuencia que corre `reminder-job.ts` (filtrar candidatos → construir
 * mensaje → sintetizar voz → enviar nota de voz), con `fetch` mockeado para
 * ElevenLabs/WhatsApp Cloud API — así el escenario valida la lógica real de
 * cada pieza sin necesitar una base de datos en CI.
 */

const TELEFONO_ESCENARIO = "573009876543";

Given("que mi alquiler vence en las próximas 24 horas", function (this: Agente1World) {
  const ahora = new Date();
  const enOnceHoras = new Date(ahora.getTime() + 11 * 60 * 60 * 1000);

  const orden: OrdenParaRecordatorio = {
    id: "orden-recordatorio-1",
    clienteId: "cliente-1",
    tipo: "alquiler",
    estado: "confirmada",
    fechaFin: enOnceHoras,
  };

  const candidatas = filtrarCandidatosRecordatorio([orden], ahora);
  assert.equal(candidatas.length, 1, "la orden sembrada debería caer dentro de la ventana de 24h");
  this.ordenParaRecordatorio = candidatas[0];
});

When("el WhatsAppReminderJob se ejecuta", async function (this: Agente1World) {
  const orden = this.ordenParaRecordatorio!;

  const fetchTts = (async () =>
    ({ ok: true, arrayBuffer: async () => new TextEncoder().encode("audio-fake-mp3").buffer }) as Response) as unknown as typeof fetch;

  let llamadaWhatsapp = 0;
  const fetchWhatsapp = (async (url: string) => {
    llamadaWhatsapp++;
    if (url.endsWith("/media")) {
      return { ok: true, status: 200, json: async () => ({ id: "media-recordatorio-1" }) } as Response;
    }
    return { ok: true, status: 200, json: async () => ({ messaging_product: "whatsapp" }) } as Response;
  }) as unknown as typeof fetch;

  try {
    const mensaje = construirMensajeRecordatorio(orden.fechaFin!);
    const audio = await sintetizarVoz(mensaje, "fake-elevenlabs-key", "fake-voice-id", fetchTts);
    await enviarNotaDeVoz(
      TELEFONO_ESCENARIO,
      audio,
      { token: "fake-whatsapp-token", phoneNumberId: "fake-phone-number-id" },
      fetchWhatsapp,
    );
    this.notasDeVozEnviadasAgente2.push({ telefono: TELEFONO_ESCENARIO, audio });
    this.enviadosAgente2 = 1;
    assert.equal(llamadaWhatsapp, 2, "se esperaban 2 llamadas a WhatsApp Cloud API (subir media + enviar mensaje)");
  } catch (error) {
    this.errorAgente2 = error as Error;
  }
});

Then(
  "recibo una nota de voz generada con ElevenLabs TTS por WhatsApp Cloud API recordándome la devolución",
  function (this: Agente1World) {
    assert.ok(!this.errorAgente2, `El recordatorio falló inesperadamente: ${this.errorAgente2?.message}`);
    assert.equal(this.enviadosAgente2, 1);
    assert.equal(this.notasDeVozEnviadasAgente2.length, 1);
    assert.equal(this.notasDeVozEnviadasAgente2[0].telefono, TELEFONO_ESCENARIO);
    assert.ok(this.notasDeVozEnviadasAgente2[0].audio.length > 0, "se esperaba audio sintetizado no vacío");
  },
);
