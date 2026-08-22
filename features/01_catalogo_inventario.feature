# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 1. Artefacto de Spec-Driven Development (SDD):
# estos escenarios son la fuente canónica de criterios de aceptación ejecutables,
# consumida por Claude Code en la implementación y por el pipeline de QA
# (ver Plan de Implementación §1.1).

@Epica1 @Fase1
Característica: Catálogo e Inventario Serializado (QR)
  Como negocio, necesito que cada unidad física de herramienta tenga identidad
  única y trazable para poder ofrecer disponibilidad real y controlar su hoja
  de vida.

  @RF-1.1 @PrioridadAlta
  Escenario: Administrador registra la ficha técnica de un modelo de herramienta
    Dado que soy un Administrador autenticado
    Cuando registro un nuevo modelo de herramienta con marca, categoría, potencia, peso, volumen, manual en PDF, costo de compra, tarifa diaria, tarifa semanal e interés de mora
    Entonces el modelo se guarda con todos los campos proporcionados
    Y el modelo queda visible en el catálogo interno

  @RF-1.2 @PrioridadAlta
  Escenario: Almacenista genera un código QR único al dar de alta una unidad física
    Dado que soy un Almacenista autenticado y existe un modelo de herramienta registrado
    Cuando doy de alta una unidad física de ese modelo
    Entonces la unidad recibe un identificador UUID único
    Y se genera un código QR imprimible ligado a esa unidad física, no al modelo
    Y el QR es escaneable desde la PWA

  @RF-1.3 @PrioridadAlta
  Escenario: Almacenista registra un cambio de estado de una unidad
    Dado que soy un Almacenista autenticado y tengo identificada una unidad física por su QR
    Cuando registro un cambio de estado de la unidad a uno de "Nuevo", "Excelente", "Operativo", "En Mantenimiento" o "Dado de Baja"
    Entonces el cambio queda registrado en la hoja de vida de la unidad con fecha y autor
    Y puedo adjuntar fotos como evidencia de forma opcional

  @RF-1.4 @PrioridadAlta
  Escenario: Cliente consulta disponibilidad real de una herramienta por fechas
    Dado que soy un Cliente navegando el catálogo
    Cuando consulto la disponibilidad de un modelo para un rango de fechas específico
    Entonces el sistema calcula la disponibilidad sobre unidades físicas no reservadas en ese rango
    Y se me muestra únicamente el número de unidades realmente disponibles
