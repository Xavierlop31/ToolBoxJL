import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';

describe('AppComponent', () => {
  let isAuthSignal: ReturnType<typeof signal<boolean>>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(async () => {
    isAuthSignal = signal(false);
    authServiceMock = {
      isAuthenticated: isAuthSignal as never,
      userRoleDisplay: signal('Cliente') as never,
      isLogistica: signal(false) as never,
      isAdminOrGerente: signal(false) as never,
      signOut: jasmine.createSpy('signOut'),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'shell' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('shell');
  });

  it('should render a router-outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should render navbar when user is authenticated', () => {
    isAuthSignal.set(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.navbar')).toBeTruthy();
    expect(compiled.querySelector('.btn-logout')).toBeTruthy();
  });

  it('should call signOut when Salir button is clicked', () => {
    isAuthSignal.set(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const logoutBtn = compiled.querySelector<HTMLButtonElement>('.btn-logout');
    logoutBtn?.click();
    expect(authServiceMock.signOut).toHaveBeenCalled();
  });
});
