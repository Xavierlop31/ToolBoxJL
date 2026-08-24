/**
 * Value object de zona geográfica de cobertura logística.
 *
 * En el esquema (docs/DESIGN.md §4.1) `zona_id` es una FK uuid hacia una
 * entidad de zonas gestionada por FleetModule/LogisticsModule (Sprint 4) —
 * no hay un catálogo cerrado de zonas fijado de antemano, por eso `Zona`
 * envuelve identidad + nombre en lugar de ser un enum. Se usa para el
 * recargo logístico por zona (PricingModule, RF-2.1) y para las zonas
 * asignadas a un vehículo (FleetModule, RF-3.1).
 */
export interface ZonaProps {
  id: string;
  nombre: string;
}

export class Zona {
  private constructor(
    private readonly _id: string,
    private readonly _nombre: string,
  ) {}

  static create(props: ZonaProps): Zona {
    const id = props.id?.trim();
    const nombre = props.nombre?.trim();
    if (!id) {
      throw new Error("Zona requiere un id no vacío.");
    }
    if (!nombre) {
      throw new Error("Zona requiere un nombre no vacío.");
    }
    return new Zona(id, nombre);
  }

  get id(): string {
    return this._id;
  }

  get nombre(): string {
    return this._nombre;
  }

  /** Identidad por id, no por nombre — dos zonas con igual nombre pero distinto id no son la misma. */
  equals(otra: Zona): boolean {
    return this._id === otra._id;
  }

  toJSON(): ZonaProps {
    return { id: this._id, nombre: this._nombre };
  }
}
