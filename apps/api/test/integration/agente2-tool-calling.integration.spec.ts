/**
 * Test de integración REAL contra Anthropic/Deepgram/ElevenLabs — Issue #25
 * (HU-9.2, Agente 2). Mismo criterio que
 * `apps/workers/test/integration/route-scheduler-agent.integration.spec.ts`
 * (Sprint 7): NUNCA corre como parte de `pnpm test` — se invoca explícito
 * con `pnpm --filter @toolboxjl/api run test:integration:agente2`, en un
 * job de CI aparte (`.github/workflows/agente-2-whatsapp-integration.yml`).
 *
 * Alcance deliberadamente ACOTADO (mismo criterio de costo que Sprint 7,
 * CLAUDE.md §8): esto NO ejecuta `procesarMensajeEntrante` de punta a punta
 * (necesitaría una instancia real de apps/api corriendo, la cuenta de
 * servicio de Supabase Auth de agente-2, y un número real de WhatsApp
 * Business — varios de los cuales documentadamente pueden no existir
 * todavía). Cada bloque valida solo que la credencial autentica de verdad y
 * que el uso mínimo de esa API funciona, con costo despreciable:
 * - Anthropic: tool calling real con las mismas tools que usa el Agente 2.
 * - Deepgram: `GET /v1/projects` (no transcribe audio real, sin costo).
 * - ElevenLabs: `GET /v1/user` (no sintetiza audio real, sin costo).
 */
import Anthropic from "@anthropic-ai/sdk";
import { AGENTE_2_TOOLS, construirSystemPromptAgente2 } from "../../src/modules/whatsapp-webhook/infrastructure/agente-2/tools";
import { ANTHROPIC_MODEL_DEFAULT } from "../../src/modules/whatsapp-webhook/infrastructure/agente-2/config";

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const anthropicModel = process.env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_MODEL_DEFAULT;
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

function describeSi(condicion: boolean) {
  return condicion ? describe : describe.skip;
}

if (!anthropicApiKey) {
  // eslint-disable-next-line no-console
  console.warn("[agente2-tool-calling.integration.spec] ANTHROPIC_API_KEY no está definida — se salta.");
}
if (!deepgramApiKey) {
  // eslint-disable-next-line no-console
  console.warn("[agente2-tool-calling.integration.spec] DEEPGRAM_API_KEY no está definida — se salta.");
}
if (!elevenLabsApiKey) {
  // eslint-disable-next-line no-console
  console.warn("[agente2-tool-calling.integration.spec] ELEVENLABS_API_KEY no está definida — se salta.");
}

describeSi(Boolean(anthropicApiKey))(`Agente 2 — tool calling real contra Anthropic (modelo: ${anthropicModel})`, () => {
  it(
    "Claude decide llamar check_availability ante un pedido de extensión con modelo_id y fechas conocidos",
    async () => {
      const client = new Anthropic({ apiKey: anthropicApiKey });

      const response = await client.messages.create({
        model: anthropicModel,
        max_tokens: 512,
        system: construirSystemPromptAgente2(),
        tools: AGENTE_2_TOOLS,
        messages: [
          {
            role: "user",
            content:
              "Quiero extender mi orden 11111111-1111-1111-1111-111111111111 (modelo " +
              "22222222-2222-2222-2222-222222222222) hasta el 2026-09-15. Fijate si hay disponibilidad " +
              "entre 2026-09-10 y 2026-09-15.",
          },
        ],
      });

      expect(response.stop_reason).toBe("tool_use");
      const toolUse = response.content.find((block) => block.type === "tool_use");
      expect(toolUse).toBeDefined();
      expect((toolUse as { name?: string })?.name).toBe("check_availability");
    },
    30_000,
  );
});

describeSi(Boolean(deepgramApiKey))("Agente 2 — credenciales reales de Deepgram", () => {
  it("DEEPGRAM_API_KEY autentica contra la API real (GET /v1/projects)", async () => {
    const response = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${deepgramApiKey}` },
    });
    expect(response.status).toBe(200);
  });
});

describeSi(Boolean(elevenLabsApiKey))("Agente 2 — credenciales reales de ElevenLabs", () => {
  it("ELEVENLABS_API_KEY autentica contra la API real (GET /v1/user)", async () => {
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": elevenLabsApiKey! },
    });
    expect(response.status).toBe(200);
  });
});
