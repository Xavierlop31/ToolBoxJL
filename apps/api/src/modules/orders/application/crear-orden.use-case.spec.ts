import { randomUUID } from "node:crypto";
import type { OrderInput } from "@toolboxjl/shared-types";
import { InMemoryOrderRepository } from "../infrastructure/in-memory/in-memory-order.repository";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { SinUnidadesDisponiblesError } from "../domain/errors/sin-unidades-disponibles.error";
import { CotizarOrdenUseCase } from "./cotizar-orden.use-case";
import { CrearOrdenUseCase } from "./crear-orden.use-case";

describe("CrearOrdenUseCase", () => {
  let ordenes: InMemoryOrderRepository;
  let modelos: InMemoryToolModelRepository;
  let unidades: InMemoryToolUnitRepository;
  let cotizarOrden: CotizarOrdenUseCase;
  let useCase: CrearOrdenUseCase;

  beforeEach(() => {
    ordenes = new InMemoryOrderRepository();
    modelos = new InMemoryToolModelRepository();
    unidades = new InMemoryToolUnitRepository();
    cotizarOrden = new CotizarOrdenUseCase(modelos);
    useCase = new CrearOrdenUseCase(ordenes, modelos, unidades, cotizarOrden);
  });

  function inputAlquiler(modeloId: string, overrides: Partial<OrderInput> = {}): OrderInput {
    return {
      modelo_id: modeloId,
      tipo: "alquiler",
      fecha_inicio: "2026-09-01",
      fecha_fin: "2026-09-05",
      return_mode: "en_sede",
      direccion_entrega: "Calle 1",
      zona_id: randomUUID(),
      ...overrides,
    };
  }

  it("crea una orden de alquiler eligiendo una unidad físicamente disponible", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });

    const orden = await useCase.ejecutar("cliente-1", inputAlquiler(modelo.id));

    expect(orden.cliente_id).toBe("cliente-1");
    expect(orden.estado).toBe("pendiente_pago");
    expect(orden.items[0].unidad_id).toBe(unidad.id);
    expect(orden.items[0].tarifa_aplicada).toBeGreaterThan(0);
  });

  it("crea una orden de venta eligiendo una unidad sin órdenes activas", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
      costo_compra: 200_000,
    });
    await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });

    const orden = await useCase.ejecutar(
      "cliente-1",
      inputAlquiler(modelo.id, { tipo: "venta", fecha_inicio: undefined, fecha_fin: undefined }),
    );

    expect(orden.tipo).toBe("venta");
  });

  it("lanza ModeloNoEncontradoError si el modelo no existe", async () => {
    await expect(useCase.ejecutar("cliente-1", inputAlquiler(randomUUID()))).rejects.toThrow(
      ModeloNoEncontradoError,
    );
  });

  it("lanza SinUnidadesDisponiblesError si todas las unidades del modelo están en mantenimiento o dadas de baja", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    await unidades.actualizarEstado(unidad.id, "En Mantenimiento");

    await expect(useCase.ejecutar("cliente-1", inputAlquiler(modelo.id))).rejects.toThrow(
      SinUnidadesDisponiblesError,
    );
  });

  it("lanza SinUnidadesDisponiblesError si la única unidad disponible ya está reservada en el rango de fechas", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    await ordenes.crear({
      clienteId: "otro-cliente",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 2",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });

    await expect(useCase.ejecutar("cliente-1", inputAlquiler(modelo.id))).rejects.toThrow(
      SinUnidadesDisponiblesError,
    );
  });

  it("lanza SinUnidadesDisponiblesError en venta si la única unidad ya tiene una orden activa", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    await ordenes.crear({
      clienteId: "otro-cliente",
      tipo: "venta",
      fechaInicio: null,
      fechaFin: null,
      returnMode: "en_sede",
      direccionEntrega: "Calle 2",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 100_000 }],
    });

    await expect(
      useCase.ejecutar(
        "cliente-1",
        inputAlquiler(modelo.id, { tipo: "venta", fecha_inicio: undefined, fecha_fin: undefined }),
      ),
    ).rejects.toThrow(SinUnidadesDisponiblesError);
  });

  it("lanza un Error si un alquiler no incluye fecha_inicio/fecha_fin", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });

    await expect(
      useCase.ejecutar("cliente-1", inputAlquiler(modelo.id, { fecha_inicio: undefined, fecha_fin: undefined })),
    ).rejects.toThrow("Fechas requeridas para alquiler.");
  });
});
