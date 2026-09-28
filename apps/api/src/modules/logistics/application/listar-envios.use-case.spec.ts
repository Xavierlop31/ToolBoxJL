import { ListarEnviosUseCase } from "./listar-envios.use-case";
import { InMemoryShipmentRepository } from "../infrastructure/in-memory/in-memory-shipment.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import type { NuevaOrdenInput } from "../../orders/domain/order.repository";
import { InMemoryUserRepository } from "../../users/infrastructure/in-memory/in-memory-user.repository";

function ordenInput(overrides: Partial<NuevaOrdenInput> = {}): NuevaOrdenInput {
  return {
    clienteId: "cliente-1",
    tipo: "alquiler",
    fechaInicio: "2026-09-01",
    fechaFin: "2026-09-05",
    returnMode: "en_sede",
    direccionEntrega: "Calle 10 # 20-30, Medellín",
    zonaId: "zona-1",
    items: [{ unidadId: "unidad-1", tarifaAplicada: 45_000 }],
    ...overrides,
  };
}

describe("ListarEnviosUseCase", () => {
  async function armarEscenario() {
    const shipments = new InMemoryShipmentRepository();
    const ordenes = new InMemoryOrderRepository();
    const usuarios = new InMemoryUserRepository();
    const useCase = new ListarEnviosUseCase(shipments, ordenes, usuarios);
    return { shipments, ordenes, usuarios, useCase };
  }

  it("BUG CORREGIDO: expande cada envío con numero_orden, cliente_nombre y direccion_entrega (antes solo se veía el GUID de la orden)", async () => {
    const { shipments, ordenes, usuarios, useCase } = await armarEscenario();

    usuarios.sembrar({
      id: "cliente-1",
      nombre: "Ana Gómez",
      email: "ana@toolboxjl.test",
      telefono: null,
      rol: "cliente",
      activo: true,
    });
    const orden = await ordenes.crear(ordenInput());
    const envio = await shipments.crear({
      orderId: orden.id,
      vehiculoId: null,
      tipo: "entrega",
      estadoEnvio: "pendiente_asignacion",
    });

    const resultado = await useCase.ejecutar();

    expect(resultado).toEqual([
      {
        id: envio.id,
        order_id: orden.id,
        vehiculo_id: null,
        tipo: "entrega",
        estado_envio: "pendiente_asignacion",
        numero_orden: orden.numero_orden,
        cliente_nombre: "Ana Gómez",
        direccion_entrega: "Calle 10 # 20-30, Medellín",
      },
    ]);
  });

  it("devuelve cadenas vacías (no revienta) si la orden o el cliente no resuelven — dato inconsistente, no debería pasar en este dominio", async () => {
    const { shipments, useCase } = await armarEscenario();

    const envio = await shipments.crear({
      orderId: "orden-inexistente",
      vehiculoId: null,
      tipo: "entrega",
      estadoEnvio: "pendiente_asignacion",
    });

    const resultado = await useCase.ejecutar();

    expect(resultado).toEqual([
      {
        id: envio.id,
        order_id: "orden-inexistente",
        vehiculo_id: null,
        tipo: "entrega",
        estado_envio: "pendiente_asignacion",
        numero_orden: "",
        cliente_nombre: "",
        direccion_entrega: "",
      },
    ]);
  });

  it("devuelve [] si no hay envíos", async () => {
    const { useCase } = await armarEscenario();

    expect(await useCase.ejecutar()).toEqual([]);
  });
});
