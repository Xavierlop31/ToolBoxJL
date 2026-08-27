/**
 * `main.ts` ejecuta `bootstrap()` de forma incondicional al importarse (no
 * tiene guard `require.main === module`, a diferencia de los jobs de
 * `apps/workers`) — por eso este spec mockea `@nestjs/core` y `./app.module`
 * ANTES de requerir el archivo (con `jest.doMock` + `jest.resetModules()`
 * en cada test, mismo criterio que `app.module.smoke.spec.ts` para poder
 * re-evaluar el módulo con mocks/env distintos por test).
 */
describe("main.ts (bootstrap)", () => {
  let mockApp: { setGlobalPrefix: jest.Mock; useGlobalPipes: jest.Mock; listen: jest.Mock };
  let createMock: jest.Mock;
  const envOriginal = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    mockApp = {
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    createMock = jest.fn().mockResolvedValue(mockApp);
    jest.doMock("@nestjs/core", () => ({ NestFactory: { create: createMock } }));
    jest.doMock("./app.module", () => ({ AppModule: class AppModuleMock {} }));
  });

  afterEach(() => {
    process.env = { ...envOriginal };
    jest.dontMock("@nestjs/core");
    jest.dontMock("./app.module");
  });

  it(
    "crea la app con rawBody:true, prefijo api/v1, ValidationPipe global y escucha en el puerto 3000 por default",
    async () => {
      delete process.env.PORT;

      require("./main");
      await new Promise((resolve) => setImmediate(resolve));

      expect(createMock).toHaveBeenCalledWith(expect.anything(), { rawBody: true });
      expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith("api/v1");
      expect(mockApp.useGlobalPipes).toHaveBeenCalledWith(
        expect.objectContaining({ constructor: expect.objectContaining({ name: "ValidationPipe" }) }),
      );
      expect(mockApp.listen).toHaveBeenCalledWith(3000);
    },
    // Timeout explícito más alto (default 5000ms): este test re-evalúa
    // "./main" con `require()` fresco (tras `jest.resetModules()`), lo que
    // recompila/re-importa `@nestjs/common` y el resto de la cadena de
    // imports — bajo CI con varias suites de Jest corriendo en paralelo
    // (mismo criterio documentado en `app.module.smoke.spec.ts`) puede
    // superar el margen por defecto sin que sea una regresión real.
    15_000,
  );

  it(
    "usa el puerto de la variable de entorno PORT cuando está definida",
    async () => {
      process.env.PORT = "4000";

      require("./main");
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockApp.listen).toHaveBeenCalledWith(4000);
    },
    15_000,
  );
});
