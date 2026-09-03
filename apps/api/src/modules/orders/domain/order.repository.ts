import type { EstadoOrden, Order, TipoOrden } from "@toolboxjl/shared-types";

export interface NuevaOrdenInput {
  clienteId: string;
  tipo: TipoOrden;
  fechaInicio: string | null;
  fechaFin: string | null;
  returnMode: "en_sede" | "recogida_domicilio";
  direccionEntrega: string;
  zonaId: string;
  items: {
    unidadId: string;
    tarifaAplicada: number;
  }[];
}

export interface OrderRepository {
  crear(input: NuevaOrdenInput): Promise<Order>;
  buscarPorId(id: string): Promise<Order | null>;
  /**
   * Retorna los IDs de unidades que tienen reservas activas (órdenes en estado
   * pendiente_pago, confirmada o en_curso) que se solapan con el rango dado.
   */
  obtenerUnidadesReservadasEnRango(
    modeloId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<string[]>;
  /**
   * Retorna los IDs de unidades que tienen órdenes activas de cualquier tipo
   * (usado para ventas, donde cualquier orden activa excluye la unidad).
   */
  obtenerUnidadesConOrdenesActivas(modeloId: string): Promise<string[]>;
  /**
   * Transición de estado de la orden (ej. `pendiente_pago` → `confirmada`
   * tras un pago iniciado con éxito — ver PaymentsModule/PagarOrdenUseCase,
   * Sprint 3). No valida transiciones permitidas acá: esa regla vive en el
   * caso de uso que la invoca.
   */
  actualizarEstado(id: string, estado: EstadoOrden): Promise<Order>;
  /**
   * Sprint 5 (RF-4.3, HU-5.3) — órdenes candidatas a mora: `estado` en
   * `confirmada`/`en_curso` (todavía no devueltas/cerradas/canceladas) cuya
   * `fecha_fin` ya pasó. Usada por `EjecutarMoraCalculatorUseCase`
   * (apps/api, InspectionModule) y por el script standalone de
   * `apps/workers` (que reimplementa esta misma consulta con su propio
   * `PrismaClient`, ver apps/workers/src/main.ts).
   *
   * Deliberadamente NO filtra acá por "ya tiene un Payment de tipo
   * cobro_mora" — esa es la idempotencia que exige RF-4.3, pero
   * `OrderRepository` no conoce el schema de `payments` (bounded context
   * distinto). El filtro de idempotencia lo hace quien invoca este método,
   * usando `PaymentRepository.listarPorOrden` — así el criterio es idéntico
   * para la implementación Prisma y la in-memory, sin que esta última
   * necesite una referencia cruzada al repositorio de pagos.
   */
  listarVencidasSinMora(ahora: Date): Promise<Order[]>;
  /**
   * Sprint 8 (RF-9.2, HU-9.2) — extiende `fecha_fin` de una orden de alquiler
   * ya confirmada. No valida acá disponibilidad ni transición de estado
   * permitida (eso es responsabilidad de `ExtenderAlquilerUseCase`, mismo
   * criterio que `actualizarEstado`) — este método solo persiste la nueva
   * fecha.
   */
  extenderFecha(id: string, nuevaFechaFin: string): Promise<Order>;
  /**
   * Sprint 12 (HU-12.1) — pedidos del cliente autenticado para "Mis Pedidos
   * Activos" (GET /orders, Home/Catálogo). `clienteId` nunca es un query
   * param manipulable por el cliente — sale de `@UsuarioActual()` (JWT), ver
   * `ListarMisOrdenesUseCase`. Ordenado por fecha de creación descendente
   * (más reciente primero); `estado` sin definir trae todos los estados.
   * `page` es 1-based.
   */
  listarPorCliente(
    clienteId: string,
    filtro: { estado?: EstadoOrden; page: number; pageSize: number },
  ): Promise<{ items: Order[]; total: number }>;
  /**
   * Sprint 14 (HU-13.1/HU-13.4) — ids de `ToolUnit` con un `OrderItem`
   * vigente en una Orden `confirmada`/`en_curso` (cualquier `tipo`, no solo
   * `alquiler` — así lo describe openapi.yaml para el estado de
   * visualización "En Alquiler" de `GET /inventory/units`/
   * `GET /inventory/metrics`, sin distinguir `tipo` explícitamente).
   */
  listarUnidadesEnAlquilerActivo(): Promise<string[]>;
  /**
   * Sprint 15 (Issue #153, HU-15.1) — órdenes vencidas hace AL MENOS
   * `diasMinimos` días (`ahora - fecha_fin >= diasMinimos` días), SIN
   * importar si ya se emitió el cobro de mora — a diferencia de
   * `listarVencidasSinMora` (que sí filtra por "sin mora emitida todavía",
   * ver su doc-comment). Mismo criterio de estado:
   * `confirmada`/`en_curso` con `fecha_fin` no nula en el pasado. Usado por
   * `ObtenerDashboardKpisUseCase` (AnalyticsModule) para el disparador de
   * alerta `mora_cliente` (`GET /analytics/dashboard-kpis`), que necesita
   * TODAS las órdenes en mora real del negocio, no solo las pendientes de
   * cobrar.
   */
  listarConAtrasoMinimo(diasMinimos: number, ahora: Date): Promise<Order[]>;
}
