# Hoy integrado · revisión del 15 de noviembre de 2026

Implementación local del diseño aprobado. Sin cambios en las claves, autenticación, base de datos o reglas de acceso.

- Tema carbón con superficies verdes oscuras, blanco cálido y acentos mexicanos. Adaptación de navegación, menús, formularios, compra, calendario y registro de entrenamiento.
- Hoy: resumen nutricional real, accesos directos a foto, alimentos, actividad y compra; comidas compactas con ilustración de categoría, no fotografía del plato.
- Mi compra también está en la cabecera de Comidas y en Más. Se conserva el cálculo existente, sus precios de referencia fechados y la descarga. No se añade sincronización de precios en tiempo real.
- Más agrupa compra, habituales y suplementos, calendario, Aprende, perfil e historial. Rutina abre el calendario de planificación; el registro de hoy abre un dialog nativo desde Hoy.
- El modal reutiliza WorkoutSession: series, cargas opcionales, descansos, explicación, sustituciones e historial. Cerrar conserva el borrador. Guardar cierra el modal, muestra la sesión registrada y actualiza minutos mediante el mismo reconciliador, sin duplicar registros.
- Las tomas de desayuno, durante el entreno y noche están visibles junto a la comida asignada. Las tomas postentreno aparecen junto al entrenamiento, también en descanso si el plan de ese día las conserva. No se inventan suplementos ni se añaden dosis nuevas.
- Botón Tomado reversible, estados detallados secundarios, advertencia por alérgeno y protección existente frente a equivalentes ya registrados. La creatina conserva macros cero; los batidos se contabilizan una vez por ID de suplemento. Una foto de un batido desconocido no permite confirmar automáticamente que sea el mismo producto: el usuario debe evitar registrarlo por ambos caminos.
- Vasos de 250 ml que muestran el volumen registrado. Cada pulsación añade una toma, con botones de 250/500 ml y deshacer. La referencia sigue siendo la individualizada existente; no se modifica el cálculo de hidratación.

## Comprobación

- 198 pruebas de modelo correctas; TypeScript y compilación de producción con webpack correctos.
- Revisión en navegador a 390 px con un perfil sintético importado en /review (solo navegador local).
- Creatina marcada: energía y proteína registradas sin cambios. Batido de 30 g marcado: 120 kcal y 24 g de proteína; conservación de la toma de creatina.
- Apertura de entrenamiento en Hoy, una serie marcada, cierre y reanudación conservando 1/17, guardado parcial y cierre con sesión registrada.
- Acceso a la compra desde Hoy y a calendario desde Rutina; destinos de Más visibles.
- Captura de revisión: outputs/rise-dark-hoy-mobile.jpg (ignorada por Git).

No se ha publicado esta revisión de diseño. La última versión online sigue siendo la de reajuste de macros y fotos sucesivas.
