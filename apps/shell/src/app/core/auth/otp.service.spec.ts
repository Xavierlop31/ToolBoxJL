import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { OtpService } from './otp.service';
import { OtpRequestResponse, OtpVerifyResponse } from './otp.models';

describe('OtpService', () => {
  let service: OtpService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OtpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('HU-6.2: solicita un OTP para el device_id dado', () => {
    const mockResponse: OtpRequestResponse = {
      otp_id: 'otp-1',
      expira_en: '2026-08-25T12:05:00.000Z',
    };

    service.requestOtp('device-1').subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/otp/request`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ device_id: 'device-1' });
    req.flush(mockResponse);
  });

  it('HU-6.2: verifica el código ingresado', () => {
    const mockResponse: OtpVerifyResponse = {
      verificado: true,
      device_id: 'device-1',
    };

    service
      .verifyOtp({ otp_id: 'otp-1', codigo: '123456', device_id: 'device-1' })
      .subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/otp/verify`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      otp_id: 'otp-1',
      codigo: '123456',
      device_id: 'device-1',
    });
    req.flush(mockResponse);
  });
});
