import { ForbiddenException } from "@nestjs/common";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";

describe("WhatsAppWebhookController.verificar (GET /webhooks/whatsapp)", () => {
  const ORIGINAL_ENV = process.env;
  let controller: WhatsAppWebhookController;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-secreto" };
    controller = new WhatsAppWebhookController();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("devuelve hub.challenge tal cual cuando hub.mode y hub.verify_token son correctos", () => {
    expect(controller.verificar("subscribe", "token-secreto", "challenge-123")).toBe("challenge-123");
  });

  it("lanza 403 si hub.verify_token no coincide", () => {
    expect(() => controller.verificar("subscribe", "token-incorrecto", "challenge-123")).toThrow(
      ForbiddenException,
    );
  });

  it("lanza 403 si hub.mode no es subscribe", () => {
    expect(() => controller.verificar("unsubscribe", "token-secreto", "challenge-123")).toThrow(
      ForbiddenException,
    );
  });
});
