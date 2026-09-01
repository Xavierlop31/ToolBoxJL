import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { CotizarOrdenUseCase } from "../../orders/application/cotizar-orden.use-case";
import { CrearOrdenUseCase } from "../../orders/application/crear-orden.use-case";
import { InMemoryCartRepository } from "../infrastructure/in-memory/in-memory-cart.repository";
import { AgregarItemCarritoUseCase } from "./agregar-item-carrito.use-case";
import { CheckoutCartUseCase } from "./checkout-cart.use-case";
import { EliminarItemCarritoUseCase } from "./eliminar-item-carrito.use-case";

describe("CheckoutCartUseCase", () => {
  let modelos: InMemoryToolModelRepository;
  let unidades: InMemoryToolUnitRepository;
  let ordenes: InMemoryOrderRepository;
  let carritos: InMemoryCartRepository;
  let agregarItem: AgregarItemCarritoUseCase;
  let useCase: CheckoutCartUseCase;

  const checkoutInput = {
    direccion_entrega: "Calle 123",
    zona_id: "00000000-0000-0000-0000-000000000001",
  };

  beforeEach(() => {
    modelos = new InMemoryToolModelRepository();
    unidades = new InMemoryToolUnitRepository();
    ordenes = new InMemoryOrderRepository();
    carritos = new InMemoryCartRepository();
    agregarItem = new AgregarItemCarritoUseCase(carritos, modelos);

    const cotizarOrden = new CotizarOrdenUseCase(modelos);
    const crearOrden = new CrearOrdenUseCase(ordenes, modelos, unidades, cotizarOrden);
    const eliminarItemCarrito = new EliminarItemCarritoUseCase(carritos, modelos);
    useCase = new CheckoutCartUseCase(carritos, crearOrden, eliminarItemCarrito);
  });

  it("caso carrito vacío: devuelve ordenes_creadas y fallos vacíos, sin llamar a CrearOrdenUseCase", async () => {
    const resultado = await useCase.ejecutar("cliente-1", checkoutInput);

    expect(resultado).toEqual({ ordenes_creadas: [], fallos: [] });
  });

  it("caso todo-éxito: crea una orden por cada línea (alquiler y venta) y las retira del carrito", async () => {
    const modeloAlquiler = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    await unidades.crear({ modeloId: modeloAlquiler.id, numeroSerie: "SN-1" });

    const modeloVenta = await modelos.crear({
      nombre: "Sierra Circular",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
      costo_compra: 200_000,
    });
    await unidades.crear({ modeloId: modeloVenta.id, numeroSerie: "SN-2" });

    await agregarItem.ejecutar("cliente-1", { modelo_id: modeloAlquiler.id, cantidad: 1, dias: 3 });
    await agregarItem.ejecutar("cliente-1", { modelo_id: modeloVenta.id, cantidad: 1 });

    const resultado = await useCase.ejecutar("cliente-1", checkoutInput);

    expect(resultado.ordenes_creadas).toHaveLength(2);
    expect(resultado.ordenes_creadas.map((o) => o.tipo).sort()).toEqual(["alquiler", "venta"]);
    expect(resultado.fallos).toEqual([]);

    const carritoFinal = await carritos.obtenerOCrearPorClienteId("cliente-1");
    expect(carritoFinal.items).toEqual([]);
  });

  it("caso con 1 fallo entre varias líneas: la línea exitosa se retira del carrito, la fallida permanece", async () => {
    const modeloConUnidad = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    await unidades.crear({ modeloId: modeloConUnidad.id, numeroSerie: "SN-1" });

    const modeloSinUnidades = await modelos.crear({
      nombre: "Rotomartillo",
      marca: "Makita",
      categoria: "Rotomartillos",
      tarifa_dia: 8_000,
    });
    // Sin unidades creadas para este modelo -> SinUnidadesDisponiblesError.

    await agregarItem.ejecutar("cliente-1", { modelo_id: modeloConUnidad.id, cantidad: 1, dias: 2 });
    await agregarItem.ejecutar("cliente-1", { modelo_id: modeloSinUnidades.id, cantidad: 1, dias: 2 });

    const resultado = await useCase.ejecutar("cliente-1", checkoutInput);

    expect(resultado.ordenes_creadas).toHaveLength(1);
    expect(resultado.fallos).toEqual([
      { modelo_id: modeloSinUnidades.id, motivo: expect.any(String) },
    ]);

    const carritoFinal = await carritos.obtenerOCrearPorClienteId("cliente-1");
    expect(carritoFinal.items).toHaveLength(1);
    expect(carritoFinal.items[0].modelo_id).toBe(modeloSinUnidades.id);
  });

  it("caso con 1 fallo por ModeloNoEncontradoError: reporta el motivo y no interrumpe las demás líneas", async () => {
    const modeloValido = await modelos.crear({
      nombre: "Sierra Circular",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
      costo_compra: 200_000,
    });
    await unidades.crear({ modeloId: modeloValido.id, numeroSerie: "SN-1" });

    await agregarItem.ejecutar("cliente-1", { modelo_id: modeloValido.id, cantidad: 1 });
    // Modelo que existe al agregarlo al carrito pero se elimina del catálogo
    // antes del checkout (mismo caso hipotético documentado en
    // cart-pricing.service.ts) — se simula agregando directo al repo con un
    // modelo_id que nunca existió en el catálogo.
    const carritoActual = await carritos.obtenerOCrearPorClienteId("cliente-1");
    await carritos.guardarItems("cliente-1", [
      ...carritoActual.items,
      { id: "item-fantasma", modelo_id: "00000000-0000-0000-0000-000000000099", cantidad: 1, dias: null },
    ]);

    const resultado = await useCase.ejecutar("cliente-1", checkoutInput);

    expect(resultado.ordenes_creadas).toHaveLength(1);
    expect(resultado.fallos).toEqual([
      { modelo_id: "00000000-0000-0000-0000-000000000099", motivo: expect.any(String) },
    ]);
  });
});
