import { construirMensajeRecordatorio } from "./reminder-message";

describe("construirMensajeRecordatorio", () => {
  it("incluye la fecha de vencimiento en español", () => {
    const mensaje = construirMensajeRecordatorio(new Date("2026-09-02T00:00:00.000Z"));
    expect(mensaje).toMatch(/2 de septiembre/);
    expect(mensaje).toMatch(/ToolBox JL/);
    expect(mensaje).toMatch(/extenderlo/);
  });
});
