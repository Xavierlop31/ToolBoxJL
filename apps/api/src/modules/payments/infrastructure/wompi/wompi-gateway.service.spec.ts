import { WompiGatewayService } from "./wompi-gateway.service";

describe("WompiGatewayService", () => {
  const envOriginal = { ...process.env };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.WOMPI_PRIVATE_KEY = "prv_test_1234";
    process.env.WOMPI_PUBLIC_KEY = "pub_test_1234";
    process.env.WOMPI_SPLIT_LOGISTICA_PCT = "0.2";
    fetchMock = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...envOriginal };
    jest.restoreAllMocks();
  });

  function crearServicio(): WompiGatewayService {
    return new WompiGatewayService();
  }

  it("lanza si WOMPI_PRIVATE_KEY/PUBLIC_KEY no están definidas al construir", () => {
    delete process.env.WOMPI_PRIVATE_KEY;
    delete process.env.WOMPI_PUBLIC_KEY;

    expect(() => crearServicio()).toThrow(/WOMPI_PRIVATE_KEY/);
  });

  it("iniciarTransaccion (captura) llama a Wompi y devuelve el id + estado capturado", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "txn-abc-123" } }),
    });

    const servicio = crearServicio();
    const resultado = await servicio.iniciarTransaccion(50_000, "tarjeta", "captura");

    expect(resultado).toEqual({ wompiTransactionId: "txn-abc-123", estado: "capturado" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.wompi.co/v1/transactions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer prv_test_1234" }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({
      amount_in_cents: 5_000_000,
      currency: "COP",
      payment_method_type: "CARD",
      capture_method: "automatic",
    });
  });

  it("iniciarTransaccion (hold) usa capture_method manual y devuelve estado hold", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "txn-hold-1" } }),
    });

    const servicio = crearServicio();
    const resultado = await servicio.iniciarTransaccion(10_000, "pse", "hold");

    expect(resultado.estado).toBe("hold");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.payment_method_type).toBe("PSE");
    expect(body.capture_method).toBe("manual");
  });

  it("lanza un Error si Wompi responde con status no-ok", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });

    const servicio = crearServicio();
    await expect(servicio.iniciarTransaccion(10_000, "tarjeta", "captura")).rejects.toThrow(
      /respondió 502/,
    );
  });

  it("lanza un Error si Wompi no devuelve un id de transacción", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) });

    const servicio = crearServicio();
    await expect(servicio.iniciarTransaccion(10_000, "tarjeta", "captura")).rejects.toThrow(
      "Wompi sandbox no devolvió un id de transacción.",
    );
  });

  it("simularSplit usa el % configurado por env var", () => {
    const servicio = crearServicio();

    const split = servicio.simularSplit(1_000);

    expect(split).toEqual({ montoLogistica: 200, montoMatriz: 800 });
  });

  it("capturarHold llama al endpoint de captura y devuelve estado capturado", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const servicio = crearServicio();
    const resultado = await servicio.capturarHold("txn-abc-123");

    expect(resultado).toEqual({ estado: "capturado" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.wompi.co/v1/transactions/txn-abc-123/capture",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("capturarHold lanza un Error si Wompi responde con status no-ok", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    const servicio = crearServicio();
    await expect(servicio.capturarHold("txn-abc-123")).rejects.toThrow(/respondió 500/);
  });
});
