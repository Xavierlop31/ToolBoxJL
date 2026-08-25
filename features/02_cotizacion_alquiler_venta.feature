# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 2.

@Epica2 @Fase1
Característica: Cotización, Alquiler y Venta
  Como cliente, quiero cotizar y reservar una herramienta de forma autoservicio,
  con el costo total (incluida logística y garantía) claro antes de pagar.

  @RF-2.1 @PrioridadAlta
  Escenario: Cliente cotiza el costo de un alquiler
    Dado que soy un Cliente con un modelo, un rango de fechas y una dirección de entrega seleccionados
    Cuando solicito una cotización de alquiler
    Entonces el sistema calcula la tarifa por días, el recargo logístico por peso/zona y el depósito de garantía si aplica
    Y me muestra cada concepto desglosado por separado
    Y me muestra el total a pagar

  @RF-2.2 @PrioridadMedia
  Escenario: Cliente compra una herramienta directamente en lugar de alquilarla
    Dado que un modelo está marcado como disponible para venta
    Cuando selecciono la modalidad "Venta" en lugar de "Alquiler" para ese modelo
    Entonces el catálogo me permite completar el proceso de compra en modalidad venta

  @RF-2.3 @PrioridadAlta
  Escenario: Administrador configura el porcentaje de depósito de garantía por modelo
    Dado que soy un Administrador autenticado
    Cuando configuro el porcentaje de depósito de garantía para un modelo específico
    Entonces el porcentaje queda asociado a ese modelo
    Y puedo activar o desactivar la exigencia de depósito de garantía para ese modelo
