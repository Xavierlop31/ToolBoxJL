import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ReturnIntentService } from '../../core/auth/return-intent.service';
import { CartService } from '../../core/cart/cart.service';
import { CatalogService } from '../../core/catalog/catalog.service';
import { ToolModel, Zona } from '../../core/models/catalog.models';
import { Quote, Order, Payment, MetodoPago } from '../../core/models/order.models';
import { getToolImageUrl, FALLBACK_TOOL_IMAGE } from '../../core/utils/tool-image.util';

/** Forma persistida del intento guardado antes de redirigir a /login (auth-wall, HU-11.1). */
interface ReturnIntentData {
  modeloId: string;
  form: {
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    direccionEntrega: string;
    zonaId: string;
  };
}

/**
 * Ficha de modelo + consulta de disponibilidad + cotización y creación de órdenes (RF-2.1).
 * Permite seleccionar modalidad Alquiler o Venta (si está disponible para venta),
 * cotizar con desglose detallado, confirmar la orden y proceder al pago seguro (RF-2.2, RF-2.3).
 */
@Component({
  selector: 'app-model-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './model-detail.component.html',
  styleUrl: './model-detail.component.scss',
})
export class ModelDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly returnIntent = inject(ReturnIntentService);

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

  // HU-12.2: zonas reales por ciudad (GET /zones?ciudad=) — ya no un array
  // hardcodeado. El zonaId enviado a /orders/quote y /orders debe ser un
  // UUID real devuelto por el backend.
  readonly ciudades = ['Medellín', 'Bogotá'] as const;
  readonly ciudadSeleccionada = signal<string>('Bogotá');
  readonly zonas = signal<Zona[]>([]);
  readonly zonasLoading = signal(false);

  // "Agregar al Carrito" (HU-12.2, alcance mínimo — Sprint 12)
  readonly addToCartLoading = signal(false);
  readonly addToCartError = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    tipo: ['alquiler', Validators.required],
    fechaInicio: [''],
    fechaFin: [''],
    direccionEntrega: ['', Validators.required],
    zonaId: ['', Validators.required],
  });

  getToolImage(model: ToolModel): string {
    return getToolImageUrl(model);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== FALLBACK_TOOL_IMAGE) {
      target.src = FALLBACK_TOOL_IMAGE;
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Modelo no encontrado.');
      this.loading.set(false);
      return;
    }

    this.cargarZonas(this.ciudadSeleccionada());

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

        // Auth-wall (HU-11.1 parte 2): si el cliente volvió de /login con un
        // intento guardado para ESTE modelo, precargamos el form con esos
        // valores — sin auto-ejecutar getQuote() de nuevo, que confirme el
        // submit una vez más.
        const intento = this.returnIntent.recuperarIntento<ReturnIntentData>();
        if (intento && intento.datos.modeloId === model.id) {
          this.form.patchValue(intento.datos.form);
        }
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar la ficha del modelo.');
        this.loading.set(false);
      },
    });
  }

  onCiudadChange(ciudad: string): void {
    this.ciudadSeleccionada.set(ciudad);
    this.form.patchValue({ zonaId: '' });
    this.cargarZonas(ciudad);
  }

  private cargarZonas(ciudad: string): void {
    this.zonasLoading.set(true);
    this.catalog.getZones(ciudad).subscribe({
      next: (zonas) => {
        this.zonas.set(zonas);
        this.zonasLoading.set(false);
      },
      error: () => {
        this.zonas.set([]);
        this.zonasLoading.set(false);
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

    // Auth-wall (HU-11.1 parte 2): "Cotizar" es la primera acción real que
    // necesita sesión. Sin sesión, guardamos el intento y mandamos a login.
    if (!this.auth.isAuthenticated()) {
      this.redirigirALoginConIntento(model.id);
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

  /**
   * "Agregar al Carrito" (HU-12.2, alcance mínimo — Sprint 12). Mismo
   * auth-wall que `getQuote()`: sin sesión, guarda el intento y redirige a
   * login. Cantidad fija en 1 (no hay selector de cantidad en este form);
   * `dias` solo aplica si la modalidad es alquiler y hay un rango válido.
   */
  addItem(): void {
    const model = this.model();
    if (!model) return;

    if (!this.auth.isAuthenticated()) {
      this.redirigirALoginConIntento(model.id);
      return;
    }

    const { tipo, fechaInicio, fechaFin } = this.form.getRawValue();
    const dias =
      tipo === 'alquiler' ? this.calcularDias(fechaInicio, fechaFin) : undefined;

    this.addToCartLoading.set(true);
    this.addToCartError.set(null);

    this.cartService.addItem(model.id, 1, dias).subscribe({
      next: () => {
        this.addToCartLoading.set(false);
        this.mostrarToast('Se agregó al carrito.');
      },
      error: (err) => {
        this.addToCartLoading.set(false);
        this.addToCartError.set(
          err?.error?.message || 'No pudimos agregar el producto al carrito.',
        );
      },
    });
  }

  private calcularDias(fechaInicio: string, fechaFin: string): number | undefined {
    if (!fechaInicio || !fechaFin) return undefined;
    const inicio = new Date(fechaInicio).getTime();
    const fin = new Date(fechaFin).getTime();
    if (Number.isNaN(inicio) || Number.isNaN(fin) || fin <= inicio) return undefined;
    return Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
  }

  private mostrarToast(mensaje: string): void {
    this.toastMessage.set(mensaje);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  private redirigirALoginConIntento(modeloId: string): void {
    this.returnIntent.guardarIntento({
      modeloId,
      form: this.form.getRawValue(),
    } satisfies ReturnIntentData);
    void this.router.navigateByUrl(
      `/login?returnUrl=${encodeURIComponent(window.location.pathname)}`,
    );
  }
}
