import type { RangoPeriodo } from "./revenue.repository";
import { PeriodoInvalidoError } from "./errors/periodo-invalido.error";

const REGEX_ANIO_MES = /^\d{4}-\d{2}$/;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parsea el query param `periodo` de `GET /analytics/revenue` a un
 * `RangoPeriodo` (o `null` si no se pasó ningún periodo — en ese caso se
 * suma todo el histórico). Decisión de implementación del Tech Lead (no
 * requiere confirmación — ver brief del Issue #19): acepta dos formatos,
 * tal como describe openapi.yaml ("p. ej. 2026-08 o rango ISO"):
 *
 * 1. `"YYYY-MM"` (ej. `"2026-08"`): el mes calendario completo, en UTC.
 * 2. `"<inicio>/<fin>"` (ej. `"2026-08-01/2026-08-15"`): rango ISO
 *    explícito separado por `/` (notación de intervalo ISO 8601). Cada
 *    extremo puede ser una fecha (`YYYY-MM-DD`) o un datetime ISO completo.
 *    Si un extremo es solo fecha, se interpreta como el día calendario
 *    completo en UTC — por eso el límite superior (`hasta`, exclusivo) de
 *    una fecha-only se corre a la medianoche del día SIGUIENTE (así el
 *    rango incluye el día `fin` entero, no lo excluye).
 *
 * Cualquier otro formato lanza `PeriodoInvalidoError` (400).
 */
export function parsearPeriodo(periodo: string | undefined | null): RangoPeriodo | null {
  const valor = periodo?.trim();
  if (!valor) {
    return null;
  }

  if (REGEX_ANIO_MES.test(valor)) {
    const [anioStr, mesStr] = valor.split("-");
    const anio = Number(anioStr);
    const mes = Number(mesStr); // 1-12
    if (mes < 1 || mes > 12) {
      throw new PeriodoInvalidoError(valor);
    }
    const desde = new Date(Date.UTC(anio, mes - 1, 1));
    const hasta = new Date(Date.UTC(anio, mes, 1));
    validarRango(desde, hasta, valor);
    return { desde, hasta };
  }

  if (valor.includes("/")) {
    const partes = valor.split("/");
    if (partes.length !== 2) {
      throw new PeriodoInvalidoError(valor);
    }
    const [inicioRaw, finRaw] = partes;
    const desde = parsearExtremo(inicioRaw.trim(), valor, false);
    const hasta = parsearExtremo(finRaw.trim(), valor, true);
    validarRango(desde, hasta, valor);
    return { desde, hasta };
  }

  throw new PeriodoInvalidoError(valor);
}

function parsearExtremo(raw: string, periodoOriginal: string, esLimiteSuperior: boolean): Date {
  if (REGEX_FECHA.test(raw)) {
    const [anioStr, mesStr, diaStr] = raw.split("-");
    const anio = Number(anioStr);
    const mes = Number(mesStr);
    const dia = Number(diaStr);
    // Límite superior fecha-only: se corre al día siguiente para incluir el
    // día `fin` completo (ver doc-comment de `parsearPeriodo`).
    const diaEfectivo = esLimiteSuperior ? dia + 1 : dia;
    const fecha = new Date(Date.UTC(anio, mes - 1, diaEfectivo));
    if (Number.isNaN(fecha.getTime())) {
      throw new PeriodoInvalidoError(periodoOriginal);
    }
    return fecha;
  }

  const fecha = new Date(raw);
  if (Number.isNaN(fecha.getTime())) {
    throw new PeriodoInvalidoError(periodoOriginal);
  }
  return fecha;
}

function validarRango(desde: Date, hasta: Date, periodoOriginal: string): void {
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || hasta <= desde) {
    throw new PeriodoInvalidoError(periodoOriginal);
  }
}
