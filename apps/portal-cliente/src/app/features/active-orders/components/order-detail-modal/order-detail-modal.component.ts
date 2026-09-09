import { DatePipe, DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { Order, Payment } from '../../../../core/models/order.models';
import { OrderPaymentComponent } from '../../../order-payment/order-payment.component';

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
 * Detalle de un pedido (HU-12.1) — abierto desde el botón de Estado en
 * "Mis Pedidos Activos" y desde la lista de "Pedidos pendientes de pago"
 * (HU-12.3, órdenes creadas por `POST /orders/checkout-cart` que ese
 * endpoint deja en `pendiente_pago` sin iniciar el pago — ver
 * `CheckoutCartUseCase`). En general es de solo lectura (mismo criterio que
 * `ObtenerOrdenUseCase`/`GET /orders/:id`), salvo por el único caso en que sí
 * permite una acción: si `order.estado === 'pendiente_pago'`, embebe
 * `OrderPaymentComponent` para completar el pago sin salir del modal.
 * Mismo patrón de `<dialog>` nativo que
 * `apps/panel-admin/.../status-change-modal` (Web:S6819): `showModal()` en
 * `ngAfterViewInit`, cierre único vía `close()` (botón, click fuera del
 * panel por geometría, o Escape nativo vía `(cancel)`).
 */
@Component({
  selector: 'app-order-detail-modal',
  standalone: true,
  imports: [DatePipe, DecimalPipe, OrderPaymentComponent],
  templateUrl: './order-detail-modal.component.html',
  styleUrl: './order-detail-modal.component.scss',
})
export class OrderDetailModalComponent implements AfterViewInit {
  @Input({ required: true }) order!: Order;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly paid = new EventEmitter<Payment>();

  onOrderPaid(payment: Payment): void {
    this.order = { ...this.order, estado: 'confirmada' };
    this.paid.emit(payment);
  }

  @ViewChild('dialogEl') private readonly dialogEl!: ElementRef<HTMLDialogElement>;

  readonly estadoLabel = ESTADO_LABEL;
  readonly returnModeLabel = RETURN_MODE_LABEL;

  ngAfterViewInit(): void {
    this.dialogEl.nativeElement.showModal();
  }

  onBackdropClick(event: MouseEvent): void {
    const rect = this.dialogEl.nativeElement.getBoundingClientRect();
    const dentroDelPanel =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!dentroDelPanel) {
      this.close();
    }
  }

  close(): void {
    this.dialogEl?.nativeElement.close();
    this.closed.emit();
  }
}
