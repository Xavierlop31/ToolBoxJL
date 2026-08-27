import { loadElevenLabsApiKey, loadElevenLabsVoiceId, loadWhatsAppSendCredentials } from "./config";

describe("agente-2/config (workers)", () => {
  describe("loadElevenLabsApiKey", () => {
    it("lanza si ELEVENLABS_API_KEY no está definida", () => {
      expect(() => loadElevenLabsApiKey({})).toThrow(/ELEVENLABS_API_KEY/);
    });

    it("devuelve la api key definida", () => {
      expect(loadElevenLabsApiKey({ ELEVENLABS_API_KEY: "el-key" })).toBe("el-key");
    });
  });

  describe("loadElevenLabsVoiceId", () => {
    it("usa el voice id de Diego por default", () => {
      expect(loadElevenLabsVoiceId({})).toBe("tN4nkw7MBnGYAwQ71zQp");
    });

    it("respeta ELEVENLABS_VOICE_ID cuando se provee", () => {
      expect(loadElevenLabsVoiceId({ ELEVENLABS_VOICE_ID: "otra-voz" })).toBe("otra-voz");
    });
  });

  describe("loadWhatsAppSendCredentials", () => {
    it("lanza si falta WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID", () => {
      expect(() => loadWhatsAppSendCredentials({ WHATSAPP_TOKEN: "t" })).toThrow(/WHATSAPP_TOKEN/);
      expect(() => loadWhatsAppSendCredentials({})).toThrow(/WHATSAPP_TOKEN/);
    });

    it("devuelve las credenciales cuando ambas están definidas", () => {
      expect(
        loadWhatsAppSendCredentials({ WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "p" }),
      ).toEqual({ token: "t", phoneNumberId: "p" });
    });
  });
});
