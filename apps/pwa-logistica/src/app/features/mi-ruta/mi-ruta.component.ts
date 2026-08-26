import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';

import { MyRouteService } from '../../core/logistics/my-route.service';
import { RouteCacheService } from '../../core/logistics/route-cache.service';
import {
  ESTADO_ENVIO_LABEL,
  MyRouteResponse,
  TIPO_PARADA_LABEL,
} from '../../core/models/logistics.models';

/**
 * "Repartidor ve su ruta del día ya optimizada" (HU-8.2, Issue #23) —
 * features/08_agente_ruteo.feature, escenario @HU-8.2: al iniciar la PWA
 * en la mañana con las rutas del día ya publicadas, el Repartidor abre su
 * ruta asignada y la ve ordenada por parada.
 *
 * `GET /logistics/my-route` ya devuelve `paradas` en el mismo orden que
 * `route.paradas` (secuencia optimizada por el Agente 1) — este componente
 * NO reordena nada, solo pinta la lista en el orden que llega, numerada.
 *
 * "La ruta respeta el límite de peso/volumen de mi vehículo" (el otro
 * `Entonces` del escenario) es una garantía del algoritmo del Agente 1 al
 * publicar la ruta (`POST /logistics/assign-routes`, Issue #22/#23 batch) —
 * `openapi.yaml` no expone capacidad de vehículo (`capacidad_kg`/
 * `capacidad_m3`) en la respuesta de `GET /logistics/my-route` ni hay un
 * `GET /fleet/vehicles/{id}` con rol repartidor para resolverla acá,
 * así que no hay nada que este componente pueda mostrar o validar al
 * respecto — se verifica del lado del batch nocturno (Backend/IA), no acá.
 * Documentado como decisión de alcance de este sprint, no como omisión.
 *
 * 404 (`openapi.yaml` líneas 585-589): el Repartidor no tiene vehículo
 * asignado o no hay Route publicada para hoy — estado vacío explícito, no
 * error genérico.
 *
 * Offline-first (RNF-7): la ruta del día es de solo lectura para el
 * Repartidor este sprint, así que alcanza con cachear la última respuesta
 * exitosa (`RouteCacheService`, localStorage) y usarla como fallback ante
 * cualquier falla que NO sea el 404 "no hay ruta" (falla real de red/DNS,
 * timeout, 5xx) — así la pantalla no queda en blanco si se abre sin
 * conexión. El 404 nunca usa el cache: es una respuesta válida del backend
 * ("hoy no tenés ruta"), no una falla de conectividad, así que mostrar una
 * ruta vieja ahí sería engañoso.
 */
@Component({
  selector: 'app-mi-ruta',
  standalone: true,
  imports: [],
  templateUrl: './mi-ruta.component.html',
  styleUrl: './mi-ruta.component.scss',
})
export class MiRutaComponent implements OnInit {
  private readonly myRoute = inject(MyRouteService);
  private readonly routeCache = inject(RouteCacheService);

  readonly estadoLabel = ESTADO_ENVIO_LABEL;
  readonly tipoLabel = TIPO_PARADA_LABEL;

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly emptyState = signal(false);
  readonly offlineFallback = signal(false);
  readonly data = signal<MyRouteResponse | null>(null);

  ngOnInit(): void {
    this.myRoute.getMyRoute().subscribe({
      next: (response) => {
        this.routeCache.save(response);
        this.data.set(response);
        this.emptyState.set(false);
        this.offlineFallback.set(false);
        this.errorMessage.set(null);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 404) {
      this.data.set(null);
      this.emptyState.set(true);
      this.offlineFallback.set(false);
      this.loading.set(false);
      return;
    }

    // No es un 404 (no es "hoy no tenés ruta") — puede ser una falla real
    // de conectividad: se intenta mostrar la última ruta conocida antes de
    // rendirse con un error.
    const cached = this.routeCache.load();
    if (cached) {
      this.data.set(cached);
      this.emptyState.set(false);
      this.offlineFallback.set(true);
    } else {
      this.errorMessage.set('No pudimos cargar tu ruta del día.');
    }
    this.loading.set(false);
  }
}
