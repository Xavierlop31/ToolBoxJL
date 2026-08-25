import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { ModelDetailComponent } from './model-detail.component';
import { environment } from '../../../environments/environment';

describe('ModelDetailComponent', () => {
  let fixture: ComponentFixture<ModelDetailComponent>;
  let httpMock: HttpTestingController;

  const modelId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: modelId }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelDetailComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('RF-1.4: consulta disponibilidad y muestra solo unidades realmente disponibles', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/catalog/models/${modelId}`)
      .flush({
        id: modelId,
        nombre: 'Taladro',
        marca: 'DeWalt',
        categoria: 'Taladros',
        tarifa_dia: 25000,
      });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.setValue({
      tipo: 'alquiler',
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-05',
      direccionEntrega: 'Calle Falsa 123',
      zonaId: 'zona-test-uuid',
    });
    component.checkAvailability();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/inventory/check-availability`,
    );
    req.flush({ modelo_id: modelId, unidades_disponibles: 2 });

    expect(component.unidadesDisponibles()).toBe(2);
  });
});
