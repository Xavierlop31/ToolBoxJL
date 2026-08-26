import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { VoiceAgentCredentials } from '../models/voice-agent.models';

/**
 * Emite el token de sala LiveKit para abrir una sesión de voz con el
 * Agente 3 (HU-10.1/10.2). Llama `POST /voice-agent/livekit-token`
 * (`x-roles: [cliente]`, sin body) — el JWT de Supabase del Cliente
 * autenticado ya viaja en el header `Authorization` vía
 * `core/auth/auth.interceptor.ts`.
 */
@Injectable({ providedIn: 'root' })
export class VoiceAgentTokenService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  issueLiveKitToken(): Observable<VoiceAgentCredentials> {
    return this.http.post<VoiceAgentCredentials>(
      `${this.apiUrl}/voice-agent/livekit-token`,
      {},
    );
  }
}
