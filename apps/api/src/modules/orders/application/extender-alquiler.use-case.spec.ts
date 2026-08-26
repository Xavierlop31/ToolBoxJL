import { randomUUID } from "node:crypto";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { InMemoryOrderRepository } from "../infrastructure/in-memory/in-memory-order.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { OrdenNoEncontradaError } from "../domain/errors/orden-no-encontrada.error";
import { OrdenNoExtensibleError } from "../domain/errors/orden-no-extensible.error";
import { SinUnidadesDisponiblesError } from "../domain/errors/sin-unidades-disponibles.error";
import { ExtenderAlquilerUseCase } from "./extender-alquiler.use-case";

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return {
    id: "cliente-1",
    email: "cliente@example.com",
    rol: "cliente",
    ...overrides,
  };
}

describe("ExtenderAlquilerUseCase", () => {
  let ordenes: InMemoryOrderRepository;
  let unidades: InMemoryToolUnitRepository;
  let modelos: InMemoryToolModelRepository;
  let useCase: ExtenderAlquilerUseCase;

  beforeEach(() => {
    ordenes = new InMemoryOrderRepository();
    unidades = new InMemoryToolUnitRepository();
    modelos = new InMemoryToolModelRepository();
    useCase = new ExtenderAlquilerUseCase(ordenes, unidades, modelos);
  });

  async function sembrarOrdenConfirmada(clienteId: string) {
    const modelo = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: `SN-${randomUUID().slice(0, 8)}` });
    const orden = await ordenes.crear({
      clienteId,
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });
    const confirmada = await ordenes.actualizarEstado(orden.id, "confirmada");
    return { orden: confirmada, modelo, unidad };
  }

  it("extiende fecha_fin cuando el cliente dueño de la orden confirma y no hay conflicto de disponibilidad", async () => {
    const { orden } = await sembrarOrdenConfirmada("cliente-1");

    const resultado = await useCase.ejecutar(orden.id, "2026-09-08", "acumular_a_factura_final", usuario());

    expect(resultado.fecha_fin).toBe("2026-09-08");
    expect(resultado.id).toBe(orden.id);
  });

  it("permite al rol de servicio agente-2 extender una orden que no le pertenece", async () => {
    const { orden } = await sembrarOrdenConfirmada("cliente-dueno");

    const resultado = await useCase.ejecutar(
      orden.id,
      "2026-09-08",
      "link_pago",
      usuario({ id: "agente-2-service-account", rol: "agente-2" }),
    );

    expect(resultado.fecha_fin).toBe("2026-09-08");
  });

  it("lanza OrdenNoEncontradaError si la orden no existe", async () => {
    await expect(
      useCase.ejecutar(randomUUID(), "2026-09-08", undefined, usuario()),
    ).rejects.toThrow(OrdenNoEncontradaError);
  });

  it("lanza OrdenNoEncontradaError si un cliente intenta extender la orden de otro (anti-enumeración)", async () => {
    const { orden } = await sembrarOrdenConfirmada("cliente-dueno");

    await expect(
      useCase.ejecutar(orden.id, "2026-09-08", undefined, usuario({ id: "otro-cliente" })),
    ).rejects.toThrow(OrdenNoEncontradaError);
  });

  it("lanza OrdenNoExtensibleError si la orden todavía está pendiente_pago", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 20_000 }],
    });

    await expect(
      useCase.ejecutar(orden.id, "2026-09-08", undefined, usuario()),
    ).rejects.toThrow(OrdenNoExtensibleError);
  });

  it("lanza OrdenNoExtensibleError si nueva_fecha_fin no es posterior a la fecha_fin actual", async () => {
    const { orden } = await sembrarOrdenConfirmada("cliente-1");

    await expect(
      useCase.ejecutar(orden.id, "2026-09-05", undefined, usuario()),
    ).rejects.toThrow(OrdenNoExtensibleError);
  });

  it("lanza SinUnidadesDisponiblesError si otra orden ya reservó la misma unidad en la ventana de extensión", async () => {
    const { orden, unidad } = await sembrarOrdenConfirmada("cliente-1");

    // Otra orden (de otro cliente) toma la MISMA unidad justo después de que
    // esta termine — la extensión debería chocar con esa reserva.
    const otraOrden = await ordenes.crear({
      clienteId: "otro-cliente",
      tipo: "alquiler",
      fechaInicio: "2026-09-06",
      fechaFin: "2026-09-10",
      returnMode: "en_sede",
      direccionEntrega: "Calle 2",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });
    await ordenes.actualizarEstado(otraOrden.id, "confirmada");

    await expect(
      useCase.ejecutar(orden.id, "2026-09-08", undefined, usuario()),
    ).rejects.toThrow(SinUnidadesDisponiblesError);
  });
});
