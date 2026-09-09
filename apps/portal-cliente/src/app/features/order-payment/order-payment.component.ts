import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CatalogService } from '../../core/catalog/catalog.service';
import { MetodoPago, Order, PagarOrdenInput, Payment, PseBank, WompiTerms } from '../../core/models/order.models';

/**
 * Selector de método de pago + checkboxes de consentimiento de Wompi
 * (Reglamento/Política de Datos) + confirmación — extraído de
 * `ModelDetailComponent` (donde nació, Sprint 3/PSE) para poder reusarlo
 * también en el pago de órdenes creadas por `POST /orders/checkout-cart`
 * (HU-12.3), que las deja en `pendiente_pago` sin iniciar el pago (ver
 * `CheckoutCartUseCase`, comentario de cabecera).
 *
 * Recibe la orden ya creada (`pendiente_pago`) y emite `paid` con el
 * `Payment` resultante — quien lo use decide qué hacer con el estado local
 * de la orden (ver `ModelDetailComponent.onOrderPaid`).
 */
@Component({
  selector: 'app-order-payment',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './order-payment.component.html',
  styleUrl: './order-payment.component.scss',
})
export class OrderPaymentComponent implements OnInit {
  @Input({ required: true }) order!: Order;
  @Output() readonly paid = new EventEmitter<Payment>();

  private readonly catalog = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly paymentLoading = signal(false);
  readonly paymentError = signal<string | null>(null);
  readonly paymentResult = signal<Payment | null>(null);
  readonly selectedMetodoPago = signal<MetodoPago>('pse');

  // Datos de PSE (Wompi los exige para armar payment_method — sin esto,
  // POST /orders/:id/pay respondía 422 "No se especificó método de pago").
  readonly pseBanks = signal<PseBank[]>([]);
  readonly pseBanksLoading = signal(false);
  readonly pseBanksError = signal<string | null>(null);
  readonly pseForm = this.formBuilder.nonNullable.group({
    user_legal_id_type: ['CC' as const, Validators.required],
    user_legal_id: ['', Validators.required],
    financial_institution_code: ['', Validators.required],
  });

  // Términos de aceptación de Wompi (Reglamento + Política de Tratamiento de
  // Datos) — Wompi exige acceptance_token/accept_personal_auth en toda
  // transacción real (Habeas Data); sin esto, POST /orders/:id/pay
  // respondía 422 "acceptance_token no está presente".
  readonly wompiTerms = signal<WompiTerms | null>(null);
  readonly wompiTermsLoading = signal(false);
  readonly wompiTermsError = signal<string | null>(null);
  readonly aceptaReglamento = signal(false);
  readonly aceptaDatos = signal(false);
  readonly consentimientoFaltante = signal(false);

  ngOnInit(): void {
    this.setMetodoPago(this.selectedMetodoPago()); // precarga bancos PSE / términos Wompi (default pse)
  }

  setMetodoPago(metodo: MetodoPago): void {
    this.selectedMetodoPago.set(metodo);
    if (metodo === 'pse' && this.pseBanks().length === 0 && !this.pseBanksLoading()) {
      this.cargarBancosPse();
    }
    if (metodo !== 'contra_entrega' && this.wompiTerms() === null && !this.wompiTermsLoading()) {
      this.cargarWompiTerms();
    }
  }

  private cargarBancosPse(): void {
    this.pseBanksLoading.set(true);
    this.pseBanksError.set(null);
    this.catalog.getPseBanks().subscribe({
      next: (bancos) => {
        this.pseBanks.set(bancos);
        this.pseBanksLoading.set(false);
      },
      error: () => {
        this.pseBanksLoading.set(false);
        this.pseBanksError.set('No pudimos cargar la lista de bancos. Intenta de nuevo.');
      },
    });
  }

  private cargarWompiTerms(): void {
    this.wompiTermsLoading.set(true);
    this.wompiTermsError.set(null);
    this.catalog.getWompiTerms().subscribe({
      next: (terminos) => {
        this.wompiTerms.set(terminos);
        this.wompiTermsLoading.set(false);
      },
      error: () => {
        this.wompiTermsLoading.set(false);
        this.wompiTermsError.set('No pudimos cargar los términos de Wompi. Intenta de nuevo.');
      },
    });
  }

  confirmPayment(): void {
    const metodo = this.selectedMetodoPago();
    if (metodo === 'pse' && this.pseForm.invalid) {
      this.pseForm.markAllAsTouched();
      return;
    }
    if (metodo !== 'contra_entrega' && (!this.aceptaReglamento() || !this.aceptaDatos())) {
      this.consentimientoFaltante.set(true);
      return;
    }

    this.paymentLoading.set(true);
    this.paymentError.set(null);
    this.consentimientoFaltante.set(false);

    const terminos = this.wompiTerms();
    const input: PagarOrdenInput = {
      metodo,
      ...(metodo === 'pse' ? this.pseForm.getRawValue() : {}),
      ...(metodo !== 'contra_entrega' && terminos
        ? { acceptance_token: terminos.acceptance_token, accept_personal_auth: terminos.accept_personal_auth }
        : {}),
    };

    this.catalog.payOrder(this.order.id, input).subscribe({
      next: (payment) => {
        this.paymentResult.set(payment);
        this.paymentLoading.set(false);
        this.paid.emit(payment);
      },
      error: (err) => {
        this.paymentError.set(err?.error?.message || 'No pudimos procesar el pago. Intenta de nuevo.');
        this.paymentLoading.set(false);
      }
    });
  }
}
