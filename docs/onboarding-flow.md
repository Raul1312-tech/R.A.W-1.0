# Onboarding y continuidad de la rutina

El alta tiene cuatro pasos: perfil y competición, alimentación, entrenamiento según modalidad, y disponibilidad/recuperación. La revisión final no publica nada hasta pulsar Guardar mi plan.

Los datos que condicionan el motor siguen siendo obligatorios: edad, sexo para el cálculo, altura/peso, actividad, deporte/objetivo, comidas y horario, restricciones revisadas, cocina/acceso, experiencia y material, carrera en boxeo, y recuperación/limitaciones. Se muestran fechas y categoría cuando hay un combate. Cuestionarios secundarios quedan plegados o dejan de bloquear el alta; no se inventan respuestas para rellenarlos.

El objeto de respuestas y onboarding.version=1 se conservan. El marcador draft.flowVersion=2 distingue los cuatro pasos nuevos de los ocho anteriores. startOnboarding convierte el índice antiguo a la sección equivalente y retiene todas las respuestas. Los perfiles completados y los borradores v1 siguen siendo válidos. No requiere una migración SQL.

Las preferencias rápidas y Habitual/Ocasional/Evitar editan el mismo mapa food.preferences.foods. La selección tiene un check y contraste explícito para evitar que el tema oscuro oculte el estado. Las restricciones alimentarias siguen validándose al generar el menú.

applyOnboardingTraining aplica los días revisados incluso si ya existía una rutina del mismo deporte. Añade versiones mensuales; protege pasado, sesiones iniciadas/realizadas y fechas con boxeo registrado. Conserva logs, drafts y el diario. Actualiza también meses futuros ya preparados y el mes siguiente si la revisión de siete días cruza de mes. Una limitación declarada pausa las nuevas prescripciones físicas hasta revisión profesional; conserva el calendario del club declarado.

En un mes futuro sin plan, Rutina ofrece Preparar mes con mis horarios y reutiliza material, reparto y tiempos guardados. No vuelve a pedir los días. Los meses pasados sin plan son de consulta.

Móvil: controles de entrada de al menos 16 px, viewport a escala 1 y touch-action para desplazamiento sin gestos de ampliación. El navegador o sistema operativo puede ignorar los límites de zoom por accesibilidad; no hay interceptores globales de teclado o eventos de gestos.

Verificación: tests/onboarding.test.mjs cubre compatibilidad de borradores, respuestas esenciales, conservación de restricciones/preferencias, aplicación de días y protección de historial/sesiones; QA visual a 390 px y revisión del flujo completo en la demo.
