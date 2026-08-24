import { initFederation } from '@angular-architects/native-federation';

// portal-cliente puede correr standalone (`pnpm start`, puerto 4201, para
// desarrollo/BDD local) o federado dentro de apps/shell. En ambos casos
// arranca vía Native Federation: standalone no consume remotes propios, por
// lo que initFederation() sin manifest es válido (ver FAQ del plugin).
initFederation()
  .catch((err) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
