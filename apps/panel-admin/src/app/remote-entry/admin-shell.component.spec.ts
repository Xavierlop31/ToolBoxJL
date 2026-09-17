import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';

import { AdminShellComponent } from './admin-shell.component';
import { RoleService } from '../core/auth/role.service';
import { Rol } from '../core/models/users.models';

@Component({ standalone: true, template: '<p>stub</p>' })
class StubComponent {}

/** Issue #184-ter: sustituye la sesión real de Supabase por un rol fijo controlable en el test. */
function roleServiceStub(rol: Rol) {
  return { userRole: signal(rol) };
}

async function setup(rol: Rol): Promise<{ fixture: ComponentFixture<AdminShellComponent>; router: Router }> {
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
        { path: 'admin/usuarios', component: StubComponent },
      ]),
      { provide: RoleService, useValue: roleServiceStub(rol) },
    ],
  }).compileComponents();

  const router = TestBed.inject(Router);
  const fixture = TestBed.createComponent(AdminShellComponent);
  return { fixture, router };
}

describe('AdminShellComponent', () => {
  it('Issue #184/Épica 16: expone los 10 ítems de navegación en el orden acordado (independiente del rol)', async () => {
    const { fixture } = await setup('admin');
    expect(fixture.componentInstance.navItems.map((item) => item.path)).toEqual([
      '/admin/dashboard-kpis',
      '/admin/almacen',
      '/admin/mantenimiento',
      '/admin/rutas',
      '/admin/ingresos',
      '/admin/roi',
      '/admin/envios',
      '/admin/utilizacion-productividad',
      '/admin/vehiculos/nuevo',
      '/admin/usuarios',
    ]);
  });

  it('admin ve los 10 links del sidenav', async () => {
    const { fixture } = await setup('admin');
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('.sidenav-items a'));
    expect(links.length).toBe(10);
    expect(links[1].nativeElement.getAttribute('data-testid')).toBe('sidenav-almacen');
    expect(links[9].nativeElement.getAttribute('data-testid')).toBe('sidenav-usuarios');
  });

  it('Issue #184-ter: gerente ve solo 5 links (dashboard/mantenimiento/ingresos/roi/utilización)', async () => {
    const { fixture } = await setup('gerente');
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('.sidenav-items a'));
    expect(links.map((l) => l.nativeElement.getAttribute('data-testid'))).toEqual([
      'sidenav-dashboard',
      'sidenav-mantenimiento',
      'sidenav-ingresos',
      'sidenav-roi',
      'sidenav-utilizacion',
    ]);
  });

  it('marca como activo el ítem que corresponde a la ruta actual', async () => {
    const { fixture, router } = await setup('admin');
    fixture.detectChanges();
    await router.navigateByUrl('/admin/almacen');
    fixture.detectChanges();

    const activeLinks = fixture.debugElement.queryAll(By.css('.sidenav-items a.active'));
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0].nativeElement.getAttribute('data-testid')).toBe('sidenav-almacen');
  });

  it('deriva el título del TopAppBar de la sección activa', async () => {
    const { fixture, router } = await setup('admin');
    await router.navigateByUrl('/admin/mantenimiento');
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTitle()).toBe('Mantenimiento');
  });

  it('arranca con el título por defecto "Panel de Control" antes de resolver la ruta activa', async () => {
    const { fixture } = await setup('admin');
    expect(fixture.componentInstance.activeTitle()).toBe('Panel de Control');
  });
});
