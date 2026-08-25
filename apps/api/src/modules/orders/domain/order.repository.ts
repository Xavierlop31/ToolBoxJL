import type { Order, TipoOrden } from "@toolboxjl/shared-types";

export interface NuevaOrdenInput {
  clienteId: string;
  tipo: TipoOrden;
  fechaInicio: string | null;
  fechaFin: string | null;
  returnMode: "en_sede" | "recogida_domicilio";
  direccionEntrega: string;
  zonaId: string;
  items: {
    unidadId: string;
    tarifaAplicada: number;
  }[];
}

export interface OrderRepository {
  crear(input: NuevaOrdenInput): Promise<Order>;
  buscarPorId(id: string): Promise<Order | null>;
  /**
   * Retorna los IDs de unidades que tienen reservas activas (órdenes en estado
   * pendiente_pago, confirmada o en_curso) que se solapan con el rango dado.
   */
  obtenerUnidadesReservadasEnRango(
    modeloId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<string[]>;
  /**
   * Retorna los IDs de unidades que tienen órdenes activas de cualquier tipo
   * (usado para ventas, donde cualquier orden activa excluye la unidad).
   */
  obtenerUnidadesConOrdenesActivas(modeloId: string): Promise<string[]>;
}
