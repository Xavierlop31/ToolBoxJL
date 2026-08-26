import {
  ComponentFixture,
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  flushMicrotasks,
  tick,
} from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { Cart } from '../../core/models/cart.models';
import { VoiceAgentCredentials } from '../../core/models/voice-agent.models';
import { LivekitSessionService, VoiceAgentUiState } from '../../core/voice-agent/livekit-session.service';
import { VoiceAgentTokenService } from '../../core/voice-agent/voice-agent-token.service';
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

describe('VoiceWidgetComponent', () => {
  let fixture: ComponentFixture<VoiceWidgetComponent>;
  let auth: FakeAuthService;
  let cart: FakeCartService;
  let tokenService: FakeVoiceAgentTokenService;
  let session: FakeLivekitSessionService;

  function setup(): void {
    auth = new FakeAuthService();
    cart = new FakeCartService();
    tokenService = new FakeVoiceAgentTokenService();
    session = new FakeLivekitSessionService();

    TestBed.configureTestingModule({
      imports: [VoiceWidgetComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: CartService, useValue: cart },
        { provide: VoiceAgentTokenService, useValue: tokenService },
        { provide: LivekitSessionService, useValue: session },
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
});
