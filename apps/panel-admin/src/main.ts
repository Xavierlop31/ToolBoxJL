import { initFederation } from '@angular-architects/native-federation';

// panel-admin puede correr standalone (`pnpm start`, puerto 4203, para
// desarrollo/BDD local) o federada dentro de apps/shell.
initFederation()
  .catch((err) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
