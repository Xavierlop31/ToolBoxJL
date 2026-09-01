import { ListarMisOrdenesUseCase } from "./listar-mis-ordenes.use-case";
import { InMemoryOrderRepository } from "../infrastructure/in-memory/in-memory-order.repository";
import type { NuevaOrdenInput } from "../domain/order.repository";

describe("ListarMisOrdenesUseCase", () => {
  const clienteId = "11111111-1111-1111-1111-111111111111";
  const otroClienteId = "22222222-2222-2222-2222-222222222222";

  function crearOrdenBase(
    repositorio: InMemoryOrderRepository,
    overrides: Partial<NuevaOrdenInput> = {},
  ) {
    const input: NuevaOrdenInput = {
      clienteId,
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: "33333333-3333-3333-3333-333333333333",
      items: [],
      ...overrides,
    };
    return repositorio.crear(input);
  }

  it("solo devuelve órdenes del cliente autenticado", async () => {
    const repositorio = new InMemoryOrderRepository();
    await crearOrdenBase(repositorio);
    await crearOrdenBase(repositorio, { clienteId: otroClienteId });

    const useCase = new ListarMisOrdenesUseCase(repositorio);
    const resultado = await useCase.ejecutar(clienteId, {});

    expect(resultado.total).toBe(1);
    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].cliente_id).toBe(clienteId);
  });

  it("pagina en bloques de 5 por defecto, más reciente primero", async () => {
    const repositorio = new InMemoryOrderRepository();
    const ids: string[] = [];
    for (let i = 0; i < 7; i++) {
      const orden = await crearOrdenBase(repositorio);
      ids.push(orden.id);
    }

    const useCase = new ListarMisOrdenesUseCase(repositorio);
    const pagina1 = await useCase.ejecutar(clienteId, {});
    const pagina2 = await useCase.ejecutar(clienteId, { page: 2 });

    expect(pagina1.pageSize).toBe(5);
    expect(pagina1.items).toHaveLength(5);
    expect(pagina1.total).toBe(7);
    expect(pagina1.items[0].id).toBe(ids[6]); // la más reciente

    expect(pagina2.items).toHaveLength(2);
  });

  it("filtra por estado", async () => {
    const repositorio = new InMemoryOrderRepository();
    const confirmada = await crearOrdenBase(repositorio);
    await repositorio.actualizarEstado(confirmada.id, "confirmada");
    await crearOrdenBase(repositorio);

    const useCase = new ListarMisOrdenesUseCase(repositorio);
    const resultado = await useCase.ejecutar(clienteId, { estado: "confirmada" });

    expect(resultado.total).toBe(1);
    expect(resultado.items[0].id).toBe(confirmada.id);
  });
});
