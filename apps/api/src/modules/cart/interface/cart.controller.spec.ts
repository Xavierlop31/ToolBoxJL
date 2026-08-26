import { BadRequestException } from "@nestjs/common";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryCartRepository } from "../infrastructure/in-memory/in-memory-cart.repository";
import { AgregarItemCarritoUseCase } from "../application/agregar-item-carrito.use-case";
import { ObtenerCarritoUseCase } from "../application/obtener-carrito.use-case";
import { CartController } from "./cart.controller";
import { AgregarItemCarritoDto } from "./dto/agregar-item-carrito.dto";

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return { id: "cliente-1", email: "cliente@example.com", rol: "cliente", ...overrides };
}

describe("CartController", () => {
  let modelos: InMemoryToolModelRepository;
  let carritos: InMemoryCartRepository;
  let controller: CartController;

  beforeEach(() => {
    modelos = new InMemoryToolModelRepository();
    carritos = new InMemoryCartRepository();
    controller = new CartController(
      new ObtenerCarritoUseCase(carritos, modelos),
      new AgregarItemCarritoUseCase(carritos, modelos),
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

      expect(carrito.items).toEqual([{ modelo_id: modelo.id, cantidad: 2 }]);
    });

    it("mapea ModeloNoEncontradoError a 400 BadRequest (openapi.yaml no declara 404 para este endpoint)", async () => {
      const dto = Object.assign(new AgregarItemCarritoDto(), {
        modelo_id: "00000000-0000-0000-0000-000000000000",
        cantidad: 1,
      });

      await expect(controller.agregarItem(dto, usuario())).rejects.toThrow(BadRequestException);
    });
  });
});
