# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 3.

@Epica3 @Fase1
Característica: Pagos y Depósito de Garantía
  Como cliente, quiero pagar con el método de mi preferencia (PSE, tarjeta o
  contra entrega) y recuperar mi depósito de garantía sin fricción tras una
  devolución conforme.

  @RF-2.2 @RF-2.3 @PrioridadAlta
  Esquema del escenario: Cliente paga una orden con distintos métodos
    Dado que soy un Cliente con una orden confirmada pendiente de pago
    Cuando elijo pagar con "<metodo>"
    Entonces el resultado es "<resultado>"

    Ejemplos:
      | metodo          | resultado                                                                 |
      | PSE              | Wompi (sandbox) procesa el pago inmediatamente                          |
      | tarjeta          | Wompi (sandbox) procesa el pago inmediatamente                          |
      | contra entrega    | el pago queda reservado hasta que el Repartidor lo confirme en la PWA |

  @RF-2.2 @PrioridadAlta
  Escenario: Depósito de garantía como hold al pagar con tarjeta
    Dado que soy un Cliente pagando con tarjeta y mi orden requiere depósito de garantía
    Cuando se procesa el pago
    Entonces el depósito de garantía se ejecuta como un hold (preautorización) y no como un cobro definitivo

  @RF-2.2 @PrioridadAlta
  Escenario: Depósito de garantía cobrado y reembolsado con PSE o contra entrega
    Dado que soy un Cliente pagando con PSE o contra entrega y mi orden requiere depósito de garantía
    Cuando se procesa el pago
    Entonces el depósito de garantía se cobra de inmediato
    Y se reembolsa automáticamente tras una inspección de devolución satisfactoria

  @RF-2.4 @PrioridadMedia
  Escenario: Split automático de pagos entre cuenta matriz y proveedor logístico
    Dado que una orden pagada requiere dispersión de fondos
    Cuando el pago se confirma
    Entonces Wompi (sandbox) simula el split de pago entre la cuenta matriz y la cuenta del proveedor logístico según las reglas configuradas
