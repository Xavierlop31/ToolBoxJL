import type { IniciarTransaccionInput } from "../../domain/wompi-gateway";
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

  function inputTarjeta(overrides: Partial<IniciarTransaccionInput> = {}): IniciarTransaccionInput {
    return {
      monto: 50_000,
      metodo: "tarjeta",
      modo: "captura",
      referencia: "orden-1-principal-ref",
      customerEmail: "cliente@example.com",
      acceptanceToken: "token-aceptacion-test",
      personalAuthToken: "token-autorizacion-datos-test",
      ...overrides,
    };
  }

  function inputPse(overrides: Partial<IniciarTransaccionInput> = {}): IniciarTransaccionInput {
    return {
      monto: 10_000,
      metodo: "pse",
      modo: "captura",
      referencia: "orden-1-deposito-ref",
      customerEmail: "cliente@example.com",
      datosPse: {
        userLegalIdType: "CC",
        userLegalId: "123456789",
        financialInstitutionCode: "1",
      },
      acceptanceToken: "token-aceptacion-test",
      personalAuthToken: "token-autorizacion-datos-test",
      ...overrides,
    };
  }

  it("lanza si WOMPI_PRIVATE_KEY/PUBLIC_KEY no están definidas al construir", () => {
    delete process.env.WOMPI_PRIVATE_KEY;
    delete process.env.WOMPI_PUBLIC_KEY;

    expect(() => crearServicio()).toThrow(/WOMPI_PRIVATE_KEY/);
  });

  it("iniciarTransaccion (tarjeta, captura) llama a Wompi y devuelve el id + estado capturado", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "txn-abc-123", status: "APPROVED" } }),
    });

    const servicio = crearServicio();
    const resultado = await servicio.iniciarTransaccion(inputTarjeta());

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
      customer_email: "cliente@example.com",
      reference: "orden-1-principal-ref",
      payment_method: { type: "CARD" },
      capture_method: "automatic",
      acceptance_token: "token-aceptacion-test",
      accept_personal_auth: "token-autorizacion-datos-test",
    });
  });

  it("iniciarTransaccion (pse) arma payment_method anidado con los datos de PSE", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "txn-pse-1", status: "PENDING" } }),
    });

    const servicio = crearServicio();
    const resultado = await servicio.iniciarTransaccion(inputPse({ modo: "hold" }));

    // PSE real es asíncrono: "PENDING" manda sobre el modo pedido.
    expect(resultado).toEqual({ wompiTransactionId: "txn-pse-1", estado: "pendiente" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.payment_method).toEqual({
      type: "PSE",
      user_type: 0,
      user_legal_id_type: "CC",
      user_legal_id: "123456789",
      financial_institution_code: "1",
      payment_description: "Pago ToolBox JL — orden orden-1-deposito-ref",
    });
    expect(body.capture_method).toBe("manual");
  });

  it("iniciarTransaccion (hold, sin PENDING) devuelve estado hold", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "txn-hold-1", status: "APPROVED" } }),
    });

    const servicio = crearServicio();
    const resultado = await servicio.iniciarTransaccion(inputPse({ modo: "hold" }));

    expect(resultado.estado).toBe("hold");
  });

  it("lanza un Error si Wompi responde con status no-ok", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });

    const servicio = crearServicio();
    await expect(servicio.iniciarTransaccion(inputTarjeta())).rejects.toThrow(/respondió 502/);
  });

  it("incluye el cuerpo de la respuesta de Wompi en el mensaje de error, para diagnosticar rechazos de validación (422)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => '{"error":{"messages":{"payment_method":["is required"]}}}',
    });

    const servicio = crearServicio();
    await expect(servicio.iniciarTransaccion(inputPse())).rejects.toThrow(
      /respondió 422.*payment_method/s,
    );
  });

  it("no revienta si la respuesta de error no tiene body legible", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    const servicio = crearServicio();
    await expect(servicio.iniciarTransaccion(inputTarjeta())).rejects.toThrow(
      /no se pudo leer el cuerpo/,
    );
  });

  it("lanza un Error si Wompi no devuelve un id de transacción", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) });

    const servicio = crearServicio();
    await expect(servicio.iniciarTransaccion(inputTarjeta())).rejects.toThrow(
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

  it("listarBancosPse llama al endpoint público (con la public key) y mapea la lista", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { financial_institution_code: "1", financial_institution_name: "Banco A" },
          { financial_institution_code: "2", financial_institution_name: "Banco B" },
        ],
      }),
    });

    const servicio = crearServicio();
    const bancos = await servicio.listarBancosPse();

    expect(bancos).toEqual([
      { codigo: "1", nombre: "Banco A" },
      { codigo: "2", nombre: "Banco B" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.wompi.co/v1/pse/financial_institutions",
      { headers: { Authorization: "Bearer pub_test_1234" } },
    );
  });

  it("listarBancosPse lanza un Error si Wompi responde con status no-ok", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    const servicio = crearServicio();
    await expect(servicio.listarBancosPse()).rejects.toThrow(/respondió 500/);
  });

  it("obtenerTerminos llama a GET /merchants/{public_key} y mapea los tokens presigned", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          presigned_acceptance: {
            acceptance_token: "token-reglamento-abc",
            permalink: "https://wompi.co/reglamento.pdf",
          },
          presigned_personal_data_auth: {
            acceptance_token: "token-datos-personales-abc",
            permalink: "https://wompi.co/politica-datos.pdf",
          },
        },
      }),
    });

    const servicio = crearServicio();
    const terminos = await servicio.obtenerTerminos();

    expect(terminos).toEqual({
      acceptance_token: "token-reglamento-abc",
      accept_personal_auth: "token-datos-personales-abc",
      reglamento_url: "https://wompi.co/reglamento.pdf",
      politica_datos_url: "https://wompi.co/politica-datos.pdf",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://sandbox.wompi.co/v1/merchants/pub_test_1234");
  });

  it("obtenerTerminos lanza un Error si Wompi responde con status no-ok", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });

    const servicio = crearServicio();
    await expect(servicio.obtenerTerminos()).rejects.toThrow(/respondió 404/);
  });

  it("obtenerTerminos lanza un Error si Wompi no devuelve los tokens presigned esperados", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) });

    const servicio = crearServicio();
    await expect(servicio.obtenerTerminos()).rejects.toThrow(/no devolvió presigned_acceptance/);
  });
});
