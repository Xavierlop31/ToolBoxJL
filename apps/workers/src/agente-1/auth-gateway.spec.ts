import { InMemoryAgente1AuthGateway, SupabaseAgente1AuthGatewayService } from "./auth-gateway";

describe("InMemoryAgente1AuthGateway", () => {
  it("devuelve un token falso sin llamar a la red", async () => {
    const gateway = new InMemoryAgente1AuthGateway();
    await expect(gateway.obtenerAccessToken()).resolves.toBe("fake-jwt-agente-1");
  });

  it("permite configurar el token falso", async () => {
    const gateway = new InMemoryAgente1AuthGateway("otro-token");
    await expect(gateway.obtenerAccessToken()).resolves.toBe("otro-token");
  });
});

describe("SupabaseAgente1AuthGatewayService", () => {
  const credenciales = { email: "agente-ruteo@toolboxjl.internal", password: "secreta" };
  const supabase = { url: "https://x.supabase.co", anonKey: "anon-key" };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("hace login REST contra GoTrue y devuelve el access_token", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "jwt-real-123" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new SupabaseAgente1AuthGatewayService(credenciales, supabase);
    const token = await gateway.obtenerAccessToken();

    expect(token).toBe("jwt-real-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://x.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ apikey: "anon-key" }),
        body: JSON.stringify({ email: credenciales.email, password: credenciales.password }),
      }),
    );
  });

  it("lanza un error explícito y accionable si GoTrue responde 400 (usuario de servicio inexistente)", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "invalid_grant", error_description: "Invalid login credentials" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new SupabaseAgente1AuthGatewayService(credenciales, supabase);

    await expect(gateway.obtenerAccessToken()).rejects.toThrow(/400/);
    await expect(gateway.obtenerAccessToken()).rejects.toThrow(/agente-ruteo@toolboxjl\.internal/);
  });
});
