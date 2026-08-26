/**
 * Cliente HTTP contra `POST /cart/add-item` — mismo criterio que
 * `catalog-api-client.ts`. A diferencia de `search_catalog`/
 * `check_availability`, este endpoint SÍ requiere el JWT del cliente
 * reenviado (`x-roles: [cliente]`) — sin él, `apps/api` responde 401 (ver
 * `metadata.ts` para de dónde sale ese JWT).
 */

export interface CartItemApi {
  modelo_id: string;
  cantidad: number;
  dias?: number;
}

export interface CartApi {
  items: CartItemApi[];
  total: number;
}

type FetchLike = typeof fetch;

async function leerCuerpoError(response: Response): Promise<string> {
  return response.text().catch(() => "<no se pudo leer el cuerpo>");
}

export async function agregarAlCarrito(
  apiBaseUrl: string,
  jwt: string,
  item: CartItemApi,
  fetchImpl: FetchLike = fetch,
): Promise<CartApi> {
  const response = await fetchImpl(`${apiBaseUrl}/cart/add-item`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    throw new Error(`POST /cart/add-item respondió ${response.status}. Cuerpo: ${await leerCuerpoError(response)}`);
  }
  return (await response.json()) as CartApi;
}
