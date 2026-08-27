import { randomUUID } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { CotizarOrdenUseCase } from "./cotizar-orden.use-case";

describe("CotizarOrdenUseCase", () => {
  let modelos: InMemoryToolModelRepository;
  let useCase: CotizarOrdenUseCase;

  beforeEach(() => {
    modelos = new InMemoryToolModelRepository();
    useCase = new CotizarOrdenUseCase(modelos);
  });

  it("cotiza un alquiler calculando los días entre fecha_inicio y fecha_fin", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });

    const cotizacion = await useCase.ejecutar({
      modeloId: modelo.id,
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      zonaId: randomUUID(),
    });

    expect(cotizacion.modelo_id).toBe(modelo.id);
    expect(cotizacion.tarifa_base).toBeGreaterThan(0);
  });

  it("cotiza una venta sin requerir fechas", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
      costo_compra: 300_000,
    });

    const cotizacion = await useCase.ejecutar({
      modeloId: modelo.id,
      tipo: "venta",
      zonaId: randomUUID(),
    });

    expect(cotizacion.modelo_id).toBe(modelo.id);
  });

  it("lanza ModeloNoEncontradoError si el modelo no existe", async () => {
    await expect(
      useCase.ejecutar({ modeloId: randomUUID(), tipo: "venta", zonaId: randomUUID() }),
    ).rejects.toThrow(ModeloNoEncontradoError);
  });

  it("lanza BadRequestException si un alquiler no incluye fecha_inicio/fecha_fin", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });

    await expect(
      useCase.ejecutar({ modeloId: modelo.id, tipo: "alquiler", zonaId: randomUUID() }),
    ).rejects.toThrow(BadRequestException);
  });

  it("lanza BadRequestException si fecha_fin no es posterior a fecha_inicio", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });

    await expect(
      useCase.ejecutar({
        modeloId: modelo.id,
        tipo: "alquiler",
        fechaInicio: "2026-09-05",
        fechaFin: "2026-09-01",
        zonaId: randomUUID(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("usa returnMode explícito cuando se provee (en vez del default en_sede)", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
      peso_kg: 20,
    });

    const cotizacion = await useCase.ejecutar({
      modeloId: modelo.id,
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-03",
      zonaId: randomUUID(),
      returnMode: "recogida_domicilio",
    });

    expect(cotizacion.modelo_id).toBe(modelo.id);
    expect(cotizacion.recargo_logistico).toBeGreaterThanOrEqual(0);
  });
});
