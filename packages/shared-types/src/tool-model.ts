/**
 * Ficha técnica de un modelo de herramienta (SKU) — docs/DESIGN.md §4.1,
 * entidad `TOOL_MODELS`; contrato de API: openapi.yaml `#/components/schemas/ToolModel`.
 *
 * Los nombres de campo son deliberadamente snake_case, idénticos a los del
 * JSON que expone/consume la API (no es un modelo de dominio "idiomático"
 * TS) — es el contrato compartido entre apps/api y los frontends Angular,
 * igual que `UsuarioAutenticado`. El mapeo a nombres camelCase de Prisma
 * ocurre solo dentro de apps/api/infrastructure (no se filtra acá).
 *
 * Montos (`tarifa_dia`, `tarifa_semana`, `costo_compra`) están en COP enteros
 * (mismo criterio que `Dinero`, aunque acá viajan como `number` plano porque
 * así los define el schema OpenAPI, no como value object).
 */
export interface ToolModel {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
  potencia_w?: number | null;
  peso_kg?: number | null;
  volumen_m3?: number | null;
  tarifa_dia: number;
  tarifa_semana?: number | null;
  costo_compra?: number | null;
  deposito_pct?: number | null;
  interes_mora_dia?: number | null;
  manual_pdf_url?: string | null;
  imagen_url?: string | null;
  disponible_para_venta: boolean;
}

/**
 * Payload de alta de un modelo (POST /inventory/models, RF-1.1).
 * Igual que `ToolModelInput` en openapi.yaml: exige `nombre`, `marca`,
 * `categoria` y `tarifa_dia`; el resto de los campos de `ToolModel` quedan
 * opcionales (se completan en la ficha con posterioridad si hace falta).
 */
export type ToolModelInput = Pick<
  ToolModel,
  "nombre" | "marca" | "categoria" | "tarifa_dia"
> &
  Partial<
    Omit<
      ToolModel,
      "id" | "nombre" | "marca" | "categoria" | "tarifa_dia" | "disponible_para_venta"
    >
  > & { disponible_para_venta?: boolean };
