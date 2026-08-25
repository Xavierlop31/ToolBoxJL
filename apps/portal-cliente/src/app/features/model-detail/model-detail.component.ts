import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { CatalogService } from '../../core/catalog/catalog.service';
import { ToolModel } from '../../core/models/catalog.models';
import { Quote, Order, Payment, MetodoPago } from '../../core/models/order.models';

/**
 * Ficha de modelo + consulta de disponibilidad + cotización y creación de órdenes (RF-2.1).
 * Permite seleccionar modalidad Alquiler o Venta (si está disponible para venta),
 * cotizar con desglose detallado, confirmar la orden y proceder al pago seguro (RF-2.2, RF-2.3).
 */
@Component({
  selector: 'app-model-detail',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './model-detail.component.html',
  styleUrl: './model-detail.component.scss',
})
export class ModelDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly model = signal<ToolModel | null>(null);

  // Estados de disponibilidad (Sprint 1)
  readonly availabilityLoading = signal(false);
  readonly availabilityError = signal<string | null>(null);
  readonly unidadesDisponibles = signal<number | null>(null);

  // Estados de cotización y orden (Sprint 2)
  readonly quoteLoading = signal(false);
  readonly quoteError = signal<string | null>(null);
  readonly quoteResult = signal<Quote | null>(null);

  readonly orderLoading = signal(false);
  readonly orderError = signal<string | null>(null);
  readonly orderResult = signal<Order | null>(null);

  // Estados de pago (Sprint 3)
  readonly paymentLoading = signal(false);
  readonly paymentError = signal<string | null>(null);
  readonly paymentResult = signal<Payment | null>(null);
  readonly selectedMetodoPago = signal<MetodoPago>('pse');

  // Zonas de entrega simuladas para cumplir con el DTO
  readonly zonas = [
    { id: 'b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e', nombre: 'Zona Norte (Bogotá)' },
    { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nombre: 'Zona Centro (Bogotá)' },
    { id: 'f8e8d8c8-b8a8-4b8c-8d8e-8f8a8b8c8d8e', nombre: 'Zona Sur (Bogotá)' },
  ];

  readonly form = this.formBuilder.nonNullable.group({
    tipo: ['alquiler', Validators.required],
    fechaInicio: [''],
    fechaFin: [''],
    direccionEntrega: ['', Validators.required],
    zonaId: ['', Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Modelo no encontrado.');
      this.loading.set(false);
      return;
    }

    this.catalog.getModelById(id).subscribe({
      next: (model) => {
        this.model.set(model);
        this.loading.set(false);
        
        // Configurar validaciones dinámicas según el tipo seleccionado
        this.form.get('tipo')?.valueChanges.subscribe((tipo) => {
          const fechaInicioCtrl = this.form.get('fechaInicio');
          const fechaFinCtrl = this.form.get('fechaFin');
          
          if (tipo === 'alquiler') {
            fechaInicioCtrl?.setValidators([Validators.required]);
            fechaFinCtrl?.setValidators([Validators.required]);
          } else {
            fechaInicioCtrl?.clearValidators();
            fechaFinCtrl?.clearValidators();
          }
          fechaInicioCtrl?.updateValueAndValidity();
          fechaFinCtrl?.updateValueAndValidity();
        });

        // Forzar validaciones iniciales para alquiler
        this.form.get('tipo')?.setValue('alquiler');
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar la ficha del modelo.');
        this.loading.set(false);
      },
    });
  }

  checkAvailability(): void {
    const model = this.model();
    if (!model) return;

    const fechaInicio = this.form.get('fechaInicio')?.value;
    const fechaFin = this.form.get('fechaFin')?.value;

    if (!fechaInicio || !fechaFin) {
      this.availabilityError.set('Por favor selecciona un rango de fechas válido.');
      return;
    }

    this.availabilityLoading.set(true);
    this.availabilityError.set(null);
    this.unidadesDisponibles.set(null);

    this.catalog.checkAvailability(model.id, fechaInicio, fechaFin).subscribe({
      next: (result) => {
        this.unidadesDisponibles.set(result.unidades_disponibles);
        this.availabilityLoading.set(false);
      },
      error: () => {
        this.availabilityError.set('No pudimos consultar la disponibilidad.');
        this.availabilityLoading.set(false);
      },
    });
  }

  getQuote(): void {
    const model = this.model();
    if (!model || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.quoteLoading.set(true);
    this.quoteError.set(null);
    this.quoteResult.set(null);
    this.orderResult.set(null);
    this.paymentResult.set(null);

    const { tipo, fechaInicio, fechaFin, direccionEntrega, zonaId } = this.form.getRawValue();

    const payload = {
      modelo_id: model.id,
      tipo: tipo as 'alquiler' | 'venta',
      direccion_entrega: direccionEntrega,
      zona_id: zonaId,
      ...(tipo === 'alquiler' ? {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      } : {})
    };

    this.catalog.createQuote(payload).subscribe({
      next: (quote) => {
        this.quoteResult.set(quote);
        this.quoteLoading.set(false);
      },
      error: (err) => {
        this.quoteError.set(err?.error?.message || 'No pudimos generar la cotización. Intenta de nuevo.');
        this.quoteLoading.set(false);
      }
    });
  }

  confirmOrder(): void {
    const model = this.model();
    const quote = this.quoteResult();
    if (!model || !quote) return;

    this.orderLoading.set(true);
    this.orderError.set(null);

    const { tipo, fechaInicio, fechaFin, direccionEntrega, zonaId } = this.form.getRawValue();

    const payload = {
      modelo_id: model.id,
      tipo: tipo as 'alquiler' | 'venta',
      direccion_entrega: direccionEntrega,
      zona_id: zonaId,
      ...(tipo === 'alquiler' ? {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      } : {})
    };

    this.catalog.createOrder(payload).subscribe({
      next: (order) => {
        this.orderResult.set(order);
        this.orderLoading.set(false);
        this.quoteResult.set(null); // Limpiar cotización al confirmar
      },
      error: (err) => {
        this.orderError.set(err?.error?.message || 'No pudimos confirmar la orden. Intenta de nuevo.');
        this.orderLoading.set(false);
      }
    });
  }

  setMetodoPago(metodo: MetodoPago): void {
    this.selectedMetodoPago.set(metodo);
  }

  confirmPayment(): void {
    const order = this.orderResult();
    if (!order) return;

    this.paymentLoading.set(true);
    this.paymentError.set(null);

    this.catalog.payOrder(order.id, this.selectedMetodoPago()).subscribe({
      next: (payment) => {
        this.paymentResult.set(payment);
        this.paymentLoading.set(false);
        
        // Actualizar el estado local de la orden si el pago fue exitoso
        if (payment.estado === 'capturado' || payment.estado === 'hold') {
          this.orderResult.update(current => current ? { ...current, estado: 'confirmada' } : null);
        }
      },
      error: (err) => {
        this.paymentError.set(err?.error?.message || 'No pudimos procesar el pago. Intenta de nuevo.');
        this.paymentLoading.set(false);
      }
    });
  }
}
