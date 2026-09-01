import type Anthropic from "@anthropic-ai/sdk";
import { ejecutarTurnoAgente3, type AnthropicMessagesClient } from "./voice-turn-agent";

function textoBlock(text: string): Anthropic.TextBlock {
  return { type: "text", text, citations: null } as Anthropic.TextBlock;
}

function toolUseBlock(id: string, name: string, input: unknown): Anthropic.ToolUseBlock {
  return { type: "tool_use", id, name, input } as Anthropic.ToolUseBlock;
}

function mensajeAssistant(content: Anthropic.ContentBlock[]): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content,
    stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

function mockFetch(handlers: Record<string, (init?: RequestInit) => { status: number; body: unknown }>) {
  const calls: { url: string; method: string }[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    const path = new URL(url).pathname;
    const handler = handlers[path];
    if (!handler) {
      throw new Error(`No hay handler mockeado para ${method} ${path}`);
    }
    const { status, body } = handler(init);
    return {
      ok: status < 400,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe("ejecutarTurnoAgente3 — escenario: búsqueda por voz con recomendación", () => {
  it("llama search_catalog y check_availability antes de recomendar, sin llamar add_to_cart", async () => {
    const { fetchImpl, calls } = mockFetch({
      "/catalog/search": () => ({
        status: 200,
        body: [{ id: "m1", nombre: "Taladro Percutor", marca: "Bosch", categoria: "percutor", tarifa_dia: 15000, tarifa_semana: 90000 }],
      }),
      "/inventory/check-availability": () => ({ status: 200, body: { modelo_id: "m1", unidades_disponibles: 2 } }),
    });

    let llamada = 0;
    const anthropic: AnthropicMessagesClient = {
      create: async () => {
        llamada++;
        if (llamada === 1) {
          return mensajeAssistant([
            toolUseBlock("t1", "search_catalog", { q: "taladro percutor", categoria: "percutor" }),
          ]);
        }
        if (llamada === 2) {
          return mensajeAssistant([
            toolUseBlock("t2", "check_availability", {
              modelo_id: "m1",
              fecha_inicio: "2026-09-03",
              fecha_fin: "2026-09-06",
            }),
          ]);
        }
        return mensajeAssistant([
          textoBlock("Te recomiendo el Taladro Percutor Bosch, tiene 2 unidades disponibles a $15.000 por día. ¿Lo querés?"),
        ]);
      },
    };

    const resultado = await ejecutarTurnoAgente3(
      { anthropic, model: "claude-haiku-4-5", apiBaseUrl: "https://api.example.com", jwt: "jwt-cliente", fetchImpl },
      [],
      "Necesito alquilar un taladro percutor para concreto por 3 días desde este jueves.",
    );

    expect(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual(
      expect.arrayContaining(["GET /catalog/search", "GET /inventory/check-availability"]),
    );
    expect(resultado.ultimaBusqueda).toHaveLength(1);
    expect(resultado.ultimaDisponibilidad).toEqual({ modelo_id: "m1", unidades_disponibles: 2 });
    expect(resultado.carritoActualizado).toBeNull();
    expect(resultado.respuestaTexto).toMatch(/Taladro Percutor/);
    // El historial de mensajes queda disponible para el próximo turno (multi-turno).
    expect(resultado.mensajes.length).toBeGreaterThan(0);
  });
});

describe("ejecutarTurnoAgente3 — escenario: confirmación verbal agrega al carrito", () => {
  it("llama add_to_cart SOLO en el turno donde el cliente confirma, con el modelo_id recomendado antes", async () => {
    const { fetchImpl, calls } = mockFetch({
      "/cart/add-item": (init) => {
        const body = JSON.parse(String(init?.body)) as { modelo_id: string; cantidad: number; dias?: number };
        return { status: 200, body: { items: [body], total: 45000 } };
      },
    });

    // Historial previo simulando que en un turno anterior ya se recomendó "m1".
    const mensajesPrevios: Anthropic.MessageParam[] = [
      { role: "user", content: "Necesito un taladro percutor por 3 días." },
      { role: "assistant", content: "Te recomiendo el Taladro Percutor Bosch (m1). ¿Lo querés?" },
    ];

    // Primera llamada a Claude invoca add_to_cart; la segunda (después del tool_result) devuelve el texto de confirmación.
    let llamada = 0;
    const anthropicMultiturno: AnthropicMessagesClient = {
      create: async () => {
        llamada++;
        if (llamada === 1) {
          return mensajeAssistant([toolUseBlock("t3", "add_to_cart", { modelo_id: "m1", cantidad: 1, dias: 3 })]);
        }
        return mensajeAssistant([textoBlock("Listo, agregué el Taladro Percutor Bosch a tu carrito.")]);
      },
    };

    const resultado = await ejecutarTurnoAgente3(
      {
        anthropic: anthropicMultiturno,
        model: "claude-haiku-4-5",
        apiBaseUrl: "https://api.example.com",
        jwt: "jwt-cliente",
        fetchImpl,
      },
      mensajesPrevios,
      "Sí, dale, lo quiero.",
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("POST");
    expect(resultado.carritoActualizado).toEqual({ items: [{ modelo_id: "m1", cantidad: 1, dias: 3 }], total: 45000 });
    expect(resultado.respuestaTexto).toMatch(/agregué/i);
  });

  it("NO llama add_to_cart si Claude no lo invoca (cliente no confirmó)", async () => {
    const { fetchImpl, calls } = mockFetch({});
    const anthropic: AnthropicMessagesClient = {
      create: async () => mensajeAssistant([textoBlock("¿Confirmás que querés el Taladro Percutor Bosch?")]),
    };

    const resultado = await ejecutarTurnoAgente3(
      { anthropic, model: "claude-haiku-4-5", apiBaseUrl: "https://api.example.com", jwt: "jwt-cliente", fetchImpl },
      [],
      "Mmm, no sé todavía.",
    );

    expect(calls).toHaveLength(0);
    expect(resultado.carritoActualizado).toBeNull();
  });
});

describe("ejecutarTurnoAgente3 — emisión de tool_status por deps.emitirEvento (HU-14.2)", () => {
  it("emite running antes de despachar y done al resolver, para cada tool call de la respuesta", async () => {
    const { fetchImpl } = mockFetch({
      "/catalog/search": () => ({
        status: 200,
        body: [{ id: "m1", nombre: "Taladro Percutor", marca: "Bosch", categoria: "percutor", tarifa_dia: 15000, tarifa_semana: 90000 }],
      }),
      "/inventory/check-availability": () => ({ status: 200, body: { modelo_id: "m1", unidades_disponibles: 2 } }),
    });

    let llamada = 0;
    const anthropic: AnthropicMessagesClient = {
      create: async () => {
        llamada++;
        if (llamada === 1) {
          return mensajeAssistant([
            toolUseBlock("t1", "search_catalog", { q: "taladro percutor" }),
            toolUseBlock("t2", "check_availability", { modelo_id: "m1", fecha_inicio: "2026-09-03", fecha_fin: "2026-09-06" }),
          ]);
        }
        return mensajeAssistant([textoBlock("Te recomiendo el Taladro Percutor Bosch.")]);
      },
    };

    const eventos: unknown[] = [];
    await ejecutarTurnoAgente3(
      {
        anthropic,
        model: "claude-haiku-4-5",
        apiBaseUrl: "https://api.example.com",
        jwt: "jwt-cliente",
        fetchImpl,
        emitirEvento: (evento) => eventos.push(evento),
      },
      [],
      "Necesito un taladro percutor.",
    );

    // Ambas tool calls de la misma respuesta se despachan en orden — cada
    // una emite su running/done ANTES de pasar a la siguiente (no hay
    // interleaving, ver `ejecutarToolCalls`: loop secuencial con `await`).
    expect(eventos).toEqual([
      { type: "tool_status", tool: "search_catalog", label: "Buscando en catálogo…", status: "running" },
      { type: "tool_status", tool: "search_catalog", label: "Buscando en catálogo…", status: "done" },
      { type: "tool_status", tool: "check_availability", label: "Verificando disponibilidad…", status: "running" },
      { type: "tool_status", tool: "check_availability", label: "Verificando disponibilidad…", status: "done" },
    ]);
  });

  it("también emite running/done si la tool call falla (ej. add_to_cart con JWT inválido)", async () => {
    const { fetchImpl } = mockFetch({
      "/cart/add-item": () => ({ status: 401, body: { error: "unauthorized" } }),
    });
    let llamada = 0;
    const anthropic: AnthropicMessagesClient = {
      create: async () => {
        llamada++;
        if (llamada === 1) {
          return mensajeAssistant([toolUseBlock("t1", "add_to_cart", { modelo_id: "m1", cantidad: 1 })]);
        }
        return mensajeAssistant([textoBlock("Hubo un problema agregando el ítem.")]);
      },
    };

    const eventos: unknown[] = [];
    await ejecutarTurnoAgente3(
      {
        anthropic,
        model: "claude-haiku-4-5",
        apiBaseUrl: "https://api.example.com",
        jwt: "jwt-invalido",
        fetchImpl,
        emitirEvento: (evento) => eventos.push(evento),
      },
      [],
      "Sí, agregalo.",
    );

    expect(eventos).toEqual([
      { type: "tool_status", tool: "add_to_cart", label: "Agregando al carrito…", status: "running" },
      { type: "tool_status", tool: "add_to_cart", label: "Agregando al carrito…", status: "done" },
    ]);
  });

  it("no falla si emitirEvento no se pasa (deps.emitirEvento undefined)", async () => {
    const { fetchImpl } = mockFetch({
      "/catalog/search": () => ({ status: 200, body: [] }),
    });
    const anthropic: AnthropicMessagesClient = {
      create: async () => mensajeAssistant([toolUseBlock("t1", "search_catalog", { q: "taladro" })]),
    };

    await expect(
      ejecutarTurnoAgente3(
        { anthropic, model: "claude-haiku-4-5", apiBaseUrl: "https://api.example.com", jwt: "jwt-cliente", fetchImpl, maxIteraciones: 1 },
        [],
        "Busco un taladro.",
      ),
    ).resolves.toBeDefined();
  });
});

describe("ejecutarTurnoAgente3 — manejo de errores de tool", () => {
  it("propaga un tool_result de error si POST /cart/add-item falla, sin lanzar", async () => {
    const { fetchImpl } = mockFetch({
      "/cart/add-item": () => ({ status: 401, body: { error: "unauthorized" } }),
    });

    let llamada = 0;
    const anthropic: AnthropicMessagesClient = {
      create: async () => {
        llamada++;
        if (llamada === 1) {
          return mensajeAssistant([toolUseBlock("t1", "add_to_cart", { modelo_id: "m1", cantidad: 1 })]);
        }
        return mensajeAssistant([textoBlock("Hubo un problema agregando el ítem, ¿lo intentamos de nuevo?")]);
      },
    };

    const resultado = await ejecutarTurnoAgente3(
      { anthropic, model: "claude-haiku-4-5", apiBaseUrl: "https://api.example.com", jwt: "jwt-invalido", fetchImpl },
      [],
      "Sí, agregalo.",
    );

    expect(resultado.carritoActualizado).toBeNull();
    expect(resultado.respuestaTexto).toMatch(/problema/);
  });
});
