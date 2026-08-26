import { obtenerPedidosPendientes, obtenerVehiculosDisponibles, publicarRutas } from "./logistics-api-client";

function fakeFetch(response: Partial<Response>): jest.Mock {
  return jest.fn().mockResolvedValue(response);
}

describe("obtenerPedidosPendientes", () => {
  it("hace GET /logistics/pending-orders con el bearer token y devuelve el JSON", async () => {
    const shipments = [{ id: "s1", order_id: "o1", vehiculo_id: null, tipo: "entrega", estado_envio: "pendiente_asignacion" }];
    const fetchMock = fakeFetch({ ok: true, status: 200, json: async () => shipments } as Response);

    const resultado = await obtenerPedidosPendientes("https://api.example.com", "token-123", fetchMock as unknown as typeof fetch);

    expect(resultado).toEqual(shipments);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/logistics/pending-orders",
      { headers: { Authorization: "Bearer token-123" } },
    );
  });

  it("lanza un error explícito si la API responde con error", async () => {
    const fetchMock = fakeFetch({ ok: false, status: 403, text: async () => '{"code":"forbidden"}' } as Response);

    await expect(
      obtenerPedidosPendientes("https://api.example.com", "token-123", fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/403/);
  });
});

describe("publicarRutas", () => {
  it("hace POST /logistics/assign-routes con el body serializado y devuelve las rutas publicadas", async () => {
    const rutasInput = [{ vehiculo_id: "v1", fecha: "2026-08-26", paradas: ["s1", "s2"] }];
    const rutasPublicadas = [{ id: "r1", ...rutasInput[0], generada_por: "agente_1" }];
    const fetchMock = fakeFetch({ ok: true, status: 201, json: async () => rutasPublicadas } as Response);

    const resultado = await publicarRutas(
      "https://api.example.com",
      "token-123",
      rutasInput,
      fetchMock as unknown as typeof fetch,
    );

    expect(resultado).toEqual(rutasPublicadas);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/logistics/assign-routes",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(rutasInput),
      }),
    );
  });

  it("lanza un error explícito si la API responde con error (ej. shipment o vehículo inexistente)", async () => {
    const fetchMock = fakeFetch({ ok: false, status: 400, text: async () => "Vehículo no encontrado" } as Response);

    await expect(
      publicarRutas("https://api.example.com", "token-123", [], fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/400/);
  });
});

describe("obtenerVehiculosDisponibles", () => {
  it("hace GET /fleet/vehicles y devuelve el JSON", async () => {
    const vehicles = [{ id: "v1", tipo: "camioneta", capacidad_kg: 500, capacidad_m3: 3, zonas: ["z1"], repartidor_id: null }];
    const fetchMock = fakeFetch({ ok: true, status: 200, json: async () => vehicles } as Response);

    const resultado = await obtenerVehiculosDisponibles(
      "https://api.example.com",
      "token-123",
      fetchMock as unknown as typeof fetch,
    );

    expect(resultado).toEqual(vehicles);
  });

  it("lanza un error explícito y menciona el gap de contrato si la API responde 404", async () => {
    const fetchMock = fakeFetch({ ok: false, status: 404, text: async () => "Cannot GET /fleet/vehicles" } as Response);

    await expect(
      obtenerVehiculosDisponibles("https://api.example.com", "token-123", fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/openapi\.yaml/);
  });
});
