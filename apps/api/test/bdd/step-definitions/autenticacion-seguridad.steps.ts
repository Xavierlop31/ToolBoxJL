import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ToolboxWorld } from "../support/world";
import type { SupabaseJwtPayload } from "../../../src/modules/auth/application/supabase-jwt-payload";

// ============================================================================
// Escenario: Cliente inicia sesión con correo/contraseña o con Google
// (@Epica6, Sprint 0 — Issue #17, HU-6.1). El login en sí ocurre del lado
// del cliente, directo contra Supabase Auth (no hay endpoint propio de la
// API para esto, ver AuthModule) — lo único que el backend hace es
// verificar el JWT resultante, ya cubierto por unit tests desde Sprint 0
// (verificar-acceso.use-case.spec.ts, supabase-jwt.strategy.spec.ts). Este
// escenario NO tenía step definitions hasta este PR — se agregan acá recién
// (Sprint 6) porque es la primera vez que `06_autenticacion_seguridad.feature`
// se conecta a Cucumber (el escenario de HU-6.2, más abajo, es el que
// motiva la conexión); se ejercita `VerificarAccesoUseCase` con un payload
// con el mismo shape que Passport le entregaría a
// `SupabaseJwtStrategy.validate()` tras validar firma/expiración/issuer/
// audience — no se re-implementa la llamada real a Supabase Auth acá.
// ============================================================================

let payloadJwtEscenario: SupabaseJwtPayload;

Given("que soy un Cliente sin sesión iniciada", function (this: ToolboxWorld) {
  payloadJwtEscenario = {
    sub: randomUUID(),
    email: "cliente-login@example.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    app_metadata: { rol: "cliente" },
  };
});

When(
  "inicio sesión con correo y contraseña, o con mi cuenta de Google",
  function (this: ToolboxWorld) {
    this.ultimoUsuarioVerificado = this.verificarAcceso.ejecutar(payloadJwtEscenario);
  },
);

Then("Supabase Auth valida mis credenciales", function (this: ToolboxWorld) {
  assert.ok(this.ultimoUsuarioVerificado, "se esperaba un UsuarioAutenticado válido");
  assert.equal(this.ultimoUsuarioVerificado!.id, payloadJwtEscenario.sub);
});

Then("obtengo acceso a la plataforma", function (this: ToolboxWorld) {
  assert.equal(this.ultimoUsuarioVerificado!.rol, "cliente");
});

// ============================================================================
// Escenario: Verificación por OTP de WhatsApp en dispositivo nuevo
// (@Epica6, Sprint 6 — Issue #18, HU-6.2).
// ============================================================================

Given(
  "que soy un usuario iniciando sesión desde un dispositivo nuevo o registrándome por primera vez",
  function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "cliente";
    this.deviceIdEscenario = `device-${randomUUID()}`;
    this.ultimoUsuarioVerificado = {
      id: this.usuarioActualId,
      email: "usuario-dispositivo-nuevo@example.com",
      rol: "cliente",
      telefono: "+573001112233",
    };
  },
);

When("el sistema detecta el dispositivo nuevo o el registro", async function (this: ToolboxWorld) {
  this.ultimoOtpSolicitado = await this.solicitarOtp.ejecutar(
    this.ultimoUsuarioVerificado!,
    this.deviceIdEscenario!,
  );
});

Then("se genera un OTP de 6 dígitos y se envía por WhatsApp Cloud API", function (this: ToolboxWorld) {
  assert.ok(this.ultimoOtpSolicitado);
  assert.ok(this.ultimoOtpSolicitado!.otp_id);
  assert.ok(this.ultimoOtpSolicitado!.expira_en);

  const enviados = this.whatsappOtpGateway.enviados;
  assert.equal(enviados.length, 1, "se esperaba un único envío de OTP por WhatsApp");
  assert.equal(enviados[0].telefono, this.ultimoUsuarioVerificado!.telefono);
  assert.match(enviados[0].codigo, /^\d{6}$/);
});

Then(
  "mi acceso queda bloqueado hasta que ingrese el OTP correcto antes de que expire",
  async function (this: ToolboxWorld) {
    // Bloqueado: todavía no verificó ningún código.
    const bloqueadoAntes = await this.deviceVerificationRepository.estaVerificado(
      this.usuarioActualId,
      this.deviceIdEscenario!,
    );
    assert.equal(bloqueadoAntes, false);

    // Un código incorrecto no desbloquea (se deriva del real cambiando un
    // dígito, para no depender de que un código random no coincida por
    // casualidad con el real).
    const codigoReal = this.whatsappOtpGateway.enviados[0].codigo;
    const primerDigitoAlterado = codigoReal[0] === "0" ? "1" : "0";
    const codigoIncorrecto = primerDigitoAlterado + codigoReal.slice(1);

    await assert.rejects(() =>
      this.verificarOtp.ejecutar(
        this.ultimoUsuarioVerificado!,
        this.ultimoOtpSolicitado!.otp_id,
        codigoIncorrecto,
        this.deviceIdEscenario!,
      ),
    );
    const todaviaBloqueado = await this.deviceVerificationRepository.estaVerificado(
      this.usuarioActualId,
      this.deviceIdEscenario!,
    );
    assert.equal(todaviaBloqueado, false);

    // El código correcto sí desbloquea, antes de expirar.
    this.ultimoOtpVerificado = await this.verificarOtp.ejecutar(
      this.ultimoUsuarioVerificado!,
      this.ultimoOtpSolicitado!.otp_id,
      codigoReal,
      this.deviceIdEscenario!,
    );
    assert.equal(this.ultimoOtpVerificado.verificado, true);

    const verificadoDespues = await this.deviceVerificationRepository.estaVerificado(
      this.usuarioActualId,
      this.deviceIdEscenario!,
    );
    assert.equal(verificadoDespues, true);
  },
);
