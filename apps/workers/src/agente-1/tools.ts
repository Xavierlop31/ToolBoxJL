import type Anthropic from "@anthropic-ai/sdk";

/**
 * Definición de las DOS tools que el Agente 1 tiene permitido llamar
 * (TRD §4.1 — "los tres agentes comparten el mismo mecanismo de tool
 * calling" con Claude). La capacidad de la flota (`GET /fleet/vehicles`) NO
 * es una tool de Claude: se la resuelve `route-scheduler-agent.ts` ANTES de
 * arrancar el loop y se le pasa a Claude como contexto en el primer mensaje
 * — mismo criterio que TRD §4.1 ("capacidad de cada vehículo, ya vía
 * GET /fleet/vehicles si hace falta"): es una entrada del batch, no algo que
 * el modelo decide consultar dinámicamente.
 */

export const GET_PENDING_ORDERS_TOOL: Anthropic.Tool = {
  name: "get_pending_orders",
  description:
    "Devuelve la lista de pedidos confirmados (envíos) que todavía no tienen ruta asignada, " +
    "vía GET /logistics/pending-orders. Cada pedido trae al menos su id, order_id y tipo " +
    "(entrega/recogida); si el pedido no tiene zona o peso/volumen conocidos, esos campos " +
    "vienen null o ausentes — en ese caso, ese pedido NO se debe asignar a ninguna ruta (ver " +
    "el system prompt).",
  input_schema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  strict: true,
};

export const ASSIGN_ROUTES_TOOL: Anthropic.Tool = {
  name: "assign_routes",
  description:
    "Publica el resultado FINAL de la planificación vía POST /logistics/assign-routes. Llamala " +
    "UNA sola vez, al final, con TODAS las rutas ya decididas (una entrada por vehículo que " +
    "recibió al menos una parada) — no la llames varias veces con resultados parciales. Los " +
    "pedidos que decidiste dejar sin asignar simplemente no aparecen en ninguna `paradas` — no " +
    "hay forma de reportarlos por esta tool, así que mencionalos por su shipment_id en tu " +
    "respuesta de texto final, con el motivo.",
  input_schema: {
    type: "object",
    properties: {
      rutas: {
        type: "array",
        description: "Una ruta por vehículo utilizado, con sus paradas en orden de visita.",
        items: {
          type: "object",
          properties: {
            vehiculo_id: { type: "string", format: "uuid" },
            fecha: {
              type: "string",
              format: "date",
              description: "Fecha del día de reparto que se está planificando (YYYY-MM-DD).",
            },
            paradas: {
              type: "array",
              description: "shipment_id de cada pedido, en el orden en que el vehículo los va a visitar.",
              items: { type: "string", format: "uuid" },
            },
          },
          required: ["vehiculo_id", "fecha", "paradas"],
          additionalProperties: false,
        },
      },
    },
    required: ["rutas"],
    additionalProperties: false,
  },
  strict: true,
};

export const AGENTE_1_TOOLS: Anthropic.Tool[] = [GET_PENDING_ORDERS_TOOL, ASSIGN_ROUTES_TOOL];

/**
 * System prompt prescriptivo (TRD §4.1 — el criterio de negocio de
 * agrupación por zona + bin-packing por capacidad NO se deja a que el
 * modelo improvise, se le da explícito acá). El mismo algoritmo, en forma de
 * función pura testeable sin LLM, vive en `../route-scheduler.ts` — sirve
 * como referencia de la estrategia y como red de contención barata en CI.
 */
export function construirSystemPrompt(): string {
  return [
    "Sos el Agente 1 de ToolBox JL: el Programador Inteligente de Rutas. Corrés una vez por " +
      "noche y tu único trabajo es planificar y publicar las rutas de reparto/recogida de " +
      "mañana, respetando la capacidad de cada vehículo.",
    "",
    "Estrategia obligatoria (no la reemplaces por tu propio criterio):",
    "1. Llamá get_pending_orders para obtener los pedidos pendientes de asignación.",
    "2. Agrupá los pedidos por zona geográfica (zona_id) — es la aproximación a densidad " +
      "geográfica/cuadrante que tenés disponible: los pedidos de una misma zona van, en lo " +
      "posible, en la misma ruta.",
    "3. Dentro de cada zona, asigná los pedidos a los vehículos de la flota que sirven esa zona " +
      "(mirá la lista de vehículos que te doy abajo, con su capacidad_kg/capacidad_m3 y sus " +
      "zonas) usando bin-packing: metélos empezando por los más pesados/voluminosos, y NUNCA " +
      "superes la capacidad_kg ni la capacidad_m3 de un vehículo.",
    "4. Un pedido sin zona_id, peso o volumen conocidos NO se asigna a ninguna ruta — dejalo " +
      "sin asignar.",
    "5. Un pedido que no entra en la capacidad de ningún vehículo de su zona (o cuya zona no " +
      "tiene ningún vehículo asignado) NO se fuerza en una ruta que excede capacidad — también " +
      "queda sin asignar.",
    "6. Cuando termines de decidir todas las rutas, llamá assign_routes UNA sola vez con el " +
      "resultado completo (todas las rutas juntas, no una llamada por vehículo).",
    "7. En tu respuesta de texto final (después de la tool call), listá cada pedido que dejaste " +
      "sin asignar con su shipment_id y el motivo (zona sin vehículo / capacidad insuficiente / " +
      "datos insuficientes) — no existe todavía ningún canal de notificación automática al " +
      "Gerente (ni WhatsApp ni email configurados para esto), así que ese texto es la única " +
      "forma de que un humano se entere y haga la revisión manual.",
    "",
    "No inventes pedidos, vehículos ni rutas que no vengan de get_pending_orders o de la lista " +
      "de vehículos de abajo.",
  ].join("\n");
}
