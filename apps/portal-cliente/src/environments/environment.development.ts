/**
 * Entorno de desarrollo local (`ng serve`, `pnpm start`).
 *
 * Apunta al server local de Desarrollo declarado en `openapi.yaml`
 * (`http://localhost:3000/api/v1`). apps/api corre en paralelo en su propia
 * rama (feature/backend-catalog-inventory) — no hace falta que esté levantado
 * para desarrollar el frontend: los tests unitarios mockean HttpClient con
 * HttpTestingController y los tests BDD (e2e-bdd/) interceptan la red con
 * `page.route`.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
};
