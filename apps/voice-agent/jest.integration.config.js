/**
 * Config de Jest separada para el test de integración que llama a las APIs
 * REALES de Anthropic/Deepgram/ElevenLabs (Agente 3, Sprint 9, Issues
 * #26/#27) — mismo criterio que `apps/workers/jest.integration.config.js` y
 * `apps/api/jest.integration.config.js` (Agentes 1 y 2). Nunca corre como
 * parte de `pnpm test`/`pnpm turbo run test` (ese pipeline usa
 * `jest.config.js`, con `rootDir: "src"` — este archivo no matchea nada
 * ahí). Se invoca explícito con
 * `pnpm --filter @toolboxjl/voice-agent run test:integration:agente3`, en un
 * job de CI aparte — ver .github/workflows/agente-3-voz-integration.yml.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "test/integration",
  testRegex: String.raw`.*\.integration\.spec\.ts$`,
  moduleFileExtensions: ["js", "json", "ts"],
};
