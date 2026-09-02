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

  it('RF-1.3: registra un cambio de estado a Operativo (sin campos condicionales) y muestra fecha y autor', async () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/inventory/units/${unitId}`).flush({
      id: unitId,
      modelo_id: 'modelo-1',
      numero_serie: 'SN-0001',
      estado: 'Operativo',
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.patchValue({ estadoNuevo: 'Operativo' });
    await component.submit();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/inventory/units/${unitId}/status`,
    );
    expect(req.request.body).toEqual({ estado_nuevo: 'Operativo' });
    req.flush({
      id: 'log-1',
      unidad_id: unitId,
      estado_anterior: 'Operativo',
      estado_nuevo: 'Operativo',
      autor_id: 'autor-1',
      created_at: '2026-08-24T10:00:00.000Z',
    });

    expect(component.lastLogEntry()?.estado_nuevo).toBe('Operativo');
  });

  it('HU-13.3: exige los campos de taller cuando el destino es "En Mantenimiento" y no envía la mutación si faltan', async () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/inventory/units/${unitId}`).flush({
      id: unitId,
      modelo_id: 'modelo-1',
      numero_serie: 'SN-0001',
      estado: 'Operativo',
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.patchValue({ estadoNuevo: 'En Mantenimiento' });
    await component.submit();

    httpMock.expectNone(`${environment.apiUrl}/inventory/units/${unitId}/status`);
    expect(component.validationError()).toContain('Tipo');
  });

  it('HU-13.3: envía los campos de taller cuando el destino es "En Mantenimiento" y están completos', async () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/inventory/units/${unitId}`).flush({
      id: unitId,
      modelo_id: 'modelo-1',
      numero_serie: 'SN-0001',
      estado: 'Operativo',
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.patchValue({
      estadoNuevo: 'En Mantenimiento',
      tipoMantenimiento: 'Correctivo',
      fallaReportada: 'No enciende',
      tecnicoAsignado: 'Juan Pérez',
      costoEstimado: 80000,
      fechaPrevistaFin: '2026-09-10',
    });
    await component.submit();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/inventory/units/${unitId}/status`,
    );
    expect(req.request.body).toEqual({
      estado_nuevo: 'En Mantenimiento',
      tipo_mantenimiento: 'Correctivo',
      falla_reportada: 'No enciende',
      tecnico_asignado: 'Juan Pérez',
      costo_estimado: 80000,
      fecha_prevista_fin: '2026-09-10',
    });
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

  it('HU-13.3: exige motivo_baja cuando el destino es "Dado de Baja" y lo envía si está presente', async () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/inventory/units/${unitId}`).flush({
      id: unitId,
      modelo_id: 'modelo-1',
      numero_serie: 'SN-0001',
      estado: 'Operativo',
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.patchValue({ estadoNuevo: 'Dado de Baja' });
    await component.submit();
    httpMock.expectNone(`${environment.apiUrl}/inventory/units/${unitId}/status`);
    expect(component.validationError()).toContain('motivo');

    component.form.patchValue({ motivoBaja: 'Daño irreparable en el motor' });
    await component.submit();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/inventory/units/${unitId}/status`,
    );
    expect(req.request.body).toEqual({
      estado_nuevo: 'Dado de Baja',
      motivo_baja: 'Daño irreparable en el motor',
    });
    req.flush({
      id: 'log-2',
      unidad_id: unitId,
      estado_anterior: 'Operativo',
      estado_nuevo: 'Dado de Baja',
      autor_id: 'autor-1',
      created_at: '2026-08-24T10:00:00.000Z',
    });
  });

  it('la cola offline soporta los campos de mantenimiento/baja sin cambios en OfflineQueueService/OfflineSyncService', async () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/inventory/units/${unitId}`).flush({
      id: unitId,
      modelo_id: 'modelo-1',
      numero_serie: 'SN-0001',
      estado: 'Operativo',
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    // `spyOnProperty` restaura el getter original al terminar este `it()`
    // (a diferencia de `Object.defineProperty` directo sobre `navigator`,
    // que crea una propiedad propia que sombrea el getter del prototipo y
    // NO se puede restaurar leyendo `getOwnPropertyDescriptor(navigator,
    // 'onLine')` de antemano — esa lectura da `undefined` porque `onLine`
    // vive en `Navigator.prototype`, no en la instancia).
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);

    component.form.patchValue({
      estadoNuevo: 'En Mantenimiento',
      tipoMantenimiento: 'Preventivo',
      fallaReportada: 'Revisión programada',
      tecnicoAsignado: 'Ana Gómez',
      costoEstimado: 30000,
      fechaPrevistaFin: '2026-09-20',
    });
    await component.submit();

    expect(component.queuedOffline()).toBeTrue();
    httpMock.expectNone(`${environment.apiUrl}/inventory/units/${unitId}/status`);
  });
});
