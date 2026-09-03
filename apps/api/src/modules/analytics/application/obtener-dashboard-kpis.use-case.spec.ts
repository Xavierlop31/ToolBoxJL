import { randomUUID } from "node:crypto";
import { InMemoryRevenueRepository } from "../infrastructure/in-memory/in-memory-revenue.repository";
import { InMemoryRoiRepository } from "../infrastructure/in-memory/in-memory-roi.repository";
import { InMemoryUtilizationRepository } from "../infrastructure/in-memory/in-memory-utilization.repository";
import { ConsultarUtilizacionUseCase } from "./consultar-utilizacion.use-case";
import { InMemoryToolUnitStatusLogRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit-status-log.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import type { NuevaOrdenInput } from "../../orders/domain/order.repository";
import { InMemoryUserRepository } from "../../users/infrastructure/in-memory/in-memory-user.repository";
import { ObtenerDashboardKpisUseCase } from "./obtener-dashboard-kpis.use-case";

// agosto/2026 -> mes de 31 días, sin ambigüedad de rollover para las
// aserciones de ingresos/ROI/utilización (mismo AHORA que
// consultar-utilizacion.use-case.spec.ts).
const AHORA = new Date("2026-08-17T12:00:00.000Z");

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/** `YYYY-MM-DD` de "hoy - dias días" (reloj REAL) — ver nota de cabecera del describe de alertas sobre por qué. */
function fechaIsoHaceDias(dias: number): string {
  return new Date(Date.now() - dias * MS_POR_DIA).toISOString().slice(0, 10);
}

function ordenInput(overrides: Partial<NuevaOrdenInput> = {}): NuevaOrdenInput {
  return {
    clienteId: randomUUID(),
    tipo: "alquiler",
    fechaInicio: "2026-08-01",
    fechaFin: "2026-08-01",
    returnMode: "en_sede",
    direccionEntrega: "Calle 1 # 2-3",
    zonaId: randomUUID(),
    items: [{ unidadId: randomUUID(), tarifaAplicada: 10_000 }],
    ...overrides,
  };
}

describe("ObtenerDashboardKpisUseCase", () => {
  let revenue: InMemoryRevenueRepository;
  let roi: InMemoryRoiRepository;
  let utilizationRepo: InMemoryUtilizationRepository;
  let consultarUtilizacion: ConsultarUtilizacionUseCase;
  let statusLog: InMemoryToolUnitStatusLogRepository;
  let toolUnits: InMemoryToolUnitRepository;
  let toolModels: InMemoryToolModelRepository;
  let orders: InMemoryOrderRepository;
  let users: InMemoryUserRepository;
  let useCase: ObtenerDashboardKpisUseCase;

  beforeEach(() => {
    revenue = new InMemoryRevenueRepository();
    roi = new InMemoryRoiRepository();
    utilizationRepo = new InMemoryUtilizationRepository();
    consultarUtilizacion = new ConsultarUtilizacionUseCase(utilizationRepo);
    statusLog = new InMemoryToolUnitStatusLogRepository();
    toolUnits = new InMemoryToolUnitRepository();
    toolModels = new InMemoryToolModelRepository();
    orders = new InMemoryOrderRepository();
    users = new InMemoryUserRepository();
    useCase = new ObtenerDashboardKpisUseCase(
      revenue,
      roi,
      consultarUtilizacion,
      statusLog,
      toolUnits,
      toolModels,
      orders,
      users,
    );
  });

  describe("ingresos_totales_mes / variacion_ingresos_pct / moras_recaudadas_mes", () => {
    it("suma ventas + tarifas de alquiler + cobros de mora del mes actual y calcula variación positiva vs. el mes anterior", async () => {
      revenue.registrarPago({
        tipo: "pago_alquiler",
        estado: "capturado",
        monto: 200_000,
        createdAt: new Date("2026-08-05T00:00:00.000Z"),
      });
      revenue.registrarPago({
        tipo: "pago_venta",
        estado: "capturado",
        monto: 100_000,
        createdAt: new Date("2026-08-10T00:00:00.000Z"),
      });
      revenue.registrarPago({
        tipo: "cobro_mora",
        estado: "capturado",
        monto: 50_000,
        createdAt: new Date("2026-08-12T00:00:00.000Z"),
      });
      // Mes anterior (julio): 100.000 -> variación = (350000-100000)/100000*100 = 250%.
      revenue.registrarPago({
        tipo: "pago_alquiler",
        estado: "capturado",
        monto: 100_000,
        createdAt: new Date("2026-07-05T00:00:00.000Z"),
      });

      const resultado = await useCase.ejecutar(AHORA);

      expect(resultado.ingresos_totales_mes).toBe(350_000);
      expect(resultado.moras_recaudadas_mes).toBe(50_000);
      expect(resultado.variacion_ingresos_pct).toBe(250);
    });

    it("calcula una variación negativa cuando el mes actual ingresó menos que el anterior", async () => {
      revenue.registrarPago({
        tipo: "pago_alquiler",
        estado: "capturado",
        monto: 50_000,
        createdAt: new Date("2026-08-05T00:00:00.000Z"),
      });
      revenue.registrarPago({
        tipo: "pago_alquiler",
        estado: "capturado",
        monto: 200_000,
        createdAt: new Date("2026-07-05T00:00:00.000Z"),
      });

      const resultado = await useCase.ejecutar(AHORA);

      expect(resultado.variacion_ingresos_pct).toBe(-75);
    });

    it("devuelve 0 (no Infinity/NaN) cuando el mes anterior no tuvo ingresos", async () => {
      revenue.registrarPago({
        tipo: "pago_alquiler",
        estado: "capturado",
        monto: 50_000,
        createdAt: new Date("2026-08-05T00:00:00.000Z"),
      });

      const resultado = await useCase.ejecutar(AHORA);

      expect(resultado.variacion_ingresos_pct).toBe(0);
    });

    it("devuelve 0 en todos los campos de ingresos cuando no hay pagos sembrados", async () => {
      const resultado = await useCase.ejecutar(AHORA);

      expect(resultado.ingresos_totales_mes).toBe(0);
      expect(resultado.moras_recaudadas_mes).toBe(0);
      expect(resultado.variacion_ingresos_pct).toBe(0);
    });
  });

  describe("ocupacion_global_pct", () => {
    it("toma utilizacion_global_pct de ConsultarUtilizacionUseCase tal cual", async () => {
      const modeloId = randomUUID();
      utilizationRepo.sembrarUnidad({
        modeloId,
        estado: "Operativo",
        fechaIngreso: new Date("2026-01-01T00:00:00.000Z"),
      });
      utilizationRepo.sembrarAlquiler({
        modeloId,
        fechaInicio: new Date("2026-08-01T00:00:00.000Z"),
        fechaFin: new Date("2026-08-11T00:00:00.000Z"),
      });

      const resultado = await useCase.ejecutar(AHORA);

      expect(resultado.ocupacion_global_pct).toBe(Math.round((10 / 31) * 10000) / 100);
    });

    it("devuelve 0% cuando no hay ninguna unidad sembrada", async () => {
      const resultado = await useCase.ejecutar(AHORA);

      expect(resultado.ocupacion_global_pct).toBe(0);
    });
  });

  describe("roi_promedio_pct", () => {
    it("promedia el roi_pct (misma fórmula que ConsultarRoiUseCase) de los modelos con costo_compra válido", async () => {
      roi.sembrar({ modeloId: randomUUID(), costoCompra: 1_000_000, ingresosAcumulados: 1_500_000 }); // 50%
      roi.sembrar({ modeloId: randomUUID(), costoCompra: 1_000_000, ingresosAcumulados: 700_000 }); // -30%

      const resultado = await useCase.ejecutar(AHORA);

      expect(resultado.roi_promedio_pct).toBe(10);
    });

    it("excluye modelos sin costo_compra cargado (GAP documentado, mismo criterio que ConsultarRoiUseCase)", async () => {
      roi.sembrar({ modeloId: randomUUID(), costoCompra: null, ingresosAcumulados: 500_000 });
      roi.sembrar({ modeloId: randomUUID(), costoCompra: 0, ingresosAcumulados: 500_000 });
      roi.sembrar({ modeloId: randomUUID(), costoCompra: 1_000_000, ingresosAcumulados: 1_200_000 }); // 20%

      const resultado = await useCase.ejecutar(AHORA);

      expect(resultado.roi_promedio_pct).toBe(20);
    });

    it("devuelve 0 cuando ningún modelo tiene costo_compra cargado", async () => {
      roi.sembrar({ modeloId: randomUUID(), costoCompra: null, ingresosAcumulados: 500_000 });

      const resultado = await useCase.ejecutar(AHORA);

      expect(resultado.roi_promedio_pct).toBe(0);
    });
  });

  /**
   * `InMemoryToolUnitStatusLogRepository.crear` sella `created_at` con el
   * reloj REAL (`new Date().toISOString()`, no controlable — ver su propio
   * spec) así que estos tests, a diferencia de los de arriba, ejecutan el
   * caso de uso con `new Date()` (el "ahora" real) en vez del `AHORA` fijo
   * de agosto/2026 — mismo criterio que
   * `in-memory-tool-unit-status-log.repository.spec.ts`.
   */
  describe("alertas_criticas — mantenimiento_recurrente", () => {
    it("no genera alerta si ninguna unidad supera 3 transiciones a 'En Mantenimiento' en el mes", async () => {
      const modelo = await toolModels.crear({
        nombre: "Taladro Percutor",
        marca: "Bosch",
        categoria: "Taladros",
        tarifa_dia: 40_000,
      });
      const unidad = await toolUnits.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
      for (let i = 0; i < 3; i++) {
        await statusLog.crear({
          unidadId: unidad.id,
          estadoAnterior: "Operativo",
          estadoNuevo: "En Mantenimiento",
          fotosUrls: [],
          autorId: "autor-1",
        });
      }

      const resultado = await useCase.ejecutar(new Date());

      expect(resultado.alertas_criticas.filter((a) => a.tipo === "mantenimiento_recurrente")).toEqual([]);
    });

    it("genera UNA alerta 'alta' para una unidad con más de 3 transiciones en el mes", async () => {
      const modelo = await toolModels.crear({
        nombre: "Rotomartillo RH-40",
        marca: "Bosch",
        categoria: "Rotomartillos",
        tarifa_dia: 45_000,
      });
      const unidad = await toolUnits.crear({ modeloId: modelo.id, numeroSerie: "SN-REC-42" });
      for (let i = 0; i < 4; i++) {
        await statusLog.crear({
          unidadId: unidad.id,
          estadoAnterior: "Operativo",
          estadoNuevo: "En Mantenimiento",
          fotosUrls: [],
          autorId: "autor-1",
        });
      }

      const resultado = await useCase.ejecutar(new Date());

      const alertas = resultado.alertas_criticas.filter((a) => a.tipo === "mantenimiento_recurrente");
      expect(alertas).toHaveLength(1);
      expect(alertas[0]).toMatchObject({
        tipo: "mantenimiento_recurrente",
        severidad: "alta",
        referencia_id: unidad.id,
        accion_sugerida: "Revisar Ficha / Dar de Baja",
      });
      expect(alertas[0].titulo).toContain("SN-REC-42");
      expect(alertas[0].descripcion).toContain("Rotomartillo RH-40");
    });

    it("genera VARIAS alertas si hay varias unidades con más de 3 transiciones", async () => {
      const modelo = await toolModels.crear({
        nombre: "Compresor CA-50",
        marca: "DeWalt",
        categoria: "Compresores",
        tarifa_dia: 30_000,
      });
      const unidadA = await toolUnits.crear({ modeloId: modelo.id, numeroSerie: "SN-A" });
      const unidadB = await toolUnits.crear({ modeloId: modelo.id, numeroSerie: "SN-B" });
      for (const unidad of [unidadA, unidadB]) {
        for (let i = 0; i < 4; i++) {
          await statusLog.crear({
            unidadId: unidad.id,
            estadoAnterior: "Operativo",
            estadoNuevo: "En Mantenimiento",
            fotosUrls: [],
            autorId: "autor-1",
          });
        }
      }

      const resultado = await useCase.ejecutar(new Date());

      const alertas = resultado.alertas_criticas.filter((a) => a.tipo === "mantenimiento_recurrente");
      expect(alertas).toHaveLength(2);
      expect(alertas.map((a) => a.referencia_id).sort()).toEqual([unidadA.id, unidadB.id].sort());
    });
  });

  describe("alertas_criticas — mora_cliente", () => {
    it("no genera alerta para una orden con 3 días de atraso (por debajo del umbral de 5)", async () => {
      const orden = await orders.crear(ordenInput({ fechaFin: fechaIsoHaceDias(3) }));
      await orders.actualizarEstado(orden.id, "confirmada");

      const resultado = await useCase.ejecutar(new Date());

      expect(resultado.alertas_criticas.filter((a) => a.tipo === "mora_cliente")).toEqual([]);
    });

    it("genera UNA alerta 'media' para una orden con más de 5 días y hasta 15 días de atraso", async () => {
      const clienteId = randomUUID();
      users.sembrar({ id: clienteId, nombre: "Juan Pérez", email: "juan@example.com", telefono: null, rol: "cliente" });
      const orden = await orders.crear(ordenInput({ clienteId, fechaFin: fechaIsoHaceDias(9) }));
      await orders.actualizarEstado(orden.id, "confirmada");

      const resultado = await useCase.ejecutar(new Date());

      const alertas = resultado.alertas_criticas.filter((a) => a.tipo === "mora_cliente");
      expect(alertas).toHaveLength(1);
      expect(alertas[0]).toMatchObject({
        tipo: "mora_cliente",
        severidad: "media",
        referencia_id: orden.id,
        accion_sugerida: "Ver Contrato / Contactar",
      });
      expect(alertas[0].titulo).toContain("Juan Pérez");
    });

    it("genera UNA alerta 'alta' para una orden con más de 15 días de atraso", async () => {
      const clienteId = randomUUID();
      users.sembrar({ id: clienteId, nombre: "Ana Gómez", email: "ana@example.com", telefono: null, rol: "cliente" });
      const orden = await orders.crear(ordenInput({ clienteId, fechaFin: fechaIsoHaceDias(19) }));
      await orders.actualizarEstado(orden.id, "en_curso");

      const resultado = await useCase.ejecutar(new Date());

      const alertas = resultado.alertas_criticas.filter((a) => a.tipo === "mora_cliente");
      expect(alertas).toHaveLength(1);
      expect(alertas[0].severidad).toBe("alta");
    });

    it("genera VARIAS alertas si hay varias órdenes en mora", async () => {
      const ordenA = await orders.crear(ordenInput({ fechaFin: fechaIsoHaceDias(9) }));
      await orders.actualizarEstado(ordenA.id, "confirmada");
      const ordenB = await orders.crear(ordenInput({ fechaFin: fechaIsoHaceDias(8) }));
      await orders.actualizarEstado(ordenB.id, "en_curso");

      const resultado = await useCase.ejecutar(new Date());

      const alertas = resultado.alertas_criticas.filter((a) => a.tipo === "mora_cliente");
      expect(alertas).toHaveLength(2);
      expect(alertas.map((a) => a.referencia_id).sort()).toEqual([ordenA.id, ordenB.id].sort());
    });

    it("usa un nombre de cliente genérico si USER_REPOSITORY no tiene el registro (dato inconsistente, no debería reventar el endpoint)", async () => {
      const orden = await orders.crear(ordenInput({ fechaFin: fechaIsoHaceDias(9) }));
      await orders.actualizarEstado(orden.id, "confirmada");

      const resultado = await useCase.ejecutar(new Date());

      const alertas = resultado.alertas_criticas.filter((a) => a.tipo === "mora_cliente");
      expect(alertas).toHaveLength(1);
      expect(alertas[0].titulo).toContain("cliente desconocido");
    });
  });

  describe("orden del array alertas_criticas", () => {
    it("lista primero mantenimiento_recurrente y luego mora_cliente (orden fijo del contrato)", async () => {
      const modelo = await toolModels.crear({
        nombre: "Sierra Circular",
        marca: "Makita",
        categoria: "Sierras",
        tarifa_dia: 25_000,
      });
      const unidad = await toolUnits.crear({ modeloId: modelo.id, numeroSerie: "SN-ORDEN" });
      for (let i = 0; i < 4; i++) {
        await statusLog.crear({
          unidadId: unidad.id,
          estadoAnterior: "Operativo",
          estadoNuevo: "En Mantenimiento",
          fotosUrls: [],
          autorId: "autor-1",
        });
      }
      const orden = await orders.crear(ordenInput({ fechaFin: fechaIsoHaceDias(9) }));
      await orders.actualizarEstado(orden.id, "confirmada");

      const resultado = await useCase.ejecutar(new Date());

      expect(resultado.alertas_criticas.map((a) => a.tipo)).toEqual([
        "mantenimiento_recurrente",
        "mora_cliente",
      ]);
    });
  });
});
