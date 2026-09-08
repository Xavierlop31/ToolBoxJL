import { Inject, Injectable } from "@nestjs/common";
import type { PseBank } from "@toolboxjl/shared-types";
import { WOMPI_GATEWAY } from "../infrastructure/payments.tokens";
import type { WompiGateway } from "../domain/wompi-gateway";

/** GET /payments/pse-banks — pobla el selector de banco antes de un pago PSE. */
@Injectable()
export class ListarBancosPseUseCase {
  constructor(
    @Inject(WOMPI_GATEWAY)
    private readonly wompi: WompiGateway,
  ) {}

  async ejecutar(): Promise<PseBank[]> {
    return this.wompi.listarBancosPse();
  }
}
