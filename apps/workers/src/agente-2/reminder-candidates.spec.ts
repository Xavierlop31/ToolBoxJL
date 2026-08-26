import { filtrarCandidatosRecordatorio, type OrdenParaRecordatorio } from "./reminder-candidates";

const AHORA = new Date("2026-09-01T08:00:00.000Z");

function orden(overrides: Partial<OrdenParaRecordatorio> = {}): OrdenParaRecordatorio {
  return {
    id: "orden-1",
    clienteId: "cliente-1",
    tipo: "alquiler",
    estado: "confirmada",
    fechaFin: new Date("2026-09-01T20:00:00.000Z"),
    ...overrides,
  };
}

describe("filtrarCandidatosRecordatorio", () => {
  it("incluye una orden de alquiler activa que vence dentro de las próximas 24h", () => {
    expect(filtrarCandidatosRecordatorio([orden()], AHORA)).toHaveLength(1);
  });

  it("excluye una orden que vence en más de 24h", () => {
    const lejos = orden({ fechaFin: new Date("2026-09-03T08:00:00.000Z") });
    expect(filtrarCandidatosRecordatorio([lejos], AHORA)).toEqual([]);
  });

  it("excluye una orden que ya venció", () => {
    const vencida = orden({ fechaFin: new Date("2026-08-31T08:00:00.000Z") });
    expect(filtrarCandidatosRecordatorio([vencida], AHORA)).toEqual([]);
  });

  it("excluye órdenes de tipo venta", () => {
    expect(filtrarCandidatosRecordatorio([orden({ tipo: "venta" })], AHORA)).toEqual([]);
  });

  it("excluye órdenes que no están confirmada/en_curso", () => {
    expect(filtrarCandidatosRecordatorio([orden({ estado: "pendiente_pago" })], AHORA)).toEqual([]);
    expect(filtrarCandidatosRecordatorio([orden({ estado: "devuelta" })], AHORA)).toEqual([]);
  });

  it("excluye órdenes sin fecha_fin", () => {
    expect(filtrarCandidatosRecordatorio([orden({ fechaFin: null })], AHORA)).toEqual([]);
  });

  it("incluye los límites exactos de la ventana (ahora y ahora+24h)", () => {
    const limiteInferior = orden({ fechaFin: AHORA });
    const limiteSuperior = orden({ fechaFin: new Date(AHORA.getTime() + 24 * 60 * 60 * 1000) });
    expect(filtrarCandidatosRecordatorio([limiteInferior, limiteSuperior], AHORA)).toHaveLength(2);
  });
});
