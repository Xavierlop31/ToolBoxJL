import { Injectable } from "@nestjs/common";
import type { WhatsAppOtpGateway } from "../../domain/whatsapp-otp-gateway";

/** Fake determinístico para tests/BDD — nunca llama a la red. */
@Injectable()
export class InMemoryWhatsAppOtpGateway implements WhatsAppOtpGateway {
  /** Conveniencia para asserts en tests: los OTPs "enviados" en esta corrida. */
  readonly enviados: { telefono: string; codigo: string }[] = [];

  async enviarOtp(telefono: string, codigo: string): Promise<void> {
    this.enviados.push({ telefono, codigo });
  }
}
