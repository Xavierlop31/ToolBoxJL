import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryCartRepository } from "../infrastructure/in-memory/in-memory-cart.repository";
import { AgregarItemCarritoUseCase } from "./agregar-item-carrito.use-case";
import { ObtenerCarritoUseCase } from "./obtener-carrito.use-case";

describe("ObtenerCarritoUseCase", () => {
  let modelos: InMemoryToolModelRepository;
  let carritos: InMemoryCartRepository;
  let obtenerCarrito: ObtenerCarritoUseCase;
  let agregarItem: AgregarItemCarritoUseCase;

  beforeEach(() => {
    modelos = new InMemoryToolModelRepository();
    carritos = new InMemoryCartRepository();
    obtenerCarrito = new ObtenerCarritoUseCase(carritos, modelos);
    agregarItem = new AgregarItemCarritoUseCase(carritos, modelos);
  });

  it("devuelve un carrito vacío (items: [], total: 0) para un cliente que nunca agregó nada", async () => {
    const carrito = await obtenerCarrito.ejecutar("cliente-nuevo");
    expect(carrito).toEqual({ items: [], total: 0 });
  });

  it("devuelve el carrito con el total recalculado server-side, no un total guardado", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    await agregarItem.ejecutar("cliente-1", { modelo_id: modelo.id, cantidad: 2, dias: 3 });

    const carrito = await obtenerCarrito.ejecutar("cliente-1");

    expect(carrito.items).toEqual([{ modelo_id: modelo.id, cantidad: 2, dias: 3 }]);
    expect(carrito.total).toBe(2 * (3 * 10_000));
  });
});
