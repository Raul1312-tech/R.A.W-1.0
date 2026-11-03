# Calendario configurable

Físico, carrera, técnica y sparring admiten 0–7 días, incluidos días coincidentes. Musculación también admite 0–7. La frecuencia, las coincidencias, el nivel inicial, la falta de descanso y una limitación declarada generan avisos; no bloquean la propuesta. Los errores de formato (día fuera de rango, duplicados en un mismo selector o campos no válidos) siguen rechazándose.

La semana mantiene siete entradas `sessions`, compatibles con los planes anteriores. Cuando carrera y físico coinciden, la carrera se guarda en `extraSessions`, con un máximo de siete entradas. `allTrainingSessions` se usa para contar y presentar todas las sesiones. Los botones Físico/Carrera del día abren checklists independientes.

Los planes nuevos incluyen `slot: physical | running`. `workoutKey` añade el slot a la clave de borradores y registros. Los planes anteriores, sin slot, conservan exactamente sus identificadores. La edición de una sesión no sustituye la otra; los minutos se suman y se corrigen por registro, sin duplicarlos.

El físico de boxeo alterna A/B/C según el orden de los días elegidos; carrera alterna intervalos cortos/sostenidos. No se interpreta que elegir siete sesiones de carrera exigentes sea recomendable: la app conserva la decisión y muestra el aviso de carga y recuperación antes de guardar. Técnica y sparring siguen dirigidos por el entrenador, y sus minutos se anotan en el registro de actividad.

Validación: 46 pruebas, incluyendo frecuencias 0–7 en 448 combinaciones con solapes, siete días de las cuatro actividades, conservación de planes anteriores y dos registros independientes en una misma fecha.
