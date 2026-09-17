import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { SortToggleComponent } from './sort-toggle.component';

describe('SortToggleComponent', () => {
  let fixture: ComponentFixture<SortToggleComponent>;
  let component: SortToggleComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SortToggleComponent] });
    fixture = TestBed.createComponent(SortToggleComponent);
    component = fixture.componentInstance;
  });

  it('por defecto muestra "Mayor a menor" (direction desc)', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('button')).nativeElement.textContent).toContain(
      'Mayor a menor',
    );
  });

  it('al hacer click emite la dirección contraria a la actual', () => {
    fixture.componentRef.setInput('direction', 'desc');
    fixture.detectChanges();

    let emitido: string | undefined;
    component.directionChange.subscribe((d) => (emitido = d));

    fixture.debugElement.query(By.css('button')).nativeElement.click();

    expect(emitido).toBe('asc');
  });

  it('cuando direction es asc, muestra "Menor a mayor" y al click emite desc', () => {
    fixture.componentRef.setInput('direction', 'asc');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button')).nativeElement.textContent).toContain(
      'Menor a mayor',
    );

    let emitido: string | undefined;
    component.directionChange.subscribe((d) => (emitido = d));
    fixture.debugElement.query(By.css('button')).nativeElement.click();

    expect(emitido).toBe('desc');
  });
});
