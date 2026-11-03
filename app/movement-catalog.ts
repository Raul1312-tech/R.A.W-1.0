import type {ExerciseRecord} from './exercise-catalog.ts';
type MovementInput=[string,string,string,string[],string,string];
const entries:MovementInput[]=[
  ['shoulder-tap','Plancha con toque de hombro','Resistir la rotación del tronco al cambiar el apoyo.',[
    'Apoya las manos bajo los hombros y separa los pies. Forma una línea estable entre cabeza, cadera y talones.',
    'Despega una mano y toca el hombro contrario sin desplazar la pelvis. Exhala suavemente.',
    'Vuelve a apoyar y alterna el brazo. Cuenta cada toque; reduce la velocidad si la cadera se balancea.'
  ],'Girar la pelvis o hundir la zona lumbar para alcanzar el hombro.','Empieza con manos sobre un banco estable o rodillas apoyadas.'],
  ['short-crunch','Crunch corto con pies apoyados','Flexión controlada del tronco con recorrido pequeño.',[
    'Túmbate boca arriba, rodillas flexionadas y pies apoyados. Mantén la mirada hacia arriba y brazos junto al cuerpo.',
    'Exhala y acerca suavemente las costillas a la pelvis, elevando solo la parte alta de la espalda.',
    'Baja despacio, sin tirar del cuello ni convertir el movimiento en una incorporación completa.'
  ],'Impulsarte con la cabeza o buscar altura en vez de control abdominal.','Ensaya sin carga y con un recorrido corto, cómodo.'],
  ['bird-dog','Bird dog contralateral','Control de tronco y pelvis mientras se mueven brazo y pierna opuestos.',[
    'Coloca manos bajo hombros y rodillas bajo caderas. Mantén cuello y espalda neutrales.',
    'Alarga un brazo y la pierna contraria hasta la altura del tronco, sin levantar la cadera.',
    'Pausa dos segundos, vuelve con control y cambia de lado. Sigue respirando.'
  ],'Arquear la espalda o abrir la pelvis al elevar la pierna.','Practica primero moviendo solo el brazo o solo la pierna.'],
  ['crunch-hold','Isométrico abdominal con pies apoyados','Mantener tensión abdominal con respiración y un recorrido reducido.',[
    'Túmbate con rodillas flexionadas y pies en el suelo; alarga los brazos hacia los muslos.',
    'Eleva ligeramente los omóplatos acercando costillas a pelvis, sin despegar la zona lumbar.',
    'Mantén la posición durante el tiempo indicado respirando; apoya la cabeza y descansa entre series.'
  ],'Bloquear la respiración o tensar el cuello para sostenerte.','Empieza con 10 segundos y reduce el tiempo si se pierde la posición.'],
  ['pogo-hop','Rebotes de tobillo a dos pies','Introducir contactos breves de baja amplitud y control del apoyo.',[
    'De pie, pies paralelos y separados a anchura de caderas; rodillas ligeramente desbloqueadas.',
    'Haz pequeños rebotes verticales desde los tobillos. Despega pocos centímetros y mantén el tronco alto.',
    'Contacta de forma silenciosa y regular. Para si los apoyos se vuelven pesados o aparece molestia.'
  ],'Buscar altura máxima, bloquear las rodillas o aterrizar sobre el borde del pie.','Primero domina elevaciones de talón y aterrizajes suaves. No se hace con lastre.'],
  ['line-hop','Saltos laterales bajos sobre línea','Coordinar pequeños impulsos laterales y aterrizajes repetidos.',[
    'Marca una línea en suelo plano y sitúate a un lado con ambos pies juntos, rodillas flexibles.',
    'Salta unos centímetros al otro lado con los dos pies a la vez, sin inclinar excesivamente el tronco.',
    'Repite al ritmo que permita apoyos suaves. Cada salto cuenta como un contacto; descansa antes de perder control.'
  ],'Separar las rodillas de la dirección de los pies o convertirlo en un esfuerzo hasta el agotamiento.','Empieza con pasos laterales sobre la línea y después saltos aislados.'],
  ['broad-jump','Salto horizontal con estabilización','Producir impulso horizontal y absorber el aterrizaje con control.',[
    'Comprueba que tienes suelo antideslizante y espacio libre delante. Flexiona cadera y rodillas llevando brazos atrás.',
    'Empuja el suelo con los dos pies y acompaña con los brazos hacia delante.',
    'Aterriza con ambos pies, cadera y rodillas flexionadas; mantén la posición dos segundos y recolócate antes del siguiente salto.'
  ],'Perseguir distancia perdiendo equilibrio o enlazar saltos sin estabilizar.','Usa una distancia corta y evita intentos máximos hasta dominar el aterrizaje.'],
  ['split-jump','Salto en zancada con cambio','Potencia unilateral alterna para quien ya controla saltos y zancadas.',[
    'Adopta una zancada estable con separación lateral entre pies, rodillas alineadas y tronco erguido.',
    'Impulsa suavemente hacia arriba y cambia la posición de las piernas en el aire.',
    'Aterriza amortiguando en zancada, estabiliza y repite con amplitud baja. Cuenta cada cambio.'
  ],'Cerrar los pies en una línea o hundir la rodilla hacia dentro al aterrizar.','Ejercicio avanzado: domina primero la zancada sin salto. No añadas peso.'],
  ['cone-shuffle','Desplazamiento lateral entre conos','Mover la base de apoyo manteniendo equilibrio y guardia.',[
    'Coloca dos marcas separadas unos dos metros y adopta tu guardia habitual, rodillas flexibles.',
    'Muévete lateralmente iniciando con el pie del lado al que vas; el otro recupera la distancia de guardia.',
    'Frena antes de la marca y vuelve sin cruzar ni juntar los pies. Prioriza precisión y aumenta ritmo gradualmente.'
  ],'Cruzar las piernas, rebotar en exceso o perder la guardia para ir más rápido.','Puedes usar dos marcas en el suelo; no necesitas conos.'],
  ['ladder-two','Escalera de coordinación: dos apoyos','Practicar ritmo y precisión de apoyos; no sustituye el trabajo táctico del ring.',[
    'Extiende una escalera plana o marca casillas en el suelo. Colócate frente a la primera, con guardia relajada.',
    'Introduce un pie y después el otro en cada casilla, avanzando una casilla cada dos apoyos.',
    'Mantén contactos ligeros y mirada al frente cuando domines el recorrido. Sal, camina y reinicia; alterna el pie que inicia.'
  ],'Acelerar hasta pisar las cintas o mirar siempre hacia abajo.','Practica despacio con casillas amplias antes de aumentar velocidad.'],
  ['boxing-in-out','Entrada y salida en guardia','Controlar la distancia conservando la base de apoyo.',[
    'Adopta tu guardia habitual, pies separados y peso equilibrado. Usa una marca en el suelo como referencia.',
    'Para entrar, avanza primero el pie delantero y recupera la separación con el trasero.',
    'Para salir, retrocede primero el pie trasero y acompaña con el delantero. Mantén guardia y pasos cortos; una entrada y salida es una repetición.'
  ],'Juntar los pies, cruzarlos o inclinarte hacia el objetivo en lugar de desplazar la base.','Ensaya sin golpes y pide al entrenador que revise tu guardia.'],
  ['boxing-pivot','Pivote de cuarto de vuelta en guardia','Cambiar el ángulo conservando equilibrio y orientación de la guardia.',[
    'Desde tu guardia, descarga ligeramente el pie posterior y mantén el delantero cerca del punto de referencia.',
    'Gira sobre la parte delantera del apoyo delantero permitiendo que rodilla y pie acompañen; el trasero dibuja un arco pequeño.',
    'Recupera una base estable mirando hacia el nuevo ángulo. Practica a ambos lados sin forzar la amplitud.'
  ],'Mantener el pie clavado y retorcer la rodilla, o cruzar las piernas.','Empieza con un giro pequeño y lento, revisado por tu entrenador.'],
];
export const movementCatalog:ExerciseRecord[]=entries.map(([id,name,purpose,steps,mistake,learn],tile)=>({id,name,purpose,steps,mistake,learn,aliases:[],version:1,image:{src:'/training/core-footwork.png',columns:4,rows:3,tile}}));
