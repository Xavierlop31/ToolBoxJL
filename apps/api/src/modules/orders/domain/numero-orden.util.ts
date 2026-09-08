const PREFIJO = "TJL";
const ANCHO_PADDING = 7;

/**
 * Formatea el entero autoincremental `orders.numero_orden` (Postgres) al
 * identificador legible que ve el cliente (ej. "TJL0000001") — `id` (UUID)
 * sigue siendo la PK real; esto es solo para mostrar. Vive acá (no en cada
 * implementación de `OrderRepository`) para que el ancho del padding/prefijo
 * se pueda ajustar en un solo lugar sin tocar la columna de la base.
 */
export function formatearNumeroOrden(secuencia: number): string {
  return `${PREFIJO}${String(secuencia).padStart(ANCHO_PADDING, "0")}`;
}
