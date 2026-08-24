import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CatalogSearchComponent } from './catalog-search.component';
import { environment } from '../../../environments/environment';

describe('CatalogSearchComponent', () => {
  let fixture: ComponentFixture<CatalogSearchComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogSearchComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
    expect(fixture.componentInstance.results().length).toBe(1);
  });
});
