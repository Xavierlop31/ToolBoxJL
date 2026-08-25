import { TestBed } from '@angular/core/testing';

import { DeviceVerificationService } from './device-verification.service';

describe('DeviceVerificationService', () => {
  const STORAGE_KEY = 'tbjl_verified_devices';

  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('un dispositivo nuevo no está verificado por defecto', () => {
    const service = TestBed.inject(DeviceVerificationService);

    expect(service.isVerified('user-1', 'device-1')).toBeFalse();
  });

  it('marca un dispositivo como verificado y lo recuerda', () => {
    const service = TestBed.inject(DeviceVerificationService);

    service.markVerified('user-1', 'device-1');

    expect(service.isVerified('user-1', 'device-1')).toBeTrue();
  });

  it('no confunde la verificación de un usuario/dispositivo con otro', () => {
    const service = TestBed.inject(DeviceVerificationService);

    service.markVerified('user-1', 'device-1');

    expect(service.isVerified('user-1', 'device-2')).toBeFalse();
    expect(service.isVerified('user-2', 'device-1')).toBeFalse();
  });
});
