import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { CartService } from '../../core/cart/cart.service';
import { calcularSubtotalLinea, esLineaDeAlquiler, tarifaUnitariaLinea } from '../../core/cart/cart-pricing.util';
import { CatalogService } from '../../core/catalog/catalog.service';
import { ToolModel, Zona } from '../../core/models/catalog.models';
import { Cart, CartItem, CheckoutCartResult } from '../../core/models/cart.models';
import { getToolImageUrl, FALLBACK_TOOL_IMAGE } from '../../core/utils/tool-image.util';

/** Vista enriquecida de una línea del carrito — el backend solo trae `CartItem` (modelo_id/cantidad/dias). */
export interface CartLineView {
  id: string;
  modeloId: string;
  modelo: ToolModel;
  cantidad: number;
  dias?: number;
  esAlquiler: boolean;
  tarifaUnitaria: number;
  subtotal: number;
}

/**
 * Página `/carrito` (HU-12.3, Sprint 13, `features/12_catalogo_avanzado_carrito.feature`).
 *
 * El `Cart`/`CartItem` que devuelve el backend NO trae nombre/marca/precio
 * por línea (openapi.yaml, schema `CartItem`) — este componente enriquece
 * cada línea con `GET /catalog/models/{modelo_id}` (`CatalogService`) y
 * calcula el subtotal con la misma lógica que el backend
 * (`core/cart/cart-pricing.util.ts`).
 *
 * Limitación real y documentada del backend (no de este componente): el
 * carrito todavía no tiene `zona_id`/`return_mode`, así que el recargo
 * logístico y el depósito de garantía NO se pueden calcular en este panel —
 * se muestran como "Se calcula al confirmar tu pedido" en vez de un monto.
 */
@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
})
export class CartPageComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly catalog = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly lineas = signal<CartLineView[]>([]);

  /** Id de la línea (`CartItem.id`) sobre la que hay una mutación en curso — deshabilita sus controles. */
  readonly updatingItemId = signal<string | null>(null);

  readonly subtotalAlquileres = computed(() =>
    this.lineas()
      .filter((l) => l.esAlquiler)
      .reduce((total, l) => total + l.subtotal, 0),
  );
  readonly subtotalVentas = computed(() =>
    this.lineas()
      .filter((l) => !l.esAlquiler)
      .reduce((total, l) => total + l.subtotal, 0),
  );
  readonly granTotal = computed(() => this.subtotalAlquileres() + this.subtotalVentas());

  // Checkout consolidado ("Proceder al Pago")
  readonly showCheckoutForm = signal(false);
  readonly ciudades = ['Medellín', 'Bogotá'] as const;
  readonly ciudadSeleccionada = signal<string>('Bogotá');
  readonly zonas = signal<Zona[]>([]);
  readonly zonasLoading = signal(false);

  readonly checkoutForm = this.formBuilder.nonNullable.group({
    direccionEntrega: ['', Validators.required],
    zonaId: ['', Validators.required],
  });

  readonly checkoutLoading = signal(false);
  readonly checkoutError = signal<string | null>(null);
  readonly checkoutResult = signal<CheckoutCartResult | null>(null);

  ngOnInit(): void {
    this.cargarCarrito();
  }

  getToolImage(model: ToolModel): string {
    return getToolImageUrl(model);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== FALLBACK_TOOL_IMAGE) {
      target.src = FALLBACK_TOOL_IMAGE;
    }
  }

  increaseQuantity(linea: CartLineView): void {
    this.mutarCantidad(linea, linea.cantidad + 1);
  }

  decreaseQuantity(linea: CartLineView): void {
    if (linea.cantidad <= 1) return;
    this.mutarCantidad(linea, linea.cantidad - 1);
  }

  removeItem(linea: CartLineView): void {
    this.updatingItemId.set(linea.id);
    this.errorMessage.set(null);
    this.cartService.removeItem(linea.id).subscribe({
      next: (cart) => {
        this.aplicarCarrito(cart, false);
        this.updatingItemId.set(null);
      },
      error: () => {
        this.errorMessage.set('No pudimos eliminar el producto del carrito.');
        this.updatingItemId.set(null);
      },
    });
  }

  abrirCheckout(): void {
    this.showCheckoutForm.set(true);
    this.checkoutResult.set(null);
    this.checkoutError.set(null);
    if (this.zonas().length === 0) {
      this.cargarZonas(this.ciudadSeleccionada());
    }
  }

  cancelarCheckout(): void {
    this.showCheckoutForm.set(false);
  }

  onCiudadChange(ciudad: string): void {
    this.ciudadSeleccionada.set(ciudad);
    this.checkoutForm.patchValue({ zonaId: '' });
    this.cargarZonas(ciudad);
  }

  confirmarCheckout(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    const { direccionEntrega, zonaId } = this.checkoutForm.getRawValue();

    this.checkoutLoading.set(true);
    this.checkoutError.set(null);
    this.checkoutResult.set(null);

    this.cartService.checkoutCart(direccionEntrega, zonaId).subscribe({
      next: (result) => {
        this.checkoutResult.set(result);
        this.checkoutLoading.set(false);
        // El backend retira del carrito las líneas que sí se convirtieron en
        // orden; las que fallaron quedan. Refrescamos para reflejar eso.
        this.cargarCarrito();
      },
      error: (err) => {
        this.checkoutError.set(
          err?.error?.message || 'No pudimos procesar tu pedido. Intenta de nuevo.',
        );
        this.checkoutLoading.set(false);
      },
    });
  }

  private cargarCarrito(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cartService.refresh().subscribe({
      next: (cart) => this.aplicarCarrito(cart, true),
      error: () => {
        this.errorMessage.set('No pudimos cargar tu carrito.');
        this.loading.set(false);
      },
    });
  }

  private aplicarCarrito(cart: Cart, esCargaInicial: boolean): void {
    this.construirLineasDesdeCarrito(cart).subscribe({
      next: (lineas) => {
        this.lineas.set(lineas);
        if (esCargaInicial) this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar el detalle de los productos del carrito.');
        if (esCargaInicial) this.loading.set(false);
      },
    });
  }

  private construirLineasDesdeCarrito(cart: Cart): Observable<CartLineView[]> {
    const items = (cart.items ?? []).filter((item): item is CartItem & { id: string } => !!item.id);
    if (items.length === 0) {
      return of([]);
    }

    const idsUnicos = [...new Set(items.map((item) => item.modelo_id))];
    return forkJoin(idsUnicos.map((id) => this.catalog.getModelById(id))).pipe(
      map((modelos) => {
        const mapaModelos = new Map(modelos.map((modelo) => [modelo.id, modelo]));
        return items
          .filter((item) => mapaModelos.has(item.modelo_id))
          .map((item) => this.construirLinea(item, mapaModelos.get(item.modelo_id) as ToolModel));
      }),
    );
  }

  private construirLinea(item: CartItem & { id: string }, modelo: ToolModel): CartLineView {
    return {
      id: item.id,
      modeloId: item.modelo_id,
      modelo,
      cantidad: item.cantidad,
      dias: item.dias,
      esAlquiler: esLineaDeAlquiler(item),
      tarifaUnitaria: tarifaUnitariaLinea(modelo, item),
      subtotal: calcularSubtotalLinea(modelo, item),
    };
  }

  private mutarCantidad(linea: CartLineView, nuevaCantidad: number): void {
    this.updatingItemId.set(linea.id);
    this.errorMessage.set(null);
    this.cartService.updateItemQuantity(linea.id, nuevaCantidad).subscribe({
      next: (cart) => {
        this.aplicarCarrito(cart, false);
        this.updatingItemId.set(null);
      },
      error: () => {
        this.errorMessage.set('No pudimos actualizar la cantidad.');
        this.updatingItemId.set(null);
      },
    });
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
}
