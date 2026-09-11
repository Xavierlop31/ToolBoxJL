import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  flushMicrotasks,
  tick,
} from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { Cart } from '../../core/models/cart.models';
import { VoiceAgentCredentials } from '../../core/models/voice-agent.models';
import { LivekitSessionService, VoiceAgentUiState } from '../../core/voice-agent/livekit-session.service';
import { VoiceAgentTokenService } from '../../core/voice-agent/voice-agent-token.service';
import { VoiceAgentEvent } from '../../core/models/voice-agent.models';
import { VoiceWidgetComponent } from './voice-widget.component';

const CREDENTIALS: VoiceAgentCredentials = {
  url: 'wss://livekit.sandbox.toolboxjl.dev',
  token: 'jwt-livekit-token',
  room: 'sala-cliente-123',
};

class FakeAuthService {
  readonly isAuthenticated: WritableSignal<boolean> = signal(true);
}

class FakeCartService {
  readonly itemCount: WritableSignal<number> = signal(0);
  readonly refreshSpy = jasmine.createSpy('refresh').and.returnValue(of({ items: [] } as Cart));

  refresh(): Observable<Cart> {
    return this.refreshSpy();
  }
}

class FakeVoiceAgentTokenService {
  readonly issueLiveKitTokenSpy = jasmine
    .createSpy('issueLiveKitToken')
    .and.returnValue(of(CREDENTIALS));

  issueLiveKitToken(): Observable<VoiceAgentCredentials> {
    return this.issueLiveKitTokenSpy();
  }
}

class FakeLivekitSessionService {
  readonly state: WritableSignal<VoiceAgentUiState> = signal('idle');
  readonly errorMessage: WritableSignal<string | null> = signal(null);
  readonly events: WritableSignal<VoiceAgentEvent[]> = signal([]);
  readonly connectSpy = jasmine.createSpy('connect').and.callFake(async () => {
    this.state.set('listening');
  });
  readonly disconnectSpy = jasmine.createSpy('disconnect').and.callFake(async () => {
    this.state.set('idle');
  });

  connect(credentials: VoiceAgentCredentials): Promise<void> {
    return this.connectSpy(credentials);
  }

  disconnect(): Promise<void> {
    return this.disconnectSpy();
  }
}

class FakeRouter {
  readonly navigateByUrlSpy = jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true));

  navigateByUrl(url: string): Promise<boolean> {
    return this.navigateByUrlSpy(url);
  }
}

describe('VoiceWidgetComponent', () => {
  let fixture: ComponentFixture<VoiceWidgetComponent>;
  let auth: FakeAuthService;
  let cart: FakeCartService;
  let tokenService: FakeVoiceAgentTokenService;
  let session: FakeLivekitSessionService;
  let router: FakeRouter;

  function setup(): void {
    auth = new FakeAuthService();
    cart = new FakeCartService();
    tokenService = new FakeVoiceAgentTokenService();
    session = new FakeLivekitSessionService();
    router = new FakeRouter();

    TestBed.configureTestingModule({
      imports: [VoiceWidgetComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: CartService, useValue: cart },
        { provide: VoiceAgentTokenService, useValue: tokenService },
        { provide: LivekitSessionService, useValue: session },
        { provide: Router, useValue: router },
      ],
    });

    fixture = TestBed.createComponent(VoiceWidgetComponent);
  }

  beforeEach(() => setup());

  it('no renderiza el widget si el Cliente no está autenticado', () => {
    auth.isAuthenticated.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="voice-widget-button"]')).toBeNull();
  });

  it('renderiza el botón flotante cerrado si el Cliente está autenticado', () => {
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('[data-testid="voice-widget-button"]');
    expect(button).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="voice-widget-panel"]')).toBeNull();
  });

  it('muestra el badge del carrito sobre el botón cuando hay ítems', () => {
    cart.itemCount.set(3);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('[data-testid="voice-widget-cart-badge"]');
    expect(badge.textContent.trim()).toBe('3');
  });

  it(
    'al hacer click pide el token LiveKit, conecta la sesión y abre el panel',
    fakeAsync(() => {
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '[data-testid="voice-widget-button"]',
      ) as HTMLButtonElement;
      button.click();
      tick();
      fixture.detectChanges();

      expect(tokenService.issueLiveKitTokenSpy).toHaveBeenCalled();
      expect(session.connectSpy).toHaveBeenCalledWith(CREDENTIALS);
      expect(fixture.nativeElement.querySelector('[data-testid="voice-widget-panel"]')).toBeTruthy();

      const stateEl = fixture.nativeElement.querySelector('[data-testid="voice-widget-state"]');
      expect(stateEl.getAttribute('data-state')).toBe('listening');

      // La sesión sigue abierta: hay un polling periódico del carrito
      // (setInterval vía RxJS) que fakeAsync exige descartar explícitamente
      // al final del test o falla con "periodic timer(s) still in the queue".
      discardPeriodicTasks();
    }),
  );

  it(
    'muestra el error y un botón de reintentar si falla el pedido del token',
    fakeAsync(() => {
      tokenService.issueLiveKitTokenSpy.and.returnValue(
        throwError(() => new Error('No autorizado')),
      );
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '[data-testid="voice-widget-button"]',
      ) as HTMLButtonElement;
      button.click();
      tick();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="voice-widget-error"]');
      expect(errorEl.textContent).toContain('No autorizado');
      expect(session.connectSpy).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[data-testid="voice-widget-retry"]')).toBeTruthy();
    }),
  );

  it(
    'al cerrar el panel, desconecta la sesión y refresca el carrito',
    fakeAsync(() => {
      fixture.detectChanges();
      const openButton = fixture.nativeElement.querySelector(
        '[data-testid="voice-widget-button"]',
      ) as HTMLButtonElement;
      openButton.click();
      tick();
      fixture.detectChanges();

      cart.refreshSpy.calls.reset();

      const closeButton = fixture.nativeElement.querySelector(
        '[data-testid="voice-widget-close"]',
      ) as HTMLButtonElement;
      closeButton.click();
      tick();
      fixture.detectChanges();

      expect(session.disconnectSpy).toHaveBeenCalled();
      expect(cart.refreshSpy).toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[data-testid="voice-widget-panel"]')).toBeNull();
    }),
  );

  it(
    'ngOnDestroy desconecta la sesión (best-effort) aunque el widget siga abierto',
    fakeAsync(() => {
      fixture.detectChanges();
      const openButton = fixture.nativeElement.querySelector(
        '[data-testid="voice-widget-button"]',
      ) as HTMLButtonElement;
      openButton.click();
      tick();

      fixture.destroy();
      flushMicrotasks();
      discardPeriodicTasks();

      expect(session.disconnectSpy).toHaveBeenCalled();
    }),
  );

  function openPanel(): void {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      '[data-testid="voice-widget-button"]',
    ) as HTMLButtonElement;
    button.click();
    tick();
    fixture.detectChanges();
  }

  it(
    'muestra el texto del saludo proactivo en el transcript cuando llega el evento greeting (HU-14.1)',
    fakeAsync(() => {
      openPanel();
      session.events.set([{ type: 'greeting', text: '¡Hola! Soy tu Conserje de Voz.' }]);
      fixture.detectChanges();

      const transcript = fixture.nativeElement.querySelector('[data-testid="voice-widget-transcript"]');
      expect(transcript.textContent.trim()).toBe('¡Hola! Soy tu Conserje de Voz.');

      discardPeriodicTasks();
    }),
  );

  it(
    'no renderiza el transcript si todavía no llegó ningún evento greeting',
    fakeAsync(() => {
      openPanel();

      expect(fixture.nativeElement.querySelector('[data-testid="voice-widget-transcript"]')).toBeNull();

      discardPeriodicTasks();
    }),
  );

  it(
    'muestra un chip animado "running" mientras una tool está en curso (HU-14.2)',
    fakeAsync(() => {
      openPanel();
      session.events.set([
        { type: 'tool_status', tool: 'search_catalog', label: 'Buscando en catálogo…', status: 'running' },
      ]);
      fixture.detectChanges();

      const chip = fixture.nativeElement.querySelector('[data-testid="voice-widget-chip-running"]');
      expect(chip.textContent.trim()).toContain('Buscando en catálogo…');
      expect(fixture.nativeElement.querySelector('[data-testid="voice-widget-chip-done"]')).toBeNull();

      discardPeriodicTasks();
    }),
  );

  it(
    'pasa el chip a estado "done" al concluir la llamada a la tool (HU-14.2)',
    fakeAsync(() => {
      openPanel();
      session.events.set([
        { type: 'tool_status', tool: 'add_to_cart', label: 'Agregando al carrito…', status: 'running' },
        { type: 'tool_status', tool: 'add_to_cart', label: 'Agregando al carrito…', status: 'done' },
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="voice-widget-chip-running"]')).toBeNull();
      const chip = fixture.nativeElement.querySelector('[data-testid="voice-widget-chip-done"]');
      expect(chip.textContent.trim()).toContain('Agregando al carrito…');

      discardPeriodicTasks();
    }),
  );

  it(
    'refleja el diálogo completo (saludo + turnos de usuario/agente) en orden cronológico (HU-14.3)',
    fakeAsync(() => {
      openPanel();
      session.events.set([
        { type: 'greeting', text: '¡Hola! Soy tu Conserje de Voz.' },
        { type: 'transcript', role: 'user', text: 'Busco un taladro percutor.' },
        { type: 'tool_status', tool: 'search_catalog', label: 'Buscando en catálogo…', status: 'done' },
        { type: 'transcript', role: 'agent', text: 'Tenemos un Bosch disponible, ¿te sirve?' },
      ]);
      fixture.detectChanges();

      const mensajes = fixture.nativeElement.querySelectorAll('[data-testid^="voice-widget-message-"]');
      expect(mensajes.length).toBe(3);
      expect(mensajes[0].getAttribute('data-testid')).toBe('voice-widget-message-agent');
      expect(mensajes[0].textContent.trim()).toBe('¡Hola! Soy tu Conserje de Voz.');
      expect(mensajes[1].getAttribute('data-testid')).toBe('voice-widget-message-user');
      expect(mensajes[1].textContent.trim()).toBe('Busco un taladro percutor.');
      expect(mensajes[2].getAttribute('data-testid')).toBe('voice-widget-message-agent');
      expect(mensajes[2].textContent.trim()).toBe('Tenemos un Bosch disponible, ¿te sirve?');

      discardPeriodicTasks();
    }),
  );

  it(
    'al cerrar el panel, si el carrito creció durante la sesión, navega a /carrito para que el Cliente lo vea (HU-14.4)',
    fakeAsync(() => {
      cart.itemCount.set(0);
      openPanel();
      // El Agente 3 agregó 2 ítems durante la sesión (reflejado acá por el
      // polling de `startCartPolling`, no por este test) — al cerrar, el
      // refresh final de `closeWidget` lo confirma.
      cart.itemCount.set(2);

      const closeButton = fixture.nativeElement.querySelector(
        '[data-testid="voice-widget-close"]',
      ) as HTMLButtonElement;
      closeButton.click();
      tick();

      expect(router.navigateByUrlSpy).toHaveBeenCalledWith('/carrito');
    }),
  );

  it(
    'al cerrar el panel sin que el carrito haya crecido en esta sesión, NO navega a /carrito',
    fakeAsync(() => {
      cart.itemCount.set(2); // ya tenía 2 ítems de antes de abrir el widget
      openPanel();
      // Sigue en 2: esta sesión no agregó nada nuevo (el Cliente solo preguntó).

      const closeButton = fixture.nativeElement.querySelector(
        '[data-testid="voice-widget-close"]',
      ) as HTMLButtonElement;
      closeButton.click();
      tick();

      expect(router.navigateByUrlSpy).not.toHaveBeenCalled();
    }),
  );
});
