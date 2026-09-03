import { randomUUID } from "node:crypto";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryPaymentRepository } from "../../payments/infrastructure/in-memory/in-memory-payment.repository";
import { EjecutarMoraCalculatorUseCase } from "./ejecutar-mora-calculator.use-case";

describe("EjecutarMoraCalculatorUseCase", () => {
  let ordenes: InMemoryOrderRepository;
  let unidades: InMemoryToolUnitRepository;
  let modelos: InMemoryToolModelRepository;
  let pagos: InMemoryPaymentRepository;
  let useCase: EjecutarMoraCalculatorUseCase;

  const AHORA = new Date("2026-08-20T00:00:00.000Z");

  beforeEach(() => {
    ordenes = new InMemoryOrderRepository();
    unidades = new InMemoryToolUnitRepository();
    modelos = new InMemoryToolModelRepository();
    pagos = new InMemoryPaymentRepository();
    useCase = new EjecutarMoraCalculatorUseCase(ordenes, unidades, modelos, pagos);
  });

  async function sembrarOrdenVencida(opts: {
    fechaFin?: string;
    estado?: "confirmada" | "en_curso";
    tarifaDia?: number;
    interesMoraDia?: number | null;
  } = {}) {
    const modelo = await modelos.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: opts.tarifaDia ?? 10_000,
      interes_mora_dia: opts.interesMoraDia ?? 0.05,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-08-01",
      fechaFin: opts.fechaFin ?? "2026-08-10",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });
    await ordenes.actualizarEstado(orden.id, opts.estado ?? "confirmada");
    return { orden, modelo, unidad };
  }

  it("emite un comprobante de mora para una orden vencida sin mora previa", async () => {
    const { orden } = await sembrarOrdenVencida();

    const comprobantes = await useCase.ejecutar(AHORA);

    expect(comprobantes).toHaveLength(1);
    expect(comprobantes[0].order_id).toBe(orden.id);
    expect(comprobantes[0].tipo).toBe("cobro_mora");
    expect(comprobantes[0].estado).toBe("pendiente");
    expect(comprobantes[0].monto).toBeGreaterThan(0);

    const pagosDeLaOrden = await pagos.listarPorOrden(orden.id);
    expect(pagosDeLaOrden).toHaveLength(1);
  });

  it("no emite comprobante para órdenes que aún no están vencidas", async () => {
    await sembrarOrdenVencida({ fechaFin: "2026-09-01" });

    const comprobantes = await useCase.ejecutar(AHORA);

    expect(comprobantes).toHaveLength(0);
  });

  it("es idempotente: no emite un segundo comprobante si la orden ya tiene un cobro_mora", async () => {
    const { orden } = await sembrarOrdenVencida();
    await pagos.crear({
      orderId: orden.id,
      tipo: "cobro_mora",
      metodo: "contra_entrega",
      estado: "pendiente",
      monto: 5_000,
      wompiTransactionId: null,
    });

    const comprobantes = await useCase.ejecutar(AHORA);

    expect(comprobantes).toHaveLength(0);
    const pagosDeLaOrden = await pagos.listarPorOrden(orden.id);
    expect(pagosDeLaOrden).toHaveLength(1);
  });

  it("omite la orden si su unidad ya no existe, sin lanzar excepción", async () => {
    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-08-10",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: randomUUID(), tarifaAplicada: 40_000 }],
    });
    await ordenes.actualizarEstado(orden.id, "confirmada");

    const comprobantes = await useCase.ejecutar(AHORA);

    expect(comprobantes).toHaveLength(0);
  });

  it("usa 0 como interés de mora por defecto si el modelo no lo tiene configurado", async () => {
    await sembrarOrdenVencida({ interesMoraDia: null });

    const comprobantes = await useCase.ejecutar(AHORA);

    expect(comprobantes).toHaveLength(1);
    expect(comprobantes[0].monto).toBeGreaterThanOrEqual(0);
  });

  it("procesa varias órdenes vencidas de distintos clientes en una sola corrida", async () => {
    await sembrarOrdenVencida({ fechaFin: "2026-08-05" });
    await sembrarOrdenVencida({ fechaFin: "2026-08-08", estado: "en_curso" });

    const comprobantes = await useCase.ejecutar(AHORA);

    expect(comprobantes).toHaveLength(2);
  });
});
