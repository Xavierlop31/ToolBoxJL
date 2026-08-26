import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  // `rawBody: true` (Sprint 8, Agente 2): expone `req.rawBody` (Buffer) en
  // todos los requests, sin alterar el parseo normal a `req.body` — lo
  // necesita `WhatsAppSignatureGuard` para verificar `X-Hub-Signature-256`
  // sobre los bytes EXACTOS del body de POST /webhooks/whatsapp (la firma no
  // es válida sobre un JSON re-serializado). Costo despreciable para el
  // resto de los endpoints (solo guarda el buffer ya leído, no lee dos veces
  // el stream).
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // openapi.yaml declara los paths sin prefijo (ej. /catalog/search) pero el
  // bloque `servers` fija /api/v1 (ver openapi.yaml líneas 16-20, nota de
  // convención de rutas) — se refleja acá para que la ruta física coincida
  // con lo documentado en `servers`.
  app.setGlobalPrefix("api/v1");

  // Valida los DTOs de request (class-validator) contra el contrato de
  // openapi.yaml antes de llegar a los controllers/use cases — cualquier
  // campo no declarado en el DTO o que no cumpla sus validaciones responde
  // 400 (openapi.yaml `#/components/responses/BadRequest`).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
