import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subject, Subscription, firstValueFrom, interval, takeUntil } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { LivekitSessionService, VoiceAgentUiState } from '../../core/voice-agent/livekit-session.service';
import { VoiceAgentTokenService } from '../../core/voice-agent/voice-agent-token.service';

const ESTADO_LABELS: Record<VoiceAgentUiState, string> = {
  idle: 'Listo',
  connecting: 'Conectando…',
  listening: 'Escuchando…',
  thinking: 'Pensando…',
  speaking: 'Hablando…',
  error: 'Error',
};

/** Cada cuánto se refresca el carrito mientras la sesión de voz sigue abierta. */
const CART_POLL_INTERVAL_MS = 10_000;

/**
 * Widget flotante del Agente 3 — Conserje de Voz (HU-10.1/10.2,
 * features/10_agente_conserje_voz.feature, TRD §4.3). Botón flotante
 * (esquina inferior derecha) que abre una sesión LiveKit en tiempo real:
 * `POST /voice-agent/livekit-token` para obtener credenciales de sala de
 * corta duración y `livekit-client` para la conexión WebRTC (micrófono del
 * navegador + reproducción del audio de respuesta del agente).
 *
 * ALCANCE CONFIRMADO CON EL ARQUITECTO (Sprint 9): solo Cliente ya
 * autenticado. El widget no se muestra si `AuthService.isAuthenticated()`
 * es `false` — soporte de visitante anónimo queda fuera de alcance de este
 * sprint (gap documentado, no es un olvido).
 *
 * ADR — ubicación del badge del carrito: al momento de este sprint,
 * `apps/portal-cliente/src/app` no tiene ningún header/layout con un ícono
 * de carrito visible (ver `app.component.html`) — el flujo de compra
 * (Sprint 2/3) confirma la orden directo en `model-detail.component`, sin
 * pasar por un carrito persistente en UI. Se decidió, en vez de inventar un
 * header nuevo fuera de alcance de esta HU, mostrar un badge simple con la
 * cantidad de ítems directamente sobre el propio botón flotante del widget
 * (`cartItemCount()`) — si Sprint 10 (rediseño visual + posible header con
 * carrito) agrega un ícono de carrito real, este mismo `CartService` ya
 * expone `itemCount`/`cart` como signals listos para reutilizar ahí.
 */
@Component({
  selector: 'app-voice-widget',
  standalone: true,
  imports: [],
  templateUrl: './voice-widget.component.html',
  styleUrl: './voice-widget.component.scss',
})
export class VoiceWidgetComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly tokenService = inject(VoiceAgentTokenService);
  private readonly session = inject(LivekitSessionService);
  private readonly cartService = inject(CartService);

  private readonly destroyed$ = new Subject<void>();
  private cartPollSubscription: Subscription | null = null;

  /** El widget solo se muestra si hay un Cliente autenticado (ver ADR arriba). */
  readonly isAuthenticated = this.authService.isAuthenticated;

  readonly panelOpen = signal(false);
  readonly tokenErrorMessage = signal<string | null>(null);
  readonly cartItemCount = this.cartService.itemCount;

  private readonly sessionState = this.session.state;

  /**
   * Estado combinado a mostrar: si falló el pedido del token (antes de
   * siquiera intentar conectar a LiveKit) se trata como `'error'` aunque
   * `LivekitSessionService.state()` siga en `'idle'`.
   */
  readonly displayState = computed<VoiceAgentUiState>(() =>
    this.tokenErrorMessage() ? 'error' : this.sessionState(),
  );

  readonly displayErrorMessage = computed(
    () => this.tokenErrorMessage() ?? this.session.errorMessage(),
  );

  readonly statusLabel = computed(() => ESTADO_LABELS[this.displayState()]);

  /**
   * Abre el panel y arranca la sesión: pide el token de sala
   * (`POST /voice-agent/livekit-token`) y conecta con `livekit-client`.
   * Escenario Gherkin: "Cliente busca una herramienta por voz..." — "Dado
   * que soy un Cliente... usando el widget de voz" / "Entonces se abre una
   * sesión LiveKit en tiempo real".
   */
  async openWidget(): Promise<void> {
    if (this.panelOpen()) return;

    this.panelOpen.set(true);
    this.tokenErrorMessage.set(null);

    try {
      const credentials = await firstValueFrom(this.tokenService.issueLiveKitToken());
      await this.session.connect(credentials);
      this.startCartPolling();
    } catch (error) {
      // Si `session.connect()` ya dejó su propio `errorMessage()` seteado,
      // no lo pisamos — solo cubrimos el caso en que falló el POST del
      // token, antes de intentar la conexión a LiveKit.
      if (!this.session.errorMessage()) {
        this.tokenErrorMessage.set(this.toErrorMessage(error));
      }
    }
  }

  /** Reintenta la conexión desde el estado de error, sin cerrar el panel. */
  retry(): void {
    this.tokenErrorMessage.set(null);
    void this.openWidget();
  }

  /**
   * Cierra la sesión de voz y refresca el carrito — refleja cualquier ítem
   * que el Agente 3 haya agregado vía `POST /cart/add-item` (lo hace el
   * backend de voz, nunca este componente) durante la conversación.
   * Escenario Gherkin: "...Entonces el agente invoca POST /cart/add-item Y
   * confirma verbalmente que el artículo fue agregado a mi carrito" — el
   * "confirma verbalmente" lo hace el TTS del agente (ya reproducido por
   * `LivekitSessionService`); este refresh es la confirmación visual del lado
   * del frontend.
   */
  async closeWidget(): Promise<void> {
    this.stopCartPolling();
    await this.session.disconnect();
    this.panelOpen.set(false);
    this.tokenErrorMessage.set(null);
    this.cartService.refresh().subscribe();
  }

  private startCartPolling(): void {
    // Refresco inicial apenas conecta, y luego cada CART_POLL_INTERVAL_MS
    // mientras la sesión sigue abierta — no hay forma de saber desde el
    // frontend cuándo exactamente el Agente 3 llamó POST /cart/add-item sin
    // un canal de datos propio (fuera de alcance de este sprint), así que
    // se hace polling simple en vez de esperar un evento explícito.
    this.cartService.refresh().subscribe();
    this.cartPollSubscription = interval(CART_POLL_INTERVAL_MS)
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.cartService.refresh().subscribe());
  }

  private stopCartPolling(): void {
    this.cartPollSubscription?.unsubscribe();
    this.cartPollSubscription = null;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'No pudimos iniciar la sesión de voz. Intenta de nuevo.';
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.stopCartPolling();
    // Best-effort: si el Cliente navega a otra ruta con el widget abierto,
    // no dejamos el micrófono publicado en una sala huérfana.
    void this.session.disconnect();
  }
}
