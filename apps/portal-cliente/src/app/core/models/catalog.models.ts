/**
 * Tipos locales que reflejan los schemas `ToolModel` de openapi.yaml
 * (líneas 717-739) y la respuesta de `GET /inventory/check-availability`
 * (líneas 234-244).
 *
 * Decisión del Tech Lead (Sprint 1): NO se toca packages/shared-types este
 * sprint — Backend está agregando ahí sus propios tipos ToolModel/ToolUnit
 * en paralelo (evita otro conflicto de merge como el del lockfile en
 * Sprint 0). Estas interfaces son locales a portal-cliente y duplican
 * deliberadamente la forma del contrato; se podrán migrar a shared-types en
 * un sprint futuro.
 */
export interface ToolModel {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
  potencia_w?: number;
  peso_kg?: number;
  volumen_m3?: number;
  tarifa_dia: number;
  tarifa_semana?: number;
  costo_compra?: number;
  deposito_pct?: number;
  interes_mora_dia?: number;
  manual_pdf_url?: string;
  imagen_url?: string | null;
  disponible_para_venta?: boolean;
}

export interface AvailabilityResult {
  modelo_id: string;
  unidades_disponibles: number;
}
