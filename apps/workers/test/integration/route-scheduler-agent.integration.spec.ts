/**
 * Test de integración REAL contra la API de Anthropic — Issue #22 (HU-8.1,
 * Agente 1). Mismo criterio que
 * `apps/api/test/integration/whatsapp-otp-gateway.integration.spec.ts`
 * (Sprint 6): NUNCA corre como parte de `pnpm test` (ver
 * jest.integration.config.js) — se invoca explícito con
 * `pnpm --filter @toolboxjl/workers run test:integration:agente1`, en un
 * job de CI aparte (`.github/workflows/agente-1-ruteo-integration.yml`) que
 * provee `ANTHROPIC_API_KEY` real vía `env:`.
 *
 * Alcance deliberadamente ACOTADO (instrucción explícita del Tech Lead: no
 * gastar saldo de Anthropic en cada corrida de CI, ver CLAUDE.md §8): esto
 * NO ejecuta `ejecutarAgente1` de punta a punta (eso además necesitaría una
 * instancia real de `apps/api` corriendo y credenciales de Supabase Auth del
 * usuario de servicio, que documentadamente pueden no existir todavía — ver
 * `src/agente-1/auth-gateway.ts`). Este test valida solo lo que le compete a
 * ESTE sprint de IA: que `ANTHROPIC_API_KEY` autentica de verdad contra
 * `https://api.anthropic.com` y que Claude Haiku (el modelo económico
 * elegido para este sprint, ver `src/agente-1/config.ts`) hace tool calling
 * de forma confiable con las mismas dos tools que usa el Agente 1 —
 * `max_tokens` bajo y un prompt mínimo para mantener el costo despreciable.
 */
import Anthropic from "@anthropic-ai/sdk";
import { AGENTE_1_TOOLS, construirSystemPrompt } from "../../src/agente-1/tools";
import { ANTHROPIC_MODEL_DEFAULT } from "../../src/agente-1/config";

const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_MODEL_DEFAULT;

const tieneCredenciales = Boolean(apiKey);
const describeSiHayCredenciales = tieneCredenciales ? describe : describe.skip;

if (!tieneCredenciales) {
  // eslint-disable-next-line no-console
  console.warn(
    "[route-scheduler-agent.integration.spec] ANTHROPIC_API_KEY no está definida — se salta todo " +
      "el archivo. Esto es normal en desarrollo local; en CI, el job agente-1-ruteo-integration " +
      "SIEMPRE debería tenerla definida (ver .github/workflows/agente-1-ruteo-integration.yml).",
  );
}

describeSiHayCredenciales(`Agente 1 — tool calling real contra la API de Anthropic (modelo: ${model})`, () => {
  it(
    "Claude decide llamar get_pending_orders (no responde en texto libre) ante un pedido de planificación",
    async () => {
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model,
        max_tokens: 512,
        system: construirSystemPrompt(),
        tools: AGENTE_1_TOOLS,
        messages: [
          {
            role: "user",
            content:
              "Planificá las rutas de reparto de mañana (2026-08-27). Vehículos disponibles: " +
              '[{"id":"v1","tipo":"camioneta","capacidad_kg":500,"capacidad_m3":3,"zonas":["zona-norte"]}]. ' +
              "Empezá por consultar los pedidos pendientes.",
          },
        ],
      });

      expect(response.stop_reason).toBe("tool_use");
      const toolUse = response.content.find((block) => block.type === "tool_use");
      expect(toolUse).toBeDefined();
      expect((toolUse as { name?: string })?.name).toBe("get_pending_orders");
    },
    30_000,
  );
});
