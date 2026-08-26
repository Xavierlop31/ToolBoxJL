import type { RouteApi, RouteInputApi, ShipmentApi, VehicleApi } from "./logistics-api-types";

/**
 * Cliente HTTP contra `apps/api` (`fetch` nativo, mismo criterio que
 * `WompiGatewayService`/`WhatsAppOtpGatewayService` — sin cliente HTTP
 * adicional). Cada función recibe el `bearerToken` ya resuelto (login de
 * `Agente1AuthGateway`) y una implementación de `fetch` inyectable (default:
 * la global) para poder mockearla en tests sin tocar la red.
 */

type FetchLike = typeof fetch;

async function leerCuerpoError(response: Response): Promise<string> {
  return response.text().catch(() => "<no se pudo leer el cuerpo>");
}

/** `GET /logistics/pending-orders` (RF-3.1) — la única fuente de pedidos permitida para el Agente 1 (TRD §4.1). */
export async function obtenerPedidosPendientes(
  apiBaseUrl: string,
  bearerToken: string,
  fetchImpl: FetchLike = fetch,
): Promise<ShipmentApi[]> {
  const response = await fetchImpl(`${apiBaseUrl}/logistics/pending-orders`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!response.ok) {
    throw new Error(
      `GET /logistics/pending-orders respondió ${response.status}. Cuerpo: ${await leerCuerpoError(response)}`,
    );
  }
  return (await response.json()) as ShipmentApi[];
}

/** `POST /logistics/assign-routes` (RF-3.1) — publica el resultado final de la planificación. */
export async function publicarRutas(
  apiBaseUrl: string,
  bearerToken: string,
  rutas: RouteInputApi[],
  fetchImpl: FetchLike = fetch,
): Promise<RouteApi[]> {
  const response = await fetchImpl(`${apiBaseUrl}/logistics/assign-routes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rutas),
  });
  if (!response.ok) {
    throw new Error(
      `POST /logistics/assign-routes respondió ${response.status}. Cuerpo: ${await leerCuerpoError(response)}`,
    );
  }
  return (await response.json()) as RouteApi[];
}

/**
 * `GET /fleet/vehicles` — capacidad y zonas de la flota (TRD §4.1: "capacidad
 * de cada vehículo, ya vía GET /fleet/vehicles si hace falta").
 *
 * *** GAP DE CONTRATO DOCUMENTADO ***: `openapi.yaml` hoy SOLO declara
 * `POST /fleet/vehicles` (`createVehicle`) — no existe ningún GET de listado
 * en el contrato todavía. Esta función asume que Backend/Arquitecto van a
 * agregar el verbo GET al mismo path ya existente (convención REST estándar
 * sobre un recurso que ya tiene POST) — es un supuesto, NO una edición de
 * `openapi.yaml` hecha por este sprint, y está reportado como bloqueo real
 * al Tech Lead (ver PR). Contra el contrato actual, esta llamada va a fallar
 * con 404 en un entorno real — el error de abajo lo deja explícito en vez de
 * inventar una lista de vehículos o caer a un default silencioso.
 */
export async function obtenerVehiculosDisponibles(
  apiBaseUrl: string,
  bearerToken: string,
  fetchImpl: FetchLike = fetch,
): Promise<VehicleApi[]> {
  const response = await fetchImpl(`${apiBaseUrl}/fleet/vehicles`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!response.ok) {
    throw new Error(
      `GET /fleet/vehicles respondió ${response.status}. Cuerpo: ${await leerCuerpoError(response)}. ` +
        "Este endpoint NO está declarado en openapi.yaml todavía (solo existe POST /fleet/vehicles) " +
        "— ver el comentario de cabecera de esta función en logistics-api-client.ts.",
    );
  }
  return (await response.json()) as VehicleApi[];
}
