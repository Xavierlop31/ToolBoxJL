import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AnalyticsService } from './analytics.service';
import { RevenueBreakdown } from '../models/analytics.models';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  const mockRevenue: RevenueBreakdown = {
    ventas_directas: 5_000_000,
    tarifas_alquiler: 3_200_000,
    cobros_mora: 450_000,
    total: 8_650_000,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('HU-7.1: obtiene los ingresos desglosados para el periodo indicado', () => {
    service.getRevenue('2026-08').subscribe((revenue) => {
      expect(revenue).toEqual(mockRevenue);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/analytics/revenue?periodo=2026-08`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockRevenue);
  });
});
