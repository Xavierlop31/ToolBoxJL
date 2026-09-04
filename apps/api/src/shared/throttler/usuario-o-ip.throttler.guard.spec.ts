import { UsuarioOIpThrottlerGuard } from "./usuario-o-ip.throttler.guard";

/**
 * `getTracker` es `protected` — se instancia el guard sin pasar por el
 * constructor real de `ThrottlerGuard` (que exige `options`/`storageService`/
 * `reflector`) porque acá solo se ejercita la lógica de partición de
 * `getTracker`, no el resto del guard (ya cubierto por los propios tests de
 * `@nestjs/throttler`). Mismo criterio pragmático que otros specs de guards
 * del proyecto (ver `roles.guard.spec.ts`, casts `as any` a fixtures
 * mínimos).
 */
function crearGuardDePrueba(): UsuarioOIpThrottlerGuard {
  return Object.create(
    UsuarioOIpThrottlerGuard.prototype,
  ) as UsuarioOIpThrottlerGuard;
}

function base64url(valor: string): string {
  return Buffer.from(valor).toString("base64url");
}

function jwtConSub(sub: string): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ sub }));
  return `${header}.${payload}.firma-no-verificada-aqui`;
}

describe("UsuarioOIpThrottlerGuard", () => {
  const guard = crearGuardDePrueba();
  const getTracker = (req: Record<string, any>): Promise<string> =>
    (guard as any).getTracker(req);

  it("usa `user:<sub>` cuando el request trae un Bearer token con `sub`", async () => {
    const tracker = await getTracker({
      headers: { authorization: `Bearer ${jwtConSub("uuid-usuario-1")}` },
      ip: "203.0.113.5",
    });
    expect(tracker).toBe("user:uuid-usuario-1");
  });

  it("usa `ip:<ip>` cuando el request es anónimo (sin header Authorization)", async () => {
    const tracker = await getTracker({ headers: {}, ip: "203.0.113.5" });
    expect(tracker).toBe("ip:203.0.113.5");
  });

  it("dos usuarios autenticados distintos, misma IP (ej. oficina/NAT), obtienen trackers distintos", async () => {
    const trackerA = await getTracker({
      headers: { authorization: `Bearer ${jwtConSub("usuario-a")}` },
      ip: "203.0.113.5",
    });
    const trackerB = await getTracker({
      headers: { authorization: `Bearer ${jwtConSub("usuario-b")}` },
      ip: "203.0.113.5",
    });
    expect(trackerA).not.toBe(trackerB);
  });

  it("el mismo usuario autenticado rotando de IP obtiene el mismo tracker (no evade el límite por IP)", async () => {
    const trackerDesdeIp1 = await getTracker({
      headers: { authorization: `Bearer ${jwtConSub("usuario-c")}` },
      ip: "203.0.113.5",
    });
    const trackerDesdeIp2 = await getTracker({
      headers: { authorization: `Bearer ${jwtConSub("usuario-c")}` },
      ip: "198.51.100.9",
    });
    expect(trackerDesdeIp1).toBe(trackerDesdeIp2);
  });

  it("cae a IP cuando el Authorization header no es un Bearer JWT bien formado", async () => {
    const tracker = await getTracker({
      headers: { authorization: "Bearer no-es-un-jwt" },
      ip: "203.0.113.5",
    });
    expect(tracker).toBe("ip:203.0.113.5");
  });

  it("cae a IP cuando el payload del JWT no trae `sub`", async () => {
    const header = base64url(JSON.stringify({ alg: "RS256" }));
    const payload = base64url(JSON.stringify({ email: "sin-sub@example.com" }));
    const token = `${header}.${payload}.firma`;
    const tracker = await getTracker({
      headers: { authorization: `Bearer ${token}` },
      ip: "203.0.113.5",
    });
    expect(tracker).toBe("ip:203.0.113.5");
  });

  it("usa 'desconocida' si no hay ni `req.ip` ni `req.socket.remoteAddress`", async () => {
    const tracker = await getTracker({ headers: {} });
    expect(tracker).toBe("ip:desconocida");
  });
});
