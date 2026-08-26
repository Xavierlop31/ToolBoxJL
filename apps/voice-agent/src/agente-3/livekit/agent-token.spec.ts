import { TokenVerifier } from "livekit-server-sdk";
import { AGENTE_3_BOT_IDENTITY_PREFIX, mintarTokenDeAgente } from "./agent-token";

describe("mintarTokenDeAgente", () => {
  const config = { url: "wss://x.livekit.cloud", apiKey: "APIkeytest", apiSecret: "supersecretkeyfortesting" };

  it("arma una identity con el prefijo del bot + el nombre de la sala", async () => {
    const resultado = await mintarTokenDeAgente(config, "sala-cliente-123");
    expect(resultado.identity).toBe(`${AGENTE_3_BOT_IDENTITY_PREFIX}-sala-cliente-123`);
  });

  it("produce un JWT firmado que verifica contra el mismo apiKey/apiSecret, con roomJoin y el room correcto", async () => {
    const resultado = await mintarTokenDeAgente(config, "sala-cliente-123");

    const verifier = new TokenVerifier(config.apiKey, config.apiSecret);
    const claims = await verifier.verify(resultado.token);

    expect(claims.video?.roomJoin).toBe(true);
    expect(claims.video?.room).toBe("sala-cliente-123");
    expect(claims.video?.canPublish).toBe(true);
    expect(claims.video?.canSubscribe).toBe(true);
  });

  it("un token mintado para una sala NO es válido para otra sala (roomJoin restringido)", async () => {
    const resultado = await mintarTokenDeAgente(config, "sala-A");
    const verifier = new TokenVerifier(config.apiKey, config.apiSecret);
    const claims = await verifier.verify(resultado.token);
    expect(claims.video?.room).not.toBe("sala-B");
  });
});
