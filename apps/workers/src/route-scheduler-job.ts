/**
 * RouteSchedulerJob — Agente 1, Programador Inteligente de Rutas (Sprint 7,
 * Issue #22 / HU-8.1, TRD §4.1, RF-3.1).
 *
 * Mismo patrón que `main.ts`/`mora-calculator.ts` (Sprint 5): script
 * standalone que corre UNA VEZ y termina, disparado por cron externo en
 * Railway (ej. 02:00 hora Colombia, para que las rutas de mañana estén
 * publicadas antes de las 6:00 a.m. — Gherkin
 * `features/08_agente_ruteo.feature`). A diferencia de `MoraCalculatorJob`,
 * este job NO toca Prisma directamente: llama a `apps/api` por HTTP real
 * (`fetch` nativo) autenticado con un JWT de Supabase Auth del usuario de
 * servicio `agente-ruteo@toolboxjl.internal` (`app_metadata.rol =
 * "agente-1"`), y usa la API de Anthropic (Claude Haiku por defecto, ver
 * `agente-1/config.ts`) para decidir las rutas vía tool calling
 * (`agente-1/route-scheduler-agent.ts`).
 *
 * *** ESTE JOB NUNCA CORRIÓ CONTRA UN ENTORNO REAL *** (mismo criterio
 * documentado en `mora-calculator.ts`) — no hay `ANTHROPIC_API_KEY`/
 * `AGENTE_1_SERVICE_EMAIL`/`AGENTE_1_SERVICE_PASSWORD` reales en este
 * entorno de desarrollo. La lógica está separada en piezas puras/testeables
 * (`route-scheduler.ts`, `agente-1/*.spec.ts`) y conectada al escenario
 * Gherkin `@Epica8` con mocks (ver `test/bdd/step-definitions/agente-ruteo.steps.ts`)
 * — la validación contra la API REAL de Anthropic es un workflow de CI
 * aparte (`.github/workflows/agente-1-ruteo-integration.yml`), no esta
 * corrida.
 */
import Anthropic from "@anthropic-ai/sdk";
import { SupabaseAgente1AuthGatewayService } from "./agente-1/auth-gateway";
import {
  loadAgente1ServiceCredentials,
  loadAnthropicConfig,
  loadApiBaseUrl,
  loadSupabaseRestConfig,
} from "./agente-1/config";
import { ejecutarAgente1, type AnthropicMessagesClient } from "./agente-1/route-scheduler-agent";
import type { RouteApi, ShipmentApi } from "./agente-1/logistics-api-types";

/**
 * Diff puro entre lo que se consultó y lo que efectivamente quedó en alguna
 * ruta publicada — el job confía en este cálculo determinístico para el log
 * de "Pendiente — requiere revisión manual" (TRD §4.1), no en que Claude
 * haya listado bien los pedidos sin asignar en su texto libre.
 */
export function calcularPedidosSinAsignar(
  pedidosConsultados: ShipmentApi[],
  rutasPublicadas: RouteApi[],
): string[] {
  const idsAsignados = new Set(rutasPublicadas.flatMap((ruta) => ruta.paradas));
  return pedidosConsultados.filter((pedido) => !idsAsignados.has(pedido.id)).map((pedido) => pedido.id);
}

function fechaDeManana(): string {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  return manana.toISOString().slice(0, 10);
}

export async function ejecutarRouteSchedulerJob(): Promise<void> {
  const anthropicConfig = loadAnthropicConfig();
  const apiBaseUrl = loadApiBaseUrl();
  const credenciales = loadAgente1ServiceCredentials();
  const supabaseConfig = loadSupabaseRestConfig();

  const authGateway = new SupabaseAgente1AuthGatewayService(credenciales, supabaseConfig);
  const bearerToken = await authGateway.obtenerAccessToken();

  const anthropicClient = new Anthropic({ apiKey: anthropicConfig.apiKey });
  // Wrapper explícito en vez de pasar `anthropicClient.messages` directo:
  // `Messages.create` está sobrecargado (streaming/no-streaming) y esto
  // evita cualquier ambigüedad de tipado al asignarlo a la interfaz mínima
  // `AnthropicMessagesClient` que usa el loop de tool calling.
  const anthropic: AnthropicMessagesClient = {
    create: (params) => anthropicClient.messages.create(params),
  };

  const resultado = await ejecutarAgente1({
    anthropic,
    model: anthropicConfig.model,
    apiBaseUrl,
    bearerToken,
    fechaRuta: fechaDeManana(),
  });

  console.log(
    `[RouteSchedulerJob] ${resultado.rutasPublicadas.length} ruta(s) publicada(s) para ${resultado.rutasPublicadas.map((r) => r.vehiculo_id).join(", ")}.`,
  );

  const sinAsignar = calcularPedidosSinAsignar(resultado.pedidosConsultados, resultado.rutasPublicadas);
  for (const shipmentId of sinAsignar) {
    console.warn(
      `[RouteSchedulerJob] Pedido ${shipmentId}: Pendiente — requiere revisión manual (no entró en ` +
        "ninguna ruta publicada). No hay canal de notificación operativa al Gerente configurado " +
        "todavía (gap de producción documentado, mismo criterio que el template de WhatsApp) — " +
        "este log es la única señal disponible por ahora.",
    );
  }

  console.log(`[RouteSchedulerJob] Resumen de Claude: ${resultado.resumenTexto}`);
}

if (require.main === module) {
  ejecutarRouteSchedulerJob().catch((error) => {
    console.error("[RouteSchedulerJob] Falló:", error);
    process.exitCode = 1;
  });
}
