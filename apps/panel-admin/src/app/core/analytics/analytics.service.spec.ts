import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AnalyticsService } from './analytics.service';
import {
  DeliveryProductivity,
  RevenueBreakdown,
  RoiItem,
  UtilizationSummary,
} from '../models/analytics.models';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  const mockRevenue: RevenueBreakdown = {
    ventas_directas: 5_000_000,
    tarifas_alquiler: 3_200_000,
    cobros_mora: 450_000,
    total: 8_650_000,
  };

  const mockRoi: RoiItem[] = [
    { modelo_id: '11111111-1111-1111-1111-111111111111', roi_pct: 42.5 },
  ];

  const mockUtilization: UtilizationSummary = {
    utilizacion_global_pct: 68.3,
    por_modelo: [
      { modelo_id: '11111111-1111-1111-1111-111111111111', utilizacion_pct: 72.1 },
    ],
  };

  const mockDeliveryProductivity: DeliveryProductivity[] = [
    {
      repartidor_id: '22222222-2222-2222-2222-222222222222',
      entregas_exitosas: 18,
      ruta_asignada: 20,
      tiempo_promedio_min: 12.4,
    },
  ];

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

  it('HU-7.2: obtiene el ROI de todos los modelos cuando no se indica modelo_id', () => {
    service.getRoi().subscribe((roi) => {
      expect(roi).toEqual(mockRoi);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/analytics/roi`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRoi);
  });

  it('HU-7.2: obtiene el ROI de un modelo específico', () => {
    const modeloId = '11111111-1111-1111-1111-111111111111';

    service.getRoi(modeloId).subscribe((roi) => {
      expect(roi).toEqual(mockRoi);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/analytics/roi?modelo_id=${modeloId}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockRoi);
  });

  it('HU-7.3: obtiene la tasa de utilización global y por modelo', () => {
    service.getUtilization().subscribe((utilization) => {
      expect(utilization).toEqual(mockUtilization);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/analytics/utilization`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUtilization);
  });

  it('HU-7.3: obtiene la productividad de entrega por repartidor', () => {
    service.getDeliveryProductivity().subscribe((productivity) => {
      expect(productivity).toEqual(mockDeliveryProductivity);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/analytics/delivery-productivity`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockDeliveryProductivity);
  });
});
