import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { CatalogService } from '../../core/catalog/catalog.service';
import { AuthService } from '../../core/auth/auth.service';
import { Order } from '../../core/models/order.models';
import { OrderDetailModalComponent } from './components/order-detail-modal/order-detail-modal.component';

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

const RETURN_MODE_LABEL: Record<NonNullable<Order['return_mode']>, string> = {
  en_sede: 'Retiro en sede',
  recogida_domicilio: 'Recogida a domicilio',
};

/**
 * "Mis Pedidos Activos" (HU-12.1, Fase 3) — sección inferior del Home/Catálogo,
 * solo visible con sesión activa. Consulta `GET /orders` sin filtro de
 * estado (una sola llamada) y filtra en el cliente a los dos estados que
 * cuentan como "activo" hoy en el modelo real de `Order` (`confirmada`,
 * `en_curso` — el Gherkin de origen usa nombres de estado que no existen en
 * el backend, ver la nota de Sprint 12 en el PR).
 *
 * La fila ya no muestra el UUID de la orden (poco legible para el cliente) y
 * el Estado pasó de badge puramente informativo a botón de acción: abre
 * `OrderDetailModalComponent` con el detalle completo + ítems, de solo
 * lectura (no permite editar nada desde acá — mismo criterio de
 * `GET /orders/:id`).
 */
@Component({
  selector: 'app-active-orders',
  standalone: true,
  imports: [DatePipe, OrderDetailModalComponent],
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
  readonly selectedOrder = signal<Order | null>(null);

  // HU-12.3: órdenes creadas por POST /orders/checkout-cart quedan en
  // "pendiente_pago" sin que ese endpoint inicie el pago (ver
  // CheckoutCartUseCase) — sin esta lista, no había ninguna pantalla donde
  // completarlo. Se deriva del mismo GET /orders ya pedido para "activos"
  // (sin filtro de estado), no hace falta una llamada aparte.
  readonly pendingOrders = signal<Order[]>([]);

  readonly estadoLabel = ESTADO_LABEL;
  readonly returnModeLabel = RETURN_MODE_LABEL;
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

  /** Botón de Estado / "Pagar" en la fila — abre el detalle completo del pedido. */
  verDetalle(order: Order): void {
    this.selectedOrder.set(order);
  }

  /** El pago se completó desde el modal — refresca ambas listas (server truth). */
  onOrderPaid(): void {
    this.selectedOrder.set(null);
    this.cargar();
  }

  private cargar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    // `page: 1` fijo a propósito: esta es LA única llamada al backend (ver
    // comentario de cabecera de la clase) — pide hasta 100 órdenes de una
    // vez y pagina 100% del lado del cliente con `this.page()` (slice más
    // abajo). Pasarle `this.page()` acá en cambio le pedía al backend SU
    // página 2/3 con pageSize=100 (skip=100/200) — con menos de 100 órdenes
    // reales, el backend devolvía `items: []` y la sección mostraba "no hay
    // pedidos activos" al navegar a la página 2, con la orden real igual
    // en la página 1 del backend. Bug reportado por el Arquitecto
    // (2026-09-09).
    this.catalog.listMyOrders({ page: 1, pageSize: 100 }).subscribe({
      next: ({ items }) => {
        const activos = items
          .filter((order) => ESTADOS_ACTIVOS.includes(order.estado))
          .sort((a, b) => (b.fecha_inicio ?? '').localeCompare(a.fecha_inicio ?? ''));
        this.total.set(activos.length);
        const desde = (this.page() - 1) * PAGE_SIZE;
        this.orders.set(activos.slice(desde, desde + PAGE_SIZE));

        this.pendingOrders.set(
          items
            .filter((order) => order.estado === 'pendiente_pago')
            .sort((a, b) => (b.fecha_inicio ?? '').localeCompare(a.fecha_inicio ?? '')),
        );

        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar tus pedidos activos.');
        this.loading.set(false);
      },
    });
  }
}
