import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryCartRepository } from "../infrastructure/in-memory/in-memory-cart.repository";
import { LineaCarritoNoEncontradaError } from "../domain/errors/linea-carrito-no-encontrada.error";
import { AgregarItemCarritoUseCase } from "./agregar-item-carrito.use-case";
import { EliminarItemCarritoUseCase } from "./eliminar-item-carrito.use-case";

describe("EliminarItemCarritoUseCase", () => {
  let modelos: InMemoryToolModelRepository;
  let carritos: InMemoryCartRepository;
  let agregarItem: AgregarItemCarritoUseCase;
  let useCase: EliminarItemCarritoUseCase;

  beforeEach(() => {
    modelos = new InMemoryToolModelRepository();
    carritos = new InMemoryCartRepository();
    agregarItem = new AgregarItemCarritoUseCase(carritos, modelos);
    useCase = new EliminarItemCarritoUseCase(carritos, modelos);
  });

  it("elimina la línea identificada por su id y recalcula el total", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    const carritoInicial = await agregarItem.ejecutar("cliente-1", {
      modelo_id: modelo.id,
      cantidad: 2,
      dias: 3,
    });
    const itemId = carritoInicial.items[0].id!;

    const carrito = await useCase.ejecutar("cliente-1", itemId);

    expect(carrito.items).toEqual([]);
    expect(carrito.total).toBe(0);
  });

  it("elimina solo la línea indicada, dejando las demás intactas", async () => {
    const modeloA = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    const modeloB = await modelos.crear({
      nombre: "Sierra Circular",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
    });
    await agregarItem.ejecutar("cliente-1", { modelo_id: modeloA.id, cantidad: 1 });
    const carritoConDos = await agregarItem.ejecutar("cliente-1", { modelo_id: modeloB.id, cantidad: 1 });
    const idModeloB = carritoConDos.items.find((item) => item.modelo_id === modeloB.id)!.id!;

    const carrito = await useCase.ejecutar("cliente-1", idModeloB);

    expect(carrito.items).toHaveLength(1);
    expect(carrito.items[0].modelo_id).toBe(modeloA.id);
  });

  it("lanza LineaCarritoNoEncontradaError si el id no existe en el carrito del cliente", async () => {
    await expect(useCase.ejecutar("cliente-1", "no-existe")).rejects.toThrow(
      LineaCarritoNoEncontradaError,
    );
  });

  it("lanza LineaCarritoNoEncontradaError si el id existe pero es de OTRO cliente (anti-enumeración)", async () => {
    const modelo = await modelos.crear({
      nombre: "Amoladora",
      marca: "Bosch",
      categoria: "Amoladoras",
      tarifa_dia: 6_000,
    });
    const carritoAjeno = await agregarItem.ejecutar("cliente-ajeno", { modelo_id: modelo.id, cantidad: 1 });
    const itemAjenoId = carritoAjeno.items[0].id!;

    await expect(useCase.ejecutar("cliente-1", itemAjenoId)).rejects.toThrow(
      LineaCarritoNoEncontradaError,
    );
  });
});
