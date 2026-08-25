/**
 * Cálculo de mora (RF-4.3, HU-5.3) — función de dominio pura, sin
 * dependencias de NestJS/Prisma, para poder testearla con Jest normal sin
 * levantar ningún `TestingModule`.
 *
 * Fórmula (decisión del Tech Lead, Sprint 5 — la spec no da la fórmula
 * exacta): `interes_mora_dia` es una tasa decimal, mismo criterio que
 * `deposito_pct` de `ToolModel` (ej. `0.05` = 5% de la tarifa diaria por día
 * de atraso). `montoMora = round(tarifaDia * interesMoraDia * diasRetraso)`.
 *
 * *** DUPLICADA A PROPÓSITO en `apps/workers/src/mora-calculator.ts` ***:
 * `apps/workers` es un deployable independiente (Railway, cron externo) que
 * NO depende de `apps/api` (cada app del monorepo depende solo de
 * `packages/`, nunca de otra app — ver CLAUDE.md §3) y `apps/workers`
 * consulta la base directo con su propio `PrismaClient` (sin pasar por los
 * repositorios/casos de uso de `apps/api`, ver comentario de cabecera de
 * `apps/workers/src/main.ts`). Mover esta fórmula de ~3 líneas a
 * `packages/shared-types` tampoco es correcto: ese paquete es de
 * DTOs/interfaces compartidos (CLAUDE.md §3), no de lógica de negocio.
 * Duplicar una función pura tan pequeña, con este comentario explícito en
 * ambos archivos, es más simple y más seguro que forzar una dependencia
 * cruzada entre apps solo para esto — si la fórmula cambia, hay que
 * actualizar los dos archivos (documentado también en el otro).
 */
export interface ResultadoCalculoMora {
  diasRetraso: number;
  montoMora: number;
}

export function calcularMora(
  tarifaDia: number,
  interesMoraDia: number,
  fechaFin: Date,
  ahora: Date,
): ResultadoCalculoMora {
  const msPorDia = 1000 * 60 * 60 * 24;
  const diasRetraso = Math.max(0, Math.ceil((ahora.getTime() - fechaFin.getTime()) / msPorDia));
  const montoMora = Math.round(tarifaDia * interesMoraDia * diasRetraso);
  return { diasRetraso, montoMora };
}
