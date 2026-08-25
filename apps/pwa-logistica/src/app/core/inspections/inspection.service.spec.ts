import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { InspectionService } from './inspection.service';

describe('InspectionService', () => {
  let service: InspectionService;
  let httpMock: HttpTestingController;

  const unidadId = '22222222-2222-4222-8222-222222222222';
  const shipmentId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InspectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('RF-4.2: registra un checklist de inspección de recepción con hallazgos', () => {
    service
      .submitChecklist(unidadId, {
        shipment_id: shipmentId,
        tipo: 'recepcion',
        hallazgos: [{ descripcion: 'Daño en carcasa', severidad: 'moderada' }],
        fotos_urls: ['blob:foto1'],
      })
      .subscribe((checklist) => {
        expect(checklist.garantia_ejecutada).toBe(true);
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/inspections`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      unidad_id: unidadId,
      shipment_id: shipmentId,
      tipo: 'recepcion',
      hallazgos: [{ descripcion: 'Daño en carcasa', severidad: 'moderada' }],
      fotos_urls: ['blob:foto1'],
    });
    req.flush({
      id: 'inspection-1',
      unidad_id: unidadId,
      shipment_id: shipmentId,
      tipo: 'recepcion',
      hallazgos: [{ descripcion: 'Daño en carcasa', severidad: 'moderada' }],
      fotos_urls: ['blob:foto1'],
      garantia_ejecutada: true,
    });
  });
});
