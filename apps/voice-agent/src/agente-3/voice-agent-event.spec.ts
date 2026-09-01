import { codificarVoiceAgentEvent, etiquetaDeTool } from "./voice-agent-event";

describe("codificarVoiceAgentEvent", () => {
  it("serializa un evento greeting a JSON UTF-8", () => {
    const bytes = codificarVoiceAgentEvent({ type: "greeting", text: "Hola" });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual({ type: "greeting", text: "Hola" });
  });

  it("serializa un evento tool_status a JSON UTF-8", () => {
    const bytes = codificarVoiceAgentEvent({
      type: "tool_status",
      tool: "search_catalog",
      label: "Buscando en catálogo…",
      status: "running",
    });

    expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual({
      type: "tool_status",
      tool: "search_catalog",
      label: "Buscando en catálogo…",
      status: "running",
    });
  });
});

describe("etiquetaDeTool", () => {
  it.each([
    ["search_catalog", "Buscando en catálogo…"],
    ["check_availability", "Verificando disponibilidad…"],
    ["add_to_cart", "Agregando al carrito…"],
  ])("mapea %s al label humano esperado", (tool, labelEsperado) => {
    expect(etiquetaDeTool(tool)).toBe(labelEsperado);
  });

  it("devuelve un fallback genérico para una tool no mapeada", () => {
    expect(etiquetaDeTool("una_tool_futura")).toBe("Ejecutando una_tool_futura…");
  });
});
