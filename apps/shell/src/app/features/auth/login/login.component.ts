import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

type AuthMode = 'signIn' | 'signUp';

/**
 * Pantalla de login/registro — HU-6.1 (Issue #17).
 * Cubre features/06_autenticacion_seguridad.feature, escenario "Cliente
 * inicia sesión con correo/contraseña o con Google". El segundo escenario
 * (OTP WhatsApp) es Sprint 6 y no se implementa acá.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode = signal<AuthMode>('signIn');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Standalone y no parte de `form`: en signIn no debe existir (ni
  // validarse), así que meterlo en el FormGroup obligaría a togglear sus
  // validators ahí también sin ganar nada — separado es más simple de leer.
  readonly telefonoControl = this.formBuilder.nonNullable.control('');

  get isSignUp(): boolean {
    return this.mode() === 'signUp';
  }

  toggleMode(): void {
    this.mode.set(this.isSignUp ? 'signIn' : 'signUp');
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    if (this.isSignUp) {
      this.telefonoControl.addValidators([
        Validators.required,
        Validators.pattern(/^\+?\d{8,15}$/),
      ]);
    } else {
      this.telefonoControl.clearValidators();
      this.telefonoControl.reset('');
    }
    this.telefonoControl.updateValueAndValidity();
  }

  async submit(): Promise<void> {
    if (
      this.form.invalid ||
      (this.isSignUp && this.telefonoControl.invalid) ||
      this.loading()
    ) {
      this.form.markAllAsTouched();
      this.telefonoControl.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    const { email, password } = this.form.getRawValue();
    const result = this.isSignUp
      ? await this.auth.signUp(email, password, this.telefonoControl.value)
      : await this.auth.signInWithPassword(email, password);

    this.loading.set(false);

    if (result.error) {
      this.errorMessage.set(result.error.message);
      return;
    }

    if (this.isSignUp) {
      this.infoMessage.set(
        'Cuenta creada. Revisá tu correo para confirmar el registro.',
      );
      return;
    }

    await this.router.navigateByUrl('/home');
  }

  async continueWithGoogle(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    const result = await this.auth.signInWithGoogle();

    this.loading.set(false);

    if (result.error) {
      this.errorMessage.set(result.error.message);
    }
    // En éxito, Supabase Auth redirige el navegador a Google y de vuelta a
    // la app — no hay navegación manual que hacer acá.
  }
}
