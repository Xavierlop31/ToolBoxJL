import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { InMemoryDeviceVerificationRepository } from "../infrastructure/in-memory/in-memory-device-verification.repository";
import { InMemoryOtpRepository } from "../infrastructure/in-memory/in-memory-otp.repository";
import { InMemoryWhatsAppOtpGateway } from "../infrastructure/whatsapp/in-memory-whatsapp-otp-gateway";
import { OtpInvalidoError } from "../domain/errors/otp-invalido.error";
import { SolicitarOtpUseCase } from "./solicitar-otp.use-case";
import { VerificarOtpUseCase } from "./verificar-otp.use-case";

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    email: "cliente@example.com",
    rol: "cliente",
    telefono: "+573001234567",
    ...overrides,
  };
}

describe("VerificarOtpUseCase", () => {
  let otps: InMemoryOtpRepository;
  let verificaciones: InMemoryDeviceVerificationRepository;
  let whatsapp: InMemoryWhatsAppOtpGateway;
  let solicitar: SolicitarOtpUseCase;
  let verificar: VerificarOtpUseCase;

  beforeEach(() => {
    otps = new InMemoryOtpRepository();
    verificaciones = new InMemoryDeviceVerificationRepository();
    whatsapp = new InMemoryWhatsAppOtpGateway();
    solicitar = new SolicitarOtpUseCase(otps, whatsapp);
    verificar = new VerificarOtpUseCase(otps, verificaciones);
  });

  it("marca el dispositivo como verificado con el código correcto", async () => {
    const usuarioActual = usuario();
    const solicitado = await solicitar.ejecutar(usuarioActual, "device-1");
    const codigoReal = whatsapp.enviados[0].codigo;

    const resultado = await verificar.ejecutar(usuarioActual, solicitado.otp_id, codigoReal, "device-1");

    expect(resultado).toEqual({ verificado: true, device_id: "device-1" });
    await expect(verificaciones.estaVerificado(usuarioActual.id, "device-1")).resolves.toBe(true);
  });

  it("rechaza un código incorrecto y NO verifica el dispositivo", async () => {
    const usuarioActual = usuario();
    const solicitado = await solicitar.ejecutar(usuarioActual, "device-1");

    await expect(
      verificar.ejecutar(usuarioActual, solicitado.otp_id, "000000", "device-1"),
    ).rejects.toThrow(OtpInvalidoError);
    await expect(verificaciones.estaVerificado(usuarioActual.id, "device-1")).resolves.toBe(false);
  });

  it("rechaza un OTP ya consumido (no permite reutilizar el código)", async () => {
    const usuarioActual = usuario();
    const solicitado = await solicitar.ejecutar(usuarioActual, "device-1");
    const codigoReal = whatsapp.enviados[0].codigo;

    await verificar.ejecutar(usuarioActual, solicitado.otp_id, codigoReal, "device-1");

    await expect(
      verificar.ejecutar(usuarioActual, solicitado.otp_id, codigoReal, "device-1"),
    ).rejects.toThrow(OtpInvalidoError);
  });

  it("rechaza un OTP expirado", async () => {
    const usuarioActual = usuario();
    const solicitado = await solicitar.ejecutar(usuarioActual, "device-1");
    const codigoReal = whatsapp.enviados[0].codigo;

    // Fuerza la expiración manipulando el registro directamente (evita
    // depender de tiempo real / fake timers para este test).
    const otp = await otps.buscarPorId(solicitado.otp_id);
    otp!.expiraEn = new Date(Date.now() - 1000);

    await expect(
      verificar.ejecutar(usuarioActual, solicitado.otp_id, codigoReal, "device-1"),
    ).rejects.toThrow(OtpInvalidoError);
  });

  it("rechaza si el otp_id no corresponde al usuario autenticado", async () => {
    const usuarioActual = usuario();
    const otroUsuario = usuario({ id: "otro-usuario-id" });
    const solicitado = await solicitar.ejecutar(usuarioActual, "device-1");
    const codigoReal = whatsapp.enviados[0].codigo;

    await expect(
      verificar.ejecutar(otroUsuario, solicitado.otp_id, codigoReal, "device-1"),
    ).rejects.toThrow(OtpInvalidoError);
  });

  it("rechaza si el device_id no corresponde al del OTP solicitado", async () => {
    const usuarioActual = usuario();
    const solicitado = await solicitar.ejecutar(usuarioActual, "device-1");
    const codigoReal = whatsapp.enviados[0].codigo;

    await expect(
      verificar.ejecutar(usuarioActual, solicitado.otp_id, codigoReal, "device-2"),
    ).rejects.toThrow(OtpInvalidoError);
  });

  it("rechaza un otp_id inexistente", async () => {
    const usuarioActual = usuario();
    await expect(
      verificar.ejecutar(usuarioActual, "00000000-0000-0000-0000-000000000000", "123456", "device-1"),
    ).rejects.toThrow(OtpInvalidoError);
  });
});
