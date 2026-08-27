import { InMemorySpeechToTextGateway } from "./in-memory-speech-to-text.gateway";

describe("InMemorySpeechToTextGateway", () => {
  it("devuelve la transcripción fija configurada y registra la llamada", async () => {
    const gateway = new InMemorySpeechToTextGateway("hola, busco un taladro");

    const resultado = await gateway.transcribir(Buffer.from("audio"), "audio/wav");

    expect(resultado).toBe("hola, busco un taladro");
    expect(gateway.llamadas).toEqual([{ audio: Buffer.from("audio"), mimeType: "audio/wav" }]);
  });

  it("usa la transcripción por defecto si no se configura ninguna", async () => {
    const gateway = new InMemorySpeechToTextGateway();
    expect(await gateway.transcribir(Buffer.from("x"), "audio/wav")).toBe("transcripción de prueba");
  });

  it("consume la cola de transcripciones en orden, una por turno, y se queda en la última", async () => {
    const gateway = new InMemorySpeechToTextGateway(["primer turno", "segundo turno"]);

    expect(await gateway.transcribir(Buffer.from("a"), "audio/wav")).toBe("primer turno");
    expect(await gateway.transcribir(Buffer.from("b"), "audio/wav")).toBe("segundo turno");
    expect(await gateway.transcribir(Buffer.from("c"), "audio/wav")).toBe("segundo turno");
    expect(gateway.llamadas).toHaveLength(3);
  });
});
