jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }));
});
jest.mock("./agente-1/auth-gateway", () => ({
  SupabaseAgente1AuthGatewayService: jest.fn().mockImplementation(() => ({
    obtenerAccessToken: jest.fn().mockResolvedValue("bearer-token-fake"),
  })),
}));
jest.mock("./agente-1/config", () => ({
  loadAnthropicConfig: jest.fn(),
  loadApiBaseUrl: jest.fn(),
  loadAgente1ServiceCredentials: jest.fn(),
  loadSupabaseRestConfig: jest.fn(),
}));
jest.mock("./agente-1/route-scheduler-agent", () => ({
  ejecutarAgente1: jest.fn(),
}));

import { calcularPedidosSinAsignar, ejecutarRouteSchedulerJob } from "./route-scheduler-job";
import type { RouteApi, ShipmentApi } from "./agente-1/logistics-api-types";
import {
  loadAgente1ServiceCredentials,
  loadAnthropicConfig,
  loadApiBaseUrl,
  loadSupabaseRestConfig,
} from "./agente-1/config";
import { ejecutarAgente1 } from "./agente-1/route-scheduler-agent";

function shipment(id: string): ShipmentApi {
  return { id, order_id: `order-${id}`, vehiculo_id: null, tipo: "entrega", estado_envio: "pendiente_asignacion" };
}

function ruta(paradas: string[]): RouteApi {
  return { id: `r-${paradas.join("-")}`, vehiculo_id: "v1", fecha: "2026-08-26", paradas };
}

describe("calcularPedidosSinAsignar", () => {
  it("devuelve vacío cuando todos los pedidos consultados terminaron en alguna ruta", () => {
    const pedidos = [shipment("s1"), shipment("s2")];
    const rutas = [ruta(["s1", "s2"])];

    expect(calcularPedidosSinAsignar(pedidos, rutas)).toEqual([]);
  });

  it("devuelve los shipment_id que no aparecen en ninguna ruta publicada", () => {
    const pedidos = [shipment("s1"), shipment("s2"), shipment("s3")];
    const rutas = [ruta(["s1"]), ruta(["s3"])];

    expect(calcularPedidosSinAsignar(pedidos, rutas)).toEqual(["s2"]);
  });

  it("devuelve todos los pedidos cuando no se publicó ninguna ruta", () => {
    const pedidos = [shipment("s1"), shipment("s2")];

    expect(calcularPedidosSinAsignar(pedidos, [])).toEqual(["s1", "s2"]);
  });

  it("devuelve vacío cuando no había pedidos pendientes", () => {
    expect(calcularPedidosSinAsignar([], [ruta(["s1"])])).toEqual([]);
  });
});

describe("ejecutarRouteSchedulerJob", () => {
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (loadAnthropicConfig as jest.Mock).mockReturnValue({ apiKey: "sk-fake", model: "claude-haiku-4-5" });
    (loadApiBaseUrl as jest.Mock).mockReturnValue("https://api.example.com");
    (loadAgente1ServiceCredentials as jest.Mock).mockReturnValue({
      email: "agente-ruteo@toolboxjl.internal",
      password: "clave",
    });
    (loadSupabaseRestConfig as jest.Mock).mockReturnValue({
      url: "https://proyecto.supabase.co",
      anonKey: "anon-key",
    });
  });

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("publica rutas y loguea el resumen cuando no quedan pedidos sin asignar", async () => {
    (ejecutarAgente1 as jest.Mock).mockResolvedValueOnce({
      rutasPublicadas: [ruta(["s1"])],
      pedidosConsultados: [shipment("s1")],
      resumenTexto: "Rutas publicadas con éxito.",
    });

    await ejecutarRouteSchedulerJob();

    expect(ejecutarAgente1).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5",
        apiBaseUrl: "https://api.example.com",
        bearerToken: "bearer-token-fake",
        fechaRuta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    expect(warnSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("1 ruta(s) publicada(s)"));
  });

  it("loguea un warning por cada pedido que quedó sin asignar en ninguna ruta", async () => {
    (ejecutarAgente1 as jest.Mock).mockResolvedValueOnce({
      rutasPublicadas: [ruta(["s1"])],
      pedidosConsultados: [shipment("s1"), shipment("s2")],
      resumenTexto: "Quedó un pedido sin asignar.",
    });

    await ejecutarRouteSchedulerJob();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Pedido s2"));
  });

  it("propaga el error si ejecutarAgente1 falla (sin publicar rutas)", async () => {
    (ejecutarAgente1 as jest.Mock).mockRejectedValueOnce(new Error("Agente 1: no publicó rutas."));

    await expect(ejecutarRouteSchedulerJob()).rejects.toThrow("Agente 1: no publicó rutas.");
  });
});
