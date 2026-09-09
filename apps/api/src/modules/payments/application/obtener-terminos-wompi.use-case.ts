import { Inject, Injectable } from "@nestjs/common";
import type { WompiTerms } from "@toolboxjl/shared-types";
import { WOMPI_GATEWAY } from "../infrastructure/payments.tokens";
import type { WompiGateway } from "../domain/wompi-gateway";

/**
 * GET /payments/wompi-terms — tokens de aceptación (Reglamento + Política de
 * Tratamiento de Datos) que el cliente debe ver y aceptar antes de pagar con
 * PSE o tarjeta (Wompi los exige en toda transacción real, Habeas Data).
 */
@Injectable()
export class ObtenerTerminosWompiUseCase {
  constructor(
    @Inject(WOMPI_GATEWAY)
    private readonly wompi: WompiGateway,
  ) {}

  async ejecutar(): Promise<WompiTerms> {
    return this.wompi.obtenerTerminos();
  }
}
