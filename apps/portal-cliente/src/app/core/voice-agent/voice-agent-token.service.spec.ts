import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { VoiceAgentTokenService } from './voice-agent-token.service';

describe('VoiceAgentTokenService', () => {
  let service: VoiceAgentTokenService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VoiceAgentTokenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('llama POST /voice-agent/livekit-token sin body y devuelve las credenciales', () => {
    let result: unknown;
    service.issueLiveKitToken().subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${environment.apiUrl}/voice-agent/livekit-token`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});

    req.flush({
      url: 'wss://livekit.sandbox.toolboxjl.dev',
      token: 'jwt-livekit-token',
      room: 'sala-cliente-123',
    });

    expect(result).toEqual({
      url: 'wss://livekit.sandbox.toolboxjl.dev',
      token: 'jwt-livekit-token',
      room: 'sala-cliente-123',
    });
  });
});
