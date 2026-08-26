/**
 * Texto del recordatorio de voz (HU-9.1) — función pura, testeada sin red.
 * Se sintetiza con ElevenLabs y se manda como nota de voz (ver
 * `reminder-job.ts`); por eso es una sola oración corta y sin markdown/
 * abreviaturas raras (se va a LEER en voz alta).
 */
export function construirMensajeRecordatorio(fechaFin: Date): string {
  const fecha = fechaFin.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return (
    `Hola, te habla ToolBox JL. Tu alquiler vence mañana, ${fecha}. ` +
    "Si querés extenderlo, respondé este mensaje contándome hasta cuándo lo necesitás y te ayudo."
  );
}
