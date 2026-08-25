import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { InMemoryOtpRepository } from "../infrastructure/in-memory/in-memory-otp.repository";
import { InMemoryWhatsAppOtpGateway } from "../infrastructure/whatsapp/in-memory-whatsapp-otp-gateway";
import { TelefonoNoDisponibleError } from "../domain/errors/telefono-no-disponible.error";
import { LimiteOtpExcedidoError } from "../domain/errors/limite-otp-excedido.error";
import { SolicitarOtpUseCase } from "./solicitar-otp.use-case";

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    email: "cliente@example.com",
    rol: "cliente",
    telefono: "+573001234567",
    ...overrides,
  };
}

describe("SolicitarOtpUseCase", () => {
  let otps: InMemoryOtpRepository;
  let whatsapp: InMemoryWhatsAppOtpGateway;
  let useCase: SolicitarOtpUseCase;

  beforeEach(() => {
    otps = new InMemoryOtpRepository();
    whatsapp = new InMemoryWhatsAppOtpGateway();
    useCase = new SolicitarOtpUseCase(otps, whatsapp);
  });

  it("genera un OTP, lo persiste hasheado y lo envía por WhatsApp", async () => {
    const resultado = await useCase.ejecutar(usuario(), "device-1");

    expect(resultado.otp_id).toBeTruthy();
    expect(resultado.expira_en).toBeTruthy();

    expect(whatsapp.enviados).toHaveLength(1);
    expect(whatsapp.enviados[0].telefono).toBe("+573001234567");
    expect(whatsapp.enviados[0].codigo).toMatch(/^\d{6}$/);

    const otpPersistido = await otps.buscarPorId(resultado.otp_id);
    expect(otpPersistido).not.toBeNull();
    // El código persistido nunca es el texto plano.
    expect(otpPersistido!.codigoHash).not.toBe(whatsapp.enviados[0].codigo);
  });

  it("lanza TelefonoNoDisponibleError si el usuario no tiene teléfono", async () => {
    await expect(useCase.ejecutar(usuario({ telefono: null }), "device-1")).rejects.toThrow(
      TelefonoNoDisponibleError,
    );
    expect(whatsapp.enviados).toHaveLength(0);
  });

  it("aplica el rate limit configurado (default: 3 solicitudes)", async () => {
    await useCase.ejecutar(usuario(), "device-1");
    await useCase.ejecutar(usuario(), "device-1");
    await useCase.ejecutar(usuario(), "device-1");

    await expect(useCase.ejecutar(usuario(), "device-1")).rejects.toThrow(LimiteOtpExcedidoError);
    // Nunca llegó a mandar un 4° WhatsApp.
    expect(whatsapp.enviados).toHaveLength(3);
  });

  it("el rate limit es independiente por dispositivo", async () => {
    await useCase.ejecutar(usuario(), "device-1");
    await useCase.ejecutar(usuario(), "device-1");
    await useCase.ejecutar(usuario(), "device-1");

    // device-2 del mismo usuario no está limitado por lo que pasó en device-1.
    await expect(useCase.ejecutar(usuario(), "device-2")).resolves.toBeDefined();
  });
});
