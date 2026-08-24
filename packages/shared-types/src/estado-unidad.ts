/**
 * Los 5 estados de la hoja de vida de una unidad física de herramienta
 * (docs/DESIGN.md §4.1, columna `TOOL_UNITS.estado` / `TOOL_UNIT_STATUS_LOG`,
 * y openapi.yaml `ToolUnit.estado` / `ToolUnitStatusLogEntry.estado_nuevo`).
 *
 * Igual que `Rol` (rol.ts): fuente de verdad única para el conjunto de
 * estados válidos, para que tanto apps/api (InventoryModule) como cualquier
 * frontend que necesite renderizar o filtrar por estado importen desde acá
 * en lugar de redeclarar la lista. Los valores incluyen espacios ("En
 * Mantenimiento", "Dado de Baja") porque así los define el contrato de API
 * (openapi.yaml) y el escenario Gherkin RF-1.3 — no son identificadores de
 * enum de base de datos (esos se mapean aparte en el schema de Prisma).
 */
export const ESTADOS_UNIDAD = [
  "Nuevo",
  "Excelente",
  "Operativo",
  "En Mantenimiento",
  "Dado de Baja",
] as const;

export type EstadoUnidad = (typeof ESTADOS_UNIDAD)[number];

/** Type guard: valida que un valor arbitrario sea un EstadoUnidad conocido. */
export function esEstadoUnidadValido(valor: unknown): valor is EstadoUnidad {
  return (
    typeof valor === "string" &&
    (ESTADOS_UNIDAD as readonly string[]).includes(valor)
  );
}
