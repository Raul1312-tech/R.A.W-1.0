# Cálculo automático de situaciones

La persona describe el día; no introduce kcal. La referencia procede del cálculo del perfil ya existente (Mifflin–St Jeor, actividad habitual y objetivo). Dormir hasta más tarde o comer menos veces redistribuye esa referencia, sin crear un déficit por sí solo. La categoría de competición no se usa para generar recortes.

Con calendario, se estima el gasto neto de las sesiones de la semana y se resta su media de la actividad habitual antes de añadir la actividad de la fecha: así no se suma dos veces. La estimación usa `(MET − 1) × peso × horas`. Se usan 3,5 MET para fuerza general y actividad suave, 5 para acondicionamiento moderado, 5,8 para técnica de boxeo y 7,8 para sparring. La técnica/sparring sin duración detallada se aproxima a 60 minutos; se puede indicar duración e intensidad para la situación. La intensidad alta genérica utiliza 7,5 MET. Son aproximaciones, no una medición del gasto individual.

Sin calendario, «Según mi rutina» conserva la referencia habitual. Para un descanso explícito, se aproxima conservadoramente la contribución de entrenamiento a la mitad de la actividad declarada por encima de un factor 1,4. Esta descomposición es una decisión del producto, no una ecuación clínica validada. Los cambios se limitan al menor de 300 kcal y el 10 % de la referencia. Se conserva la proteína, se ajustan grasas/hidratos y se evita bajar del suelo conservador del motor. Un objetivo profesional explícito existente conserva prioridad. Se conserva el gasto estimado de los minutos de entrenamiento ya registrados, aunque se marque descanso después; los minutos del día y los de los registros se comparan, no se suman entre sí. Las cantidades y objetivos se redondean; siguen siendo orientativos y revisables.

Fuentes primarias consultadas:

- [Compendium 2024 · deportes](https://pacompendium.com/sports/).
- [Compendium 2024 · acondicionamiento](https://pacompendium.com/conditioning-exercise/).
- [NIDDK · datos personales, actividad y necesidades energéticas](https://www.niddk.nih.gov/bwp).

Una comida fuera reserva la fracción de la toma; una comida más abundante reserva un 20 % adicional sobre esa fracción como previsión del producto. No se inventa un plato ni se registra como consumida. La app muestra la reserva como estimación y ajusta suavemente las otras tomas pendientes. Tras registrar alimentos y cantidades aproximadas, sus nutrientes reales de catálogo sustituyen la reserva; el mismo motor recalcula solo lo que queda por delante, hasta ±20 %, sin saltar comidas ni compensar mañana.

Se puede aplicar una situación después de empezar el día. Los alimentos, identificadores, registros y actividad existentes se conservan. Si reducir el número de comidas excluiría una franja ya registrada, se mantiene el menor reparto que la incluya. Las otras fechas y la semana de referencia no cambian. Los suplementos conservan las cantidades guardadas; un recordatorio postentreno se mueve a la primera comida en descanso. No se prescribe ni retira una dosis por inferencia.

Las situaciones de versiones anteriores conservan compatibilidad de lectura, pero su antiguo `energyTarget` deja de ser una entrada al cálculo. La energía aplicada se guarda como resultado para que el día permanezca estable al recargar.
