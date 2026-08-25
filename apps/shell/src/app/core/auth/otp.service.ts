import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  OtpRequestResponse,
  OtpVerifyInput,
  OtpVerifyResponse,
} from './otp.models';

/**
 * Consume `POST /auth/otp/request` y `POST /auth/otp/verify` (HU-6.2,
 * Issue #18 — features/06_autenticacion_seguridad.feature @HU-6.2:
 * "Verificación por OTP de WhatsApp en dispositivo nuevo"), openapi.yaml
 * líneas 66-145. Requiere el JWT de la sesión de Supabase Auth ya activa
 * (adjuntado por `authInterceptor`) — este paso ocurre siempre DESPUÉS de
 * un login/registro exitoso, nunca antes.
 */
@Injectable({ providedIn: 'root' })
export class OtpService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  requestOtp(deviceId: string): Observable<OtpRequestResponse> {
    return this.http.post<OtpRequestResponse>(`${this.baseUrl}/auth/otp/request`, {
      device_id: deviceId,
    });
  }

  verifyOtp(input: OtpVerifyInput): Observable<OtpVerifyResponse> {
    return this.http.post<OtpVerifyResponse>(`${this.baseUrl}/auth/otp/verify`, input);
  }
}
