/**
 * Cliente HTTP contra `GET /catalog/search` y `GET /inventory/check-availability`
 * — mismo criterio que `apps/workers/src/agente-1/logistics-api-client.ts`
 * (`fetch` nativo, `fetchImpl` inyectable para tests). `search_catalog` es
 * público (`security: []` en openapi.yaml) — se manda el JWT igual (no hace
 * daño, instrucción explícita del prompt de este sprint) para no bifurcar el
 * código según la tool.
 */

export interface ToolModelApi {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
  tarifa_dia: number;
  tarifa_semana: number;
  [clave: string]: unknown;
}

export interface DisponibilidadApi {
  modelo_id: string;
  unidades_disponibles: number;
}

type FetchLike = typeof fetch;

async function leerCuerpoError(response: Response): Promise<string> {
  return response.text().catch(() => "<no se pudo leer el cuerpo>");
}

function headersConJwtOpcional(jwt: string): Record<string, string> {
  // El JWT se reenvía SIEMPRE, aunque el endpoint sea público — instrucción
  // explícita del prompt de este sprint ("no hace daño mandarlo"), y evita
  // tener dos caminos de código (con/sin Authorization) para la misma tool.
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}

export async function buscarCatalogo(
  apiBaseUrl: string,
  jwt: string,
  filtros: { q?: string; categoria?: string; fecha_inicio?: string; fecha_fin?: string },
  fetchImpl: FetchLike = fetch,
): Promise<ToolModelApi[]> {
  const url = new URL(`${apiBaseUrl}/catalog/search`);
  if (filtros.q) url.searchParams.set("q", filtros.q);
  if (filtros.categoria) url.searchParams.set("categoria", filtros.categoria);
  if (filtros.fecha_inicio) url.searchParams.set("fecha_inicio", filtros.fecha_inicio);
  if (filtros.fecha_fin) url.searchParams.set("fecha_fin", filtros.fecha_fin);

  const response = await fetchImpl(url.toString(), { headers: headersConJwtOpcional(jwt) });
  if (!response.ok) {
    throw new Error(`GET /catalog/search respondió ${response.status}. Cuerpo: ${await leerCuerpoError(response)}`);
  }
  return (await response.json()) as ToolModelApi[];
}

export async function consultarDisponibilidad(
  apiBaseUrl: string,
  jwt: string,
  modeloId: string,
  fechaInicio: string,
  fechaFin: string,
  fetchImpl: FetchLike = fetch,
): Promise<DisponibilidadApi> {
  const url = new URL(`${apiBaseUrl}/inventory/check-availability`);
  url.searchParams.set("modelo_id", modeloId);
  url.searchParams.set("fecha_inicio", fechaInicio);
  url.searchParams.set("fecha_fin", fechaFin);

  const response = await fetchImpl(url.toString(), { headers: headersConJwtOpcional(jwt) });
  if (!response.ok) {
    throw new Error(
      `GET /inventory/check-availability respondió ${response.status}. Cuerpo: ${await leerCuerpoError(response)}`,
    );
  }
  return (await response.json()) as DisponibilidadApi;
}
