import { randomUUID } from "node:crypto";
import { InMemoryDeliveryProductivityRepository } from "../infrastructure/in-memory/in-memory-delivery-productivity.repository";
import { ConsultarProductividadRepartidoresUseCase } from "./consultar-productividad-repartidores.use-case";

const AHORA = new Date("2026-08-17T12:00:00.000Z");

describe("ConsultarProductividadRepartidoresUseCase", () => {
  let repo: InMemoryDeliveryProductivityRepository;
  let useCase: ConsultarProductividadRepartidoresUseCase;

  beforeEach(() => {
    repo = new InMemoryDeliveryProductivityRepository();
    useCase = new ConsultarProductividadRepartidoresUseCase(repo);
  });

  it("calcula Entregas Exitosas / Ruta Asignada por repartidor (crudos, sin porcentaje)", async () => {
    const repartidorId = randomUUID();
    repo.sembrarParada({
      repartidorId,
      tipo: "entrega",
      estadoEnvio: "entregado",
      fecha: new Date("2026-08-05T00:00:00.000Z"),
    });
    repo.sembrarParada({
      repartidorId,
      tipo: "recogida",
      estadoEnvio: "retornado",
      fecha: new Date("2026-08-06T00:00:00.000Z"),
    });
    // Parada asignada pero no exitosa (todavía en ruta) -> cuenta para
    // ruta_asignada, no para entregas_exitosas.
    repo.sembrarParada({
      repartidorId,
      tipo: "entrega",
      estadoEnvio: "en_ruta_entrega",
      fecha: new Date("2026-08-07T00:00:00.000Z"),
    });

    const resultado = await useCase.ejecutar(AHORA);

    expect(resultado).toEqual([
      { repartidor_id: repartidorId, entregas_exitosas: 2, ruta_asignada: 3, tiempo_promedio_min: 0 },
    ]);
  });

  it("no cuenta como exitosa una entrega cuyo shipment está 'retornado' (tipo/estado deben corresponder)", async () => {
    const repartidorId = randomUUID();
    repo.sembrarParada({
      repartidorId,
      tipo: "entrega",
      estadoEnvio: "retornado",
      fecha: new Date("2026-08-05T00:00:00.000Z"),
    });

    const resultado = await useCase.ejecutar(AHORA);

    expect(resultado[0].entregas_exitosas).toBe(0);
    expect(resultado[0].ruta_asignada).toBe(1);
  });

  it("ignora paradas fuera del mes consultado", async () => {
    const repartidorId = randomUUID();
    repo.sembrarParada({
      repartidorId,
      tipo: "entrega",
      estadoEnvio: "entregado",
      fecha: new Date("2026-07-31T23:59:59.000Z"),
    });

    const resultado = await useCase.ejecutar(AHORA);

    expect(resultado).toEqual([]);
  });

  it("devuelve tiempo_promedio_min en 0 explícitamente (GAP documentado: no hay timestamps de asignación/entrega en el schema)", async () => {
    const repartidorId = randomUUID();
    repo.sembrarParada({
      repartidorId,
      tipo: "entrega",
      estadoEnvio: "entregado",
      fecha: new Date("2026-08-01T00:00:00.000Z"),
    });

    const resultado = await useCase.ejecutar(AHORA);

    expect(resultado[0].tiempo_promedio_min).toBe(0);
  });
});
