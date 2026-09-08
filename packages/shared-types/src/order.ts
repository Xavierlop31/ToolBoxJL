export type TipoOrden = "alquiler" | "venta";

export type EstadoOrden =
  | "pendiente_pago"
  | "confirmada"
  | "en_curso"
  | "devuelta"
  | "cerrada"
  | "cancelada";

export type ModoRetorno = "en_sede" | "recogida_domicilio";

export interface OrderItem {
  id: string;
  order_id: string;
  unidad_id: string;
  tarifa_aplicada: number;
  /** Nombre del modelo de herramienta — resuelto server-side, no persistido. */
  herramienta_nombre?: string;
}

export interface Order {
  id: string;
  /** Identificador legible para el cliente (ej. "TJL0000001") — `id` sigue siendo la PK real. */
  numero_orden: string;
  cliente_id: string;
  tipo: TipoOrden;
  estado: EstadoOrden;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  return_mode: ModoRetorno;
  direccion_entrega: string;
  zona_id: string;
  items: OrderItem[];
}

export interface OrderInput {
  modelo_id: string;
  tipo: TipoOrden;
  fecha_inicio?: string;
  fecha_fin?: string;
  return_mode: ModoRetorno;
  direccion_entrega: string;
  zona_id: string;
}
