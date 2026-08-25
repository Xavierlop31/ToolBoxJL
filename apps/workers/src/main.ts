/**
 * MoraCalculatorJob (Sprint 5, Issue #16 / HU-5.3 — RF-4.3).
 *
 * Script standalone que corre UNA VEZ y termina — se dispara por cron
 * externo en Railway (mismo criterio que el batch nocturno del Agente 1,
 * docs/DESIGN.md §7, aunque ese es Sprint 7, no este). Deliberadamente NO es
 * un servidor Nest persistente: no hay necesidad de DI ni de un ciclo de
 * vida de aplicación para un job de una sola pasada — `new PrismaClient()`
 * directo + `process.exit()` al terminar es más simple y más fácil de
 * razonar para un cron job que `NestFactory.createApplicationContext()`.
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
 * se corra `pnpm install` de nuevo — aceptable para este sprint, ya que de
 * todos modos este job nunca corrió contra una base real (ver nota de
 * abajo).
 *
 * *** ESTE JOB NUNCA CORRIÓ CONTRA UNA BASE REAL *** — mismo criterio que
 * las migraciones Prisma escritas a mano de apps/api: este entorno de
 * desarrollo no tiene `DATABASE_URL` de una instancia Supabase viva. La
 * lógica de negocio (cálculo de mora) está extraída en `mora-calculator.ts`
 * y testeada con Jest de forma aislada (`mora-calculator.spec.ts`); el
 * escenario Gherkin `@RF-4.3` de `features/05_devoluciones_inspeccion_mora.feature`
 * se conecta a Cucumber real en `apps/api` (no acá), reusando la misma
 * fórmula vía `EjecutarMoraCalculatorUseCase` — ver el comentario de
 * cabecera de ese caso de uso para el detalle de por qué la lógica de
 * consulta+persistencia está necesariamente duplicada entre este script y
 * ese caso de uso (dos apps independientes, cada una con su propio acceso a
 * datos).
 */
import { PrismaClient } from "@prisma/client";
import { calcularMora } from "./mora-calculator";

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

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const emitidos = await ejecutarMoraCalculatorJob(prisma);
    console.log(`[MoraCalculatorJob] Finalizado — ${emitidos} comprobante(s) de mora emitido(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

// Solo ejecuta si este archivo corre directo (no cuando se importa desde un
// test) — permite testear `ejecutarMoraCalculatorJob` de forma aislada en el
// futuro si hiciera falta un mock de PrismaClient, sin disparar el job real.
if (require.main === module) {
  main().catch((error) => {
    console.error("[MoraCalculatorJob] Falló:", error);
    process.exitCode = 1;
  });
}

export { ejecutarMoraCalculatorJob };
