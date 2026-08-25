/**
 * Value object de dinero para montos en Pesos Colombianos (COP).
 *
 * COP no tiene subunidad de uso corriente (no hay centavos en la operación
 * normal de la plataforma — tarifas, depósitos y pagos se manejan en pesos
 * enteros), por eso `Dinero` envuelve un entero no negativo, tal como lo fija
 * docs/DESIGN.md §3: "Dinero (COP integer)". Nunca uses `number` suelto para
 * representar un monto en el dominio: usá `Dinero` para evitar errores de
 * redondeo/flotantes en cálculos de tarifas, recargos y depósitos.
 */
export class Dinero {
  private constructor(private readonly montoEnPesos: number) {}

  /** Construye un Dinero a partir de un monto entero en pesos (>= 0). */
  static pesos(monto: number): Dinero {
    if (!Number.isInteger(monto)) {
      throw new TypeError(
        `Dinero solo admite montos enteros en COP (recibido: ${monto}).`,
      );
    }
    if (monto < 0) {
      throw new Error(`Dinero no admite montos negativos (recibido: ${monto}).`);
    }
    if (!Number.isSafeInteger(monto)) {
      throw new TypeError(`Dinero recibió un monto fuera de rango seguro: ${monto}.`);
    }
    return new Dinero(monto);
  }

  static cero(): Dinero {
    return new Dinero(0);
  }

  /** Valor entero en pesos colombianos. */
  get valor(): number {
    return this.montoEnPesos;
  }

  sumar(otro: Dinero): Dinero {
    return Dinero.pesos(this.montoEnPesos + otro.montoEnPesos);
  }

  /** Resta otro Dinero; lanza si el resultado sería negativo. */
  restar(otro: Dinero): Dinero {
    return Dinero.pesos(this.montoEnPesos - otro.montoEnPesos);
  }

  /**
   * Multiplica por un factor (ej. porcentaje de depósito, tarifa por
   * cantidad de días). El resultado se redondea al peso entero más cercano.
   */
  multiplicarPor(factor: number): Dinero {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new Error(`Factor de multiplicación inválido: ${factor}.`);
    }
    return Dinero.pesos(Math.round(this.montoEnPesos * factor));
  }

  esMayorQue(otro: Dinero): boolean {
    return this.montoEnPesos > otro.montoEnPesos;
  }

  esMayorOIgualQue(otro: Dinero): boolean {
    return this.montoEnPesos >= otro.montoEnPesos;
  }

  equals(otro: Dinero): boolean {
    return this.montoEnPesos === otro.montoEnPesos;
  }

  /** Formato legible en pesos colombianos, ej. "$ 150.000". */
  toString(): string {
    return `$ ${this.montoEnPesos.toLocaleString("es-CO")}`;
  }

  toJSON(): number {
    return this.montoEnPesos;
  }
}
