/**
 * Cliente HTTP contra las dos tools reales del Agente 2 (TRD §4.2):
 * `GET /inventory/check-availability` y `POST /rentals/extend`. Mismo
 * criterio que `apps/workers/src/agente-1/logistics-api-client.ts` (`fetch`
 * nativo, `fetchImpl` inyectable para tests) — acá el destino es el mismo
 * proceso de `apps/api` (loopback), pero la llamada es HTTP real igual que
 * si fuera un cliente externo (ver decisión documentada en `config.ts`).
 */

export interface DisponibilidadApi {
  modelo_id: string;
  unidades_disponibles: number;
}

export interface OrderApi {
  id: string;
  cliente_id: string;
  tipo: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  return_mode: string;
  direccion_entrega: string;
  zona_id: string;
  items: { id: string; order_id: string; unidad_id: string; tarifa_aplicada: number }[];
}

type FetchLike = typeof fetch;

async function leerCuerpoError(response: Response): Promise<string> {
  return response.text().catch(() => "<no se pudo leer el cuerpo>");
}

export async function consultarDisponibilidad(
  apiBaseUrl: string,
  bearerToken: string,
  modeloId: string,
  fechaInicio: string,
  fechaFin: string,
  fetchImpl: FetchLike = fetch,
): Promise<DisponibilidadApi> {
  const url = new URL(`${apiBaseUrl}/inventory/check-availability`);
  url.searchParams.set("modelo_id", modeloId);
  url.searchParams.set("fecha_inicio", fechaInicio);
  url.searchParams.set("fecha_fin", fechaFin);

  const response = await fetchImpl(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!response.ok) {
    throw new Error(
      `GET /inventory/check-availability respondió ${response.status}. Cuerpo: ${await leerCuerpoError(response)}`,
    );
  }
  return (await response.json()) as DisponibilidadApi;
}

export async function extenderAlquiler(
  apiBaseUrl: string,
  bearerToken: string,
  input: { order_id: string; nueva_fecha_fin: string; modo_cobro?: "link_pago" | "acumular_a_factura_final" },
  fetchImpl: FetchLike = fetch,
): Promise<OrderApi> {
  const response = await fetchImpl(`${apiBaseUrl}/rentals/extend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      `POST /rentals/extend respondió ${response.status}. Cuerpo: ${await leerCuerpoError(response)}`,
    );
  }
  return (await response.json()) as OrderApi;
}
