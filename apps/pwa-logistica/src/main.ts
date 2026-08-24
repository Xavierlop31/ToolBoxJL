import { initFederation } from '@angular-architects/native-federation';

// pwa-logistica puede correr standalone (`pnpm start`, puerto 4202, para
// desarrollo/BDD local) o federada dentro de apps/shell.
initFederation()
  .catch((err) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
