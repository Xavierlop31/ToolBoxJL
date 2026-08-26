import type Anthropic from "@anthropic-ai/sdk";

/**
 * Las DOS tools que el Agente 2 tiene permitido llamar para el flujo de
 * extensión (TRD §4.2, HU-9.2): `GET /inventory/check-availability` y
 * `POST /rentals/extend`.
 *
 * *** GAP DE PRODUCTO DOCUMENTADO (flag para el Arquitecto) ***: ningún
 * endpoint del contrato le permite al Agente 2 resolver, a partir del
 * número de teléfono de WhatsApp que le escribe, CUÁL es la orden/modelo
 * del cliente (`GET /orders/{id}` no tiene `agente-2` en `x-roles`, y no
 * existe ningún "buscar orden por teléfono"). Por eso el system prompt de
 * abajo le pide a Claude que le pregunte directamente al cliente el
 * `order_id` (visible en la confirmación que recibió al alquilar) y el
 * `modelo_id` — no hay forma de resolverlos automáticamente con el contrato
 * actual. Es una limitación de UX aceptable para el demo (el cliente
 * típicamente tiene esa confirmación a mano) pero vale la pena resolverla
 * en un sprint futuro (ej. guardar el teléfono en `Order`, o exponer un
 * endpoint de "mis pedidos activos" con `x-roles` que incluya `agente-2`).
 */

export const CHECK_AVAILABILITY_TOOL: Anthropic.Tool = {
  name: "check_availability",
  description:
    "Consulta cuántas unidades del modelo indicado están disponibles en un rango de fechas, vía " +
    "GET /inventory/check-availability. Usala para saber si la extensión que pide el cliente es " +
    "viable ANTES de ofrecerle el costo/modo de pago.",
  input_schema: {
    type: "object",
    properties: {
      modelo_id: { type: "string", format: "uuid", description: "UUID del modelo de herramienta." },
      fecha_inicio: { type: "string", format: "date", description: "Primer día a verificar (YYYY-MM-DD)." },
      fecha_fin: { type: "string", format: "date", description: "Último día a verificar (YYYY-MM-DD)." },
    },
    required: ["modelo_id", "fecha_inicio", "fecha_fin"],
    additionalProperties: false,
  },
  strict: true,
};

export const EXTEND_RENTAL_TOOL: Anthropic.Tool = {
  name: "extend_rental",
  description:
    "Extiende la fecha de fin de una orden de alquiler ya confirmada, vía POST /rentals/extend. " +
    "SOLO llamala DESPUÉS de que el cliente confirmó explícitamente, en este mismo turno de " +
    "conversación, que quiere extender Y eligió cómo pagar la diferencia (link de pago o acumular " +
    "a la factura final) — nunca la llames de forma preventiva ni con un modo de cobro asumido.",
  input_schema: {
    type: "object",
    properties: {
      order_id: { type: "string", format: "uuid" },
      nueva_fecha_fin: { type: "string", format: "date" },
      modo_cobro: { type: "string", enum: ["link_pago", "acumular_a_factura_final"] },
    },
    required: ["order_id", "nueva_fecha_fin", "modo_cobro"],
    additionalProperties: false,
  },
  strict: true,
};

export const AGENTE_2_TOOLS: Anthropic.Tool[] = [CHECK_AVAILABILITY_TOOL, EXTEND_RENTAL_TOOL];

export function construirSystemPromptAgente2(): string {
  return [
    "Sos el Agente 2 de ToolBox JL: el asistente de WhatsApp que atiende a clientes que ya tienen " +
      "un alquiler activo. Hablás en español, en tono cordial y directo (las respuestas se leen o " +
      "se escuchan como nota de voz — sé breve, sin markdown ni listas con viñetas).",
    "",
    "Tu único trabajo hoy es ayudar a extender un alquiler activo. Flujo obligatorio:",
    "1. Si no sabés el order_id de la orden que el cliente quiere extender, PREGUNTASELO — " +
      "está en la confirmación que recibió al alquilar. No lo inventes ni asumas uno.",
    "2. Si no sabés el modelo_id (identificador de la herramienta alquilada) y lo necesitás para " +
      "consultar disponibilidad, preguntáselo también (o el nombre de la herramienta, si el cliente " +
      "no tiene el UUID a mano — en ese caso pedile que te confirme el order_id igual, es el dato " +
      "que de verdad necesitás para extender).",
    "3. Llamá check_availability con el rango de fechas propuesto para confirmar que la extensión " +
      "es viable ANTES de ofrecer nada.",
    "4. Si hay disponibilidad, ofrecé pagar la diferencia por link de pago (se manda por WhatsApp) o " +
      "acumularla a la factura final — preguntale cuál prefiere, NO decidas por él.",
    "5. Solo después de que el cliente elija explícitamente una opción, llamá extend_rental UNA " +
      "sola vez con order_id, nueva_fecha_fin y el modo_cobro que eligió.",
    "6. Si no hay disponibilidad, decíselo con claridad y no llames extend_rental.",
    "",
    "Nunca ejecutés extend_rental sin una confirmación explícita del cliente en este mismo turno de " +
      "conversación — es la regla de seguridad más importante de este agente.",
  ].join("\n");
}
