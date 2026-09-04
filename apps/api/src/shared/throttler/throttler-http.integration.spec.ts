import { Controller, Get, INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { Throttle, ThrottlerModule, seconds } from "@nestjs/throttler";
import { UsuarioOIpThrottlerGuard } from "./usuario-o-ip.throttler.guard";

/**
 * Test de integración HTTP real (no unitario): levanta una app Nest completa
 * con `ThrottlerModule` + `UsuarioOIpThrottlerGuard` como `APP_GUARD` —
 * exactamente como queda cableado en `app.module.ts` — y golpea un endpoint
 * de prueba con `fetch` (global desde Node 18+, sin agregar `supertest` como
 * dependencia nueva) para confirmar que exceder el límite responde 429 de
 * punta a punta a través del pipeline real de guards de Nest, no solo la
 * lógica interna del guard (ya cubierta en
 * `usuario-o-ip.throttler.guard.spec.ts`).
 */
@Controller("throttle-test")
class ThrottleTestController {
  @Throttle({ default: { limit: 2, ttl: seconds(60) } })
  @Get()
  ping(): { ok: true } {
    return { ok: true };
  }
}

describe("Rate limiting (429) — integración HTTP", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: "default", ttl: seconds(60), limit: 100 },
        ]),
      ],
      controllers: [ThrottleTestController],
      providers: [{ provide: APP_GUARD, useClass: UsuarioOIpThrottlerGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("responde 200 mientras no se exceda el límite del endpoint (@Throttle 2/60s)", async () => {
    const primera = await fetch(`${baseUrl}/throttle-test`);
    expect(primera.status).toBe(200);

    const segunda = await fetch(`${baseUrl}/throttle-test`);
    expect(segunda.status).toBe(200);
  });

  it("responde 429 al exceder el límite, con un body que identifica el motivo", async () => {
    const tercera = await fetch(`${baseUrl}/throttle-test`);
    expect(tercera.status).toBe(429);

    const body = (await tercera.json()) as { statusCode: number; message: unknown };
    expect(body.statusCode).toBe(429);
    expect(String(body.message)).toMatch(/too many requests/i);
  });
});
