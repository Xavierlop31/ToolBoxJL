import { initFederation } from '@angular-architects/native-federation';

// Manifest de remotes de Native Federation (ver docs/DESIGN.md §2 y
// apps/shell/README.md, sección "Decisión de arquitectura — Sprint 0").
// Sprint 0 lo deja vacío a propósito: portal-cliente, panel-admin y
// pwa-logistica todavía no existen como remotes. Cuando cada uno se
// scaffoldee (Sprint 1+), se le agrega su entrada acá, por ejemplo:
//   { "portal-cliente": "http://localhost:4201/remoteEntry.json" }
initFederation('/federation.manifest.json')
  .catch((err) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
