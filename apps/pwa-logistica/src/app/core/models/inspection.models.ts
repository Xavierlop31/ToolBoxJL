/**
 * Tipos locales que reflejan los schemas `InspectionChecklist` /
 * `InspectionChecklistInput` de openapi.yaml (líneas 906-941, endpoint
 * `POST /inspections`, línea 481).
 *
 * Decisión del Tech Lead (Sprint 5): igual que `inventory.models.ts`
 * (Sprint 1), no se toca `packages/shared-types` este sprint — Backend
 * puede agregar ahí sus propios tipos en paralelo (condición de carrera
 * esperada entre `feature/backend-devoluciones-mora` y esta rama).
 * Interfaces locales a pwa-logistica; se podrán migrar a shared-types más
 * adelante.
 */
export const SEVERIDADES_HALLAZGO = ['leve', 'moderada', 'grave'] as const;

export type SeveridadHallazgo = (typeof SEVERIDADES_HALLAZGO)[number];

export type TipoInspeccion = 'salida' | 'recepcion';

export interface Hallazgo {
  descripcion: string;
  severidad: SeveridadHallazgo;
}

export interface InspectionChecklistInput {
  unidad_id: string;
  shipment_id: string;
  tipo: TipoInspeccion;
  hallazgos?: Hallazgo[];
  fotos_urls?: string[];
}

export interface InspectionChecklist extends InspectionChecklistInput {
  id: string;
  /**
   * `true` cuando `hallazgos` incluye daño o pieza faltante y el backend
   * disparó `GarantiaExecutionHandler` (openapi.yaml línea 496-499,
   * Esquema de Backend §5) — ejecución parcial o total del depósito de
   * garantía (RF-4.2).
   */
  garantia_ejecutada: boolean;
}
