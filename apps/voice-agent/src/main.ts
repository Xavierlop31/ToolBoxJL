/**
 * Entry point del Agente 3 — Conserje Web de Voz (Sprint 9, Issues #26/#27,
 * HU-10.1/10.2, TRD §4.3). PROCESO PERSISTENTE (a diferencia de
 * `apps/workers`, que corre un job y termina) — arranca, expone un servidor
 * HTTP en `PORT` para recibir webhooks de LiveKit (`participant_joined`) y se
 * queda corriendo, uniéndose a cada sala nueva del widget de voz para correr
 * el pipeline Deepgram STT → Claude (tool calling) → ElevenLabs TTS.
 *
 * Comando de arranque en producción (Railway, servicio APARTE de
 * `apps/workers` — ver `railway.voice-agent.json` que arma la sesión de
 * infraestructura en paralelo): `pnpm build && node dist/main.js`. Desarrollo
 * local: `pnpm agente3:iniciar` (ts-node directo). *** Necesita un puerto
 * HTTP expuesto *** (`PORT`, Railway lo inyecta automáticamente en runtime;
 * default 8080 si corre fuera de Railway — ver `agente-3/config.ts`,
 * `loadPort`) para que LiveKit pueda entregarle los webhooks — sin esto, el
 * Agente 3 nunca se entera de que hay una sala nueva.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  loadAnthropicConfig,
  loadApiBaseUrl,
  loadDeepgramConfig,
  loadElevenLabsConfig,
  loadLiveKitConfig,
  loadPort,
} from "./agente-3/config";
import { DeepgramSpeechToTextService } from "./agente-3/infrastructure/deepgram-speech-to-text.service";
import { ElevenLabsTextToSpeechService } from "./agente-3/infrastructure/elevenlabs-text-to-speech.service";
import { crearServidorWebhook } from "./agente-3/livekit/webhook-http-server";
import { manejarSesionDeVoz, type CerrarSesion } from "./agente-3/livekit/room-session";
import { SesionesActivas } from "./agente-3/livekit/sesiones-activas";

async function main(): Promise<void> {
  const anthropicConfig = loadAnthropicConfig();
  const apiBaseUrl = loadApiBaseUrl();
  const deepgramConfig = loadDeepgramConfig();
  const elevenLabsConfig = loadElevenLabsConfig();
  const liveKitConfig = loadLiveKitConfig();
  const port = loadPort();

  const anthropicClient = new Anthropic({ apiKey: anthropicConfig.apiKey });
  const speechToText = new DeepgramSpeechToTextService(deepgramConfig.apiKey);
  const textToSpeech = new ElevenLabsTextToSpeechService(elevenLabsConfig.apiKey, elevenLabsConfig.voiceId);

  const sesionesActivas = new SesionesActivas();
  const cierresPorSala = new Map<string, CerrarSesion>();

  async function unirseASala(roomName: string): Promise<void> {
    if (sesionesActivas.estaActiva(roomName)) {
      console.log(`[Agente 3] Ya hay una sesión activa para la sala "${roomName}" — se ignora el webhook duplicado.`);
      return;
    }
    sesionesActivas.marcarActiva(roomName);
    try {
      const cerrar = await manejarSesionDeVoz(
        {
          liveKitConfig,
          anthropic: anthropicClient.messages,
          anthropicModel: anthropicConfig.model,
          apiBaseUrl,
          speechToText,
          textToSpeech,
        },
        roomName,
      );
      cierresPorSala.set(roomName, cerrar);
    } catch (error) {
      sesionesActivas.marcarFinalizada(roomName);
      console.error(`[Agente 3] No se pudo unir a la sala "${roomName}":`, error);
    }
  }

  const servidor = crearServidorWebhook({ liveKitConfig, unirseASala });
  servidor.listen(port, () => {
    console.log(`[Agente 3] Servicio de voz escuchando en el puerto ${port} (webhook: POST /livekit/webhook).`);
  });

  const cerrarTodoYSalir = async (): Promise<void> => {
    console.log("[Agente 3] Cerrando sesiones activas...");
    await Promise.all([...cierresPorSala.values()].map((cerrar) => cerrar().catch(() => undefined)));
    servidor.close(() => process.exit(0));
  };
  process.on("SIGTERM", () => void cerrarTodoYSalir());
  process.on("SIGINT", () => void cerrarTodoYSalir());
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[Agente 3] Falló el arranque del proceso:", error);
    process.exitCode = 1;
  });
}

export { main };
