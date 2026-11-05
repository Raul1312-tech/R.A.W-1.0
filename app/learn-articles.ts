export type LearnArticle={id:string;category:string;title:string;intro:string;image:string;imageAlt:string;idea:string;paragraphs:string[];action:string;question:string;source:{name:string;url:string};note?:string};
export const learnArticles:LearnArticle[]=[
  {
    "id": "un-detalle",
    "category": "Hábitos",
    "title": "La constancia empieza antes de ponerte los guantes.",
    "intro": "La mochila, el desayuno, la hora de salir. Haz que entrenar bien dependa menos de las ganas del día.",
    "image": "un-detalle-photo",
    "idea": "Elige una acción concreta y una señal que te recuerde hacerla.",
    "paragraphs": [
      "La filosofía kaizen propone mejorar de forma continua. En este diario la convertimos en una pauta sencilla: leer una idea, probar una acción y revisar qué ha cambiado. No necesitas añadir diez obligaciones a tu entrenamiento.",
      "Deja preparada una conducta fácil de empezar: la botella junto a la mochila o el desayuno elegido la noche anterior. Vincúlala a algo que ya haces. Después de preparar las vendas, por ejemplo, revisa la sesión del día.",
      "Una semana sirve para observar si la acción cabe en tu vida; no garantiza que ya sea un hábito. Si no se repite, reduce la dificultad o cambia la señal. La consistencia se diseña."
    ],
    "action": "Elige un solo detalle de este diario y escribe: «Después de ___, haré ___».",
    "question": "¿La acción era fácil de empezar o dependía de tener un día perfecto?",
    "source": {
      "name": "James Clear · Habit stacking",
      "url": "https://jamesclear.com/habit-stacking"
    },
    "note": "Propuesta editorial de práctica; no es una cita ni un resumen del libro Hábitos atómicos.",
    "imageAlt": "Mochila preparada con guantes, vendas, agua y desayuno"
  },
  {
    "id": "timing",
    "category": "Nutrición",
    "title": "¿Cuándo tomar el batido? Empieza por aquí.",
    "intro": "Antes, después o al llegar a casa: descubre qué cambia de verdad y qué importa menos de lo que crees.",
    "image": "timing-photo",
    "idea": "Organiza la ingesta alrededor de tus sesiones sin descuidar el total diario.",
    "paragraphs": [
      "El horario de los nutrientes puede ayudar a preparar una sesión y recuperar entre entrenamientos. Su importancia cambia según cuánto tiempo tienes hasta la siguiente sesión, qué has comido antes y cómo lo toleras.",
      "Antes de entrenar, utiliza alimentos conocidos y una cantidad que puedas digerir con comodidad. Después, encaja una comida o toma que contribuya a tus necesidades del día. Un batido es una opción práctica, no un requisito para que el entrenamiento cuente."
    ],
    "action": "Anota qué comiste antes de tu próxima sesión y cómo te sentiste: energía, hambre y molestias.",
    "question": "¿El problema era el horario, la cantidad o el alimento elegido?",
    "source": {
      "name": "ISSN · Nutrient timing",
      "url": "https://pubmed.ncbi.nlm.nih.gov/28919842/"
    },
    "imageAlt": "Deportista mirando su reloj junto a un batido y un plátano"
  },
  {
    "id": "absorcion",
    "category": "Nutrición",
    "title": "¿Más proteína en una comida se desperdicia?",
    "intro": "El mito del límite por comida confunde digestión con crecimiento muscular. Aprende a distinguirlos.",
    "image": "absorcion-photo",
    "idea": "La digestión y el uso de aminoácidos no funcionan como un vaso que se desborda a una cifra fija.",
    "paragraphs": [
      "La proteína de una comida se digiere y sus aminoácidos tienen distintos destinos en el organismo. Absorberlos no equivale a utilizarlos todos para aumentar músculo. Una respuesta muscular que se estabiliza tampoco significa que el resto se haya desperdiciado.",
      "Importan el total diario, las fuentes, el reparto y el entrenamiento. Las comidas mixtas modifican la velocidad de digestión. En la práctica, revisa si concentras casi toda la proteína en una sola toma y si el resto del día se queda corto."
    ],
    "action": "Mira tus comidas de ayer e identifica en cuáles hubo una fuente de proteína.",
    "question": "¿Puedes mejorar el reparto con comida habitual antes de añadir otro suplemento?",
    "source": {
      "name": "Schoenfeld y Aragon · Distribución de proteína",
      "url": "https://pubmed.ncbi.nlm.nih.gov/29497353/"
    },
    "imageAlt": "Huevos, yogur y pollo repartidos en tres comidas"
  },
  {
    "id": "hidratos",
    "category": "Nutrición",
    "title": "Tu sesión más dura empieza en el plato.",
    "intro": "¿Comes igual un día suave que uno de doble sesión? Revisa cómo llegas de energía al entrenamiento.",
    "image": "hidratos-photo",
    "idea": "Relaciona la alimentación con la duración y exigencia del trabajo previsto.",
    "paragraphs": [
      "Una sesión técnica suave y una jornada con intervalos y boxeo no son la misma demanda. La alimentación deportiva debe acompañar esa diferencia, incluyendo la recuperación y el tiempo disponible entre sesiones.",
      "No hace falta convertir cada entrenamiento en una cuenta exacta de calorías quemadas. Primero comprueba que llegas alimentado, que la pauta encaja con tu calendario y que puedes repetirla. Recortar alimentos por improvisación puede dejarte sin recursos para entrenar bien."
    ],
    "action": "Señala en tu calendario el día más exigente y revisa qué comidas tienes disponibles alrededor.",
    "question": "¿Tu organización facilita comer ese día o te obliga a improvisar?",
    "source": {
      "name": "ACSM · Nutrition and Athletic Performance",
      "url": "https://pubmed.ncbi.nlm.nih.gov/26891166/"
    },
    "imageAlt": "Arroz, avena, pan y plátano junto a una pista de atletismo"
  },
  {
    "id": "carga",
    "category": "Preparación",
    "title": "¿Entrenas más… o solo acumulas cansancio?",
    "intro": "Los minutos no lo cuentan todo. Aprende a registrar el esfuerzo para entender cómo estás respondiendo.",
    "image": "carga-photo",
    "idea": "La carga externa describe lo que haces; la interna, cómo te exige hacerlo.",
    "paragraphs": [
      "Anotar duración, tipo de sesión y esfuerzo percibido ayuda a contextualizar el trabajo. Una hora de técnica y una hora de intervalos no deberían interpretarse como equivalentes solo porque duren lo mismo.",
      "Minutos multiplicados por esfuerzo percibido pueden servir como una medida práctica de carga interna. No son kilocalorías ni una predicción de lesión. Interpreta la tendencia junto a sueño, sensaciones, rendimiento y contexto."
    ],
    "action": "Después de entrenar, registra el tipo de sesión, su duración y el esfuerzo global que te ha supuesto.",
    "question": "¿La misma sesión se siente progresivamente más dura sin que estés mejorando?",
    "source": {
      "name": "Bourdon et al. · Monitoring Athlete Training Loads",
      "url": "https://pubmed.ncbi.nlm.nih.gov/28463642/"
    },
    "imageAlt": "Boxeador anotando el esfuerzo de la sesión en un cuaderno"
  },
  {
    "id": "sparring",
    "category": "Boxeo",
    "title": "¿Qué te llevas de cada sparring?",
    "intro": "Técnico, condicionado o abierto: elige una tarea y sal con algo más útil que la cuenta de golpes.",
    "image": "sparring-photo",
    "idea": "Acordar qué vas a practicar permite evaluar si el sparring ha servido.",
    "paragraphs": [
      "El sparring técnico centra la práctica en habilidades concretas. El condicionado limita acciones o situaciones para trabajar un problema. El abierto ofrece más libertad y requiere una supervisión y un control adecuados. Más contacto no significa automáticamente más aprendizaje.",
      "La frecuencia se decide con el entrenador según experiencia, preparación y recuperación; no hay una cifra semanal universal. Acordad tarea, intensidad, compañero y señal para detenerse. Si aparece dolor de cabeza, mareo o confusión tras un golpe, detén el contacto y busca valoración sanitaria antes de volver."
    ],
    "action": "Antes de empezar, completa con tu entrenador: «Hoy practicamos ___ y lo evaluamos por ___».",
    "question": "¿Has entrenado la tarea acordada o has terminado intentando ganar cada intercambio?",
    "source": {
      "name": "England Boxing · Enfoques de sparring",
      "url": "https://www.englandboxing.org/news_articles/sparring-document-to-help-coaches-after-end-of-covid-19-restrictions/"
    },
    "note": "Los síntomas tras impactos requieren evaluación; una ilustración o lectura no autoriza volver al contacto.",
    "imageAlt": "Dos boxeadores practicando sparring bajo la supervisión de un entrenador"
  },
  {
    "id": "pies",
    "category": "Boxeo",
    "title": "Tus pies se mueven rápido. ¿Y tu equilibrio?",
    "intro": "Moverte mucho no basta. Comprueba si terminas cada paso listo para atacar, defender o salir.",
    "image": "pies-photo",
    "idea": "La velocidad sirve si al terminar el desplazamiento puedes atacar, defender o volver a moverte.",
    "paragraphs": [
      "El trabajo de pies busca desplazarte manteniendo equilibrio y forma de boxeo. No consiste solo en mover los pies muy deprisa. Si terminas cruzado o demasiado abierto, tendrás que corregir antes de responder.",
      "Como práctica sencilla, marca una referencia en el suelo y ensaya pasos cortos sin contacto. Detente después de cada desplazamiento y comprueba tu base. Añade ritmo cuando puedas conservar la posición, con la corrección de tu entrenador."
    ],
    "action": "Dedica una parte breve de tu sombra a desplazarte y detenerte en equilibrio, sin añadir golpes todavía.",
    "question": "¿Puedes cambiar de dirección desde la posición en la que acabas?",
    "source": {
      "name": "Boxing Scotland · Footwork",
      "url": "https://www.boxingscotlandtoolkit.org/session-delivery/footwork/"
    },
    "imageAlt": "Botas de boxeo en posición escalonada sobre marcas del suelo"
  },
  {
    "id": "transferencia",
    "category": "Preparación",
    "title": "Levantas más. ¿Se nota en el ring?",
    "intro": "Pon a prueba el sentido de tu rutina: qué capacidad trabaja cada ejercicio y cómo esperas usarla boxeando.",
    "image": "transferencia-photo",
    "idea": "Relaciona cada bloque físico con una capacidad y observa su utilidad en el deporte.",
    "paragraphs": [
      "Fuerza, potencia y resistencia son capacidades distintas. El trabajo físico debe convivir con la técnica: mover más carga no sustituye aprender a colocar un golpe. La fatiga acumulada también puede cambiar cómo ejecutas la sesión de boxeo.",
      "Como criterio editorial, pregunta para qué está cada ejercicio y qué señal de progreso esperas. Una rotación con resistencia puede ser una herramienta; no debe convertirse en una imitación pesada de cada gesto ni en una garantía de más pegada."
    ],
    "action": "Escoge un ejercicio de tu rutina y pide a tu preparador que explique capacidad, dosis y criterio de progreso.",
    "question": "¿Estás midiendo una mejora útil o solo cuánto cansancio produce?",
    "source": {
      "name": "IOC · Carga, rendimiento y riesgo",
      "url": "https://pubmed.ncbi.nlm.nih.gov/27535989/"
    },
    "note": "La selección y transferencia de ejercicios requieren evaluación técnica individual.",
    "imageAlt": "Deportista preparando una rotación con balón medicinal en un gimnasio de boxeo"
  },
  {
    "id": "pliometria",
    "category": "Preparación",
    "title": "Saltos que entrenan algo más que el cansancio.",
    "intro": "Antes de sumar repeticiones, define qué buscas: rapidez, coordinación o control. La calidad también se entrena.",
    "image": "pliometria-photo",
    "idea": "Empieza por una ejecución controlada y progresa con supervisión.",
    "paragraphs": [
      "No todos los saltos tienen la misma exigencia. Altura, velocidad, dirección y fatiga cambian la tarea. El objetivo de una práctica de pies o saltos debe estar claro antes de acumular repeticiones.",
      "Esta propuesta editorial prioriza que el preparador elija el nivel y observe la ejecución. Si el objetivo es rapidez y coordinación, convertir el bloque en una prueba de agotamiento puede alejarte de lo que querías practicar. No uses una escalera de agilidad como única prueba de que tu juego de pies mejora en el ring."
    ],
    "action": "Pregunta qué señal técnica indica que debes terminar la serie de tu ejercicio de saltos.",
    "question": "¿Las últimas repeticiones conservan la intención y el control de las primeras?",
    "source": {
      "name": "England Boxing · Recursos de práctica y desplazamiento",
      "url": "https://www.englandboxing.org/members/stay-active/"
    },
    "note": "Orientación editorial; no es una prescripción de alturas, impactos ni volumen individual.",
    "imageAlt": "Atleta preparando un salto a un cajón bajo con supervisión"
  },
  {
    "id": "pesaje",
    "category": "Pesaje",
    "title": "Dar el peso sin dejar tu rendimiento por el camino.",
    "intro": "La categoría se planifica antes de la fight week. Entiende por qué copiar el corte de otro peleador puede salir caro.",
    "image": "pesaje-photo",
    "idea": "Categoría, calendario y tiempo de recuperación deben valorarse juntos.",
    "paragraphs": [
      "El peso de la báscula puede cambiar por agua, glucógeno y contenido digestivo, además de tejido corporal. Una bajada rápida no equivale a perder esa cantidad de grasa. Copiar el corte de otro deportista no reproduce su contexto ni su supervisión.",
      "Habla con un dietista-nutricionista deportivo sobre la viabilidad de la categoría, la evolución y el intervalo entre pesaje y combate. Esta entrada no propone restringir líquidos, usar sauna o entrenar abrigado para bajar kilos."
    ],
    "action": "Deja anotadas las fechas y horas exactas de pesaje y combate antes de plantear cambios.",
    "question": "¿La categoría permite llegar preparado o está condicionando toda tu salud y rendimiento?",
    "source": {
      "name": "AIS · Making Weight in Weight Category Sports",
      "url": "https://www.ausport.gov.au/ais/position_statements/making-weight-in-weight-category-sports"
    },
    "imageAlt": "Boxeador y nutricionista revisando un calendario con una báscula delante"
  },
  {
    "id": "despues-pesaje",
    "category": "Pesaje",
    "title": "Ya has dado el peso. ¿Ahora qué comes?",
    "intro": "Lo que hagas después también cuenta. Prepara la recuperación según el tiempo que queda hasta competir.",
    "image": "despues-pesaje-photo",
    "idea": "El intervalo hasta competir cambia las posibilidades de recuperación.",
    "paragraphs": [
      "Recuperar líquidos y energía después del pesaje depende de cómo se ha llegado y de cuánto tiempo hay hasta competir. Una mañana con poco margen no permite aplicar la misma estrategia que una ventana más larga.",
      "Elige con tu profesional alimentos y bebidas conocidos, cantidades tolerables y una secuencia ensayada. El exceso de comida de golpe o los experimentos pueden dificultar la comodidad digestiva. Este artículo no sustituye una pauta individual de rehidratación."
    ],
    "action": "Prepara una lista de alimentos que ya toleras bien y coméntala con quien supervise tu preparación.",
    "question": "¿Lo que tienes previsto comer está ensayado o lo has copiado de otro peleador?",
    "source": {
      "name": "ISSN · Nutrición y preparación en deportes de combate",
      "url": "https://www.tandfonline.com/doi/full/10.1080/15502783.2025.2467909"
    },
    "imageAlt": "Comida sencilla con arroz, pollo, pan, plátano y agua después del pesaje"
  },
  {
    "id": "recuperacion",
    "category": "Hábitos",
    "title": "La parte de tu preparación que ocurre en la cama.",
    "intro": "Antes de añadir otra sesión, mira cómo estás durmiendo. Tu agenda también necesita espacio para recuperar.",
    "image": "recuperacion-photo",
    "idea": "Una rutina sostenible también reserva espacio para recuperarse.",
    "paragraphs": [
      "El sueño contribuye a la recuperación física y psicológica. Antes de buscar otra herramienta, observa si tus horarios y obligaciones te dejan una oportunidad suficiente y regular para descansar.",
      "Prueba a preparar mochila y comida con antelación para no alargar innecesariamente la noche. Compara sensaciones y capacidad de atención durante varios días; una mala noche aislada no cuenta toda la historia. Si los problemas persisten, busca ayuda profesional."
    ],
    "action": "Elige una tarea de la noche que puedas dejar resuelta antes y protege ese tiempo de descanso.",
    "question": "¿Tu organización diaria acompaña el entrenamiento que quieres sostener?",
    "source": {
      "name": "Australian Institute of Sport · Sleep",
      "url": "https://www.ais.gov.au/rest-hub/sleep"
    },
    "imageAlt": "Deportista descansando en una habitación con el teléfono apartado"
  }
];
export const learnCategories=['Todos',...new Set(learnArticles.map(a=>a.category))];
export const normalizeLearning=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
export function filterLearning(query:string,category:string){const q=normalizeLearning(query.trim());return learnArticles.filter(a=>(category==='Todos'||a.category===category)&&normalizeLearning([a.title,a.intro,a.idea,...a.paragraphs,a.category].join(' ')).includes(q))}
