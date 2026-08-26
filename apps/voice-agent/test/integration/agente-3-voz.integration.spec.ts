/**
 * Test de integración REAL contra Anthropic/Deepgram/ElevenLabs/LiveKit —
 * Issues #26/#27 (HU-10.1/10.2, Agente 3). Mismo criterio que
 * `apps/api/test/integration/agente2-tool-calling.integration.spec.ts`
 * (Sprint 8): NUNCA corre como parte de `pnpm test` — se invoca explícito
 * con `pnpm --filter @toolboxjl/voice-agent run test:integration:agente3`,
 * en un job de CI aparte
 * (`.github/workflows/agente-3-voz-integration.yml`).
 *
 * Alcance deliberadamente ACOTADO (mismo criterio de costo, CLAUDE.md §8):
 * esto NO abre una sesión LiveKit real de punta a punta (necesitaría un
 * cliente de navegador real hablando por WebRTC — fuera de lo que un job de
 * CI puede simular). Cada bloque valida solo que la credencial autentica de
 * verdad, con costo despreciable:
 * - Anthropic: tool calling real con las mismas tools que usa el Agente 3.
 * - Deepgram: `GET /v1/projects` (no transcribe audio real, sin costo).
 * - ElevenLabs: `GET /v1/user` (no sintetiza audio real, sin costo).
 * - LiveKit: `RoomServiceClient.listRooms()` (no abre ninguna sala, solo
 *   confirma que LIVEKIT_URL/API_KEY/API_SECRET autentican contra el
 *   proyecto real).
 *
 * *** Nota conocida sobre ELEVENLABS_API_KEY (reportada por el Arquitecto,
 * no es un bug de este archivo) ***: el 401 que este bloque puede devolver
 * NO significa necesariamente que la key esté mal escrita o vencida — el
 * Arquitecto confirmó que la key vigente (hasta 21-sep) sigue fallando con
 * 401 en el workflow de integración del Agente 2 desde Sprint 8. La
 * hipótesis actual es que la key tiene un scope/permiso granular en
 * ElevenLabs (Claves de API → permisos por key) que no incluye el/los
 * endpoint(s) que se están llamando — NO que la key sea inválida. Si este
 * bloque también falla con 401, es la MISMA causa raíz ya escalada al
 * Arquitecto, no un bloqueo nuevo de este sprint.
 */
import Anthropic from "@anthropic-ai/sdk";
import { RoomServiceClient } from "livekit-server-sdk";
import { AGENTE_3_TOOLS, construirSystemPromptAgente3 } from "../../src/agente-3/tools";
import { ANTHROPIC_MODEL_DEFAULT } from "../../src/agente-3/config";

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const anthropicModel = process.env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_MODEL_DEFAULT;
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const liveKitUrl = process.env.LIVEKIT_URL;
const liveKitApiKey = process.env.LIVEKIT_API_KEY;
const liveKitApiSecret = process.env.LIVEKIT_API_SECRET;

function describeSi(condicion: boolean) {
  return condicion ? describe : describe.skip;
}

if (!anthropicApiKey) {
  // eslint-disable-next-line no-console
  console.warn("[agente-3-voz.integration.spec] ANTHROPIC_API_KEY no está definida — se salta ese bloque.");
}
if (!deepgramApiKey) {
  // eslint-disable-next-line no-console
  console.warn("[agente-3-voz.integration.spec] DEEPGRAM_API_KEY no está definida — se salta ese bloque.");
}
if (!elevenLabsApiKey) {
  // eslint-disable-next-line no-console
  console.warn("[agente-3-voz.integration.spec] ELEVENLABS_API_KEY no está definida — se salta ese bloque.");
}
if (!liveKitUrl || !liveKitApiKey || !liveKitApiSecret) {
  // eslint-disable-next-line no-console
  console.warn(
    "[agente-3-voz.integration.spec] LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET no están todas definidas — se salta ese bloque.",
  );
}

describeSi(Boolean(anthropicApiKey))(`Agente 3 — tool calling real contra Anthropic (modelo: ${anthropicModel})`, () => {
  it(
    "Claude decide llamar search_catalog ante un pedido de búsqueda por voz",
    async () => {
      const client = new Anthropic({ apiKey: anthropicApiKey });

      const response = await client.messages.create({
        model: anthropicModel,
        max_tokens: 512,
        system: construirSystemPromptAgente3(),
        tools: AGENTE_3_TOOLS,
        messages: [
          {
            role: "user",
            content: "Necesito alquilar un taladro percutor para concreto por 3 días desde este jueves.",
          },
        ],
      });

      expect(response.stop_reason).toBe("tool_use");
      const toolUse = response.content.find((block) => block.type === "tool_use");
      expect(toolUse).toBeDefined();
      expect((toolUse as { name?: string })?.name).toBe("search_catalog");
    },
    30_000,
  );
});

describeSi(Boolean(deepgramApiKey))("Agente 3 — credenciales reales de Deepgram", () => {
  it("DEEPGRAM_API_KEY autentica contra la API real (GET /v1/projects)", async () => {
    const response = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${deepgramApiKey}` },
    });
    expect(response.status).toBe(200);
  });
});

describeSi(Boolean(elevenLabsApiKey))("Agente 3 — credenciales reales de ElevenLabs", () => {
  it("ELEVENLABS_API_KEY autentica contra la API real (GET /v1/user)", async () => {
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": elevenLabsApiKey! },
    });
    // Ver el comentario de cabecera de este archivo sobre el 401 conocido —
    // se deja la aserción estricta (200) a propósito para que el workflow
    // de CI siga marcando el gap en rojo hasta que se corrija el scope de
    // la key, en vez de esconderlo con un assert laxo.
    expect(response.status).toBe(200);
  });
});

describeSi(Boolean(liveKitUrl && liveKitApiKey && liveKitApiSecret))("Agente 3 — credenciales reales de LiveKit", () => {
  it("LIVEKIT_API_KEY/LIVEKIT_API_SECRET autentican contra el proyecto real (listRooms)", async () => {
    const httpUrl = liveKitUrl!.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
    const client = new RoomServiceClient(httpUrl, liveKitApiKey, liveKitApiSecret);
    // No lanza si autentica correctamente, aunque no haya salas activas.
    await expect(client.listRooms()).resolves.toBeDefined();
  });
});
