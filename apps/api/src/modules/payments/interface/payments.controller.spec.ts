import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Payment, PseBank, WompiTerms } from "@toolboxjl/shared-types";
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

const usuarioConEmail = { id: "cliente-1", email: "cliente@example.com" } as never;

describe("PaymentsController", () => {
  let pagarOrden: ReturnType<typeof crearMockUseCase>;
  let confirmarPagoContraEntrega: ReturnType<typeof crearMockUseCase>;
  let listarBancosPse: ReturnType<typeof crearMockUseCase>;
  let obtenerTerminosWompi: ReturnType<typeof crearMockUseCase>;
  let controller: PaymentsController;

  beforeEach(() => {
    pagarOrden = crearMockUseCase();
    confirmarPagoContraEntrega = crearMockUseCase();
    listarBancosPse = crearMockUseCase();
    obtenerTerminosWompi = crearMockUseCase();
    controller = new PaymentsController(
      pagarOrden as never,
      confirmarPagoContraEntrega as never,
      listarBancosPse as never,
      obtenerTerminosWompi as never,
    );
  });

  describe("pagar", () => {
    it("delega en PagarOrdenUseCase (pse sin datos de banco) y devuelve el pago principal", async () => {
      const pago = pagoFake();
      pagarOrden.ejecutar.mockResolvedValue({ pagoPrincipal: pago });
      const ordenId = randomUUID();

      const resultado = await controller.pagar(ordenId, { metodo: "pse" } as never, usuarioConEmail);

      expect(pagarOrden.ejecutar).toHaveBeenCalledWith(
        ordenId,
        "cliente-1",
        "cliente@example.com",
        "pse",
        undefined,
        undefined,
      );
      expect(resultado).toBe(pago);
    });

    it("arma datosPse cuando el DTO trae los 3 campos de PSE completos", async () => {
      const pago = pagoFake();
      pagarOrden.ejecutar.mockResolvedValue({ pagoPrincipal: pago });
      const ordenId = randomUUID();

      await controller.pagar(
        ordenId,
        {
          metodo: "pse",
          user_legal_id_type: "CC",
          user_legal_id: "123456789",
          financial_institution_code: "1",
        } as never,
        usuarioConEmail,
      );

      expect(pagarOrden.ejecutar).toHaveBeenCalledWith(
        ordenId,
        "cliente-1",
        "cliente@example.com",
        "pse",
        { userLegalIdType: "CC", userLegalId: "123456789", financialInstitutionCode: "1" },
        undefined,
      );
    });

    it("arma aceptacionWompi cuando el DTO trae acceptance_token y accept_personal_auth", async () => {
      const pago = pagoFake();
      pagarOrden.ejecutar.mockResolvedValue({ pagoPrincipal: pago });
      const ordenId = randomUUID();

      await controller.pagar(
        ordenId,
        {
          metodo: "tarjeta",
          acceptance_token: "token-reglamento-abc",
          accept_personal_auth: "token-datos-abc",
        } as never,
        usuarioConEmail,
      );

      expect(pagarOrden.ejecutar).toHaveBeenCalledWith(
        ordenId,
        "cliente-1",
        "cliente@example.com",
        "tarjeta",
        undefined,
        { acceptanceToken: "token-reglamento-abc", personalAuthToken: "token-datos-abc" },
      );
    });

    it("rechaza con BadRequestException si el usuario no tiene email y el método no es contra_entrega", async () => {
      const ordenId = randomUUID();

      await expect(
        controller.pagar(ordenId, { metodo: "pse" } as never, { id: "cliente-1", email: null } as never),
      ).rejects.toThrow(BadRequestException);
      expect(pagarOrden.ejecutar).not.toHaveBeenCalled();
    });

    it("no exige email si el método es contra_entrega", async () => {
      const pago = pagoFake({ metodo: "contra_entrega", estado: "pendiente" });
      pagarOrden.ejecutar.mockResolvedValue({ pagoPrincipal: pago });
      const ordenId = randomUUID();

      const resultado = await controller.pagar(
        ordenId,
        { metodo: "contra_entrega" } as never,
        { id: "cliente-1", email: null } as never,
      );

      expect(resultado).toBe(pago);
    });

    it("mapea OrdenNoEncontradaError a NotFoundException", async () => {
      pagarOrden.ejecutar.mockRejectedValue(new OrdenNoEncontradaError(randomUUID()));

      await expect(
        controller.pagar(randomUUID(), { metodo: "pse" } as never, usuarioConEmail),
      ).rejects.toThrow(NotFoundException);
    });

    it("mapea OrdenNoPagableError a BadRequestException", async () => {
      pagarOrden.ejecutar.mockRejectedValue(new OrdenNoPagableError(randomUUID(), "confirmada"));

      await expect(
        controller.pagar(randomUUID(), { metodo: "pse" } as never, usuarioConEmail),
      ).rejects.toThrow(BadRequestException);
    });

    it("propaga errores no mapeados sin transformarlos", async () => {
      pagarOrden.ejecutar.mockRejectedValue(new Error("boom"));

      await expect(
        controller.pagar(randomUUID(), { metodo: "pse" } as never, usuarioConEmail),
      ).rejects.toThrow("boom");
    });
  });

  describe("pseBanks", () => {
    it("delega en ListarBancosPseUseCase", async () => {
      const bancos: PseBank[] = [{ codigo: "1", nombre: "Banco A" }];
      listarBancosPse.ejecutar.mockResolvedValue(bancos);

      const resultado = await controller.pseBanks();

      expect(listarBancosPse.ejecutar).toHaveBeenCalledWith();
      expect(resultado).toBe(bancos);
    });
  });

  describe("wompiTerms", () => {
    it("delega en ObtenerTerminosWompiUseCase", async () => {
      const terminos: WompiTerms = {
        acceptance_token: "token-reglamento-abc",
        accept_personal_auth: "token-datos-abc",
        reglamento_url: "https://wompi.co/reglamento.pdf",
        politica_datos_url: "https://wompi.co/politica-datos.pdf",
      };
      obtenerTerminosWompi.ejecutar.mockResolvedValue(terminos);

      const resultado = await controller.wompiTerms();

      expect(obtenerTerminosWompi.ejecutar).toHaveBeenCalledWith();
      expect(resultado).toBe(terminos);
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
