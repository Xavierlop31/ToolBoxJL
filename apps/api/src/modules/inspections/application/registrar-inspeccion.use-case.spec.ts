import { randomUUID } from "node:crypto";
import { InMemoryInspectionChecklistRepository } from "../infrastructure/in-memory/in-memory-inspection-checklist.repository";
import { InMemoryShipmentRepository } from "../../logistics/infrastructure/in-memory/in-memory-shipment.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { InMemoryPaymentRepository } from "../../payments/infrastructure/in-memory/in-memory-payment.repository";
import { InMemoryWompiGateway } from "../../payments/infrastructure/wompi/in-memory-wompi-gateway";
import { ShipmentNoEncontradoError } from "../../logistics/domain/errors/shipment-no-encontrado.error";
import { UnidadNoEncontradaError } from "../../catalog-inventory/domain/errors/unidad-no-encontrada.error";
import { RegistrarInspeccionUseCase } from "./registrar-inspeccion.use-case";

describe("RegistrarInspeccionUseCase", () => {
  let checklists: InMemoryInspectionChecklistRepository;
  let shipments: InMemoryShipmentRepository;
  let unidades: InMemoryToolUnitRepository;
  let modelos: InMemoryToolModelRepository;
  let ordenes: InMemoryOrderRepository;
  let pagos: InMemoryPaymentRepository;
  let wompi: InMemoryWompiGateway;
  let useCase: RegistrarInspeccionUseCase;

  beforeEach(() => {
    checklists = new InMemoryInspectionChecklistRepository();
    shipments = new InMemoryShipmentRepository();
    unidades = new InMemoryToolUnitRepository();
    modelos = new InMemoryToolModelRepository();
    ordenes = new InMemoryOrderRepository();
    pagos = new InMemoryPaymentRepository();
    wompi = new InMemoryWompiGateway();
    useCase = new RegistrarInspeccionUseCase(checklists, shipments, unidades, ordenes, pagos, wompi);
  });

  async function sembrarOrdenConShipment(tipoShipment: "entrega" | "recogida" = "recogida") {
    const modelo = await modelos.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-08-10",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });
    const shipment = await shipments.crear({
      orderId: orden.id,
      tipo: tipoShipment,
      estadoEnvio: "en_ruta_recogida",
      vehiculoId: "vehiculo-1",
    });
    return { orden, unidad, shipment };
  }

  it("registra un checklist de salida sin cerrar el ciclo de la orden ni ejecutar garantía", async () => {
    const { unidad, shipment } = await sembrarOrdenConShipment("entrega");

    const checklist = await useCase.ejecutar({
      unidad_id: unidad.id,
      shipment_id: shipment.id,
      tipo: "salida",
      hallazgos: [],
    });

    expect(checklist.garantia_ejecutada).toBe(false);
    const shipmentActualizado = await shipments.buscarPorId(shipment.id);
    expect(shipmentActualizado?.estado_envio).toBe("en_ruta_recogida");
  });

  it("un checklist de recepción sin hallazgos moderados/graves cierra el ciclo sin ejecutar garantía", async () => {
    const { orden, unidad, shipment } = await sembrarOrdenConShipment("recogida");

    const checklist = await useCase.ejecutar({
      unidad_id: unidad.id,
      shipment_id: shipment.id,
      tipo: "recepcion",
      hallazgos: [{ descripcion: "Rasguño leve", severidad: "leve" }],
    });

    expect(checklist.garantia_ejecutada).toBe(false);
    const shipmentActualizado = await shipments.buscarPorId(shipment.id);
    expect(shipmentActualizado?.estado_envio).toBe("retornado");
    const ordenActualizada = await ordenes.buscarPorId(orden.id);
    expect(ordenActualizada?.estado).toBe("devuelta");
  });

  it("un hallazgo moderado/grave en recepción ejecuta la garantía: captura los depósitos en hold", async () => {
    const { orden, unidad, shipment } = await sembrarOrdenConShipment("recogida");
    const pagoHold = await pagos.crear({
      orderId: orden.id,
      tipo: "deposito_garantia",
      metodo: "tarjeta",
      estado: "hold",
      monto: 20_000,
      wompiTransactionId: "wompi-fake-1",
    });

    const capturarHoldSpy = jest.spyOn(wompi, "capturarHold");

    const checklist = await useCase.ejecutar({
      unidad_id: unidad.id,
      shipment_id: shipment.id,
      tipo: "recepcion",
      hallazgos: [{ descripcion: "Motor dañado", severidad: "grave" }],
    });

    expect(checklist.garantia_ejecutada).toBe(true);
    expect(capturarHoldSpy).toHaveBeenCalledWith("wompi-fake-1");
    const pagoActualizado = await pagos.buscarPorId(pagoHold.id);
    expect(pagoActualizado?.estado).toBe("capturado");
  });

  it("no toca depósitos ya capturados o pendientes al ejecutar la garantía", async () => {
    const { orden, unidad, shipment } = await sembrarOrdenConShipment("recogida");
    const pagoCapturado = await pagos.crear({
      orderId: orden.id,
      tipo: "deposito_garantia",
      metodo: "pse",
      estado: "capturado",
      monto: 20_000,
      wompiTransactionId: "wompi-fake-2",
    });
    const capturarHoldSpy = jest.spyOn(wompi, "capturarHold");

    await useCase.ejecutar({
      unidad_id: unidad.id,
      shipment_id: shipment.id,
      tipo: "recepcion",
      hallazgos: [{ descripcion: "Rayón", severidad: "moderada" }],
    });

    expect(capturarHoldSpy).not.toHaveBeenCalled();
    const pagoTrasInspeccion = await pagos.buscarPorId(pagoCapturado.id);
    expect(pagoTrasInspeccion?.estado).toBe("capturado");
  });

  it("usa hallazgos: [] y fotos_urls: [] por default cuando no se proveen", async () => {
    const { unidad, shipment } = await sembrarOrdenConShipment("entrega");

    const checklist = await useCase.ejecutar({
      unidad_id: unidad.id,
      shipment_id: shipment.id,
      tipo: "salida",
    });

    expect(checklist.hallazgos).toEqual([]);
    expect(checklist.fotos_urls).toEqual([]);
  });

  it("lanza ShipmentNoEncontradoError si el shipment no existe", async () => {
    await expect(
      useCase.ejecutar({ unidad_id: randomUUID(), shipment_id: randomUUID(), tipo: "salida" }),
    ).rejects.toThrow(ShipmentNoEncontradoError);
  });

  it("lanza UnidadNoEncontradaError si la unidad no existe", async () => {
    const { shipment } = await sembrarOrdenConShipment("entrega");

    await expect(
      useCase.ejecutar({ unidad_id: randomUUID(), shipment_id: shipment.id, tipo: "salida" }),
    ).rejects.toThrow(UnidadNoEncontradaError);
  });
});
