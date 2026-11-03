# Registro por comidas y ajuste de cantidades

En Mi día y Registro se muestra el menú correspondiente al día de la semana seleccionado. «Lo he comido» registra exactamente los alimentos y cantidades que se ven y recoge la tarjeta. «He comido otra cosa» abre una parrilla con búsqueda, categorías, raciones orientativas, controles de cantidad y alta por etiqueta. «No he hecho esta comida» registra una omisión explícita, sin añadir calorías. Editar reemplaza los alimentos asociados a esa comida; deshacer elimina solo ese registro. Un doble toque de confirmación no duplica alimentos.

El primer registro conserva una copia del menú de ese día en `Day.foodPlan`. Los cambios posteriores del menú semanal no reescriben el día. Los alimentos consumidos siguen en `Day.items`, vinculados por ID a cada comida, por lo que los totales, exportaciones y diario existentes mantienen una única fuente de consumo. Los registros anteriores se reconocen por su nombre de comida sin duplicarlos. Las correcciones del editor detallado actualizan el estado de la comida.

El ajuste automático parte siempre de esa copia original, nunca del último ajuste. Solo modifica cantidades de comidas pendientes posteriores a la última comida registrada. Una comida previa sin registrar se mantiene pendiente: no se interpreta como omitida. Lo consumido, los objetivos diarios, otras fechas, el ejercicio y la hidratación no cambian.

Se minimiza una diferencia ponderada de kcal, proteína, carbohidratos y grasas, con regularización y límites de 80–120 % de las cantidades originales por ingrediente ajustable. Fruta fresca y verduras se conservan. Se mantienen los alimentos del menú; no se sustituyen por productos nuevos. La regla del 20 % es una decisión conservadora de producto, no un umbral clínico validado. Se muestran la proyección del día y cada cambio de cantidad, sin prometer un ajuste exacto. Diferencias grandes pueden quedar sin cubrir. El usuario puede desactivar el ajuste.

Después de registrar la cena no se recalculan comidas anteriores ni se traslada ningún ajuste a mañana. No se eliminan platos ni se propone ejercicio compensatorio. El producto usa «alternativa», «con cambios» y «no realizada», sin clasificar la comida como un fallo personal.

El catálogo añade café solo, proteína en polvo, pavo en lonchas halal, arroz cocido, pasta cocida y azúcar, distinguiendo expresamente crudo/seco/cocido y valores por 100 g o 100 ml. Son valores genéricos; las etiquetas del producto prevalecen. Las porciones de taza, rebanada o cacito son aproximaciones visibles y editables.

Referencia de contexto: [NHS Eatwell Guide](https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/) explica que el equilibrio alimentario se valora en el conjunto del día o la semana, sin exigirlo en cada comida. El algoritmo concreto de esta aplicación es propio y no se atribuye a esa guía.

Validación: pruebas de menú del día correcto, confirmación idempotente, edición y deshacer, lectura de registros antiguos, límites de cantidades, ajuste hacia el objetivo, comidas anteriores pendientes, cena sin compensación, aislamiento entre fechas y conservación tras exportar/importar JSON. En navegador se probaron desayuno con check, desayuno alternativo con pan/pavo/café/proteína, confirmación de almuerzo ajustado, recarga y añadido de un producto por etiqueta sin duplicar la comida.
