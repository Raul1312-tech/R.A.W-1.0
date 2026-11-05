# Coordinador: propuestas conectadas

## Estrategia semanal (6 de noviembre de 2026)

La acción `strategy` amplía las acciones diarias descritas más abajo. Regenera las sesiones futuras a partir del catálogo y configuración del usuario (deporte, nivel, material, prioridad, días físicos y carrera), con fase base, desarrollo o descarga. La IA elige entre las alternativas calculadas; no inventa libremente una prescripción. Tres sesiones completas con RPE ≤7 permiten plantear desarrollo. Fatiga registrada o competición próxima orientan a descarga. El incremento de series por sesión se limita al 20 %; no se infieren kilos de trabajo.

Para modificar energía exige al menos tres pesos en cada semana de los últimos catorce días y diez días completos con ingesta cercana al objetivo, que además debe ser comparable al actual. Compara medias semanales, descarta fluctuaciones internas superiores al 4 % y aplica pasos máximos de 150 kcal y 5 %. Los intervalos orientativos de progreso son 0,1–0,3 % semanal en ganancia, −0,25 a −0,5 % en pérdida y ±0,15 % en mantenimiento. Son reglas de producto, no límites clínicos universales. No se baja energía con fatiga, IMC inferior a 20, pesaje en los próximos catorce días o categoría que exigiría una pérdida superior al 0,5 % semanal. El mínimo estimado combina metabolismo basal y mantenimiento, pero no estima disponibilidad energética individual.

La propuesta empieza mañana y cubre siete días. Mantiene días históricos, sesiones iniciadas, fechas de calendario personalizadas y fotos de comidas ya fijadas. Conserva platos habituales, muestra los menús completos y advierte si estos se alejan del nuevo objetivo. Actualiza el objetivo energético de referencia y guarda fotos diarias de los nuevos menús para que la compra mensual use las mismas cantidades. No añade suplementos ni manipula agua o sal. Una estrategia aceptada impide aceptar otra durante siete días; después se vuelven a exigir datos suficientes. Los menús mensuales fuera del periodo propuesto no se reescriben automáticamente y deben revisarse en la siguiente planificación.

Referencias de contexto: [AIS, Making Weight](https://www.ausport.gov.au/ais/position_statements/making-weight-in-weight-category-sports), [Garthe et al., 2011](https://pubmed.ncbi.nlm.nih.gov/21558571/), [revisión de puesta a punto en fuerza](https://pmc.ncbi.nlm.nih.gov/articles/PMC7552788/). La evidencia orienta la pérdida progresiva y reducción de volumen; no valida este algoritmo ni permite equiparar datos de powerlifting con una prescripción individual de boxeo.

## Alcance de esta versión

El servidor carga el perfil del usuario autenticado. Calcula alternativas válidas y envía a OpenAI únicamente señales agregadas, hechos y efectos numéricos de esas alternativas. Structured Outputs limita la respuesta a identificadores de hechos y una acción. Tanto cliente como servidor validan que la acción siga siendo admisible.

- `keep`: conservar el plan.
- `ease`: una serie menos por ejercicio pendiente (mínimo una), si existen señales registradas de recuperación insuficiente. No cambia cargas, repeticiones o descansos, ni sesiones iniciadas.
- `fuel`: acercar las porciones pendientes al objetivo nutricional existente.
- `coordinate`: aplicar ambos ajustes en una única actualización del perfil.

La IA elige entre alternativas, no inventa alimentos, ejercicios o cantidades. No es todavía un generador autónomo de mesociclos ni una prescripción nutricional clínica. Los límites de una serie y ±10 % son decisiones conservadoras de producto, no umbrales clínicos validados individualmente.

## Alimentación y compra

El cálculo parte de las cantidades visibles de `foodDayView`, incluido cualquier ajuste previo. Optimiza energía y macros con porciones limitadas a ±10 %, exige mejora y evita empeorar materialmente el error energético/proteico. Conserva frutas/verduras fijas, suplementos conocidos y productos personalizados no incluidos en el catálogo base. No inventa nutrientes ni modifica objetivos, agua o sal.

Las comidas registradas son inmutables. No se proponen compensaciones tras una omisión ni después de registrar la cena. Al aceptar se fija la foto del día y se desactiva su ajuste automático para impedir una segunda compensación. El usuario puede seguir editando manualmente. El ajuste nutricional solo se acepta una vez por fecha.

`monthlyShopping` ya prioriza la foto diaria sobre el menú mensual fijado: la lista y su estimación de coste usan automáticamente las cantidades aceptadas. Sin mes fijado no se afirma que exista una lista mensual. Los precios siguen siendo los guardados por el usuario, no cotizaciones en vivo.

## Integridad y privacidad

La firma incluye una huella del estado exacto, además de los hechos agregados. Un cambio de receta, registro o sesión invalida la propuesta. La huella es control de concurrencia optimista, no una firma de seguridad; autorización y aislamiento dependen de Auth y RLS. El estado detallado usado para la huella no se envía a OpenAI.

Se conserva el límite de tres consultas por cuenta y día UTC, caché y consentimiento. Las demostraciones calculadas se identifican como «sin IA». No hay automatización de cortes rápidos, deshidratación, cambios de sal o dosis de suplementos.

## Comprobaciones

Pruebas unitarias de límites, inmutabilidad, sincronización exacta con la compra, rechazo de propuestas obsoletas, acciones ajenas al esquema, coordinación conjunta y no acumulación. Prueba real de OpenAI con datos totalmente ficticios: selección válida de `coordinate` ante recuperación insuficiente y mejora nutricional calculada.

## Referencias

- [OpenAI: Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses): formato estricto de respuesta; no sustituye la validación de negocio.
- [AIS: Training and Competition Nutrition](https://www.ausport.gov.au/ais/nutrition/education-modules/modules/training-and-competition-nutrition): marco general de alimentación para entrenamiento y recuperación. No establece los límites numéricos de producto usados aquí.
