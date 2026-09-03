import { randomUUID } from "node:crypto";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { InMemoryPaymentRepository } from "../infrastructure/in-memory/in-memory-payment.repository";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import { SinPagosPendientesError } from "../domain/errors/sin-pagos-pendientes.error";
import { ConfirmarPagoContraEntregaUseCase } from "./confirmar-pago-contra-entrega.use-case";

describe("ConfirmarPagoContraEntregaUseCase", () => {
  let ordenes: InMemoryOrderRepository;
  let pagos: InMemoryPaymentRepository;
  let useCase: ConfirmarPagoContraEntregaUseCase;

  beforeEach(() => {
    ordenes = new InMemoryOrderRepository();
    pagos = new InMemoryPaymentRepository();
    useCase = new ConfirmarPagoContraEntregaUseCase(ordenes, pagos);
  });

  async function sembrarOrden() {
    return ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "recogida_domicilio",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: randomUUID(), tarifaAplicada: 40_000 }],
    });
  }

  it("lanza OrdenNoEncontradaError si la orden no existe", async () => {
    await expect(useCase.ejecutar(randomUUID())).rejects.toThrow(OrdenNoEncontradaError);
  });

  it("lanza SinPagosPendientesError si la orden no tiene ningún pago", async () => {
    const orden = await sembrarOrden();

    await expect(useCase.ejecutar(orden.id)).rejects.toThrow(SinPagosPendientesError);
  });

  it("lanza SinPagosPendientesError si todos los pagos ya están capturados", async () => {
    const orden = await sembrarOrden();
    const pago = await pagos.crear({
      orderId: orden.id,
      tipo: "pago_alquiler",
      metodo: "contra_entrega",
      estado: "pendiente",
      monto: 40_000,
      wompiTransactionId: null,
    });
    await pagos.actualizarEstado(pago.id, "capturado");

    await expect(useCase.ejecutar(orden.id)).rejects.toThrow(SinPagosPendientesError);
  });

  it("confirma (pasa a capturado) todos los pagos pendientes de la orden, principal y depósito", async () => {
    const orden = await sembrarOrden();
    await pagos.crear({
      orderId: orden.id,
      tipo: "pago_alquiler",
      metodo: "contra_entrega",
      estado: "pendiente",
      monto: 40_000,
      wompiTransactionId: null,
    });
    await pagos.crear({
      orderId: orden.id,
      tipo: "deposito_garantia",
      metodo: "contra_entrega",
      estado: "pendiente",
      monto: 20_000,
      wompiTransactionId: null,
    });

    const confirmados = await useCase.ejecutar(orden.id);

    expect(confirmados).toHaveLength(2);
    expect(confirmados.every((p) => p.estado === "capturado")).toBe(true);
  });

  it("no toca pagos de otra orden ni cambia el estado de la orden", async () => {
    const orden = await sembrarOrden();
    const otraOrden = await sembrarOrden();
    await pagos.crear({
      orderId: orden.id,
      tipo: "pago_alquiler",
      metodo: "contra_entrega",
      estado: "pendiente",
      monto: 40_000,
      wompiTransactionId: null,
    });
    const pagoDeOtraOrden = await pagos.crear({
      orderId: otraOrden.id,
      tipo: "pago_alquiler",
      metodo: "contra_entrega",
      estado: "pendiente",
      monto: 40_000,
      wompiTransactionId: null,
    });

    await useCase.ejecutar(orden.id);

    const pagoDeOtraOrdenSinTocar = await pagos.buscarPorId(pagoDeOtraOrden.id);
    expect(pagoDeOtraOrdenSinTocar?.estado).toBe("pendiente");

    const ordenSinTocar = await ordenes.buscarPorId(orden.id);
    expect(ordenSinTocar?.estado).toBe("pendiente_pago");
  });
});
