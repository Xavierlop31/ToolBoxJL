/**
 * Puerto de generación de QR (RF-1.2). Decisión provisoria (punto 4 del
 * prompt del Tech Lead): el QR se genera on-demand y se devuelve como data
 * URI (`data:image/png;base64,...`) en `qr_code_url` — no se sube a Supabase
 * Storage todavía (no hay spec de buckets definida). Revisar esta decisión
 * cuando exista una spec real de Storage.
 */
export interface QrCodeGenerator {
  /**
   * Genera el QR imprimible ligado a una unidad física (no al modelo).
   * Codifica el UUID de la unidad — a criterio del Backend Developer se usa
   * el formato de URL corta `toolboxjl://units/{id}` en vez del UUID pelado,
   * para que un lector de QR genérico (no solo la PWA) resuelva a algo
   * identificable como perteneciente a ToolBox JL.
   */
  generar(unidadId: string): Promise<string>;
}
