/**
 * WhatsAppReminderJob — Agente 2, recordatorio de voz 24h antes del
 * vencimiento (Sprint 8, Issue #24 / HU-9.1, TRD §4.2).
 *
 * Mismo patrón que `mora-calculator.ts` (Sprint 5): script standalone que
 * corre UNA VEZ y termina, disparado por cron externo en Railway (ej. una
 * vez por hora, para no perderse la ventana de 24h por poco — el filtro de
 * `reminder-candidates.ts` ya acota a exactamente esa ventana, así que
 * correr más seguido no duplica destinatarios en un mismo día porque este
 * job NO es idempotente por sí solo — ver gap documentado abajo). Consume
 * el MISMO Postgres que `apps/api` vía Prisma directo (mismo criterio que
 * `MoraCalculatorJob` — ver `src/main.ts`), no HTTP: no hay ningún endpoint
 * de "órdenes por vencer" en `openapi.yaml`, y esta consulta es exactamente
 * el mismo tipo de acceso directo ya aceptado para `listarVencidasSinMora`.
 *
 * *** GAP: teléfono del cliente (`auth.users`, fuera del schema de Prisma
 * de `apps/api`) ***. `Order.clienteId` es el `id` de un usuario de
 * Supabase Auth — el teléfono NO vive en ninguna tabla de
 * `apps/api/prisma/schema.prisma` (no hay tabla `User`/`Customer` propia:
 * Supabase Auth es la fuente de verdad, ver AuthModule). Mismo criterio ya
 * documentado para `UsuarioAutenticado.telefono` (auth-otp/domain, HU-6.2):
 * el teléfono vive en `app_metadata.telefono`/`user_metadata.telefono` del
 * usuario de Supabase Auth — acá se lee con una query SQL cruda contra
 * `auth.users` (mismo esquema Postgres, distinto schema de Supabase) en vez
 * de vía la API de administración de Supabase, para no agregar una
 * dependencia HTTP nueva a un job que hoy es 100% Prisma. *** No confirmado
 * contra un proyecto Supabase real *** (mismo caveat que
 * `TelefonoNoDisponibleError`) — si `DATABASE_URL` no tiene permisos sobre
 * el schema `auth` (rol restringido en vez del `postgres` de ejemplo en
 * `.env.example`), esta consulta falla explícito por cliente, se loguea y
 * se sigue con el resto del batch (no tumba todo el job por un cliente).
 *
 * *** GAP: idempotencia ***. Este job no registra "ya le mandé el
 * recordatorio a esta orden" en ningún lado — si el cron corre más de una
 * vez dentro de la ventana de 24h de una misma orden, el cliente recibe más
 * de un recordatorio. Aceptado por plazo (Sprint 8, demo del 4 de
 * septiembre): el impacto es un mensaje de más, no un cobro ni una acción
 * irreversible — documentado, no ignorado.
 *
 * *** Limitación permanente de entrega (docs/DESIGN.md §7.1) ***: sin
 * template "Authentication"/proactivo aprobado (WABA sin verificación de
 * negocio posible en este proyecto académico), este recordatorio PROACTIVO
 * solo entrega si el cliente le escribió al negocio en las últimas 24h. El
 * job igual se implementa y se corre (es el criterio de aceptación de
 * HU-9.1 y es demostrable en el escenario correcto — Gherkin
 * `features/09_agente_whatsapp.feature`), pero no hay forma de garantizar
 * la entrega incondicional en producción real. No es un bug de este job.
 */
import { PrismaClient } from "@prisma/client";
import { filtrarCandidatosRecordatorio, type OrdenParaRecordatorio } from "./reminder-candidates";
import { construirMensajeRecordatorio } from "./reminder-message";
import { sintetizarVoz } from "./text-to-speech";
import { enviarNotaDeVoz } from "./whatsapp-send-client";
import { loadElevenLabsApiKey, loadElevenLabsVoiceId, loadWhatsAppSendCredentials } from "./config";

async function resolverTelefono(prisma: PrismaClient, clienteId: string): Promise<string | null> {
  const filas = await prisma.$queryRaw<{ telefono: string | null }[]>`
    SELECT COALESCE(raw_app_meta_data->>'telefono', raw_user_meta_data->>'telefono') AS telefono
    FROM auth.users
    WHERE id = ${clienteId}::uuid
  `;
  return filas[0]?.telefono ?? null;
}

export async function ejecutarWhatsAppReminderJob(prisma: PrismaClient): Promise<number> {
  const ahora = new Date();
  const en24h = new Date(ahora.getTime() + 25 * 60 * 60 * 1000); // margen de 1h para no perder candidatos en el borde de la consulta SQL.

  const ordenes = await prisma.order.findMany({
    where: {
      tipo: "alquiler",
      estado: { in: ["confirmada", "en_curso"] },
      fechaFin: { gte: ahora, lte: en24h },
    },
  });

  const candidatas: OrdenParaRecordatorio[] = ordenes.map((o) => ({
    id: o.id,
    clienteId: o.clienteId,
    tipo: o.tipo,
    estado: o.estado,
    fechaFin: o.fechaFin,
  }));
  const aRecordar = filtrarCandidatosRecordatorio(candidatas, ahora);

  const elevenLabsApiKey = loadElevenLabsApiKey();
  const voiceId = loadElevenLabsVoiceId();
  const whatsappCredenciales = loadWhatsAppSendCredentials();

  let enviados = 0;
  for (const orden of aRecordar) {
    try {
      const telefono = await resolverTelefono(prisma, orden.clienteId);
      if (!telefono) {
        console.warn(
          `[WhatsAppReminderJob] Orden ${orden.id}: no se pudo resolver el teléfono del cliente ` +
            `${orden.clienteId} — se omite (ver gap documentado en la cabecera de este archivo).`,
        );
        continue;
      }

      const mensaje = construirMensajeRecordatorio(orden.fechaFin!);
      const audio = await sintetizarVoz(mensaje, elevenLabsApiKey, voiceId);
      await enviarNotaDeVoz(telefono, audio, whatsappCredenciales);

      console.log(`[WhatsAppReminderJob] Orden ${orden.id}: recordatorio de voz enviado a ${telefono}.`);
      enviados++;
    } catch (error) {
      console.error(
        `[WhatsAppReminderJob] Orden ${orden.id}: falló el envío del recordatorio — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return enviados;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const enviados = await ejecutarWhatsAppReminderJob(prisma);
    console.log(`[WhatsAppReminderJob] Finalizado — ${enviados} recordatorio(s) enviado(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[WhatsAppReminderJob] Falló:", error);
    process.exitCode = 1;
  });
}
