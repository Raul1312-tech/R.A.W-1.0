# Registro visual simplificado · 15 de noviembre de 2026

- Hoy y Comidas comparten la agenda compacta de comidas, con pictogramas decorativos por momento: desayuno, almuerzo, comida, merienda, cena y recena. No representan una fotografía del plato ni modifican la receta.
- Se conservan los controles de sustitución, regeneración de un plato y guardado/aplicación de habituales en un desplegable secundario por comida.
- Agua: vasos con líquido proporcional al volumen registrado, reflejos suaves y botella ilustrada para añadir 500 ml. Continúan las tomas de 250 ml, la referencia individual y Deshacer. No hay animaciones en bucle.
- Retirado el desplegable de balance y su interruptor de ajuste. Se mantiene el motor de reajuste; una nueva comida alternativa, un añadido libre o una corrección manual reactiva el ajuste si un registro antiguo lo tenía desactivado. Los snapshots específicos que fija el coordinador se conservan hasta la siguiente corrección de ingesta, para evitar un segundo ajuste del mismo plan aprobado.
- Retirados los bloques Cambios para esta fecha y el selector de situación diaria de Comidas. Los estados ya guardados se conservan, con posibilidad de registrar lo consumido. Sensaciones permanece en Historial sin añadir las opciones de comer fuera.
- Retirados Cómo se calcula mi dieta y Tu propuesta de suplementación para hoy. Mis suplementos y horarios conserva producto, cantidad, unidad, macros de etiqueta, alérgenos y momento de toma. Sus tomas se muestran en Hoy y Comidas.
- Sin cambios de autenticación, claves ni base de datos.

Verificación: 199 pruebas correctas, TypeScript y compilación de producción webpack correctos. Navegador local con datos sintéticos: misma agenda en Hoy/Comidas, bloques retirados ausentes, suplementos existentes presentes y botella de 500 ml reflejada en dos vasos. Prueba nueva: reactivación automática tras comida manual/foto, alimentos añadidos y corrección de cantidades, conservando el objeto previo.
