import { RutasHoyUseCase } from "./rutas-hoy.use-case";
import { InMemoryRouteRepository } from "../infrastructure/in-memory/in-memory-route.repository";
import { InMemoryShipmentRepository } from "../infrastructure/in-memory/in-memory-shipment.repository";
import { InMemoryVehicleRepository } from "../../fleet/infrastructure/in-memory/in-memory-vehicle.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryUserRepository } from "../../users/infrastructure/in-memory/in-memory-user.repository";

const HOY = new Date("2026-09-02T00:00:00.000Z");

describe("RutasHoyUseCase", () => {
  async function armarEscenario() {
    const rutas = new InMemoryRouteRepository();
    const shipments = new InMemoryShipmentRepository();
    const vehiculos = new InMemoryVehicleRepository();
    const ordenes = new InMemoryOrderRepository();
    const unidades = new InMemoryToolUnitRepository();
    const modelos = new InMemoryToolModelRepository();
    const usuarios = new InMemoryUserRepository();
    const useCase = new RutasHoyUseCase(
      rutas,
      vehiculos,
      shipments,
      ordenes,
      unidades,
      modelos,
      usuarios,
    );

    const vehiculo = await vehiculos.crear({
      tipo: "moto",
      capacidad_kg: 50,
      capacidad_m3: 0.5,
      repartidor_id: "repartidor-1",
    });
    vehiculo.placa = "ABC-123";

    usuarios.sembrar({
      id: "repartidor-1",
      nombre: "Carlos Repartidor",
      email: "carlos@toolboxjl.test",
      telefono: null,
      rol: "repartidor",
    });
    usuarios.sembrar({
      id: "cliente-1",
      nombre: "Ana Cliente",
      email: "ana@toolboxjl.test",
      telefono: null,
      rol: "cliente",
    });

    const modelo = await modelos.crear({
      nombre: "Taladro Percutor XR-500",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 45000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });

    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-09-02",
      fechaFin: "2026-09-05",
      returnMode: "recogida_domicilio",
      direccionEntrega: "Calle 123 #45-67",
      zonaId: "zona-1",
      items: [{ unidadId: unidad.id, tarifaAplicada: 45000 }],
    });

    const shipment1 = await shipments.crear({
      orderId: orden.id,
      tipo: "entrega",
      estadoEnvio: "entregado",
      vehiculoId: vehiculo.id,
    });
    const shipment2 = await shipments.crear({
      orderId: orden.id,
      tipo: "entrega",
      estadoEnvio: "en_ruta_entrega",
      vehiculoId: vehiculo.id,
    });

    await rutas.crear({
      vehiculoId: vehiculo.id,
      fecha: "2026-09-02",
      paradas: [shipment1.id, shipment2.id],
      generadaPor: "manual",
    });

    return { useCase, vehiculo, orden, shipment1, shipment2, modelo, unidad };
  }

  it("agrupa las rutas de hoy por repartidor, con nombre/vehículo/placa", async () => {
    const { useCase, vehiculo } = await armarEscenario();

    const resultado = await useCase.ejecutar(HOY);

    expect(resultado.repartidores).toHaveLength(1);
    const [rep] = resultado.repartidores;
    expect(rep.repartidor_id).toBe("repartidor-1");
    expect(rep.nombre).toBe("Carlos Repartidor");
    expect(rep.vehiculo_id).toBe(vehiculo.id);
    expect(rep.placa).toBe("ABC-123");
  });

  it("calcula total_paradas/paradas_completadas/porcentaje_avance/estado_ruta", async () => {
    const { useCase } = await armarEscenario();

    const resultado = await useCase.ejecutar(HOY);
    const [rep] = resultado.repartidores;

    expect(rep.total_paradas).toBe(2);
    expect(rep.paradas_completadas).toBe(1); // solo shipment1 está "entregado"
    expect(rep.porcentaje_avance).toBe(50);
    expect(rep.estado_ruta).toBe("En Progreso");
  });

  it('expande cada parada con cliente, dirección, herramientas y hora estimada', async () => {
    const { useCase, orden, shipment1, shipment2, modelo, unidad } = await armarEscenario();

    const resultado = await useCase.ejecutar(HOY);
    const [rep] = resultado.repartidores;

    expect(rep.paradas).toHaveLength(2);
    const [parada1, parada2] = rep.paradas;

    expect(parada1.shipment_id).toBe(shipment1.id);
    expect(parada1.order_id).toBe(orden.id);
    expect(parada1.direccion).toBe("Calle 123 #45-67");
    expect(parada1.cliente_nombre).toBe("Ana Cliente");
    expect(parada1.herramientas).toEqual([
      { modelo_nombre: modelo.nombre, numero_serie: unidad.numero_serie },
    ]);
    expect(parada1.hora_estimada_llegada).toBe("08:00");
    expect(parada2.hora_estimada_llegada).toBe("08:45");
  });

  it('estado_ruta es "Pendiente" cuando ninguna parada está completada', async () => {
    const rutas = new InMemoryRouteRepository();
    const shipmentsRepo = new InMemoryShipmentRepository();
    const vehiculos = new InMemoryVehicleRepository();
    const ordenes = new InMemoryOrderRepository();
    const unidades = new InMemoryToolUnitRepository();
    const modelos = new InMemoryToolModelRepository();
    const usuarios = new InMemoryUserRepository();
    const nuevoUseCase = new RutasHoyUseCase(
      rutas,
      vehiculos,
      shipmentsRepo,
      ordenes,
      unidades,
      modelos,
      usuarios,
    );

    const vehiculo = await vehiculos.crear({
      tipo: "moto",
      capacidad_kg: 50,
      capacidad_m3: 0.5,
      repartidor_id: "repartidor-2",
    });
    usuarios.sembrar({
      id: "repartidor-2",
      nombre: "Luis Repartidor",
      email: "luis@toolboxjl.test",
      telefono: null,
      rol: "repartidor",
    });
    const orden = await ordenes.crear({
      clienteId: "cliente-2",
      tipo: "alquiler",
      fechaInicio: "2026-09-02",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle X",
      zonaId: "zona-1",
      items: [],
    });
    const shipment = await shipmentsRepo.crear({
      orderId: orden.id,
      tipo: "entrega",
      estadoEnvio: "pendiente_asignacion",
      vehiculoId: vehiculo.id,
    });
    await rutas.crear({
      vehiculoId: vehiculo.id,
      fecha: "2026-09-02",
      paradas: [shipment.id],
      generadaPor: "manual",
    });

    const resultado = await nuevoUseCase.ejecutar(HOY);
    expect(resultado.repartidores[0].estado_ruta).toBe("Pendiente");
  });

  it("omite las rutas cuyo vehículo no tiene repartidor asignado", async () => {
    const rutas = new InMemoryRouteRepository();
    const shipments = new InMemoryShipmentRepository();
    const vehiculos = new InMemoryVehicleRepository();
    const ordenes = new InMemoryOrderRepository();
    const unidades = new InMemoryToolUnitRepository();
    const modelos = new InMemoryToolModelRepository();
    const usuarios = new InMemoryUserRepository();
    const useCase = new RutasHoyUseCase(
      rutas,
      vehiculos,
      shipments,
      ordenes,
      unidades,
      modelos,
      usuarios,
    );

    const vehiculoSinRepartidor = await vehiculos.crear({
      tipo: "camioneta",
      capacidad_kg: 500,
      capacidad_m3: 3,
    });
    await rutas.crear({
      vehiculoId: vehiculoSinRepartidor.id,
      fecha: "2026-09-02",
      paradas: [],
      generadaPor: "manual",
    });

    const resultado = await useCase.ejecutar(HOY);

    expect(resultado.repartidores).toHaveLength(0);
  });
});
