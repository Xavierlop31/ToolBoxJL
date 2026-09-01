import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CatalogSearchComponent } from './catalog-search.component';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

describe('CatalogSearchComponent', () => {
  let fixture: ComponentFixture<CatalogSearchComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        // ActiveOrdersComponent (embebido en el template, Sprint 12) inyecta
        // AuthService — se mockea sin sesión para no arrastrar el cliente
        // real de Supabase a estos tests, que no versan sobre auth.
        { provide: AuthService, useValue: { isAuthenticated: () => false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogSearchComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('carga el catálogo al iniciar (RF-1.1)', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/catalog/search`,
    );
    req.flush([
      {
        id: '1',
        nombre: 'Taladro',
        marca: 'DeWalt',
        categoria: 'Taladros',
        tarifa_dia: 25000,
      },
    ]);

    fixture.detectChanges();
    expect(fixture.componentInstance.results()).toHaveSize(1);
  });

  it('HU-12.1: pide la primera página con pageSize=6 por defecto', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/catalog/search`,
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('6');
    req.flush([], { headers: { 'X-Total-Count': '0' } });
  });

  it('HU-12.1: lee el total real del header X-Total-Count y calcula totalPages', () => {
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/catalog/search`)
      .flush([{ id: '1', nombre: 'Taladro', marca: 'DeWalt', categoria: 'Taladros', tarifa_dia: 25000 }], {
        headers: { 'X-Total-Count': '13' },
      });
    fixture.detectChanges();

    expect(fixture.componentInstance.total()).toBe(13);
    expect(fixture.componentInstance.totalPages()).toBe(3); // ceil(13/6)
  });

  it('HU-12.1: cambiar de página vuelve a pedir con el page nuevo', () => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/catalog/search`)
      .flush([], { headers: { 'X-Total-Count': '20' } });
    fixture.detectChanges();

    fixture.componentInstance.goToPage(2);

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/catalog/search`);
    expect(req.request.params.get('page')).toBe('2');
    req.flush([], { headers: { 'X-Total-Count': '20' } });
  });

  it('HU-12.1: cambiar el tamaño de página resetea a la página 1', () => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/catalog/search`)
      .flush([], { headers: { 'X-Total-Count': '20' } });
    fixture.detectChanges();

    fixture.componentInstance.goToPage(2);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/catalog/search`)
      .flush([], { headers: { 'X-Total-Count': '20' } });

    fixture.componentInstance.setPageSize(24);

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/catalog/search`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('24');
    req.flush([], { headers: { 'X-Total-Count': '20' } });
  });
});
