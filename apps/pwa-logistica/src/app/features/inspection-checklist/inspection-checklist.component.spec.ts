import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { InspectionChecklistComponent } from './inspection-checklist.component';
import { environment } from '../../../environments/environment';

describe('InspectionChecklistComponent', () => {
  let fixture: ComponentFixture<InspectionChecklistComponent>;
  let httpMock: HttpTestingController;

  const unidadId = '22222222-2222-4222-8222-222222222222';
  const shipmentId = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectionChecklistComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ unidadId }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectionChecklistComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('RF-4.2: registra un checklist sin hallazgos como devolución conforme', async () => {
    const component = fixture.componentInstance;
    component.form.controls.shipmentId.setValue(shipmentId);

    await component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/inspections`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      unidad_id: unidadId,
      shipment_id: shipmentId,
      tipo: 'recepcion',
    });
    req.flush({
      id: 'inspection-1',
      unidad_id: unidadId,
      shipment_id: shipmentId,
      tipo: 'recepcion',
      garantia_ejecutada: false,
    });

    expect(component.result()?.garantia_ejecutada).toBe(false);
  });

  it('RF-4.2: un hallazgo grave ejecuta la garantía', async () => {
    const component = fixture.componentInstance;
    component.form.controls.shipmentId.setValue(shipmentId);
    component.addHallazgo();
    component.hallazgos.at(0).setValue({
      descripcion: 'Pieza faltante',
      severidad: 'grave',
    });

    await component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/inspections`);
    expect(req.request.body.hallazgos).toEqual([
      { descripcion: 'Pieza faltante', severidad: 'grave' },
    ]);
    req.flush({
      id: 'inspection-2',
      unidad_id: unidadId,
      shipment_id: shipmentId,
      tipo: 'recepcion',
      hallazgos: [{ descripcion: 'Pieza faltante', severidad: 'grave' }],
      garantia_ejecutada: true,
    });

    expect(component.result()?.garantia_ejecutada).toBe(true);
  });
});
