# language: es
# Fuente: docs/08_PRD_Fase3_Historias_de_Usuario_ToolBoxJL.md, Épica 15.

@Epica15 @Fase3
Característica: Rediseño Gerencial de Dashboard de KPIs
  Como director general o gerente
  Quiero un panel ejecutivo de alto nivel según el diseño de Stitch
  Para evaluar el desempeño financiero y operativo del negocio.

  @HU-15.1 @DashboardGerencial @KPIsStitch
  Escenario: Visualización de KPIs ejecutivos de alto impacto
    Dado que accedo a "/admin/dashboard-kpis"
    Entonces visualizo las métricas consolidadas: Ingresos Totales del Mes (COP) con variación porcentual, Tasa de Ocupación Global de Flota (%), Total Recaudado por Moras (COP) e Índice de Retorno de Inversión Promedio (ROI %).

  @HU-15.1 @DashboardGerencial @KPIsStitch
  Escenario: Panel de Alertas Críticas del Negocio
    Dado que existen herramientas con más de 3 ingresos a taller en el mes o clientes con más de 5 días de mora
    Cuando visualizo el panel de "Alertas Críticas"
    Entonces se listan tarjetas de alerta clasificadas por severidad (Alta, Media, Informativa) con botones de acción directa ("Revisar Ficha / Dar de Baja", "Ver Contrato / Contactar").
