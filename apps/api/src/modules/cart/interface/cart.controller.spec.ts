import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { CotizarOrdenUseCase } from "../../orders/application/cotizar-orden.use-case";
import { CrearOrdenUseCase } from "../../orders/application/crear-orden.use-case";
import { InMemoryCartRepository } from "../infrastructure/in-memory/in-memory-cart.repository";
import { ActualizarCantidadCarritoUseCase } from "../application/actualizar-cantidad-carrito.use-case";
import { AgregarItemCarritoUseCase } from "../application/agregar-item-carrito.use-case";
import { CheckoutCartUseCase } from "../application/checkout-cart.use-case";
import { EliminarItemCarritoUseCase } from "../application/eliminar-item-carrito.use-case";
import { ObtenerCarritoUseCase } from "../application/obtener-carrito.use-case";
import { CartController } from "./cart.controller";
import { ActualizarCantidadCarritoDto } from "./dto/actualizar-cantidad-carrito.dto";
import { AgregarItemCarritoDto } from "./dto/agregar-item-carrito.dto";
import { CheckoutCartDto } from "./dto/checkout-cart.dto";

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return { id: "cliente-1", email: "cliente@example.com", rol: "cliente", ...overrides };
}

describe("CartController", () => {
  let modelos: InMemoryToolModelRepository;
  let unidades: InMemoryToolUnitRepository;
  let ordenes: InMemoryOrderRepository;
  let carritos: InMemoryCartRepository;
  let controller: CartController;

  beforeEach(() => {
    modelos = new InMemoryToolModelRepository();
    unidades = new InMemoryToolUnitRepository();
    ordenes = new InMemoryOrderRepository();
    carritos = new InMemoryCartRepository();

    const cotizarOrden = new CotizarOrdenUseCase(modelos);
    const crearOrden = new CrearOrdenUseCase(ordenes, modelos, unidades, cotizarOrden);
    const eliminarItemCarrito = new EliminarItemCarritoUseCase(carritos, modelos);

    controller = new CartController(
      new ObtenerCarritoUseCase(carritos, modelos),
      new AgregarItemCarritoUseCase(carritos, modelos),
      new ActualizarCantidadCarritoUseCase(carritos, modelos),
      eliminarItemCarrito,
      new CheckoutCartUseCase(carritos, crearOrden, eliminarItemCarrito),
    );
  });

  describe("GET /cart", () => {
    it("devuelve el carrito del usuario autenticado (usuario.id, no un id del body)", async () => {
      const carrito = await controller.ver(usuario({ id: "cliente-42" }));
      expect(carrito).toEqual({ items: [], total: 0 });
    });
  });

  describe("POST /cart/add-item", () => {
    it("agrega el item y devuelve el carrito actualizado", async () => {
      const modelo = await modelos.crear({
        nombre: "Taladro Percutor",
        marca: "Bosch",
        categoria: "Taladros",
        tarifa_dia: 10_000,
      });
      const dto = Object.assign(new AgregarItemCarritoDto(), { modelo_id: modelo.id, cantidad: 2 });

      const carrito = await controller.agregarItem(dto, usuario());

      expect(carrito.items).toEqual([{ id: expect.any(String), modelo_id: modelo.id, cantidad: 2 }]);
    });

    it("mapea ModeloNoEncontradoError a 400 BadRequest (openapi.yaml no declara 404 para este endpoint)", async () => {
      const dto = Object.assign(new AgregarItemCarritoDto(), {
        modelo_id: "00000000-0000-0000-0000-000000000000",
        cantidad: 1,
      });

      await expect(controller.agregarItem(dto, usuario())).rejects.toThrow(BadRequestException);
    });
  });

  describe("PATCH /cart/items/:id", () => {
    it("cambia la cantidad de la línea y devuelve el carrito actualizado", async () => {
      const modelo = await modelos.crear({
        nombre: "Sierra Circular",
        marca: "Dewalt",
        categoria: "Sierras",
        tarifa_dia: 5_000,
      });
      const dtoAgregar = Object.assign(new AgregarItemCarritoDto(), { modelo_id: modelo.id, cantidad: 1 });
      const carritoInicial = await controller.agregarItem(dtoAgregar, usuario());
      const itemId = carritoInicial.items[0].id!;

      const dtoActualizar = Object.assign(new ActualizarCantidadCarritoDto(), { cantidad: 5 });
      const carrito = await controller.actualizarItem(itemId, dtoActualizar, usuario());

      expect(carrito.items).toEqual([{ id: itemId, modelo_id: modelo.id, cantidad: 5 }]);
    });

    it("mapea LineaCarritoNoEncontradaError a 404 (línea inexistente)", async () => {
      const dto = Object.assign(new ActualizarCantidadCarritoDto(), { cantidad: 2 });

      await expect(
        controller.actualizarItem("00000000-0000-0000-0000-000000000000", dto, usuario()),
      ).rejects.toThrow(NotFoundException);
    });

    it("mapea a 404 una línea que existe pero es de OTRO cliente (anti-enumeración)", async () => {
      const modelo = await modelos.crear({
        nombre: "Amoladora",
        marca: "Bosch",
        categoria: "Amoladoras",
        tarifa_dia: 6_000,
      });
      const dtoAgregar = Object.assign(new AgregarItemCarritoDto(), { modelo_id: modelo.id, cantidad: 1 });
      const carritoAjeno = await controller.agregarItem(dtoAgregar, usuario({ id: "cliente-otro" }));
      const itemAjenoId = carritoAjeno.items[0].id!;

      const dtoActualizar = Object.assign(new ActualizarCantidadCarritoDto(), { cantidad: 3 });
      await expect(
        controller.actualizarItem(itemAjenoId, dtoActualizar, usuario({ id: "cliente-1" })),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("DELETE /cart/items/:id", () => {
    it("elimina la línea y devuelve el carrito sin ella", async () => {
      const modelo = await modelos.crear({
        nombre: "Rotomartillo",
        marca: "Makita",
        categoria: "Rotomartillos",
        tarifa_dia: 8_000,
      });
      const dtoAgregar = Object.assign(new AgregarItemCarritoDto(), { modelo_id: modelo.id, cantidad: 1 });
      const carritoInicial = await controller.agregarItem(dtoAgregar, usuario());
      const itemId = carritoInicial.items[0].id!;

      const carrito = await controller.eliminarItem(itemId, usuario());

      expect(carrito.items).toEqual([]);
    });

    it("mapea LineaCarritoNoEncontradaError a 404 (línea inexistente)", async () => {
      await expect(
        controller.eliminarItem("00000000-0000-0000-0000-000000000000", usuario()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("POST /orders/checkout-cart", () => {
    it("crea una orden por línea del carrito y las retira del carrito", async () => {
      const modelo = await modelos.crear({
        nombre: "Taladro Percutor",
        marca: "Bosch",
        categoria: "Taladros",
        tarifa_dia: 10_000,
      });
      await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
      const dtoAgregar = Object.assign(new AgregarItemCarritoDto(), {
        modelo_id: modelo.id,
        cantidad: 1,
        dias: 3,
      });
      await controller.agregarItem(dtoAgregar, usuario());

      const dtoCheckout = Object.assign(new CheckoutCartDto(), {
        direccion_entrega: "Calle 1",
        zona_id: "00000000-0000-0000-0000-000000000001",
      });
      const resultado = await controller.checkoutCart(dtoCheckout, usuario());

      expect(resultado.ordenes_creadas).toHaveLength(1);
      expect(resultado.fallos).toEqual([]);

      const carritoFinal = await controller.ver(usuario());
      expect(carritoFinal.items).toEqual([]);
    });
  });
});
