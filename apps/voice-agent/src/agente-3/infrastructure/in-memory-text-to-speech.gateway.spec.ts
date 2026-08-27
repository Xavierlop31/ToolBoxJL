import { InMemoryTextToSpeechGateway } from "./in-memory-text-to-speech.gateway";

describe("InMemoryTextToSpeechGateway", () => {
  it("devuelve un Buffer PCM de silencio y registra el texto sintetizado", async () => {
    const gateway = new InMemoryTextToSpeechGateway();

    const resultado = await gateway.sintetizar("Tenemos un taladro Bosch disponible.");

    expect(resultado).toEqual(Buffer.alloc(20));
    expect(gateway.textosSintetizados).toEqual(["Tenemos un taladro Bosch disponible."]);
  });

  it("registra cada texto sintetizado en orden a través de varios turnos", async () => {
    const gateway = new InMemoryTextToSpeechGateway();

    await gateway.sintetizar("primero");
    await gateway.sintetizar("segundo");

    expect(gateway.textosSintetizados).toEqual(["primero", "segundo"]);
  });
});
