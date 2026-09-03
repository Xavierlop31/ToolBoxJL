import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Payment } from "@toolboxjl/shared-types";
import { PaymentsController } from "./payments.controller";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import { OrdenNoPagableError } from "../domain/errors/orden-no-pagable.error";
import { SinPagosPendientesError } from "../domain/errors/sin-pagos-pendientes.error";

function crearMockUseCase() {
  return { ejecutar: jest.fn() };
}

function pagoFake(overrides: Partial<Payment> = {}): Payment {
  return {
    id: randomUUID(),
    order_id: randomUUID(),
    tipo: "pago_alquiler",
    metodo: "pse",
    estado: "capturado",
    monto: 40_000,
    wompi_transaction_id: null,
    ...overrides,
  };
}

describe("PaymentsController", () => {
  let pagarOrden: ReturnType<typeof crearMockUseCase>;
  let confirmarPagoContraEntrega: ReturnType<typeof crearMockUseCase>;
  let controller: PaymentsController;

  beforeEach(() => {
    pagarOrden = crearMockUseCase();
    confirmarPagoContraEntrega = crearMockUseCase();
    controller = new PaymentsController(pagarOrden as never, confirmarPagoContraEntrega as never);
  });

  describe("pagar", () => {
    it("delega en PagarOrdenUseCase y devuelve el pago principal", async () => {
      const pago = pagoFake();
      pagarOrden.ejecutar.mockResolvedValue({ pagoPrincipal: pago });
      const ordenId = randomUUID();

      const resultado = await controller.pagar(
        ordenId,
        { metodo: "pse" } as never,
        { id: "cliente-1" } as never,
      );

      expect(pagarOrden.ejecutar).toHaveBeenCalledWith(ordenId, "cliente-1", "pse");
      expect(resultado).toBe(pago);
    });

    it("mapea OrdenNoEncontradaError a NotFoundException", async () => {
      pagarOrden.ejecutar.mockRejectedValue(new OrdenNoEncontradaError(randomUUID()));

      await expect(
        controller.pagar(randomUUID(), { metodo: "pse" } as never, { id: "cliente-1" } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it("mapea OrdenNoPagableError a BadRequestException", async () => {
      pagarOrden.ejecutar.mockRejectedValue(new OrdenNoPagableError(randomUUID(), "confirmada"));

      await expect(
        controller.pagar(randomUUID(), { metodo: "pse" } as never, { id: "cliente-1" } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("propaga errores no mapeados sin transformarlos", async () => {
      pagarOrden.ejecutar.mockRejectedValue(new Error("boom"));

      await expect(
        controller.pagar(randomUUID(), { metodo: "pse" } as never, { id: "cliente-1" } as never),
      ).rejects.toThrow("boom");
    });
  });

  describe("confirmarContraEntrega", () => {
    it("delega en ConfirmarPagoContraEntregaUseCase y devuelve el primer pago confirmado", async () => {
      const principal = pagoFake();
      const deposito = pagoFake();
      confirmarPagoContraEntrega.ejecutar.mockResolvedValue([principal, deposito]);
      const ordenId = randomUUID();

      const resultado = await controller.confirmarContraEntrega(ordenId);

      expect(confirmarPagoContraEntrega.ejecutar).toHaveBeenCalledWith(ordenId);
      expect(resultado).toBe(principal);
    });

    it("mapea OrdenNoEncontradaError a NotFoundException", async () => {
      confirmarPagoContraEntrega.ejecutar.mockRejectedValue(new OrdenNoEncontradaError(randomUUID()));

      await expect(controller.confirmarContraEntrega(randomUUID())).rejects.toThrow(NotFoundException);
    });

    it("mapea SinPagosPendientesError a BadRequestException", async () => {
      confirmarPagoContraEntrega.ejecutar.mockRejectedValue(new SinPagosPendientesError(randomUUID()));

      await expect(controller.confirmarContraEntrega(randomUUID())).rejects.toThrow(BadRequestException);
    });

    it("propaga errores no mapeados sin transformarlos", async () => {
      confirmarPagoContraEntrega.ejecutar.mockRejectedValue(new Error("boom"));

      await expect(controller.confirmarContraEntrega(randomUUID())).rejects.toThrow("boom");
    });
  });
});
