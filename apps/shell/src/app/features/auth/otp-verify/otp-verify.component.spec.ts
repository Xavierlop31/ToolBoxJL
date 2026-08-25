import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { Session } from '@supabase/supabase-js';

import { AuthService } from '../../../core/auth/auth.service';
import { DeviceIdService } from '../../../core/auth/device-id.service';
import { DeviceVerificationService } from '../../../core/auth/device-verification.service';
import { OtpService } from '../../../core/auth/otp.service';
import { OtpVerifyComponent } from './otp-verify.component';

describe('OtpVerifyComponent', () => {
  let fixture: ComponentFixture<OtpVerifyComponent>;
  let component: OtpVerifyComponent;
  let otpServiceSpy: jasmine.SpyObj<OtpService>;
  let deviceVerificationSpy: jasmine.SpyObj<DeviceVerificationService>;
  let router: Router;

  const fakeSession = { user: { id: 'user-1' } } as unknown as Session;

  async function setup(options: { session: Session | null; alreadyVerified?: boolean }) {
    otpServiceSpy = jasmine.createSpyObj<OtpService>('OtpService', [
      'requestOtp',
      'verifyOtp',
    ]);
    deviceVerificationSpy = jasmine.createSpyObj<DeviceVerificationService>(
      'DeviceVerificationService',
      ['isVerified', 'markVerified'],
    );
    deviceVerificationSpy.isVerified.and.returnValue(options.alreadyVerified ?? false);

    otpServiceSpy.requestOtp.and.returnValue(
      // Expira en 30 segundos desde "ahora" (jasmine.clock() controla el tiempo).
      new (await import('rxjs')).Observable((subscriber) => {
        subscriber.next({
          otp_id: 'otp-1',
          expira_en: new Date(Date.now() + 30_000).toISOString(),
        });
        subscriber.complete();
      }),
    );

    await TestBed.configureTestingModule({
      imports: [OtpVerifyComponent],
      providers: [
        provideRouter([
          { path: 'home', component: OtpVerifyComponent },
          { path: 'login', component: OtpVerifyComponent },
        ]),
        { provide: AuthService, useValue: { session: () => options.session } },
        { provide: DeviceIdService, useValue: { deviceId: 'device-1' } },
        { provide: DeviceVerificationService, useValue: deviceVerificationSpy },
        { provide: OtpService, useValue: otpServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OtpVerifyComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  }

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('HU-6.2: solicita un OTP nuevo al entrar cuando el dispositivo no está verificado', async () => {
    await setup({ session: fakeSession, alreadyVerified: false });
    fixture.detectChanges();

    expect(otpServiceSpy.requestOtp).toHaveBeenCalledWith('device-1');
    expect(component.otpId()).toBe('otp-1');
  });

  it('redirige a /home sin pedir OTP si el dispositivo ya está verificado', async () => {
    await setup({ session: fakeSession, alreadyVerified: true });
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.detectChanges();

    expect(otpServiceSpy.requestOtp).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/home');
  });

  it('redirige a /login si no hay sesión activa', async () => {
    await setup({ session: null });
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.detectChanges();

    expect(otpServiceSpy.requestOtp).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('con código correcto: marca el dispositivo verificado y navega a /home', async () => {
    await setup({ session: fakeSession, alreadyVerified: false });
    fixture.detectChanges();

    otpServiceSpy.verifyOtp.and.returnValue(
      (await import('rxjs')).of({ verificado: true, device_id: 'device-1' }),
    );
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    component.form.controls.codigo.setValue('123456');
    component.verificar();

    expect(otpServiceSpy.verifyOtp).toHaveBeenCalledWith({
      otp_id: 'otp-1',
      codigo: '123456',
      device_id: 'device-1',
    });
    expect(deviceVerificationSpy.markVerified).toHaveBeenCalledWith('user-1', 'device-1');
    expect(navigateSpy).toHaveBeenCalledWith('/home');
  });

  it('con código incorrecto (400): muestra el error y no navega', async () => {
    await setup({ session: fakeSession, alreadyVerified: false });
    fixture.detectChanges();

    otpServiceSpy.verifyOtp.and.returnValue(
      (await import('rxjs')).throwError(() => ({
        error: { message: 'Código incorrecto, OTP expirado, o ya consumido.' },
      })),
    );
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    component.form.controls.codigo.setValue('000000');
    component.verificar();

    expect(component.errorMessage()).toBe('Código incorrecto, OTP expirado, o ya consumido.');
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(deviceVerificationSpy.markVerified).not.toHaveBeenCalled();
  });

  it('reenviar código llama de nuevo a requestOtp', async () => {
    await setup({ session: fakeSession, alreadyVerified: false });
    fixture.detectChanges();

    expect(otpServiceSpy.requestOtp).toHaveBeenCalledTimes(1);

    component.solicitarOtp();

    expect(otpServiceSpy.requestOtp).toHaveBeenCalledTimes(2);
  });

  it('la cuenta regresiva llega a cero cuando expira el OTP', async () => {
    // `setup()` es async (TestBed.compileComponents) — se resuelve ANTES de
    // entrar a la zona fakeAsync, que debe envolver solo código síncrono
    // para que `tick()` funcione de forma confiable.
    await setup({ session: fakeSession, alreadyVerified: false });

    fakeAsync(() => {
      fixture.detectChanges();

      expect(component.expired).toBeFalse();

      tick(31_000);

      expect(component.secondsRemaining()).toBe(0);
      expect(component.expired).toBeTrue();
    })();
  });
});
