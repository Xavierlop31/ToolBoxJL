import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Rol, UsuarioAutenticado } from "@toolboxjl/shared-types";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { InMemoryRevenueRepository } from "../infrastructure/in-memory/in-memory-revenue.repository";
import { InMemoryRoiRepository } from "../infrastructure/in-memory/in-memory-roi.repository";
import { InMemoryUtilizationRepository } from "../infrastructure/in-memory/in-memory-utilization.repository";
import { InMemoryDeliveryProductivityRepository } from "../infrastructure/in-memory/in-memory-delivery-productivity.repository";
import { ConsultarIngresosUseCase } from "../application/consultar-ingresos.use-case";
import { ConsultarRoiUseCase } from "../application/consultar-roi.use-case";
import { ConsultarUtilizacionUseCase } from "../application/consultar-utilizacion.use-case";
import { ConsultarProductividadRepartidoresUseCase } from "../application/consultar-productividad-repartidores.use-case";
import { ObtenerDashboardKpisUseCase } from "../application/obtener-dashboard-kpis.use-case";
import { InMemoryToolUnitStatusLogRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit-status-log.repository";
import { InMemoryToolUnitRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../../catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { InMemoryUserRepository } from "../../users/infrastructure/in-memory/in-memory-user.repository";
import { AnalyticsController } from "./analytics.controller";

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return { id: "u-1", email: "gerente@example.com", rol: "gerente", ...overrides };
}

/**
 * `ExecutionContext` mínimo para ejercitar `RolesGuard` — mismo criterio que
 * `roles.guard.spec.ts`, pero acá con un `Reflector` REAL (no mockeado) leyendo
 * el metadata que el decorador `@Roles("gerente", "admin")` realmente dejó en
 * `AnalyticsController.prototype.dashboardKpis` — así se verifica la
 * integración decorador+guard+handler real, no solo la lógica interna del
 * guard en aislamiento.
 */
function contextoParaHandler(
  handler: (...args: unknown[]) => unknown,
  usuarioActual: UsuarioAutenticado | undefined,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => AnalyticsController,
    switchToHttp: () => ({ getRequest: () => ({ user: usuarioActual }) }),
  } as unknown as ExecutionContext;
}

describe("AnalyticsController — GET /analytics/dashboard-kpis (Issue #153, HU-15.1)", () => {
  let controller: AnalyticsController;
  let guard: RolesGuard;

  beforeEach(() => {
    const consultarUtilizacion = new ConsultarUtilizacionUseCase(new InMemoryUtilizationRepository());
    controller = new AnalyticsController(
      new ConsultarIngresosUseCase(new InMemoryRevenueRepository()),
      new ConsultarRoiUseCase(new InMemoryRoiRepository()),
      consultarUtilizacion,
      new ConsultarProductividadRepartidoresUseCase(new InMemoryDeliveryProductivityRepository()),
      new ObtenerDashboardKpisUseCase(
        new InMemoryRevenueRepository(),
        new InMemoryRoiRepository(),
        consultarUtilizacion,
        new InMemoryToolUnitStatusLogRepository(),
        new InMemoryToolUnitRepository(),
        new InMemoryToolModelRepository(),
        new InMemoryOrderRepository(),
        new InMemoryUserRepository(),
      ),
    );
    // Reflector real (no mockeado): lee el metadata que `@Roles(...)`
    // realmente dejó sobre el handler del controller.
    guard = new RolesGuard(new Reflector());
  });

  it("devuelve los 4 KPIs consolidados + alertas_criticas (forma de DashboardKpis, openapi.yaml)", async () => {
    const resultado = await controller.dashboardKpis();

    expect(resultado).toEqual({
      ingresos_totales_mes: expect.any(Number),
      variacion_ingresos_pct: expect.any(Number),
      ocupacion_global_pct: expect.any(Number),
      moras_recaudadas_mes: expect.any(Number),
      roi_promedio_pct: expect.any(Number),
      alertas_criticas: expect.any(Array),
    });
  });

  it.each<Rol>(["gerente", "admin"])(
    "RolesGuard permite el acceso al rol '%s' (x-roles: [gerente, admin] de openapi.yaml)",
    (rol) => {
      const contexto = contextoParaHandler(AnalyticsController.prototype.dashboardKpis, usuario({ rol }));
      expect(guard.canActivate(contexto)).toBe(true);
    },
  );

  it.each<Rol>(["cliente", "almacenista", "repartidor"])(
    "RolesGuard deniega con ForbiddenException (403) al rol '%s'",
    (rol) => {
      const contexto = contextoParaHandler(AnalyticsController.prototype.dashboardKpis, usuario({ rol }));
      expect(() => guard.canActivate(contexto)).toThrow(ForbiddenException);
    },
  );

  it("RolesGuard lanza si no hay usuario en la request (SupabaseAuthGuard no corrió antes)", () => {
    const contexto = contextoParaHandler(AnalyticsController.prototype.dashboardKpis, undefined);
    expect(() => guard.canActivate(contexto)).toThrow();
  });
});
