export type Ciudad = "Medellín" | "Bogotá";

/**
 * Zona logística de una ciudad — HU-12.2 (Fase 3). No reutiliza la clase
 * `Zona` de `@toolboxjl/shared-types` (usada por FleetModule/LogisticsModule
 * para zonas de asignación de rutas, ver `packages/shared-types/src/zona.ts`)
 * a propósito: ese value object no declara `ciudad` (no forma parte de su
 * `ZonaProps`) y este módulo expone exactamente el schema `Zona` de
 * openapi.yaml (`id`, `nombre`, `ciudad`) — mismo criterio que
 * `ToolModel`/`Order`: DTO de contrato de API, no un value object de
 * dominio "idiomático".
 */
export interface ZonaGeografica {
  id: string;
  nombre: string;
  ciudad: Ciudad;
}
