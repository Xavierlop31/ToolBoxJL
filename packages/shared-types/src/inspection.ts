/**
 * Checklist de inspección de salida/recepción de una unidad física —
 * docs/DESIGN.md §4.1, entidad `INSPECTION_CHECKLISTS`; contrato de API:
 * openapi.yaml `#/components/schemas/InspectionChecklist` (Sprint 5,
 * HU-5.1/RF-4.2).
 *
 * `tipo: "salida"` es el checklist de despacho (no dispara ningún efecto de
 * dominio adicional en este sprint); `tipo: "recepcion"` es el de devolución
 * y es el que puede disparar el evento `InspeccionConHallazgo` que ejecuta
 * la garantía (ver InspectionModule/RegistrarInspeccionUseCase, apps/api).
 */
export type TipoInspeccion = "salida" | "recepcion";

export type SeveridadHallazgo = "leve" | "moderada" | "grave";

export interface Hallazgo {
  descripcion: string;
  severidad: SeveridadHallazgo;
}

export interface InspectionChecklist {
  id: string;
  unidad_id: string;
  shipment_id: string;
  tipo: TipoInspeccion;
  hallazgos: Hallazgo[];
  fotos_urls: string[];
  garantia_ejecutada: boolean;
}

/** Payload de `POST /inspections` (RF-4.2). */
export interface InspectionChecklistInput {
  unidad_id: string;
  shipment_id: string;
  tipo: TipoInspeccion;
  hallazgos?: Hallazgo[];
  fotos_urls?: string[];
}
