import type { TestingModule } from "@nestjs/testing";

/**
 * Smoke test de arranque — arma el grafo de DI REAL de `AppModule` (los
 * mismos providers Prisma/Wompi/WhatsApp que corren en Railway), no el
 * `TestingModule` con implementaciones in-memory que usa el resto de la
 * suite (BDD/Cucumber, unit tests).
 *
 * Por qué existe: un `UnknownDependenciesException` entre CatalogInventoryModule
 * y OrdersModule (ciclo genuino — ver el comentario de cabecera de
 * `modules/catalog-inventory/interface/catalog-inventory.module.ts`) llegó a
 * producción (Railway) con `spec-lint`, `bdd-lint` y `ci` los tres en verde,
 * porque NINGÚN test de la suite instancia `AppModule` tal cual — todos los
 * BDD/unit arman su propio `TestingModule` con las implementaciones
 * in-memory de `infrastructure/in-memory/*`, así que el wiring de producción
 * nunca se ejercitaba. Este archivo es la única prueba de la suite que sí lo
 * hace.
 *
 * Deliberadamente NO usa `NestFactory.create` + `app.listen()`: no abre
 * ningún puerto ni conecta a nada real. `Test.createTestingModule(...).compile()`
 * construye el mismo grafo de proveedores y dispara la misma resolución de
 * dependencias que un arranque real, sin un servidor HTTP de por medio.
 * `PrismaService` no conecta en su constructor (Prisma conecta lazy, en la
 * primera query) y ninguno de `WompiGatewayService`/`WhatsAppOtpGatewayService`
 * hace I/O al construirse — solo validan que sus variables de entorno estén
 * definidas y con el formato esperado. Por eso alcanza con valores DUMMY
 * sintácticamente válidos: esta prueba certifica que el GRAFO DE DI cierra,
 * no que las credenciales sean reales (para eso están los tests de
 * integración dedicados, ver `test/integration/*.integration.spec.ts`).
 *
 * *** Por qué `require()` en vez de `import` ***: `ConfigModule.forRoot({
 * validate: validarEnvDeAuth })` corre en tiempo de EVALUACIÓN de la clase
 * `AppModule` (el decorador `@Module` se ejecuta al cargar el archivo), no
 * al instanciar el módulo. Un `import { AppModule } from "./app.module"` de
 * nivel superior se hoistea por encima de cualquier `process.env.X = ...`
 * del cuerpo del archivo, así que las variables dummy llegarían tarde y la
 * validación fallaría con "SUPABASE_URL no está definida" incluso con el
 * `beforeEach` de abajo. `require()` es síncrono en el punto donde se llama,
 * así que corre DESPUÉS de setear `process.env` — y `jest.resetModules()`
 * fuerza a que `app.module.ts` (y toda su cadena de imports, incluido
 * `ConfigModule.forRoot`) se re-evalúe en cada test en vez de reusar el
 * primer resultado cacheado por `require`.
 *
 * Si esto falla, leé el mensaje de Nest: dice exactamente qué símbolo no
 * pudo resolver y en qué módulo lo esperaba — es la misma exception que
 * crashea el contenedor en Railway, pero acá tarda segundos en vez de
 * descubrirse en un ambiente productivo.
 */
describe("AppModule (smoke — arranque real, sin mocks de DI)", () => {
  const ENV_DUMMY = {
    SUPABASE_URL: "https://smoke-test.supabase.co",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/smoke_test",
    WOMPI_PRIVATE_KEY: "prv_test_smoke",
    WOMPI_PUBLIC_KEY: "pub_test_smoke",
    WHATSAPP_TOKEN: "smoke-token",
    WHATSAPP_PHONE_NUMBER_ID: "0000000000",
    WHATSAPP_BUSINESS_ACCOUNT_ID: "0000000000",
  } as const;

  let envOriginal: NodeJS.ProcessEnv;

  beforeEach(() => {
    envOriginal = { ...process.env };
    Object.assign(process.env, ENV_DUMMY);
    jest.resetModules();
  });

  afterEach(() => {
    process.env = envOriginal;
    jest.resetModules();
  });

  it("resuelve el grafo de dependencias completo sin UnknownDependenciesException", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Test } = require("@nestjs/testing") as typeof import("@nestjs/testing");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AppModule } = require("./app.module") as typeof import("./app.module");

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    await moduleRef.close();
  });
});
