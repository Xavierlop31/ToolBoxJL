/**
 * Vehículo de la flota logística — docs/DESIGN.md §4.1, entidad `VEHICLES`;
 * contrato de API: openapi.yaml `#/components/schemas/Vehicle` (Sprint 4,
 * HU-4.1 / RF-3.1).
 *
 * Nota: el ER diagram de docs/DESIGN.md §4.1 no lista un campo `zonas` para
 * `VEHICLES`, pero openapi.yaml sí lo declara (`zonas: uuid[]`) y es
 * necesario para el escenario `@RF-3.1` de
 * features/04_logistica_flota.feature ("zonas geográficas asociadas"). Ante
 * esta discrepancia se sigue el orden de autoridad de CLAUDE.md §1:
 * openapi.yaml (contrato de API) antes que docs/ — se incluye el campo.
 */
export type TipoVehiculo = "moto" | "camioneta" | "camion";

/**
 * `placa` (Sprint 14, HU-13.4): nullable — vehículos creados antes de este
 * campo no lo tienen. *** GAP DE ALCANCE DOCUMENTADO ***: openapi.yaml
 * modela `VehicleInput` como `allOf: [Vehicle]`, así que técnicamente
 * permite mandar `placa` en `POST /fleet/vehicles`, pero ese endpoint
 * (FleetModule, Sprint 4) queda FUERA de alcance de este sprint — ni
 * `VehicleInput` (ver abajo) ni `CrearVehiculoDto`/`RegistrarVehiculoUseCase`
 * se tocan acá. Un cliente que mande `placa` en ese POST hoy recibe 400
 * (`forbidNonWhitelisted: true` en el `ValidationPipe` global, ver
 * `apps/api/src/main.ts`) porque el DTO no la declara. Este campo solo se
 * puebla hoy vía una migración/seed manual contra la base real; se lee (no
 * se escribe) en `GET /logistics/routes-today`.
 */
export interface Vehicle {
  id: string;
  tipo: TipoVehiculo;
  capacidad_kg: number;
  capacidad_m3: number;
  zonas: string[];
  repartidor_id: string | null;
  placa: string | null;
}

/**
 * Payload de alta de un vehículo (POST /fleet/vehicles, RF-3.1). openapi.yaml
 * modela `VehicleInput` como `allOf: [Vehicle]` con
 * `required: [tipo, capacidad_kg, capacidad_m3]` — acá se define sin `id`
 * (lo genera el repositorio, mismo criterio que `ToolModelInput`/
 * `OrderInput`) y con `zonas`/`repartidor_id` opcionales. `placa` NO se
 * incluye acá a propósito (ver el doc-comment de `Vehicle.placa` arriba).
 */
export interface VehicleInput {
  tipo: TipoVehiculo;
  capacidad_kg: number;
  capacidad_m3: number;
  zonas?: string[];
  repartidor_id?: string | null;
}
