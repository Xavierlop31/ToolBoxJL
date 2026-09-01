import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { CatalogService } from '../../core/catalog/catalog.service';
import { AuthService } from '../../core/auth/auth.service';
import { Order } from '../../core/models/order.models';

const PAGE_SIZE = 5;

/** Estados que cuentan como "pedido activo" para el Home/Catálogo (HU-12.1). */
const ESTADOS_ACTIVOS: Order['estado'][] = ['confirmada', 'en_curso'];

const ESTADO_LABEL: Record<Order['estado'], string> = {
  pendiente_pago: 'Pendiente de pago',
  confirmada: 'Confirmado',
  en_curso: 'En curso',
  devuelta: 'Devuelta',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
};

/**
 * "Mis Pedidos Activos" (HU-12.1, Fase 3) — sección inferior del Home/Catálogo,
 * solo visible con sesión activa. Consulta `GET /orders` sin filtro de
 * estado (una sola llamada) y filtra en el cliente a los dos estados que
 * cuentan como "activo" hoy en el modelo real de `Order` (`confirmada`,
 * `en_curso` — el Gherkin de origen usa nombres de estado que no existen en
 * el backend, ver la nota de Sprint 12 en el PR).
 */
@Component({
  selector: 'app-active-orders',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './active-orders.component.html',
  styleUrl: './active-orders.component.scss',
})
export class ActiveOrdersComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  readonly estadoLabel = ESTADO_LABEL;
  readonly isAuthenticated = this.auth.isAuthenticated;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.cargar();
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.cargar();
  }

  private cargar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.catalog.listMyOrders({ page: this.page(), pageSize: 100 }).subscribe({
      next: ({ items }) => {
        const activos = items
          .filter((order) => ESTADOS_ACTIVOS.includes(order.estado))
          .sort((a, b) => (b.fecha_inicio ?? '').localeCompare(a.fecha_inicio ?? ''));
        this.total.set(activos.length);
        const desde = (this.page() - 1) * PAGE_SIZE;
        this.orders.set(activos.slice(desde, desde + PAGE_SIZE));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar tus pedidos activos.');
        this.loading.set(false);
      },
    });
  }
}
