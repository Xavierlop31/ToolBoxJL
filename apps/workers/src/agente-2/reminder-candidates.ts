/**
 * Lógica PURA (sin red, sin DB) del `WhatsAppReminderJob` (Sprint 8, Issue
 * #24, HU-9.1) — testeada de forma aislada, mismo criterio que
 * `route-scheduler.ts`/`mora-calculator.ts`.
 */

export interface OrdenParaRecordatorio {
  id: string;
  clienteId: string;
  tipo: "alquiler" | "venta" | string;
  estado: string;
  fechaFin: Date | null;
}

const UN_DIA_MS = 1000 * 60 * 60 * 24;
const ESTADOS_ACTIVOS = new Set(["confirmada", "en_curso"]);

/**
 * Órdenes de alquiler ACTIVAS cuya `fechaFin` cae dentro de las próximas 24
 * horas contadas desde `ahora` — el recordatorio de voz de HU-9.1
 * ("Recordatorio de voz 24 horas antes del vencimiento"). Ventana cerrada
 * en ambos extremos: `ahora <= fechaFin <= ahora + 24h` (una orden que ya
 * venció, o que vence en más de 24h, no es candidata hoy).
 */
export function filtrarCandidatosRecordatorio(
  ordenes: OrdenParaRecordatorio[],
  ahora: Date,
): OrdenParaRecordatorio[] {
  const limite = new Date(ahora.getTime() + UN_DIA_MS);
  return ordenes.filter(
    (orden) =>
      orden.tipo === "alquiler" &&
      ESTADOS_ACTIVOS.has(orden.estado) &&
      orden.fechaFin !== null &&
      orden.fechaFin.getTime() >= ahora.getTime() &&
      orden.fechaFin.getTime() <= limite.getTime(),
  );
}
