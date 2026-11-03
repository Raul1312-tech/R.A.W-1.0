# Planificación mensual y ejecución diaria

Mi rutina es el espacio de planificación. Una semana base se repite en un mes concreto; el calendario permite sustituir la programación de una fecha o de todos los días equivalentes del mes. Cada fecha admite un bloque físico y uno de carrera, con hasta diez ejercicios cada uno. Se pueden añadir, quitar, ordenar y agrupar ejercicios; modificar series, dosis, descanso, intensidad y kilos previstos. Los grupos con el mismo nombre alternan sus series por vueltas en Mi día.

Mi día resuelve las sesiones de la fecha seleccionada. La ejecución conserva el checklist, el reloj, el RPE, las fichas ilustradas y el guardado parcial. Los minutos registrados actualizan el diario una sola vez, también si se corrige una sesión. Los kilos previstos nunca se convierten automáticamente en kilos realizados.

Compatibilidad: planes semanales anteriores siguen visibles hasta crear un mes explícito. Los planes mensuales no se extienden automáticamente a meses sin plan. Se conservan las últimas doce versiones y los registros ya realizados. Cada borrador nuevo y registro terminado guarda la sesión original completa. Esa instantánea prevalece sobre ediciones posteriores del calendario para esa fecha y tipo de sesión. Borradores antiguos sin instantánea se resuelven desde el plan original mientras esté conservado.

Frecuencia: selección independiente de 0–7 días, con coincidencias permitidas. Los avisos no bloquean la frecuencia. El calendario recalcula avisos de carga al guardar excepciones, además de mostrar técnica/sparring y vísperas. Técnica y sparring siguen dirigidos por el entrenador; la app no inventa su contenido.

Biblioteca: 57 fichas permanentes, incluidas doce nuevas (cuatro abdomen, cuatro pliometría y cuatro agilidad de pies). Están disponibles en el selector al editar cada sesión. El generador incorpora desplazamientos, variaciones de abdomen y saltos sin añadir cargas externas universales. Pogo, escalera y salto en zancada también están disponibles para selección manual; esta última ficha indica su dificultad avanzada.

Las fichas usan una imagen persistente por atlas y coordenadas por ejercicio. `core-footwork.png` se generó una sola vez: doce celdas, dos posiciones, ilustración de adulto genérico, fondo claro y sin textos. Tras inspección visual, las celdas abdominales segunda y cuarta se describen como crunch corto y sostén abdominal con pies apoyados: la imagen no muestra un reverse crunch ni un hollow con piernas elevadas. Las explicaciones de texto son la referencia de ejecución, con revisión técnica del entrenador.

Fuentes consultadas para orientar la ampliación, sin copiar rutinas personales de deportistas:
- [Boxing Science: pliometría para boxeo](https://boxingscience.co.uk/plyometrics-for-boxing-2/)
- [Boxing Science: entrenamiento del core](https://boxingscience.co.uk/boxing-training-core/)

La biblioteca es propia, con ejercicios comunes y fichas originales. La selección automática sigue plantillas y reglas deterministas, no una generación ilimitada ni un entrenador de IA. El calendario empieza con una semana repetida; la progresión mensual se ajusta mediante ediciones de fechas, no mediante una periodización automática individual.

Validación: pruebas de límites de mes y años bisiestos, edición aislada y por día de semana, dos sesiones en una fecha, persistencia de instantáneas, compatibilidad semanal, separación de cargas previstas y reales y correspondencia de todas las imágenes. Prueba en navegador: tres físicos y dos carreras, edición de todos los martes, añadido de abdomen, guardado y recarga de checklist, conservación de 30 kg originales tras planificar 32 kg, y suma independiente de 45 minutos de físico + 15 de carrera.
