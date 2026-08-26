import { agregarAlCarrito } from "./cart-api-client";

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

describe("agregarAlCarrito", () => {
  it("hace POST /cart/add-item con el body y el JWT del cliente como Bearer", async () => {
    const carritoRespuesta = { items: [{ modelo_id: "m1", cantidad: 1, dias: 3 }], total: 45000 };
    const { fetchImpl, calls } = mockFetch({ ok: true, status: 200, body: carritoRespuesta });

    const resultado = await agregarAlCarrito(
      "https://api.example.com",
      "jwt-cliente",
      { modelo_id: "m1", cantidad: 1, dias: 3 },
      fetchImpl,
    );

    expect(resultado).toEqual(carritoRespuesta);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.example.com/cart/add-item");
    expect(calls[0].init?.method).toBe("POST");
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-cliente");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ modelo_id: "m1", cantidad: 1, dias: 3 });
  });

  it("lanza si la respuesta no es ok (ej. 401 sin JWT válido)", async () => {
    const { fetchImpl } = mockFetch({ ok: false, status: 401, body: {} });
    await expect(
      agregarAlCarrito("https://api.example.com", "jwt-invalido", { modelo_id: "m1", cantidad: 1 }, fetchImpl),
    ).rejects.toThrow(/POST \/cart\/add-item respondió 401/);
  });

  it("lanza si la respuesta es 400 (item inválido)", async () => {
    const { fetchImpl } = mockFetch({ ok: false, status: 400, body: { error: "cantidad inválida" } });
    await expect(
      agregarAlCarrito("https://api.example.com", "jwt", { modelo_id: "m1", cantidad: 0 }, fetchImpl),
    ).rejects.toThrow(/POST \/cart\/add-item respondió 400/);
  });
});
