import type Anthropic from "@anthropic-ai/sdk";

/**
 * Las tools que el Agente 3 tiene permitido llamar (TRD §4.3, HU-10.1/10.2):
 * `search_catalog` (GET /catalog/search, público) y `add_to_cart`
 * (POST /cart/add-item, requiere el JWT del cliente reenviado — ver
 * `metadata.ts`). Se agrega además `check_availability`
 * (GET /inventory/check-availability, `x-roles` ya incluye `agente-3` en el
 * contrato) — instrucción explícita del prompt de este sprint: "validar
 * disponibilidad... antes de recomendar", igual criterio que ya usa el
 * Agente 2 para `extend_rental`. Sin esta tool, Claude solo podría
 * recomendar por nombre/categoría sin saber si hay unidades libres en el
 * rango de fechas pedido.
 */

export const SEARCH_CATALOG_TOOL: Anthropic.Tool = {
  name: "search_catalog",
  description:
    "Busca modelos de herramientas en el catálogo, vía GET /catalog/search (endpoint público, no " +
    "requiere autenticación). Usala para encontrar candidatos que coincidan con lo que el cliente " +
    "pidió por voz (texto libre, categoría y/o rango de fechas) ANTES de recomendar nada — nunca " +
    "inventes un modelo, marca o tarifa que no venga de esta tool.",
  input_schema: {
    type: "object",
    properties: {
      q: { type: "string", description: "Texto de búsqueda libre (nombre, marca, categoría)." },
      categoria: { type: "string" },
      fecha_inicio: { type: "string", format: "date", description: "Primer día del alquiler (YYYY-MM-DD), si el cliente lo mencionó." },
      fecha_fin: { type: "string", format: "date", description: "Último día del alquiler (YYYY-MM-DD), si el cliente lo mencionó." },
    },
    additionalProperties: false,
  },
  strict: true,
};

export const CHECK_AVAILABILITY_TOOL: Anthropic.Tool = {
  name: "check_availability",
  description:
    "Consulta cuántas unidades del modelo indicado están disponibles en un rango de fechas, vía " +
    "GET /inventory/check-availability. Llamala DESPUÉS de encontrar un modelo candidato con " +
    "search_catalog y ANTES de recomendarlo — si unidades_disponibles es 0, no lo recomiendes, " +
    "buscá otro candidato o decile al cliente que no hay disponibilidad para esas fechas.",
  input_schema: {
    type: "object",
    properties: {
      modelo_id: { type: "string", format: "uuid", description: "UUID del modelo de herramienta (id devuelto por search_catalog)." },
      fecha_inicio: { type: "string", format: "date", description: "Primer día a verificar (YYYY-MM-DD)." },
      fecha_fin: { type: "string", format: "date", description: "Último día a verificar (YYYY-MM-DD)." },
    },
    required: ["modelo_id", "fecha_inicio", "fecha_fin"],
    additionalProperties: false,
  },
  strict: true,
};

export const ADD_TO_CART_TOOL: Anthropic.Tool = {
  name: "add_to_cart",
  description:
    "Agrega un modelo de herramienta al carrito del cliente, vía POST /cart/add-item. SOLO " +
    "llamala DESPUÉS de que el cliente confirmó VERBALMENTE, en este mismo turno de conversación, " +
    "que quiere esa herramienta específica — nunca la llames de forma preventiva, ni apenas la " +
    "recomendás, ni si el cliente todavía está dudando entre opciones.",
  input_schema: {
    type: "object",
    properties: {
      modelo_id: { type: "string", format: "uuid", description: "UUID del modelo confirmado por el cliente." },
      // Sin "minimum" — la API de Anthropic rechaza esa keyword en tools
      // (400: "For 'integer' type, property 'minimum' is not supported",
      // detectado en el workflow de integración real). La restricción
      // ">= 1" queda en la descripción para el modelo y la valida de
      // verdad POST /cart/add-item server-side (class-validator).
      cantidad: { type: "integer", description: "Cantidad de unidades, siempre >= 1. Default 1 si el cliente no especificó otra cosa." },
      dias: { type: "integer", description: "Cantidad de días de alquiler (>= 1), si el cliente los mencionó." },
    },
    required: ["modelo_id", "cantidad"],
    additionalProperties: false,
  },
  strict: true,
};

export const AGENTE_3_TOOLS: Anthropic.Tool[] = [SEARCH_CATALOG_TOOL, CHECK_AVAILABILITY_TOOL, ADD_TO_CART_TOOL];

/**
 * System prompt prescriptivo (mismo criterio que Agentes 1/2 — TRD §4: "el
 * backend nunca confía ciegamente en la salida del agente", y acá tampoco el
 * modelo inventa catálogo/disponibilidad). Ejemplo de flujo tomado
 * literalmente del TRD §4.3: "el agente filtra catálogo por
 * categoría+atributo, valida disponibilidad de unidades para el rango de
 * fechas, recomienda un modelo y agrega al carrito tras confirmación
 * verbal".
 */
export function construirSystemPromptAgente3(): string {
  return [
    "Sos el Agente 3 de ToolBox JL: el Conserje Web de Voz. Un cliente te habla por voz desde el " +
      "widget flotante del sitio — tu trabajo es ayudarlo a encontrar la herramienta que necesita y, " +
      "si la confirma, agregarla a su carrito. Hablás en español, en tono cordial y breve — tus " +
      "respuestas se leen en voz alta (ElevenLabs), así que nunca uses markdown, listas con viñetas " +
      "ni texto largo: 1-3 frases cortas por turno.",
    "",
    "Flujo obligatorio:",
    "1. Escuchá qué herramienta necesita el cliente y, si lo mencionó, por cuántos días/qué fechas.",
    "2. Llamá search_catalog con el texto/categoría que mencionó para encontrar candidatos.",
    "3. Si tenés fechas (o el cliente las dio), llamá check_availability sobre el/los candidato(s) " +
      "más relevante(s) ANTES de recomendar — nunca recomiendes un modelo sin verificar que hay " +
      "unidades disponibles en ese rango.",
    "4. Recomendá UN modelo concreto (nombre, tarifa) basado solo en lo que devolvieron esas tools. " +
      "Si no encontrás nada disponible, decíselo con claridad y ofrecé buscar otra cosa.",
    "5. Preguntale explícitamente si lo confirma antes de agregarlo al carrito — no des por sentado " +
      "un \"sí\" implícito.",
    "6. Solo cuando el cliente confirme VERBALMENTE en este mismo turno (algo como \"sí\", \"dale\", " +
      "\"agregalo\", \"lo quiero\"), llamá add_to_cart con el modelo_id exacto que recomendaste.",
    "7. Después de add_to_cart, confirmá verbalmente que quedó agregado al carrito.",
    "",
    "Nunca inventes modelos, tarifas o disponibilidad que no vengan de search_catalog/" +
      "check_availability — si no tenés la información, pedísela al cliente o decile que no la " +
      "tenés. Nunca llames add_to_cart sin una confirmación explícita del cliente en el turno actual " +
      "— es la regla de seguridad más importante de este agente.",
  ].join("\n");
}
