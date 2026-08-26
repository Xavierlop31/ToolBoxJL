import type Anthropic from "@anthropic-ai/sdk";
import { ejecutarAgente1, type AnthropicMessagesClient } from "./route-scheduler-agent";

const VEHICULOS = [
  { id: "v1", tipo: "camioneta", capacidad_kg: 500, capacidad_m3: 3, zonas: ["zona-1"], repartidor_id: null },
];

const PEDIDOS = [
  { id: "s1", order_id: "o1", vehiculo_id: null, tipo: "entrega", estado_envio: "pendiente_asignacion" },
];

const RUTAS_PUBLICADAS = [
  { id: "r1", vehiculo_id: "v1", fecha: "2026-08-26", paradas: ["s1"], generada_por: "agente_1" },
];

function fakeFetch(): jest.Mock {
  return jest.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/fleet/vehicles")) {
      return { ok: true, status: 200, json: async () => VEHICULOS } as Response;
    }
    if (url.endsWith("/logistics/pending-orders")) {
      return { ok: true, status: 200, json: async () => PEDIDOS } as Response;
    }
    if (url.endsWith("/logistics/assign-routes") && init?.method === "POST") {
      return { ok: true, status: 201, json: async () => RUTAS_PUBLICADAS } as Response;
    }
    throw new Error(`fakeFetch: URL inesperada en el test: ${url}`);
  });
}

function mensajeConToolUse(name: string, input: unknown, extraTexto?: string): Anthropic.Message {
  const content: Anthropic.ContentBlock[] = [];
  if (extraTexto) {
    content.push({ type: "text", text: extraTexto, citations: [] } as Anthropic.TextBlock);
  }
  content.push({
    type: "tool_use",
    id: `toolu_${name}`,
    name,
    input,
  } as Anthropic.ToolUseBlock);
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content,
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  } as Anthropic.Message;
}

describe("ejecutarAgente1", () => {
  const baseDeps = {
    model: "claude-haiku-4-5",
    apiBaseUrl: "https://api.example.com",
    bearerToken: "token-123",
    fechaRuta: "2026-08-26",
  };

  it("ejecuta el loop completo: consulta pedidos, decide, y publica rutas una sola vez", async () => {
    const create = jest
      .fn<Promise<Anthropic.Message>, [Anthropic.MessageCreateParamsNonStreaming]>()
      .mockResolvedValueOnce(mensajeConToolUse("get_pending_orders", {}))
      .mockResolvedValueOnce(
        mensajeConToolUse(
          "assign_routes",
          { rutas: [{ vehiculo_id: "v1", fecha: "2026-08-26", paradas: ["s1"] }] },
          "Todos los pedidos fueron asignados.",
        ),
      );
    const anthropic: AnthropicMessagesClient = { create };
    const fetchImpl = fakeFetch();

    const resultado = await ejecutarAgente1({ ...baseDeps, anthropic, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(resultado.rutasPublicadas).toEqual(RUTAS_PUBLICADAS);
    expect(resultado.pedidosConsultados).toEqual(PEDIDOS);
    expect(resultado.resumenTexto).toBe("Todos los pedidos fueron asignados.");
    expect(create).toHaveBeenCalledTimes(2);

    // Vehículos se consultan antes de arrancar el loop, con el bearer token correcto.
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/fleet/vehicles",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );

    // El primer mensaje a Claude incluye la lista de vehículos como contexto.
    const primeraLlamada = create.mock.calls[0][0];
    expect(JSON.stringify(primeraLlamada.messages)).toContain("capacidad_kg");
  });

  it("le pasa las dos tools y el system prompt a cada llamada de Claude", async () => {
    const create = jest
      .fn<Promise<Anthropic.Message>, [Anthropic.MessageCreateParamsNonStreaming]>()
      .mockResolvedValueOnce(
        mensajeConToolUse("assign_routes", { rutas: [{ vehiculo_id: "v1", fecha: "2026-08-26", paradas: ["s1"] }] }),
      );
    const anthropic: AnthropicMessagesClient = { create };

    await ejecutarAgente1({ ...baseDeps, anthropic, fetchImpl: fakeFetch() as unknown as typeof fetch });

    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-4-5");
    expect((params.tools ?? []).map((t) => (t as Anthropic.Tool).name)).toEqual([
      "get_pending_orders",
      "assign_routes",
    ]);
    expect(params.system).toContain("bin-packing");
  });

  it("lanza un error explícito si el loop termina sin publicar rutas (tope de iteraciones agotado)", async () => {
    const create = jest
      .fn<Promise<Anthropic.Message>, [Anthropic.MessageCreateParamsNonStreaming]>()
      .mockResolvedValue(mensajeConToolUse("get_pending_orders", {}));
    const anthropic: AnthropicMessagesClient = { create };

    await expect(
      ejecutarAgente1({
        ...baseDeps,
        anthropic,
        fetchImpl: fakeFetch() as unknown as typeof fetch,
        maxIteraciones: 2,
      }),
    ).rejects.toThrow(/sin publicar rutas/);

    expect(create).toHaveBeenCalledTimes(2);
  });

  it("si assign_routes falla contra la API real, le devuelve el error a Claude como tool_result de error y no lo da por publicado", async () => {
    const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/fleet/vehicles")) return { ok: true, status: 200, json: async () => VEHICULOS } as Response;
      if (url.endsWith("/logistics/assign-routes")) {
        return { ok: false, status: 400, text: async () => "Vehículo no encontrado" } as Response;
      }
      throw new Error(`URL inesperada: ${url}`);
    });

    const create = jest
      .fn<Promise<Anthropic.Message>, [Anthropic.MessageCreateParamsNonStreaming]>()
      .mockResolvedValueOnce(
        mensajeConToolUse("assign_routes", { rutas: [{ vehiculo_id: "v-inexistente", fecha: "2026-08-26", paradas: ["s1"] }] }),
      )
      .mockResolvedValueOnce({
        id: "msg_2",
        type: "message",
        role: "assistant",
        model: "claude-haiku-4-5",
        content: [{ type: "text", text: "No pude publicar las rutas.", citations: [] } as Anthropic.TextBlock],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 5, output_tokens: 5 },
      } as Anthropic.Message);
    const anthropic: AnthropicMessagesClient = { create };

    await expect(
      ejecutarAgente1({ ...baseDeps, anthropic, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow(/sin publicar rutas/);

    // El segundo mensaje enviado a Claude (el tool_result) marca is_error: true.
    const segundaLlamada = create.mock.calls[1][0];
    const ultimoMensaje = segundaLlamada.messages[segundaLlamada.messages.length - 1];
    expect(JSON.stringify(ultimoMensaje)).toContain("is_error");
  });
});
