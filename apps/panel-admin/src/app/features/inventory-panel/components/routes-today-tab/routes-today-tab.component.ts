import { Component, OnInit, inject, signal } from '@angular/core';

import { LogisticsService } from '../../../../core/logistics/logistics.service';
import { RepartidorRuta } from '../../../../core/models/logistics.models';

/**
 * Pestaña "Rutas del Día" del panel de Gestión de Inventario QR (HU-13.4,
 * Issue #150) — features/13_gestion_inventario_qr.feature: "Visualización
 * de rutas activas por repartidor" y "Detalle de paradas de un repartidor
 * específico".
 *
 * `GET /logistics/routes-today` (openapi.yaml líneas 945-1003), requiere
 * rol admin/gerente (`x-roles`) — distinto de los otros dos tabs de este
 * panel (`almacenista, admin`), ver la nota de roles en el brief de la
 * tarea.
 */
@Component({
  selector: 'app-routes-today-tab',
  standalone: true,
  imports: [],
  templateUrl: './routes-today-tab.component.html',
  styleUrl: './routes-today-tab.component.scss',
})
export class RoutesTodayTabComponent implements OnInit {
  private readonly logistics = inject(LogisticsService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly repartidores = signal<RepartidorRuta[]>([]);
  readonly expandedRepartidorId = signal<string | null>(null);

  private readonly tipoParadaLabels: Record<'entrega' | 'recogida', string> = {
    entrega: 'Entrega',
    recogida: 'Recolección',
  };

  ngOnInit(): void {
    this.logistics.getRoutesToday().subscribe({
      next: (routesToday) => {
        this.repartidores.set(routesToday.repartidores);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar las rutas de hoy.');
        this.loading.set(false);
      },
    });
  }

  toggleRepartidor(repartidorId: string): void {
    this.expandedRepartidorId.update((current) =>
      current === repartidorId ? null : repartidorId,
    );
  }

  tipoParadaLabel(tipo: 'entrega' | 'recogida'): string {
    return this.tipoParadaLabels[tipo];
  }

  estadoRutaBadgeClass(estado: RepartidorRuta['estado_ruta']): string {
    switch (estado) {
      case 'Pendiente':
        return 'badge-pendiente';
      case 'En Progreso':
        return 'badge-en-progreso';
      case 'Completada':
        return 'badge-completada';
    }
  }
}
