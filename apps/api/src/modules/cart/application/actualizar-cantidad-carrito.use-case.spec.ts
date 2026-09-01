import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryCartRepository } from "../infrastructure/in-memory/in-memory-cart.repository";
import { LineaCarritoNoEncontradaError } from "../domain/errors/linea-carrito-no-encontrada.error";
import { AgregarItemCarritoUseCase } from "./agregar-item-carrito.use-case";
import { ActualizarCantidadCarritoUseCase } from "./actualizar-cantidad-carrito.use-case";

describe("ActualizarCantidadCarritoUseCase", () => {
  let modelos: InMemoryToolModelRepository;
  let carritos: InMemoryCartRepository;
  let agregarItem: AgregarItemCarritoUseCase;
  let useCase: ActualizarCantidadCarritoUseCase;

  beforeEach(() => {
    modelos = new InMemoryToolModelRepository();
    carritos = new InMemoryCartRepository();
    agregarItem = new AgregarItemCarritoUseCase(carritos, modelos);
    useCase = new ActualizarCantidadCarritoUseCase(carritos, modelos);
  });

  it("cambia la cantidad de la línea identificada por su id y recalcula el total", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    const carritoInicial = await agregarItem.ejecutar("cliente-1", {
      modelo_id: modelo.id,
      cantidad: 1,
      dias: 3,
    });
    const itemId = carritoInicial.items[0].id!;

    const carrito = await useCase.ejecutar("cliente-1", itemId, 4);

    expect(carrito.items).toEqual([{ id: itemId, modelo_id: modelo.id, cantidad: 4, dias: 3 }]);
    expect(carrito.total).toBe(4 * (3 * 10_000));
  });

  it("no toca `dias` de la línea (PATCH solo cambia cantidad)", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra Circular",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
    });
    const carritoInicial = await agregarItem.ejecutar("cliente-1", {
      modelo_id: modelo.id,
      cantidad: 1,
      dias: 2,
    });
    const itemId = carritoInicial.items[0].id!;

    const carrito = await useCase.ejecutar("cliente-1", itemId, 2);

    expect(carrito.items[0].dias).toBe(2);
  });

  it("lanza LineaCarritoNoEncontradaError si el id no existe en el carrito del cliente", async () => {
    await expect(useCase.ejecutar("cliente-1", "no-existe", 3)).rejects.toThrow(
      LineaCarritoNoEncontradaError,
    );
  });

  it("lanza LineaCarritoNoEncontradaError si el id existe pero es de OTRO cliente (anti-enumeración)", async () => {
    const modelo = await modelos.crear({
      nombre: "Rotomartillo",
      marca: "Makita",
      categoria: "Rotomartillos",
      tarifa_dia: 8_000,
    });
    const carritoAjeno = await agregarItem.ejecutar("cliente-ajeno", { modelo_id: modelo.id, cantidad: 1 });
    const itemAjenoId = carritoAjeno.items[0].id!;

    await expect(useCase.ejecutar("cliente-1", itemAjenoId, 3)).rejects.toThrow(
      LineaCarritoNoEncontradaError,
    );
  });
});
