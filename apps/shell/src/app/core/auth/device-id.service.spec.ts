import { TestBed } from '@angular/core/testing';

import { DeviceIdService } from './device-id.service';

describe('DeviceIdService', () => {
  const STORAGE_KEY = 'tbjl_device_id';

  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('genera un device_id nuevo y lo persiste en localStorage la primera vez', () => {
    const service = TestBed.inject(DeviceIdService);

    expect(service.deviceId).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(service.deviceId);
  });

  it('reusa el device_id existente en vez de generar uno nuevo', () => {
    localStorage.setItem(STORAGE_KEY, 'ya-existente-uuid');

    const service = TestBed.inject(DeviceIdService);

    expect(service.deviceId).toBe('ya-existente-uuid');
  });
});
