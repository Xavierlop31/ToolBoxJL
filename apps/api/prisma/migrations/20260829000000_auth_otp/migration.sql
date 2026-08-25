-- ToolBox JL — migración de verificación OTP por WhatsApp (Sprint 6, Issue #18, HU-6.2).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL ***
-- Escrita a mano porque este entorno de desarrollo no tiene una conexión a una
-- instancia de Supabase viva. Es responsabilidad de quien tenga las credenciales
-- aplicar este SQL contra la base real.

-- ============================================================================
-- Tabla: otps
-- ============================================================================
CREATE TABLE "otps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "consumido_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otps_usuario_id_device_id_idx" ON "otps"("usuario_id", "device_id");

-- ============================================================================
-- Tabla: device_verifications
-- ============================================================================
CREATE TABLE "device_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_verifications_usuario_id_device_id_key" ON "device_verifications"("usuario_id", "device_id");

-- ============================================================================
-- Row-Level Security (docs/DESIGN.md §4.2)
-- ============================================================================
ALTER TABLE "public"."otps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."device_verifications" ENABLE ROW LEVEL SECURITY;

-- Un usuario puede ver (no escribir) sus propios OTPs/verificaciones — el
-- código en sí queda hasheado (codigo_hash), así que exponer la fila no
-- filtra el código. No se define política de INSERT/UPDATE para
-- "authenticated": OTPs y verificaciones se crean y actualizan
-- exclusivamente desde la API (AuthOtpModule), mismo criterio que el resto
-- de las escrituras transaccionales de la plataforma.
CREATE POLICY "Users can view own OTPs"
ON "public"."otps"
FOR SELECT
USING (usuario_id = auth.uid());

CREATE POLICY "Users can view own device verifications"
ON "public"."device_verifications"
FOR SELECT
USING (usuario_id = auth.uid());
