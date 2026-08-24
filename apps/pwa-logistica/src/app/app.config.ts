import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    // Offline-first (Definition of Done Fase 1, docs/DESIGN.md §8): cachea
    // el shell de la app para que sea usable sin conectividad. La cola de
    // mutaciones offline (cambios de estado pendientes de sincronizar) vive
    // en core/offline/ (IndexedDB), independiente del Service Worker.
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
