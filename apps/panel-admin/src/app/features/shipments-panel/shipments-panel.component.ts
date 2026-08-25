import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LogisticsRealtimeService } from '../../core/logistics/logistics-realtime.service';
import { LogisticsService } from '../../core/logistics/logistics.service';
import { ESTADO_ENVIO_LABEL, Shipment } from '../../core/models/logistics.models';

/**
 * Panel de seguimiento de envíos en tiempo real (RF-3.3, Issue #12) —
 * features/04_logistica_flota.feature @RF-3.3: "Gerente monitorea el
 * estado de los envíos en tiempo real".
 *
 * Carga inicial vía `GET /logistics/shipments` (LogisticsService) y luego
 * se suscribe a Supabase Realtime (LogisticsRealtimeService) para reflejar
 * altas/cambios de estado sin recargar la página — el criterio de
 * aceptación central del escenario.
 */
@Component({
  selector: 'app-shipments-panel',
  standalone: true,
  imports: [],
  templateUrl: './shipments-panel.component.html',
  styleUrl: './shipments-panel.component.scss',
})
export class ShipmentsPanelComponent implements OnInit {
  private readonly logistics = inject(LogisticsService);
  private readonly realtime = inject(LogisticsRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly estadoLabel = ESTADO_ENVIO_LABEL;

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly shipments = signal<Shipment[]>([]);

  ngOnInit(): void {
    this.logistics.getShipments().subscribe({
      next: (shipments) => {
        this.shipments.set(shipments);
        this.loading.set(false);
        this.subscribeToRealtimeUpdates();
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar el panel de envíos.');
        this.loading.set(false);
      },
    });
  }

  private subscribeToRealtimeUpdates(): void {
    this.realtime
      .watchShipments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => this.applyRealtimeChange(payload),
        error: () => {
          // No se interrumpe el panel si el canal Realtime falla (p.ej.
          // credenciales sandbox no configuradas en este entorno): el
          // listado inicial del GET sigue siendo válido y visible.
        },
      });
  }

  private applyRealtimeChange(payload: {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }): void {
    const newRow = payload.new as Partial<Shipment>;
    const oldRow = payload.old as Partial<Shipment>;

    if (payload.eventType === 'DELETE') {
      this.shipments.update((list) => list.filter((s) => s.id !== oldRow.id));
      return;
    }

    this.shipments.update((list) => {
      const index = list.findIndex((s) => s.id === newRow.id);
      const updated = newRow as Shipment;
      if (index === -1) {
        return [...list, updated];
      }
      const copy = [...list];
      copy[index] = updated;
      return copy;
    });
  }
}
