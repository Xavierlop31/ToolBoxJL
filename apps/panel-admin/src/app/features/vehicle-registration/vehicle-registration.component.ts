import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FleetService } from '../../core/fleet/fleet.service';
import { TIPOS_VEHICULO, TipoVehiculo, Vehicle } from '../../core/models/fleet.models';

/**
 * Alta de vehículos de la flota (RF-3.1, Issue #11) —
 * features/04_logistica_flota.feature @RF-3.1: "Administrador registra un
 * vehículo de la flota". Llama a `POST /fleet/vehicles`
 * (openapi.yaml líneas 397-417, `x-roles: [admin]`) con `VehicleInput`
 * ({ tipo, capacidad_kg, capacidad_m3, zonas }) y muestra el `Vehicle`
 * registrado — eso cubre el "Entonces el vehículo queda disponible para
 * asignación de rutas" del escenario.
 */
@Component({
  selector: 'app-vehicle-registration',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './vehicle-registration.component.html',
  styleUrl: './vehicle-registration.component.scss',
})
export class VehicleRegistrationComponent {
  private readonly fleet = inject(FleetService);
  private readonly formBuilder = inject(FormBuilder);

  readonly tipos = TIPOS_VEHICULO;

  // Reusadas de apps/portal-cliente/src/app/features/model-detail/
  // model-detail.component.ts (mismo criterio hardcodeado, mismos 3 UUIDs).
  readonly zonas = [
    { id: 'b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e', nombre: 'Zona Norte (Bogotá)' },
    { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nombre: 'Zona Centro (Bogotá)' },
    { id: 'f8e8d8c8-b8a8-4b8c-8d8e-8f8a8b8c8d8e', nombre: 'Zona Sur (Bogotá)' },
  ];

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly vehicle = signal<Vehicle | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    tipo: ['moto' as TipoVehiculo, Validators.required],
    capacidad_kg: [0, [Validators.required, Validators.min(0.01)]],
    capacidad_m3: [0, [Validators.required, Validators.min(0.01)]],
    zonas: this.formBuilder.nonNullable.group(
      Object.fromEntries(this.zonas.map((z) => [z.id, this.formBuilder.nonNullable.control(false)])),
    ),
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const zonasSeleccionadas = Object.entries(raw.zonas)
      .filter(([, checked]) => checked)
      .map(([zonaId]) => zonaId);

    if (zonasSeleccionadas.length === 0) {
      this.submitError.set('Selecciona al menos una zona geográfica.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    this.vehicle.set(null);

    this.fleet
      .registrarVehiculo({
        tipo: raw.tipo,
        capacidad_kg: raw.capacidad_kg,
        capacidad_m3: raw.capacidad_m3,
        zonas: zonasSeleccionadas,
      })
      .subscribe({
        next: (vehicle) => {
          this.vehicle.set(vehicle);
          this.submitting.set(false);
          this.form.reset({
            tipo: 'moto',
            capacidad_kg: 0,
            capacidad_m3: 0,
            zonas: Object.fromEntries(this.zonas.map((z) => [z.id, false])),
          });
        },
        error: (err) => {
          this.submitError.set(
            err?.error?.message ?? 'No pudimos registrar el vehículo. Intenta de nuevo.',
          );
          this.submitting.set(false);
        },
      });
  }

  nombreZona(zonaId: string): string {
    return this.zonas.find((z) => z.id === zonaId)?.nombre ?? zonaId;
  }
}
