export interface Quote {
  modelo_id: string;
  tarifa_base: number;
  recargo_logistico: number;
  deposito_garantia: number;
  total: number;
  desglose: {
    concepto: string;
    monto: number;
  }[];
}

export interface OrderInput {
  modelo_id: string;
  tipo: 'alquiler' | 'venta';
  fecha_inicio?: string;
  fecha_fin?: string;
  return_mode?: 'en_sede' | 'recogida_domicilio';
  direccion_entrega: string;
  zona_id: string;
}

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
  tipo: 'alquiler' | 'venta';
  estado: 'pendiente_pago' | 'confirmada' | 'en_curso' | 'devuelta' | 'cerrada' | 'cancelada';
  fecha_inicio: string | null;
  fecha_fin: string | null;
  return_mode?: 'en_sede' | 'recogida_domicilio';
  direccion_entrega: string;
  zona_id: string;
  items?: OrderItem[];
}

export type MetodoPago = 'pse' | 'tarjeta' | 'contra_entrega';
export type EstadoPago = 'pendiente' | 'hold' | 'capturado' | 'reembolsado' | 'fallido';

export interface Payment {
  id: string;
  order_id: string;
  tipo: 'pago_alquiler' | 'pago_venta' | 'deposito_garantia' | 'cobro_mora';
  metodo: MetodoPago;
  estado: EstadoPago;
  monto: number;
  wompi_transaction_id: string | null;
}
