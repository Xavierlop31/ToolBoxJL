import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { InMemoryCartRepository } from "../infrastructure/in-memory/in-memory-cart.repository";
import { AgregarItemCarritoUseCase } from "./agregar-item-carrito.use-case";

describe("AgregarItemCarritoUseCase", () => {
  let modelos: InMemoryToolModelRepository;
  let carritos: InMemoryCartRepository;
  let useCase: AgregarItemCarritoUseCase;

  beforeEach(() => {
    modelos = new InMemoryToolModelRepository();
    carritos = new InMemoryCartRepository();
    useCase = new AgregarItemCarritoUseCase(carritos, modelos);
  });

  it("agrega un item nuevo al carrito vacío y devuelve el total recalculado server-side", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
      tarifa_semana: 60_000,
    });

    const carrito = await useCase.ejecutar("cliente-1", {
      modelo_id: modelo.id,
      cantidad: 2,
      dias: 3,
    });

    expect(carrito.items).toEqual([
      { id: expect.any(String), modelo_id: modelo.id, cantidad: 2, dias: 3 },
    ]);
    expect(carrito.total).toBe(2 * (3 * 10_000)); // 60_000
  });

  it("SUMA la cantidad en vez de duplicar la línea cuando el modelo ya está en el carrito", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra Circular",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
    });

    await useCase.ejecutar("cliente-1", { modelo_id: modelo.id, cantidad: 1, dias: 2 });
    const carrito = await useCase.ejecutar("cliente-1", { modelo_id: modelo.id, cantidad: 3, dias: 2 });

    expect(carrito.items).toHaveLength(1);
    expect(carrito.items[0]).toEqual({
      id: expect.any(String),
      modelo_id: modelo.id,
      cantidad: 4,
      dias: 2,
    });
  });

  it("conserva el `dias` anterior si el segundo pedido no lo informa", async () => {
    const modelo = await modelos.crear({
      nombre: "Rotomartillo",
      marca: "Makita",
      categoria: "Rotomartillos",
      tarifa_dia: 8_000,
    });

    await useCase.ejecutar("cliente-1", { modelo_id: modelo.id, cantidad: 1, dias: 5 });
    const carrito = await useCase.ejecutar("cliente-1", { modelo_id: modelo.id, cantidad: 1 });

    expect(carrito.items[0]).toEqual({ id: expect.any(String), modelo_id: modelo.id, cantidad: 2, dias: 5 });
  });

  it("preserva el `id` de la línea entre llamadas sucesivas (Sprint 13, HU-12.3 — necesario para PATCH/DELETE /cart/items/{id})", async () => {
    const modelo = await modelos.crear({
      nombre: "Router",
      marca: "Bosch",
      categoria: "Routers",
      tarifa_dia: 7_000,
    });

    const primero = await useCase.ejecutar("cliente-1", { modelo_id: modelo.id, cantidad: 1, dias: 1 });
    const segundo = await useCase.ejecutar("cliente-1", { modelo_id: modelo.id, cantidad: 1, dias: 1 });

    expect(segundo.items[0].id).toBe(primero.items[0].id);
  });

  it("no mezcla carritos de clientes distintos", async () => {
    const modelo = await modelos.crear({
      nombre: "Amoladora",
      marca: "Bosch",
      categoria: "Amoladoras",
      tarifa_dia: 6_000,
    });

    await useCase.ejecutar("cliente-1", { modelo_id: modelo.id, cantidad: 5 });
    const carritoCliente2 = await useCase.ejecutar("cliente-2", { modelo_id: modelo.id, cantidad: 1 });

    expect(carritoCliente2.items).toEqual([{ id: expect.any(String), modelo_id: modelo.id, cantidad: 1 }]);
  });

  it("lanza ModeloNoEncontradoError si modelo_id no existe en el catálogo", async () => {
    await expect(
      useCase.ejecutar("cliente-1", { modelo_id: "no-existe", cantidad: 1 }),
    ).rejects.toThrow(ModeloNoEncontradoError);
  });
});
