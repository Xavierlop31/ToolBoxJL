import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';

import { AdminShellComponent } from './admin-shell.component';

@Component({ standalone: true, template: '<p>stub</p>' })
class StubComponent {}

describe('AdminShellComponent', () => {
  let fixture: ComponentFixture<AdminShellComponent>;
  let component: AdminShellComponent;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminShellComponent],
      providers: [
        provideRouter([
          { path: 'admin/dashboard-kpis', component: StubComponent },
          { path: 'admin/almacen', component: StubComponent },
          { path: 'admin/mantenimiento', component: StubComponent },
          { path: 'admin/rutas', component: StubComponent },
          { path: 'admin/ingresos', component: StubComponent },
          { path: 'admin/roi', component: StubComponent },
          { path: 'admin/envios', component: StubComponent },
          { path: 'admin/utilizacion-productividad', component: StubComponent },
          { path: 'admin/vehiculos/nuevo', component: StubComponent },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AdminShellComponent);
    component = fixture.componentInstance;
  });

  it('Issue #184: expone los 9 ítems de navegación en el orden acordado', () => {
    expect(component.navItems.map((item) => item.path)).toEqual([
      '/admin/dashboard-kpis',
      '/admin/almacen',
      '/admin/mantenimiento',
      '/admin/rutas',
      '/admin/ingresos',
      '/admin/roi',
      '/admin/envios',
      '/admin/utilizacion-productividad',
      '/admin/vehiculos/nuevo',
    ]);
  });

  it('renderiza los 9 links del sidenav con su routerLink', () => {
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('.sidenav-items a'));
    expect(links.length).toBe(9);
    expect(links[1].nativeElement.getAttribute('data-testid')).toBe('sidenav-almacen');
  });

  it('marca como activo el ítem que corresponde a la ruta actual', async () => {
    fixture.detectChanges();
    await router.navigateByUrl('/admin/almacen');
    fixture.detectChanges();

    const activeLinks = fixture.debugElement.queryAll(By.css('.sidenav-items a.active'));
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0].nativeElement.getAttribute('data-testid')).toBe('sidenav-almacen');
  });

  it('deriva el título del TopAppBar de la sección activa', async () => {
    await router.navigateByUrl('/admin/mantenimiento');
    fixture.detectChanges();

    expect(component.activeTitle()).toBe('Mantenimiento');
  });

  it('arranca con el título por defecto "Panel de Control" antes de resolver la ruta activa', () => {
    expect(component.activeTitle()).toBe('Panel de Control');
  });
});
