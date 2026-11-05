# Coordinador: propuestas conectadas

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
