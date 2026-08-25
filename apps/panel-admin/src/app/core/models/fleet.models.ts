/**
 * Tipos locales que reflejan los schemas `Vehicle`/`VehicleInput` de
 * openapi.yaml (líneas 857-872).
 *
 * Decisión del Tech Lead (Sprint 1, ver apps/pwa-logistica/src/app/core/
 * models/inventory.models.ts): NO se toca packages/shared-types este
 * sprint — Backend agrega ahí sus propios tipos en paralelo. Interfaces
 * locales a panel-admin; se podrán migrar a shared-types más adelante.
 */
export const TIPOS_VEHICULO = ['moto', 'camioneta', 'camion'] as const;

export type TipoVehiculo = (typeof TIPOS_VEHICULO)[number];

export interface Vehicle {
  id: string;
  tipo: TipoVehiculo;
  capacidad_kg: number;
  capacidad_m3: number;
  zonas: string[];
  repartidor_id?: string | null;
}

export interface VehicleInput {
  tipo: TipoVehiculo;
  capacidad_kg: number;
  capacidad_m3: number;
  zonas: string[];
}
