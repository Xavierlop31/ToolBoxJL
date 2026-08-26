/**
 * Config de Jest separada para tests de integración que llaman a APIs
 * externas reales (WhatsApp Cloud API, y desde Sprint 8 también Anthropic —
 * ver test/integration/*). Nunca corre como parte de `pnpm test`/
 * `pnpm turbo run test` (ese pipeline usa `jest.config.js`, con
 * `rootDir: "src"` — este archivo directamente no matchea nada ahí). Se
 * invoca explícito con `pnpm --filter @toolboxjl/api run
 * test:integration:whatsapp` / `test:integration:agente2` (cada script usa
 * `--testPathPattern` para correr solo su archivo, ver package.json), cada
 * uno en su propio job de CI con los secrets reales que necesita — ver
 * .github/workflows/whatsapp-otp-integration.yml y
 * .github/workflows/agente-2-whatsapp-integration.yml.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "test/integration",
  testRegex: String.raw`.*\.integration\.spec\.ts$`,
  setupFiles: ["reflect-metadata"],
  moduleFileExtensions: ["js", "json", "ts"],
};
