import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { UnitDetailComponent } from './unit-detail.component';
import { environment } from '../../../environments/environment';

describe('UnitDetailComponent', () => {
  let fixture: ComponentFixture<UnitDetailComponent>;
  let httpMock: HttpTestingController;

  const unitId = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: unitId }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UnitDetailComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('RF-1.3: registra un cambio de estado y muestra fecha y autor', async () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/inventory/units/${unitId}`).flush({
      id: unitId,
      modelo_id: 'modelo-1',
      numero_serie: 'SN-0001',
      estado: 'Operativo',
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.setValue({ estadoNuevo: 'En Mantenimiento' });
    await component.submit();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/inventory/units/${unitId}/status`,
    );
    expect(req.request.body).toEqual({ estado_nuevo: 'En Mantenimiento' });
    req.flush({
      id: 'log-1',
      unidad_id: unitId,
      estado_anterior: 'Operativo',
      estado_nuevo: 'En Mantenimiento',
      autor_id: 'autor-1',
      created_at: '2026-08-24T10:00:00.000Z',
    });

    expect(component.lastLogEntry()?.estado_nuevo).toBe('En Mantenimiento');
  });
});
