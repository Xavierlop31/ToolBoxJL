/**
 * Se lanza cuando el query param `periodo` de `GET /analytics/revenue` no
 * matchea ninguno de los formatos aceptados (ver `domain/periodo.ts`).
 * openapi.yaml declara 400 (`BadRequest`) para este caso — no está
 * explícito en la descripción del parámetro, pero es la respuesta estándar
 * del contrato para input inválido (mismo criterio que el resto de los
 * endpoints).
 */
export class PeriodoInvalidoError extends Error {
  constructor(periodo: string) {
    super(
      `El parámetro "periodo" no es válido: "${periodo}". Formatos aceptados: ` +
        `"YYYY-MM" (ej. "2026-08") o un rango ISO "<inicio>/<fin>" ` +
        `(ej. "2026-08-01/2026-08-15" o "2026-08-01T00:00:00Z/2026-08-15T00:00:00Z").`,
    );
    this.name = "PeriodoInvalidoError";
  }
}
