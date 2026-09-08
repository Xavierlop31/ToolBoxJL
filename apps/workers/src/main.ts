/**
 * Entrypoint del batch diario de `apps/workers` — cron único en
 * `railway.workers.json` (05:00 UTC). Corre dos jobs standalone, uno atrás
 * del otro, cada uno aislado del otro (`ejecutarJobAislado`, ver abajo):
 *
 * - `MoraCalculatorJob` (Sprint 5, Issue #16 / HU-5.3 — RF-4.3).
 * - `WhatsAppReminderJob` (Sprint 8, Issue #24 / HU-9.1) — agregado acá
 *   2026-09-08 (bug reportado por el Arquitecto: nunca se agendó en
 *   producción, solo existía el script npm `agente2:recordatorio` para
 *   correr a mano; ver `agente-2/reminder-job.ts` para el detalle del job y
 *   sus gaps ya documentados — teléfono vía `auth.users`, idempotencia,
 *   límite de entrega proactiva de WhatsApp sin plantilla aprobada).
 *
 * Deliberadamente NO es un servidor Nest persistente: no hay necesidad de DI
 * ni de un ciclo de vida de aplicación para un batch de una sola pasada —
 * `new PrismaClient()` directo + salir al terminar es más simple y más fácil
 * de razonar que `NestFactory.createApplicationContext()`.
 *
 * `apps/workers` NO tiene su propio `prisma/schema.prisma` (decisión del
 * Tech Lead — ver prompt del sprint): consume el MISMO `@prisma/client` ya
 * generado por el `postinstall` de `apps/api` (`prisma generate` corre ahí,
 * contra `apps/api/prisma/schema.prisma`) — en un workspace pnpm, ambos
 * paquetes declaran la misma versión de `@prisma/client` en su
 * `package.json`, así que pnpm los resuelve al mismo paquete físico en el
 * store (`.pnpm/@prisma+client@.../`), y por lo tanto al mismo cliente
 * generado, sin necesitar una segunda ejecución de `prisma generate` acá.
 * *** Riesgo documentado ***: si en algún entorno CI pnpm NO dedupea (o el
 * postinstall de apps/api todavía no corrió), este import fallará hasta que
 * se corra `pnpm install` de nuevo.
 *
 * La lógica de negocio de `MoraCalculatorJob` (cálculo de mora) está
 * extraída en `mora-calculator.ts` y testeada con Jest de forma aislada
 * (`mora-calculator.spec.ts`); el escenario Gherkin `@RF-4.3` de
 * `features/05_devoluciones_inspeccion_mora.feature` se conecta a Cucumber
 * real en `apps/api` (no acá), reusando la misma fórmula vía
 * `EjecutarMoraCalculatorUseCase` — ver el comentario de cabecera de ese
 * caso de uso para el detalle de por qué la lógica de consulta+persistencia
 * está necesariamente duplicada entre este script y ese caso de uso (dos
 * apps independientes, cada una con su propio acceso a datos).
 */
import { PrismaClient } from "@prisma/client";
import { calcularMora } from "./mora-calculator";
import { ejecutarWhatsAppReminderJob } from "./agente-2/reminder-job";

async function ejecutarMoraCalculatorJob(prisma: PrismaClient): Promise<number> {
  const ahora = new Date();

  // Órdenes candidatas: todavía no devueltas/cerradas/canceladas, con fecha
  // de fin ya vencida (mismo criterio que
  // apps/api OrderRepository.listarVencidasSinMora).
  const ordenesVencidas = await prisma.order.findMany({
    where: {
      estado: { in: ["confirmada", "en_curso"] },
      fechaFin: { lt: ahora },
    },
    include: {
      items: { include: { unidad: { include: { modelo: true } } } },
      payments: true,
    },
  });

  let emitidos = 0;

  for (const orden of ordenesVencidas) {
    // Idempotencia: si ya existe un Payment de tipo "cobro_mora" para esta
    // orden, no se duplica el cobro (el job puede correr varias veces).
    const yaTieneMora = orden.payments.some((p) => p.tipo === "cobro_mora");
    if (yaTieneMora) {
      continue;
    }

    if (!orden.fechaFin || orden.items.length === 0) {
      continue;
    }

    const modelo = orden.items[0]?.unidad?.modelo;
    if (!modelo) {
      console.warn(`[MoraCalculatorJob] Orden ${orden.id}: no se pudo resolver el modelo, se omite.`);
      continue;
    }

    const { diasRetraso, montoMora } = calcularMora(
      modelo.tarifaDia,
      modelo.interesMoraDia ?? 0,
      orden.fechaFin,
      ahora,
    );

    if (diasRetraso <= 0) {
      continue;
    }

    await prisma.payment.create({
      data: {
        orderId: orden.id,
        tipo: "cobro_mora",
        // Placeholder documentado: el método real de cobro de la mora no se
        // elige en este sprint (se define cuando efectivamente se cobre) —
        // no hay endpoint para eso en openapi.yaml.
        metodo: "contra_entrega",
        estado: "pendiente",
        monto: montoMora,
        wompiTransactionId: null,
      },
    });

    console.log(
      `[MoraCalculatorJob] Orden ${orden.id}: comprobante de mora emitido — ${diasRetraso} día(s), ${montoMora} COP.`,
    );
    emitidos++;
  }

  return emitidos;
}

/**
 * Corre un job del batch aislado del resto — si `ejecutar` rechaza, se
 * loguea y se devuelve `true` (huboError) en vez de propagar, para que un
 * job caído (ej. credenciales de WhatsApp/ElevenLabs faltantes) no le
 * impida correr al resto. Devuelve `false` si terminó bien.
 */
async function ejecutarJobAislado(
  nombre: string,
  ejecutar: () => Promise<void>,
  logger: Pick<Console, "error"> = console,
): Promise<boolean> {
  try {
    await ejecutar();
    return false;
  } catch (error) {
    logger.error(`[${nombre}] Falló:`, error);
    return true;
  }
}

/**
 * Ambos jobs del batch diario (cron único en `railway.workers.json`, 05:00
 * UTC — Issue #187-adyacente, bug reportado por el Arquitecto 2026-09-08:
 * `WhatsAppReminderJob` nunca estuvo agendado en producción, solo existía
 * como script npm `agente2:recordatorio` para correr a mano). Se agrega ACÁ
 * en vez de crear un servicio de Railway nuevo con su propio cron: comparten
 * el mismo `PrismaClient`/conexión a Postgres (relevante tras el incidente
 * de pool de conexiones de Supabase del mismo día — un servicio menos
 * sumando al límite compartido) y la ventana de 25h de
 * `WhatsAppReminderJob` (ver `agente-2/reminder-job.ts`) ya está pensada
 * para tolerar una cadencia de una vez por día sin perder candidatos.
 *
 * Cada job corre aislado (`ejecutarJobAislado`): si a `WhatsAppReminderJob`
 * le faltan credenciales (`ELEVENLABS_API_KEY`/`WHATSAPP_TOKEN`/
 * `WHATSAPP_PHONE_NUMBER_ID`) y tira, `MoraCalculatorJob` corre igual, y
 * viceversa.
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let huboError = false;
  try {
    huboError ||= await ejecutarJobAislado("MoraCalculatorJob", async () => {
      const emitidos = await ejecutarMoraCalculatorJob(prisma);
      console.log(`[MoraCalculatorJob] Finalizado — ${emitidos} comprobante(s) de mora emitido(s).`);
    });

    huboError ||= await ejecutarJobAislado("WhatsAppReminderJob", async () => {
      const enviados = await ejecutarWhatsAppReminderJob(prisma);
      console.log(`[WhatsAppReminderJob] Finalizado — ${enviados} recordatorio(s) enviado(s).`);
    });
  } finally {
    await prisma.$disconnect();
  }

  if (huboError) {
    // Al menos un job falló — el error específico ya se logueó en
    // `ejecutarJobAislado`. Se propaga acá solo para que el proceso salga
    // con código != 0 y Railway marque el deployment como CRASHED (visible
    // en `list-deployments`/logs), en vez de reportar SUCCESS silencioso
    // aunque un job se haya caído.
    throw new Error("main: al menos un job del batch falló — ver logs de arriba.");
  }
}

// Solo ejecuta si este archivo corre directo (no cuando se importa desde un
// test) — permite testear `ejecutarMoraCalculatorJob` de forma aislada en el
// futuro si hiciera falta un mock de PrismaClient, sin disparar el job real.
if (require.main === module) {
  main().catch((error) => {
    console.error("[Workers] Falló:", error);
    process.exitCode = 1;
  });
}

export { ejecutarMoraCalculatorJob, ejecutarJobAislado };
