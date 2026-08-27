import { randomUUID } from "node:crypto";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryPaymentRepository } from "../infrastructure/in-memory/in-memory-payment.repository";
import { InMemoryWompiGateway } from "../infrastructure/wompi/in-memory-wompi-gateway";
import { InMemoryShipmentRepository } from "../../logistics/infrastructure/in-memory/in-memory-shipment.repository";
import { CotizarOrdenUseCase } from "../../orders/application/cotizar-orden.use-case";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import { UnidadNoEncontradaError } from "../../catalog-inventory/domain/errors/unidad-no-encontrada.error";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { OrdenNoPagableError } from "../domain/errors/orden-no-pagable.error";
import { PagarOrdenUseCase } from "./pagar-orden.use-case";

describe("PagarOrdenUseCase", () => {
  let ordenes: InMemoryOrderRepository;
  let modelos: InMemoryToolModelRepository;
  let unidades: InMemoryToolUnitRepository;
  let pagos: InMemoryPaymentRepository;
  let wompi: InMemoryWompiGateway;
  let shipments: InMemoryShipmentRepository;
  let cotizarOrden: CotizarOrdenUseCase;
  let useCase: PagarOrdenUseCase;

  beforeEach(() => {
    ordenes = new InMemoryOrderRepository();
    modelos = new InMemoryToolModelRepository();
    unidades = new InMemoryToolUnitRepository();
    pagos = new InMemoryPaymentRepository();
    wompi = new InMemoryWompiGateway();
    shipments = new InMemoryShipmentRepository();
    cotizarOrden = new CotizarOrdenUseCase(modelos);
    useCase = new PagarOrdenUseCase(ordenes, unidades, modelos, pagos, wompi, shipments, cotizarOrden);
  });

  async function sembrarOrden(opts: {
    clienteId?: string;
    tipo?: "alquiler" | "venta";
    depositoPct?: number;
  } = {}) {
    const modelo = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
      deposito_pct: opts.depositoPct ?? 0,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: `SN-${randomUUID().slice(0, 8)}` });
    const orden = await ordenes.crear({
      clienteId: opts.clienteId ?? "cliente-1",
      tipo: opts.tipo ?? "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });
    return { orden, modelo, unidad };
  }

  it("paga contra_entrega sin depósito: crea un único pago pendiente y confirma la orden", async () => {
    const { orden } = await sembrarOrden();

    const resultado = await useCase.ejecutar(orden.id, "cliente-1", "contra_entrega");

    expect(resultado.pagoPrincipal.estado).toBe("pendiente");
    expect(resultado.pagoPrincipal.wompi_transaction_id).toBeNull();
    expect(resultado.pagoDeposito).toBeNull();

    const ordenActualizada = await ordenes.buscarPorId(orden.id);
    expect(ordenActualizada?.estado).toBe("confirmada");

    const shipmentsCreados = await shipments.listarTodos();
    expect(shipmentsCreados).toHaveLength(1);
    expect(shipmentsCreados[0].order_id).toBe(orden.id);
    expect(shipmentsCreados[0].tipo).toBe("entrega");
  });

  it("paga contra_entrega con depósito: crea también un pago de depósito de garantía pendiente", async () => {
    const { orden } = await sembrarOrden({ depositoPct: 0.2 });

    const resultado = await useCase.ejecutar(orden.id, "cliente-1", "contra_entrega");

    expect(resultado.pagoDeposito).not.toBeNull();
    expect(resultado.pagoDeposito?.tipo).toBe("deposito_garantia");
    expect(resultado.pagoDeposito?.estado).toBe("pendiente");
  });

  it("paga con tarjeta: inicia transacción Wompi, el depósito queda en hold y devuelve el split simulado", async () => {
    const { orden } = await sembrarOrden({ depositoPct: 0.2 });

    const resultado = await useCase.ejecutar(orden.id, "cliente-1", "tarjeta");

    expect(resultado.pagoPrincipal.estado).toBe("capturado");
    expect(resultado.pagoPrincipal.wompi_transaction_id).toMatch(/^wompi-fake-/);
    expect(resultado.pagoDeposito?.estado).toBe("hold");
    expect(resultado.split.montoLogistica + resultado.split.montoMatriz).toBeGreaterThanOrEqual(0);
  });

  it("paga con pse: el depósito se captura de inmediato (no queda en hold)", async () => {
    const { orden } = await sembrarOrden({ depositoPct: 0.2 });

    const resultado = await useCase.ejecutar(orden.id, "cliente-1", "pse");

    expect(resultado.pagoDeposito?.estado).toBe("capturado");
  });

  it("lanza OrdenNoEncontradaError si la orden no existe", async () => {
    await expect(useCase.ejecutar(randomUUID(), "cliente-1", "contra_entrega")).rejects.toThrow(
      OrdenNoEncontradaError,
    );
  });

  it("lanza OrdenNoEncontradaError si un cliente intenta pagar la orden de otro (anti-enumeración)", async () => {
    const { orden } = await sembrarOrden({ clienteId: "cliente-dueno" });

    await expect(useCase.ejecutar(orden.id, "otro-cliente", "contra_entrega")).rejects.toThrow(
      OrdenNoEncontradaError,
    );
  });

  it("lanza OrdenNoPagableError si la orden ya no está pendiente_pago", async () => {
    const { orden } = await sembrarOrden();
    await ordenes.actualizarEstado(orden.id, "confirmada");

    await expect(useCase.ejecutar(orden.id, "cliente-1", "contra_entrega")).rejects.toThrow(OrdenNoPagableError);
  });

  it("lanza UnidadNoEncontradaError si la unidad reservada por la orden ya no existe", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
    });
    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: randomUUID(), tarifaAplicada: 20_000 }],
    });

    await expect(useCase.ejecutar(orden.id, "cliente-1", "contra_entrega")).rejects.toThrow(UnidadNoEncontradaError);
    void modelo;
  });

  it("lanza ModeloNoEncontradoError si el modelo de la unidad reservada ya no existe", async () => {
    const unidad = await unidades.crear({ modeloId: randomUUID(), numeroSerie: "SN-1" });
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

    await expect(useCase.ejecutar(orden.id, "cliente-1", "contra_entrega")).rejects.toThrow(ModeloNoEncontradoError);
  });
});
