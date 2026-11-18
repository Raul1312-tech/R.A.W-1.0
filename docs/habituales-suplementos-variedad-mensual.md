# Registro compacto y variedad mensual

- Suplementos: iconos por producto, resumen de dosis y estado, toma sin desplegar; al cambiar el estado se recoge el detalle. Se mantienen prevención de duplicados y alérgenos.
- Cambiar comida: acceso directo a platos habituales compatibles con el perfil. Elegir reemplaza el borrador, permite ajustar y añadir fotos; no registra hasta guardar.
- Días de entrenamiento: selección destacada con fondo, borde y marca, conservando aria-pressed.
- Eliminados los bloques Cómo progresar y Entiende los números.
- Boxeo catálogo v2: rotación determinista por semana del mes dentro del mismo patrón y categoría. Mantiene series, descanso, enfoque A/B y grupos. Filtra nivel, material, exclusiones y descarga. Conserva cargas prescritas, ediciones manuales y snapshots de sesiones iniciadas/guardadas. La puesta a punto se aplica después de la variación. Hipertrofia conserva sus ejercicios para progresar.
- La variedad disponible depende del material y del número de alternativas compatibles; no se promete un ejercicio distinto para cada fecha cuando el catálogo no lo permite. Cuello usa las variantes actuales ilustradas, sin inventar cargas ni puentes cervicales.

Validación: 202 pruebas, comprobación TypeScript, compilación de producción y revisión visual del guardado de habituales, suplementos y selección de días.

## Corrección de copias semanales antiguas

La renovación antigua del catálogo copiaba todos los días previos a la fecha de renovación como excepciones sin indicar su origen. Esas copias impedían la variedad entre semanas. Ahora se distinguen ediciones manuales, copias de una semana base y sesiones ya calculadas para una fecha. Para datos antiguos, solo se reconocen automáticamente prefijos completos de al menos siete días que coincidan exactamente con una misma semana anterior. Los casos ambiguos se conservan. La recuperación se aplica al leer el plan, sin cambiar registros de ejecución ni requerir regenerar el mes.

Comprobado el caso del físico C repetido en los sábados 7 y 14 de noviembre; el enfoque se conserva y las listas cambian. Pasan 205 pruebas, TypeScript y compilación de producción.
