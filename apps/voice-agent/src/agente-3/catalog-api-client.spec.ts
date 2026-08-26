import { buscarCatalogo, consultarDisponibilidad } from "./catalog-api-client";

function mockFetch(response: { ok: boolean; status: number; body: unknown }) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body),
    } as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe("buscarCatalogo", () => {
  it("arma la URL con los filtros provistos y manda el JWT como Bearer", async () => {
    const { fetchImpl, calls } = mockFetch({ ok: true, status: 200, body: [{ id: "m1", nombre: "Taladro" }] });

    const resultado = await buscarCatalogo(
      "https://api.example.com",
      "jwt-cliente",
      { q: "taladro", categoria: "percutor", fecha_inicio: "2026-09-01", fecha_fin: "2026-09-04" },
      fetchImpl,
    );

    expect(resultado).toEqual([{ id: "m1", nombre: "Taladro" }]);
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe("/catalog/search");
    expect(url.searchParams.get("q")).toBe("taladro");
    expect(url.searchParams.get("categoria")).toBe("percutor");
    expect(url.searchParams.get("fecha_inicio")).toBe("2026-09-01");
    expect(url.searchParams.get("fecha_fin")).toBe("2026-09-04");
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-cliente");
  });

  it("omite los filtros no provistos", async () => {
    const { fetchImpl, calls } = mockFetch({ ok: true, status: 200, body: [] });
    await buscarCatalogo("https://api.example.com", "jwt", {}, fetchImpl);
    const url = new URL(calls[0].url);
    expect(url.searchParams.has("q")).toBe(false);
  });

  it("lanza si la respuesta no es ok", async () => {
    const { fetchImpl } = mockFetch({ ok: false, status: 500, body: { error: "boom" } });
    await expect(buscarCatalogo("https://api.example.com", "jwt", {}, fetchImpl)).rejects.toThrow(
      /GET \/catalog\/search respondió 500/,
    );
  });
});

describe("consultarDisponibilidad", () => {
  it("arma la query con modelo_id/fecha_inicio/fecha_fin y manda el JWT", async () => {
    const { fetchImpl, calls } = mockFetch({
      ok: true,
      status: 200,
      body: { modelo_id: "m1", unidades_disponibles: 3 },
    });

    const resultado = await consultarDisponibilidad(
      "https://api.example.com",
      "jwt-cliente",
      "m1",
      "2026-09-01",
      "2026-09-04",
      fetchImpl,
    );

    expect(resultado).toEqual({ modelo_id: "m1", unidades_disponibles: 3 });
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe("/inventory/check-availability");
    expect(url.searchParams.get("modelo_id")).toBe("m1");
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-cliente");
  });

  it("lanza si la respuesta no es ok", async () => {
    const { fetchImpl } = mockFetch({ ok: false, status: 401, body: {} });
    await expect(
      consultarDisponibilidad("https://api.example.com", "jwt", "m1", "2026-09-01", "2026-09-04", fetchImpl),
    ).rejects.toThrow(/GET \/inventory\/check-availability respondió 401/);
  });
});
