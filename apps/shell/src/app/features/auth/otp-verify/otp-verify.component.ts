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

  // FormGroup (no un FormControl standalone): `(ngSubmit)` en el template
  // solo lo emite `FormGroupDirective`/`NgForm` cuando el `<form>` tiene
  // `[formGroup]` — sin eso, Angular no intercepta el submit nativo del
  // botón y el navegador termina haciendo un submit HTML real (recarga de
  // página) en vez de llamar a `verificar()`. Mismo criterio que
  // login.component.ts/vehicle-registration.component.ts.
  readonly form = this.formBuilder.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // FormGroup propio (no un FormControl standalone ni parte de `form`):
  // solo se necesita (y valida) cuando `telefonoFaltante()` es true, así
  // que no tiene sentido meterlo junto a `codigo` — pero SÍ necesita estar
  // en un FormGroup para que el `<form [formGroup]>` de más abajo pueda
  // bindearse y que `(ngSubmit)` efectivamente intercepte el submit (ver
  // el comentario de `form` arriba: sin `[formGroup]` el navegador hace un
  // submit HTML nativo — recarga de página — en vez de llamar a
  // `guardarTelefono()`; un `[formControl]` standalone en el input, sin
  // `[formGroup]` en el `<form>`, no alcanza).
  readonly telefonoForm = this.formBuilder.nonNullable.group({
    telefono: ['', [Validators.required, Validators.pattern(/^\+?\d{8,15}$/)]],
  });

  readonly requesting = signal(false);
  readonly verifying = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly otpId = signal<string | null>(null);
  readonly secondsRemaining = signal(0);
  // Login por Google (a diferencia del signUp por correo/contraseña) no
  // pasa por ningún formulario que pida teléfono — cuando el backend
  // rechaza el pedido de OTP con TelefonoNoDisponibleError, mostramos acá
  // mismo un campo para cargarlo y reintentar, en vez de dejar a la persona
  // trabada con un error que no puede resolver desde esta pantalla.
  readonly telefonoFaltante = signal(false);
  readonly guardandoTelefono = signal(false);

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
    this.telefonoFaltante.set(false);
    this.otpId.set(null);
    this.form.reset({ codigo: '' });

    this.otp.requestOtp(this.deviceIdService.deviceId).subscribe({
      next: ({ otp_id, expira_en }) => {
        this.otpId.set(otp_id);
        this.startCountdown(expira_en);
        this.requesting.set(false);
      },
      error: (err) => {
        const mensaje: string | undefined = err?.error?.message;

        // TelefonoNoDisponibleError (apps/api/.../telefono-no-disponible.error.ts)
        // no tiene un código propio en el 400 que devuelve el backend — se
        // matchea por el texto estable del mensaje (el resto es el UUID del
        // usuario, que varía). Login por Google es el caso típico: nunca
        // pasa por un formulario que pida teléfono.
        if (mensaje?.includes('no tiene un teléfono registrado')) {
          this.telefonoFaltante.set(true);
          this.requesting.set(false);
          return;
        }

        this.errorMessage.set(
          mensaje ?? 'No pudimos enviar el código por WhatsApp. Intenta de nuevo.',
        );
        this.requesting.set(false);
      },
    });
  }

  guardarTelefono(): void {
    if (this.telefonoForm.invalid || this.guardandoTelefono()) {
      this.telefonoForm.markAllAsTouched();
      return;
    }

    this.guardandoTelefono.set(true);
    this.errorMessage.set(null);

    this.auth.actualizarTelefono(this.telefonoForm.controls.telefono.value).then((result) => {
      this.guardandoTelefono.set(false);

      if (result.error) {
        this.errorMessage.set(result.error.message);
        return;
      }

      this.telefonoFaltante.set(false);
      this.solicitarOtp();
    });
  }

  verificar(): void {
    const session = this.auth.session();
    const otpId = this.otpId();

    if (!session || !otpId || this.form.invalid || this.verifying() || this.expired) {
      this.form.markAllAsTouched();
      return;
    }

    this.verifying.set(true);
    this.errorMessage.set(null);

    this.otp
      .verifyOtp({
        otp_id: otpId,
        codigo: this.form.controls.codigo.value,
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
