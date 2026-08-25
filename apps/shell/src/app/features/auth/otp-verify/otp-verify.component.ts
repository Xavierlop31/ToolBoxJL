import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { DeviceIdService } from '../../../core/auth/device-id.service';
import { DeviceVerificationService } from '../../../core/auth/device-verification.service';
import { OtpService } from '../../../core/auth/otp.service';

/**
 * Pantalla de verificación por OTP de WhatsApp en dispositivo nuevo
 * (HU-6.2, Issue #18) — features/06_autenticacion_seguridad.feature
 * @HU-6.2: "Verificación por OTP de WhatsApp en dispositivo nuevo".
 *
 * Llega acá cualquier sesión de Supabase Auth activa (correo/contraseña o
 * Google, login o registro — `login.component.ts`) cuyo `device_id` local
 * todavía no fue marcado como verificado (`DeviceVerificationService`).
 * El `authGuard` de `app.routes.ts` es quien redirige acá y quien bloquea
 * el resto de las rutas protegidas hasta que este componente llame
 * `markVerified()` — ver la nota completa en `auth.guard.ts`.
 *
 * Al entrar, solicita un OTP nuevo (`POST /auth/otp/request`) y arranca la
 * cuenta regresiva hasta `expira_en`. Verificar el código correcto antes de
 * que expire (`POST /auth/otp/verify`) marca el dispositivo como
 * verificado localmente y navega a `/home`. Código incorrecto o expirado
 * (400) se muestra como error, con opción de reenviar.
 */
@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './otp-verify.component.html',
  styleUrl: './otp-verify.component.scss',
})
export class OtpVerifyComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly otp = inject(OtpService);
  private readonly deviceIdService = inject(DeviceIdService);
  private readonly deviceVerification = inject(DeviceVerificationService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  readonly codeControl = this.formBuilder.nonNullable.control('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  readonly requesting = signal(false);
  readonly verifying = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly otpId = signal<string | null>(null);
  readonly secondsRemaining = signal(0);

  private countdownHandle: ReturnType<typeof setInterval> | null = null;

  get expired(): boolean {
    return this.otpId() !== null && this.secondsRemaining() <= 0;
  }

  ngOnInit(): void {
    const session = this.auth.session();
    if (!session) {
      // sessionGuard ya debería impedir llegar acá sin sesión; defensivo.
      void this.router.navigateByUrl('/login');
      return;
    }

    if (this.deviceVerification.isVerified(session.user.id, this.deviceIdService.deviceId)) {
      void this.router.navigateByUrl('/home');
      return;
    }

    this.solicitarOtp();
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  solicitarOtp(): void {
    if (this.requesting()) {
      return;
    }

    this.requesting.set(true);
    this.errorMessage.set(null);
    this.otpId.set(null);
    this.codeControl.reset('');

    this.otp.requestOtp(this.deviceIdService.deviceId).subscribe({
      next: ({ otp_id, expira_en }) => {
        this.otpId.set(otp_id);
        this.startCountdown(expira_en);
        this.requesting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(
          err?.error?.message ??
            'No pudimos enviar el código por WhatsApp. Intenta de nuevo.',
        );
        this.requesting.set(false);
      },
    });
  }

  verificar(): void {
    const session = this.auth.session();
    const otpId = this.otpId();

    if (!session || !otpId || this.codeControl.invalid || this.verifying() || this.expired) {
      this.codeControl.markAsTouched();
      return;
    }

    this.verifying.set(true);
    this.errorMessage.set(null);

    this.otp
      .verifyOtp({
        otp_id: otpId,
        codigo: this.codeControl.value,
        device_id: this.deviceIdService.deviceId,
      })
      .subscribe({
        next: ({ verificado }) => {
          this.verifying.set(false);

          if (!verificado) {
            this.errorMessage.set('Código incorrecto. Intenta de nuevo.');
            return;
          }

          this.deviceVerification.markVerified(session.user.id, this.deviceIdService.deviceId);
          void this.router.navigateByUrl('/home');
        },
        error: (err) => {
          this.verifying.set(false);
          this.errorMessage.set(
            err?.error?.message ?? 'Código incorrecto o expirado. Solicita uno nuevo.',
          );
        },
      });
  }

  private startCountdown(expiraEn: string): void {
    this.clearCountdown();
    const expiraMs = new Date(expiraEn).getTime();

    const tick = () => {
      const remaining = Math.max(0, Math.round((expiraMs - Date.now()) / 1000));
      this.secondsRemaining.set(remaining);
      if (remaining <= 0) {
        this.clearCountdown();
      }
    };

    tick();
    this.countdownHandle = setInterval(tick, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownHandle !== null) {
      clearInterval(this.countdownHandle);
      this.countdownHandle = null;
    }
  }
}
