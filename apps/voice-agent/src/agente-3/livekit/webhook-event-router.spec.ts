import { decidirSiUnirseASala } from "./webhook-event-router";
import { AGENTE_3_BOT_IDENTITY_PREFIX } from "./agent-token";

describe("decidirSiUnirseASala", () => {
  it("decide unirse ante participant_joined de un cliente real con room.name", () => {
    const decision = decidirSiUnirseASala({
      event: "participant_joined",
      room: { name: "sala-cliente-123" },
      participant: { identity: "cliente-abc" },
    });
    expect(decision).toEqual({
      debeUnirse: true,
      roomName: "sala-cliente-123",
      motivo: expect.stringContaining("cliente-abc"),
    });
  });

  it("ignora eventos que no son participant_joined", () => {
    const decision = decidirSiUnirseASala({ event: "room_started", room: { name: "sala-1" } });
    expect(decision.debeUnirse).toBe(false);
  });

  it("ignora participant_joined del propio bot del Agente 3 (evita unirse en loop)", () => {
    const decision = decidirSiUnirseASala({
      event: "participant_joined",
      room: { name: "sala-cliente-123" },
      participant: { identity: `${AGENTE_3_BOT_IDENTITY_PREFIX}-sala-cliente-123` },
    });
    expect(decision.debeUnirse).toBe(false);
    expect(decision.motivo).toMatch(/propio bot/);
  });

  it("no se une si el evento no trae room.name", () => {
    const decision = decidirSiUnirseASala({ event: "participant_joined", participant: { identity: "cliente-x" } });
    expect(decision.debeUnirse).toBe(false);
  });

  it("no se une si el evento no trae participant (identity vacía no matchea el prefijo del bot, pero sin room falla igual)", () => {
    const decision = decidirSiUnirseASala({ event: "participant_joined", room: { name: "sala-1" } });
    expect(decision.debeUnirse).toBe(true);
    expect(decision.roomName).toBe("sala-1");
  });
});
