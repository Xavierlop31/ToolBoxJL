jest.mock("./text-to-speech", () => ({ sintetizarVoz: jest.fn() }));
jest.mock("./whatsapp-send-client", () => ({ enviarNotaDeVoz: jest.fn() }));
jest.mock("./config", () => ({
  loadElevenLabsApiKey: jest.fn().mockReturnValue("el-key"),
  loadElevenLabsVoiceId: jest.fn().mockReturnValue("voice-1"),
  loadWhatsAppSendCredentials: jest.fn().mockReturnValue({ token: "t", phoneNumberId: "p" }),
}));

import type { PrismaClient } from "@prisma/client";
import { ejecutarWhatsAppReminderJob } from "./reminder-job";
import { sintetizarVoz } from "./text-to-speech";
import { enviarNotaDeVoz } from "./whatsapp-send-client";

function fakeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "orden-1",
    clienteId: "cliente-1",
    tipo: "alquiler",
    estado: "confirmada",
    fechaFin: new Date(Date.now() + 12 * 60 * 60 * 1000),
    ...overrides,
  };
}

describe("ejecutarWhatsAppReminderJob", () => {
  let prisma: { order: { findMany: jest.Mock }; $queryRaw: jest.Mock };
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      order: { findMany: jest.fn() },
      $queryRaw: jest.fn(),
    };
  });

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("envía un recordatorio de voz por cada orden candidata con teléfono resuelto", async () => {
    prisma.order.findMany.mockResolvedValueOnce([fakeOrder()]);
    prisma.$queryRaw.mockResolvedValueOnce([{ telefono: "573001234567" }]);
    (sintetizarVoz as jest.Mock).mockResolvedValueOnce(Buffer.from("audio"));
    (enviarNotaDeVoz as jest.Mock).mockResolvedValueOnce(undefined);

    const enviados = await ejecutarWhatsAppReminderJob(prisma as unknown as PrismaClient);

    expect(enviados).toBe(1);
    expect(enviarNotaDeVoz).toHaveBeenCalledWith(
      "573001234567",
      Buffer.from("audio"),
      { token: "t", phoneNumberId: "p" },
    );
  });

  it("omite (sin lanzar) las órdenes cuyo cliente no tiene teléfono resoluble", async () => {
    prisma.order.findMany.mockResolvedValueOnce([fakeOrder()]);
    prisma.$queryRaw.mockResolvedValueOnce([{ telefono: null }]);

    const enviados = await ejecutarWhatsAppReminderJob(prisma as unknown as PrismaClient);

    expect(enviados).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no se pudo resolver el teléfono"));
    expect(sintetizarVoz).not.toHaveBeenCalled();
  });

  it("continúa con el resto del batch si falla el envío de una orden puntual", async () => {
    prisma.order.findMany.mockResolvedValueOnce([fakeOrder({ id: "orden-1" }), fakeOrder({ id: "orden-2" })]);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ telefono: "573001111111" }])
      .mockResolvedValueOnce([{ telefono: "573002222222" }]);
    (sintetizarVoz as jest.Mock)
      .mockRejectedValueOnce(new Error("ElevenLabs caído"))
      .mockResolvedValueOnce(Buffer.from("audio"));
    (enviarNotaDeVoz as jest.Mock).mockResolvedValueOnce(undefined);

    const enviados = await ejecutarWhatsAppReminderJob(prisma as unknown as PrismaClient);

    expect(enviados).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("falló el envío del recordatorio"));
  });

  it("devuelve 0 sin llamar a ElevenLabs/WhatsApp cuando no hay órdenes candidatas", async () => {
    prisma.order.findMany.mockResolvedValueOnce([]);

    const enviados = await ejecutarWhatsAppReminderJob(prisma as unknown as PrismaClient);

    expect(enviados).toBe(0);
    expect(sintetizarVoz).not.toHaveBeenCalled();
    expect(enviarNotaDeVoz).not.toHaveBeenCalled();
  });

  it("filtra en memoria las órdenes que no son alquiler activo dentro de la ventana de 24h", async () => {
    prisma.order.findMany.mockResolvedValueOnce([
      fakeOrder({ id: "venta", tipo: "venta" }),
      fakeOrder({ id: "muy-lejos", fechaFin: new Date(Date.now() + 72 * 60 * 60 * 1000) }),
    ]);

    const enviados = await ejecutarWhatsAppReminderJob(prisma as unknown as PrismaClient);

    expect(enviados).toBe(0);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
