import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Order, UsuarioAutenticado } from "@toolboxjl/shared-types";
import { OrdersController } from "./orders.controller";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { SinUnidadesDisponiblesError } from "../domain/errors/sin-unidades-disponibles.error";
import { OrdenNoEncontradaError } from "../domain/errors/orden-no-encontrada.error";
import { OrdenNoExtensibleError } from "../domain/errors/orden-no-extensible.error";

function crearMockUseCase() {
  return { ejecutar: jest.fn() };
}

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return { id: "cliente-1", email: "cliente@example.com", rol: "cliente", ...overrides };
}

function ordenFake(overrides: Partial<Order> = {}): Order {
  return {
    id: randomUUID(),
    cliente_id: "cliente-1",
    tipo: "alquiler",
    estado: "pendiente_pago",
    fecha_inicio: "2026-09-01",
    fecha_fin: "2026-09-05",
    return_mode: "en_sede",
    direccion_entrega: "Calle 1",
    zona_id: randomUUID(),
    items: [],
    ...overrides,
  } as Order;
}

describe("OrdersController", () => {
  let cotizarOrden: ReturnType<typeof crearMockUseCase>;
  let crearOrden: ReturnType<typeof crearMockUseCase>;
  let obtenerOrden: ReturnType<typeof crearMockUseCase>;
  let extenderAlquiler: ReturnType<typeof crearMockUseCase>;
  let listarMisOrdenes: ReturnType<typeof crearMockUseCase>;
  let controller: OrdersController;

  beforeEach(() => {
    cotizarOrden = crearMockUseCase();
    crearOrden = crearMockUseCase();
    obtenerOrden = crearMockUseCase();
    extenderAlquiler = crearMockUseCase();
    listarMisOrdenes = crearMockUseCase();
    controller = new OrdersController(
      cotizarOrden as never,
      crearOrden as never,
      obtenerOrden as never,
      extenderAlquiler as never,
      listarMisOrdenes as never,
    );
  });

  describe("cotizar", () => {
    it("devuelve la cotización del use case", async () => {
      const cotizacion = { total: 40_000 };
      cotizarOrden.ejecutar.mockResolvedValue(cotizacion);

      const resultado = await controller.cotizar({
        modelo_id: randomUUID(),
        tipo: "alquiler",
        fecha_inicio: "2026-09-01",
        fecha_fin: "2026-09-05",
      } as never);

      expect(resultado).toBe(cotizacion);
    });

    it("mapea ModeloNoEncontradoError a BadRequestException", async () => {
      cotizarOrden.ejecutar.mockRejectedValue(new ModeloNoEncontradoError(randomUUID()));

      await expect(
        controller.cotizar({ modelo_id: randomUUID(), tipo: "alquiler" } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("propaga errores no mapeados sin transformarlos", async () => {
      cotizarOrden.ejecutar.mockRejectedValue(new Error("boom"));

      await expect(controller.cotizar({} as never)).rejects.toThrow("boom");
    });
  });

  describe("crear", () => {
    it("crea la orden delegando en el use case con el id del usuario autenticado", async () => {
      const orden = ordenFake();
      crearOrden.ejecutar.mockResolvedValue(orden);

      const resultado = await controller.crear({} as never, usuario({ id: "cliente-1" }));

      expect(crearOrden.ejecutar).toHaveBeenCalledWith("cliente-1", {});
      expect(resultado).toBe(orden);
    });

    it("mapea ModeloNoEncontradoError a BadRequestException", async () => {
      crearOrden.ejecutar.mockRejectedValue(new ModeloNoEncontradoError(randomUUID()));

      await expect(controller.crear({} as never, usuario())).rejects.toThrow(BadRequestException);
    });

    it("mapea SinUnidadesDisponiblesError a BadRequestException", async () => {
      crearOrden.ejecutar.mockRejectedValue(new SinUnidadesDisponiblesError(randomUUID()));

      await expect(controller.crear({} as never, usuario())).rejects.toThrow(BadRequestException);
    });
  });

  describe("listar", () => {
    it("delega en ListarMisOrdenesUseCase con el id del usuario y el query", async () => {
      const resultadoEsperado = { items: [], total: 0 };
      listarMisOrdenes.ejecutar.mockResolvedValue(resultadoEsperado);

      const resultado = await controller.listar({ page: 1 } as never, usuario({ id: "cliente-1" }));

      expect(listarMisOrdenes.ejecutar).toHaveBeenCalledWith("cliente-1", { page: 1 });
      expect(resultado).toBe(resultadoEsperado);
    });
  });

  describe("obtenerPorId", () => {
    it("devuelve la orden del use case", async () => {
      const orden = ordenFake();
      obtenerOrden.ejecutar.mockResolvedValue(orden);

      const resultado = await controller.obtenerPorId(orden.id, usuario());

      expect(resultado).toBe(orden);
    });

    it("mapea OrdenNoEncontradaError a NotFoundException", async () => {
      obtenerOrden.ejecutar.mockRejectedValue(new OrdenNoEncontradaError(randomUUID()));

      await expect(controller.obtenerPorId(randomUUID(), usuario())).rejects.toThrow(NotFoundException);
    });

    it("propaga un ForbiddenException del use case sin transformarlo", async () => {
      obtenerOrden.ejecutar.mockRejectedValue(new ForbiddenException("no autorizado"));

      await expect(controller.obtenerPorId(randomUUID(), usuario())).rejects.toThrow(ForbiddenException);
    });
  });

  describe("extender", () => {
    it("delega en ExtenderAlquilerUseCase con los parámetros del dto", async () => {
      const orden = ordenFake();
      extenderAlquiler.ejecutar.mockResolvedValue(orden);
      const dto = { order_id: orden.id, nueva_fecha_fin: "2026-09-10", modo_cobro: "pse" } as never;

      const resultado = await controller.extender(dto, usuario());

      expect(extenderAlquiler.ejecutar).toHaveBeenCalledWith(orden.id, "2026-09-10", "pse", usuario());
      expect(resultado).toBe(orden);
    });

    it.each([
      [new OrdenNoEncontradaError(randomUUID())],
      [new OrdenNoExtensibleError(randomUUID(), "orden no está en curso")],
      [new SinUnidadesDisponiblesError(randomUUID())],
    ])("mapea %p a BadRequestException", async (error) => {
      extenderAlquiler.ejecutar.mockRejectedValue(error);

      await expect(
        controller.extender({ order_id: randomUUID(), nueva_fecha_fin: "2026-09-10" } as never, usuario()),
      ).rejects.toThrow(BadRequestException);
    });

    it("propaga errores no mapeados sin transformarlos", async () => {
      extenderAlquiler.ejecutar.mockRejectedValue(new Error("boom"));

      await expect(
        controller.extender({ order_id: randomUUID(), nueva_fecha_fin: "2026-09-10" } as never, usuario()),
      ).rejects.toThrow("boom");
    });
  });
});
