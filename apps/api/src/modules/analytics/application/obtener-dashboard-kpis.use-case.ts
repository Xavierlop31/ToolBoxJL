import { Inject, Injectable } from "@nestjs/common";
import type { Order } from "@toolboxjl/shared-types";
import { mesActualUtc, mesAnteriorUtc } from "../domain/mes-actual";
import type { ModeloConIngresos, RoiRepository } from "../domain/roi.repository";
import type { RangoPeriodo, RevenueRepository } from "../domain/revenue.repository";
import { REVENUE_REPOSITORY, ROI_REPOSITORY } from "../infrastructure/analytics.tokens";
import { ConsultarUtilizacionUseCase } from "./consultar-utilizacion.use-case";

import { TOOL_MODEL_REPOSITORY, TOOL_UNIT_REPOSITORY, TOOL_UNIT_STATUS_LOG_REPOSITORY } from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import type { ToolUnitRepository } from "../../catalog-inventory/domain/tool-unit.repository";
import type { ToolUnitStatusLogRepository } from "../../catalog-inventory/domain/tool-unit-status-log.repository";

import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";

import { USER_REPOSITORY } from "../../users/infrastructure/users.tokens";
import type { UserRepository } from "../../users/domain/user.repository";

/** Un ítem del panel de "Alertas Críticas" — forma de `AlertaCritica` en openapi.yaml. */
export interface AlertaCriticaRespuesta {
  tipo: "mantenimiento_recurrente" | "mora_cliente";
  severidad: "alta" | "media" | "informativa";
  titulo: string;
  descripcion: string;
  referencia_id: string;
  accion_sugerida: "Revisar Ficha / Dar de Baja" | "Ver Contrato / Contactar";
}

/** Forma de la respuesta de `GET /analytics/dashboard-kpis` (openapi.yaml, `DashboardKpis`). */
export interface DashboardKpisRespuesta {
  ingresos_totales_mes: number;
  variacion_ingresos_pct: number;
  ocupacion_global_pct: number;
  moras_recaudadas_mes: number;
  roi_promedio_pct: number;
  alertas_criticas: AlertaCriticaRespuesta[];
}

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Cantidad de transiciones a "En Mantenimiento" en el mes, a partir de la
 * cual se dispara la alerta `mantenimiento_recurrente` (Gherkin
 * `15_dashboard_kpis_gerencial.feature`: "más de 3 ingresos a taller").
 */
const UMBRAL_TRANSICIONES_MANTENIMIENTO = 3;

/**
 * Días mínimos de atraso a partir de los cuales se dispara la alerta
 * `mora_cliente` (Gherkin: "más de 5 días de mora"). El filtro del
 * repositorio (`OrderRepository.listarConAtrasoMinimo`) es
 * `ahora - fecha_fin >= diasMinimos` (delta de tiempo crudo, no el
 * `diasRetraso` redondeado hacia arriba de `calcularMora`); en la práctica
 * ambos coinciden salvo en el borde teórico de una orden vencida hace
 * EXACTAMENTE 5.000000 días al milisegundo — imposible en este dominio
 * porque `fecha_fin` siempre es medianoche UTC (`Order.fecha_fin: string`,
 * fecha sin hora) y `ahora` casi nunca cae justo en medianoche. Umbral
 * fijado por el Tech Lead (no está en el PRD), documentado también en
 * `openapi.yaml` (`AlertaCritica`).
 */
const DIAS_MINIMOS_MORA = 5;

/** Días de atraso a partir de los cuales `mora_cliente` sube de severidad "media" a "alta". */
const UMBRAL_DIAS_MORA_SEVERIDAD_ALTA = 15;

/** Porcentaje redondeado a 2 decimales. */
function redondear2Decimales(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * `GET /analytics/dashboard-kpis` (Issue #153, HU-15.1, Sprint 15 — Épica
 * 15, BI y Dashboard Gerencial). Panel ejecutivo único que consolida los 4
 * KPIs macrofinancieros ya expuestos por separado en
 * `GET /analytics/revenue`/`GET /analytics/roi`/`GET /analytics/utilization`
 * (Sprints 6/10) más el panel de "Alertas Críticas" (nuevo en este sprint),
 * en una sola llamada — ver descripción de `GET /analytics/dashboard-kpis`
 * en openapi.yaml para el porqué de esta consolidación.
 *
 * Deliberadamente NO reimplementa las fórmulas de ingresos/ROI/utilización:
 * reutiliza los mismos puertos de repositorio (`RevenueRepository`,
 * `RoiRepository`) y el mismo caso de uso (`ConsultarUtilizacionUseCase`)
 * que ya las resuelven, para no arriesgar que este endpoint y sus 3
 * hermanos diverjan en el cálculo con el tiempo.
 *
 * Las 2 consultas de alertas críticas (`detectarMantenimientoRecurrente`/
 * `detectarMoraCliente`) SÍ son nuevas: cruzan `CatalogInventoryModule`/
 * `OrdersModule`/`UsersModule` — 3 bounded contexts distintos de
 * AnalyticsModule — mismo criterio ya documentado en
 * `domain/revenue.repository.ts`/`domain/roi.repository.ts` sobre por qué
 * este tipo de agregación cross-contexto vive en el caso de uso de
 * AnalyticsModule (que sí puede depender de los demás módulos) en vez de
 * forzarse dentro de los repos de dominio de esos otros bounded contexts
 * (que no deberían conocer AnalyticsModule).
 */
@Injectable()
export class ObtenerDashboardKpisUseCase {
  constructor(
    @Inject(REVENUE_REPOSITORY)
    private readonly revenue: RevenueRepository,
    @Inject(ROI_REPOSITORY)
    private readonly roi: RoiRepository,
    private readonly consultarUtilizacion: ConsultarUtilizacionUseCase,
    @Inject(TOOL_UNIT_STATUS_LOG_REPOSITORY)
    private readonly statusLog: ToolUnitStatusLogRepository,
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly toolUnits: ToolUnitRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly toolModels: ToolModelRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<DashboardKpisRespuesta> {
    const mesActual = mesActualUtc(ahora);
    const mesAnterior = mesAnteriorUtc(ahora);

    const [ingresosMesActual, ingresosMesAnterior, utilizacion, modelosConIngresos, alertasMantenimiento, alertasMora] =
      await Promise.all([
        this.revenue.sumarPorTipo(mesActual),
        this.revenue.sumarPorTipo(mesAnterior),
        this.consultarUtilizacion.ejecutar(ahora),
        this.roi.listarConIngresos(),
        this.detectarMantenimientoRecurrente(mesActual),
        this.detectarMoraCliente(ahora),
      ]);

    const totalMesActual = ingresosMesActual.ventasDirectas
      .sumar(ingresosMesActual.tarifasAlquiler)
      .sumar(ingresosMesActual.cobrosMora);
    const totalMesAnterior = ingresosMesAnterior.ventasDirectas
      .sumar(ingresosMesAnterior.tarifasAlquiler)
      .sumar(ingresosMesAnterior.cobrosMora);

    return {
      ingresos_totales_mes: totalMesActual.valor,
      variacion_ingresos_pct: this.calcularVariacionPct(totalMesActual.valor, totalMesAnterior.valor),
      ocupacion_global_pct: utilizacion.utilizacion_global_pct,
      moras_recaudadas_mes: ingresosMesActual.cobrosMora.valor,
      roi_promedio_pct: this.calcularRoiPromedio(modelosConIngresos),
      // Orden fijo: mantenimiento primero, mora después (openapi.yaml,
      // doc-comment de `AlertaCritica`, describe los 2 disparadores en ese
      // orden).
      alertas_criticas: [...alertasMantenimiento, ...alertasMora],
    };
  }

  /** `variacion_ingresos_pct` = (mesActual - mesAnterior) / mesAnterior x 100. `0` (no Infinity/NaN) si mesAnterior fue 0. */
  private calcularVariacionPct(mesActual: number, mesAnterior: number): number {
    if (mesAnterior === 0) {
      return 0;
    }
    return redondear2Decimales(((mesActual - mesAnterior) / mesAnterior) * 100);
  }

  /**
   * `roi_promedio_pct` = promedio simple de `roi_pct` entre los modelos con
   * `costo_compra` cargado — MISMO filtro y fórmula que `ConsultarRoiUseCase`
   * (excluye `costoCompra === null || costoCompra.valor <= 0`). `0` si
   * ningún modelo queda tras el filtro.
   */
  private calcularRoiPromedio(modelos: ModeloConIngresos[]): number {
    const validos = modelos.filter((m) => m.costoCompra !== null && m.costoCompra.valor > 0);
    if (validos.length === 0) {
      return 0;
    }
    const sumaRoiPct = validos.reduce((acumulado, m) => {
      const costo = m.costoCompra!.valor;
      const roiPct = ((m.ingresosAcumulados.valor - costo) / costo) * 100;
      return acumulado + roiPct;
    }, 0);
    return redondear2Decimales(sumaRoiPct / validos.length);
  }

  /**
   * Alerta `mantenimiento_recurrente`: unidades con MÁS DE
   * `UMBRAL_TRANSICIONES_MANTENIMIENTO` transiciones a "En Mantenimiento"
   * en `mes`. Severidad siempre "alta" (contrato, `AlertaCritica`).
   */
  private async detectarMantenimientoRecurrente(mes: RangoPeriodo): Promise<AlertaCriticaRespuesta[]> {
    const transiciones = await this.statusLog.contarTransicionesAMantenimiento(mes);
    const criticas = transiciones.filter((t) => t.cantidad > UMBRAL_TRANSICIONES_MANTENIMIENTO);

    const alertas: AlertaCriticaRespuesta[] = [];
    for (const { unidadId, cantidad } of criticas) {
      const unidad = await this.toolUnits.buscarPorId(unidadId);
      if (!unidad) {
        // Dato inconsistente (unidad borrada/no encontrada pero con hoja de
        // vida) — no debería pasar en este dominio (tabla append-only, sin
        // delete de unidades), se omite en vez de reventar el endpoint.
        continue;
      }
      const modelo = await this.toolModels.buscarPorId(unidad.modelo_id);
      const nombreModelo = modelo?.nombre ?? "modelo desconocido";

      alertas.push({
        tipo: "mantenimiento_recurrente",
        severidad: "alta",
        titulo: `Mantenimiento recurrente — ${unidad.numero_serie}`,
        descripcion: `La unidad ${unidad.numero_serie} (${nombreModelo}) ingresó a taller ${cantidad} veces este mes.`,
        referencia_id: unidad.id,
        accion_sugerida: "Revisar Ficha / Dar de Baja",
      });
    }
    return alertas;
  }

  /**
   * Alerta `mora_cliente`: órdenes `confirmada`/`en_curso` vencidas hace más
   * de `DIAS_MINIMOS_MORA` días. Severidad "alta" si el atraso supera
   * `UMBRAL_DIAS_MORA_SEVERIDAD_ALTA` días, "media" en caso contrario.
   */
  private async detectarMoraCliente(ahora: Date): Promise<AlertaCriticaRespuesta[]> {
    const ordenes = await this.orders.listarConAtrasoMinimo(DIAS_MINIMOS_MORA, ahora);

    const alertas: AlertaCriticaRespuesta[] = [];
    for (const orden of ordenes) {
      const diasRetraso = this.calcularDiasRetraso(orden, ahora);
      const cliente = await this.users.buscarPorId(orden.cliente_id);
      const nombreCliente = cliente?.nombre ?? "cliente desconocido";

      alertas.push({
        tipo: "mora_cliente",
        severidad: diasRetraso > UMBRAL_DIAS_MORA_SEVERIDAD_ALTA ? "alta" : "media",
        titulo: `Mora de cliente — ${nombreCliente}`,
        descripcion: `La orden de ${nombreCliente} lleva ${diasRetraso} día(s) de atraso desde su fecha de fin.`,
        referencia_id: orden.id,
        accion_sugerida: "Ver Contrato / Contactar",
      });
    }
    return alertas;
  }

  /**
   * Mismo criterio de cálculo de días de retraso que `calcularMora`
   * (`InspectionsModule/domain/mora-calculator.ts`) — `Math.ceil` del delta
   * en días, nunca negativo. No se reutiliza esa función directamente
   * porque exige `tarifaDia`/`interesMoraDia` (para el MONTO de mora), dato
   * que este disparador de alerta no necesita — solo los días.
   */
  private calcularDiasRetraso(orden: Order, ahora: Date): number {
    const fechaFin = new Date(orden.fecha_fin!);
    return Math.max(0, Math.ceil((ahora.getTime() - fechaFin.getTime()) / MS_POR_DIA));
  }
}
