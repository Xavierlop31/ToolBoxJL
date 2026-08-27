import { randomUUID } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryPaymentRepository } from "../../payments/infrastructure/in-memory/in-memory-payment.repository";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import { MoraNoEncontradaError } from "../domain/errors/mora-no-encontrada.error";
import { ConsultarMoraUseCase } from "./consultar-mora.use-case";

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return { id: "cliente-1", email: "cliente@example.com", rol: "cliente", ...overrides };
}

describe("ConsultarMoraUseCase", () => {
  let ordenes: InMemoryOrderRepository;
  let unidades: InMemoryToolUnitRepository;
  let modelos: InMemoryToolModelRepository;
  let pagos: InMemoryPaymentRepository;
  let useCase: ConsultarMoraUseCase;

  beforeEach(() => {
    ordenes = new InMemoryOrderRepository();
    unidades = new InMemoryToolUnitRepository();
    modelos = new InMemoryToolModelRepository();
    pagos = new InMemoryPaymentRepository();
    useCase = new ConsultarMoraUseCase(ordenes, unidades, modelos, pagos);
  });

  async function sembrarOrdenConMora(opts: { clienteId?: string; fechaFin?: string } = {}) {
    const modelo = await modelos.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
      interes_mora_dia: 0.05,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    const orden = await ordenes.crear({
      clienteId: opts.clienteId ?? "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-08-01",
      fechaFin: opts.fechaFin ?? "2026-08-10",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });
    await pagos.crear({
      orderId: orden.id,
      tipo: "cobro_mora",
      metodo: "contra_entrega",
      estado: "pendiente",
      monto: 5_000,
      wompiTransactionId: null,
    });
    return { orden, modelo, unidad };
  }

  it("devuelve el comprobante de mora recalculado on-the-fly cuando ya existe un Payment cobro_mora", async () => {
    const { orden } = await sembrarOrdenConMora({ fechaFin: "2026-08-10" });

    const resultado = await useCase.ejecutar(orden.id, usuario());

    expect(resultado.order_id).toBe(orden.id);
    expect(resultado.interes_mora_dia).toBe(0.05);
    expect(resultado.dias_retraso).toBeGreaterThanOrEqual(0);
    expect(resultado.monto_mora).toBeGreaterThanOrEqual(0);
  });

  it("permite a un admin consultar la mora de una orden ajena", async () => {
    const { orden } = await sembrarOrdenConMora({ clienteId: "cliente-dueno" });

    await expect(useCase.ejecutar(orden.id, usuario({ id: "admin-1", rol: "admin" }))).resolves.toBeDefined();
  });

  it("lanza OrdenNoEncontradaError si la orden no existe", async () => {
    await expect(useCase.ejecutar(randomUUID(), usuario())).rejects.toThrow(OrdenNoEncontradaError);
  });

  it("lanza ForbiddenException si un cliente intenta consultar la mora de la orden de otro", async () => {
    const { orden } = await sembrarOrdenConMora({ clienteId: "cliente-dueno" });

    await expect(useCase.ejecutar(orden.id, usuario({ id: "otro-cliente" }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("lanza MoraNoEncontradaError si la orden no tiene ningún Payment cobro_mora emitido", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-2" });
    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-08-10",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });

    await expect(useCase.ejecutar(orden.id, usuario())).rejects.toThrow(MoraNoEncontradaError);
  });

  it("lanza MoraNoEncontradaError si la unidad de la orden ya no existe", async () => {
    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-08-10",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: randomUUID(), tarifaAplicada: 40_000 }],
    });
    await pagos.crear({
      orderId: orden.id,
      tipo: "cobro_mora",
      metodo: "contra_entrega",
      estado: "pendiente",
      monto: 5_000,
      wompiTransactionId: null,
    });

    await expect(useCase.ejecutar(orden.id, usuario())).rejects.toThrow(MoraNoEncontradaError);
  });
});
