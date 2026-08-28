import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'signInWithPassword',
      'signUp',
      'signInWithGoogle',
    ]);
    authServiceSpy.signInWithPassword.and.resolveTo({ error: null });
    authServiceSpy.signUp.and.resolveTo({ error: null });
    authServiceSpy.signInWithGoogle.and.resolveTo({ error: null });

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([{ path: 'home', component: LoginComponent }]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  function setFieldValues(email: string, password: string) {
    component.form.setValue({ email, password });
  }

  function submitForm() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('se crea en modo "signIn" por defecto', () => {
    expect(component.mode()).toBe('signIn');
    expect(component.isSignUp).toBeFalse();
  });

  it('no llama a AuthService si el formulario es inválido', async () => {
    setFieldValues('no-es-un-correo', '123');
    submitForm();
    await fixture.whenStable();

    expect(authServiceSpy.signInWithPassword).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('llama a signInWithPassword con email/contraseña y navega a /home en éxito', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    setFieldValues('cliente@toolboxjl.com', 'secret123');

    submitForm();
    await fixture.whenStable();

    expect(authServiceSpy.signInWithPassword).toHaveBeenCalledWith(
      'cliente@toolboxjl.com',
      'secret123',
    );
    expect(navigateSpy).toHaveBeenCalledWith('/home');
  });

  it('muestra el error de Supabase Auth cuando signInWithPassword falla', async () => {
    authServiceSpy.signInWithPassword.and.resolveTo({
      error: { message: 'Credenciales inválidas' } as never,
    });
    setFieldValues('cliente@toolboxjl.com', 'secret123');

    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Credenciales inválidas');
    const errorEl: HTMLElement = fixture.nativeElement.querySelector('.form-error');
    expect(errorEl.textContent).toContain('Credenciales inválidas');
  });

  it('en modo "signUp" llama a AuthService.signUp en vez de signInWithPassword', async () => {
    component.toggleMode();
    fixture.detectChanges();
    setFieldValues('nuevo@toolboxjl.com', 'secret123');
    component.telefonoControl.setValue('+573001234567');

    submitForm();
    await fixture.whenStable();

    expect(authServiceSpy.signUp).toHaveBeenCalledWith(
      'nuevo@toolboxjl.com',
      'secret123',
      '+573001234567',
    );
    expect(authServiceSpy.signInWithPassword).not.toHaveBeenCalled();
    expect(component.infoMessage()).toContain('Cuenta creada');
  });

  it('en modo "signUp" no llama a AuthService.signUp si el teléfono queda vacío', async () => {
    component.toggleMode();
    fixture.detectChanges();
    setFieldValues('nuevo@toolboxjl.com', 'secret123');

    submitForm();
    await fixture.whenStable();

    expect(authServiceSpy.signUp).not.toHaveBeenCalled();
  });

  it('el botón "Continuar con Google" llama a AuthService.signInWithGoogle', async () => {
    const googleButton: HTMLButtonElement = fixture.debugElement.query(
      By.css('.btn-google'),
    ).nativeElement;

    googleButton.click();
    await fixture.whenStable();

    expect(authServiceSpy.signInWithGoogle).toHaveBeenCalled();
  });
});
