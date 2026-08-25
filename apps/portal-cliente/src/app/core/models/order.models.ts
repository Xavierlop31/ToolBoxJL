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
  tarifa_applied: number;
}

export interface Order {
  id: string;
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
