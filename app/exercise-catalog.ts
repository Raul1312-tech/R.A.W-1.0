import {boxingExpansion} from './boxing-expansion-data.ts';
import {boxingBaseMetadata} from './boxing-base-metadata.ts';
import {z} from 'zod';
import {guides} from './exercise-guides.ts';
import {movementCatalog} from './movement-catalog.ts';

export const exerciseRecordSchema=z.object({
  id:z.string().regex(/^[a-z0-9-]+$/),name:z.string().min(1).max(160),aliases:z.array(z.string().max(160)).max(15),
  purpose:z.string().min(1).max(800),steps:z.array(z.string().min(1).max(800)).min(3).max(8),mistake:z.string().min(1).max(800),learn:z.string().min(1).max(800),
  image:z.object({src:z.string().regex(/^\/training\/[a-z0-9-]+\.png$/),tile:z.number().int().min(0),columns:z.number().int().min(1).max(4),rows:z.number().int().min(1).max(3)}).refine(v=>v.tile<v.columns*v.rows),
  category:z.enum(['Fuerza y potencia','Abdomen','Pliometría','Agilidad de pies','Cuello']).optional(),
  pattern:z.string().max(60).optional(),
  equipment:z.array(z.string().max(40)).max(5).optional(),
  minLevel:z.number().int().min(1).max(3).optional(),
  impact:z.enum(['low','high']).optional(),
  version:z.number().int().min(1),
});
export type ExerciseRecord=z.infer<typeof exerciseRecordSchema>;
const image=(sheet:string,tile:number,rows=2)=>({src:`/training/${sheet}.png`,tile,columns:4,rows});
const base=(id:string,name:string,key:string,aliases:string[]=[]):ExerciseRecord=>{const g=guides[key];return {id,name,aliases,purpose:g.purpose,steps:g.steps,mistake:g.mistake,learn:g.learn,image:image('boxing-exercises-v2',g.tile,3),version:1};};
const entry=(id:string,name:string,sheet:string,tile:number,purpose:string,steps:string[],mistake:string,learn:string,aliases:string[]=[]):ExerciseRecord=>({id,name,aliases,purpose,steps,mistake,learn,image:image(sheet,tile),version:1});
const originalCatalog:ExerciseRecord[]=[
  {id:'neck-isometric',name:'Isométricos cervicales con la mano',aliases:[],purpose:'Trabajo cervical de baja carga para controlar la posición de la cabeza. No evita por sí solo una conmoción cerebral.',steps:['Siéntate erguido, cuello neutral y hombros relajados. Coloca la palma sobre la frente.','Presiona suavemente cabeza y mano una contra otra sin mover el cuello. Respira durante la contracción y relaja por completo.','Repite con la mano detrás y a cada lado de la cabeza. Mantén presión moderada, sin tirones ni movimientos al final del recorrido.'],mistake:'Empujar al máximo, contener la respiración o trabajar con dolor, mareo o síntomas tras un golpe.',learn:'Aprende la técnica con un profesional. No uses arnés pesado ni puentes de cuello como sustituto. Si hay lesión o síntomas tras un golpe, no lo realices y busca valoración.',image:{src:'/training/neck-isometrics.png',tile:0,columns:1,rows:1},version:1},
  ...movementCatalog,
  entry('dumbbell-bench','Press de banca con mancuernas','combat-strength',0,'Fuerza de empuje horizontal y control de ambos brazos.',[
    'Apoya pies y espalda en un banco estable. Coloca las mancuernas junto al pecho, muñecas encima de los codos.',
    'Empuja ambas cargas hacia arriba con intención rápida, sin perder los apoyos ni golpear las mancuernas entre sí.',
    'Baja controlando hasta un recorrido cómodo. Termina dejando las repeticiones en reserva indicadas.'
  ],'Rebotar abajo, levantar los glúteos o forzar el hombro con los codos completamente abiertos.','Haz aproximaciones progresivas. Para cargas altas, acuerda ayuda para colocar y retirar las mancuernas.'),
  entry('pull-up','Dominadas estrictas','combat-strength',1,'Fuerza de tracción vertical para complementar los empujes.',[
    'Usa una barra fija y agarre cómodo algo más ancho que hombros; inicia con el tronco controlado.',
    'Lleva los codos hacia las costillas para subir, sin impulso de piernas ni extender el cuello buscando la barra.',
    'Desciende de forma controlada. Usa asistencia si no puedes completar el rango y las repeticiones en reserva.'
  ],'Balancearte o añadir lastre antes de dominar las repeticiones estrictas.','Empieza con asistencia o jalón al pecho; el lastre solo si dominas tu peso corporal.'),
  entry('trap-bar-deadlift','Peso muerto con barra hexagonal','combat-strength',2,'Fuerza de piernas y cadera con carga centrada alrededor del cuerpo.',[
    'Sitúate dentro de la barra, pies a anchura cómoda. Agarra las asas y ajusta cadera y rodillas con espalda estable.',
    'Tensa el tronco y empuja el suelo; hombros y cadera suben coordinados, brazos largos.',
    'Termina erguido sin echarte atrás y baja controlando hasta el suelo. Recoloca y respira antes de repetir.'
  ],'Arrancar con tirón, redondear la espalda o terminar hiperextendiendo la zona lumbar.','Aprende con una carga ligera y asas altas si hace falta. Los kilos se eligen por técnica y reserva, no por el ejemplo de otra persona.'),
  entry('box-jump','Salto al cajón bajo','combat-strength',3,'Impulso explosivo con aterrizaje estable.',[
    'Usa un cajón bajo, sólido y antideslizante que puedas alcanzar sin recoger excesivamente las rodillas.',
    'Haz una flexión corta de cadera y rodillas y salta con intención rápida; aterriza con ambos pies completos y rodillas alineadas.',
    'Estabiliza, baja caminando un pie cada vez y recolócate. Descansa entre repeticiones; corta si baja la altura o el control.'
  ],'Usar un cajón demasiado alto, caer en sentadilla profunda o saltar hacia abajo para encadenar rebotes.','Ensaya primero el aterrizaje a nivel del suelo y usa la altura mínima adecuada.'),
  entry('kettlebell-swing','Swing con kettlebell','combat-strength',4,'Extensión rápida de cadera y producción de potencia con carga moderada.',[
    'Coloca la pesa delante, sujétala con ambas manos y llévala entre las piernas mediante una bisagra de cadera.',
    'Extiende la cadera con rapidez y deja que la pesa flote aproximadamente a la altura del pecho, con brazos largos.',
    'Espera a que vuelva hacia ti para llevar la cadera atrás. Mantén columna estable y termina depositando la pesa con control.'
  ],'Levantar la pesa con los hombros, convertirlo en sentadilla o arquear la espalda arriba.','Domina primero la bisagra y el peso muerto con kettlebell. No uses una mancuerna improvisada para sustituir el agarre.'),
  entry('landmine-punch','Press rotacional en landmine','combat-strength',5,'Coordinar impulso de piernas, rotación de cadera y empuje diagonal.',[
    'Asegura la barra en un anclaje landmine. Coloca el extremo a la altura del hombro, con pies separados y un pie atrasado.',
    'Empuja el suelo, permite pivotar el pie posterior y acompaña con la cadera mientras extiendes el brazo en diagonal.',
    'Regresa controlando a la posición inicial. Practica ambos lados con carga que puedas acelerar; no fuerces el giro lumbar.'
  ],'Clavar la barra en una esquina sin anclaje seguro o copiar un golpe lastrado con torsión lumbar.','Ensaya con barra sin discos. Es preparación física; la guardia y la técnica de golpeo las ajusta tu entrenador.'),
  entry('plate-chop','Elevación diagonal con disco','combat-strength',6,'Coordinar transferencia diagonal de fuerza con control del tronco.',[
    'Sujeta un disco ligero con ambas manos cerca de una cadera y coloca los pies separados a una anchura estable.',
    'Eleva en diagonal hacia el hombro contrario acompañando con caderas y pivote de pies; acelera solo si controlas la trayectoria.',
    'Frena y vuelve despacio. Haz ambos lados sin buscar amplitud máxima ni retorcer la zona lumbar.'
  ],'Elegir demasiado peso, tirar solo de brazos o girar con los pies clavados.','Primero recorrido lento y carga ligera. Aumenta velocidad sin perder la capacidad de frenar.'),
  entry('russian-twist','Giro ruso con pies apoyados','combat-strength',7,'Resistencia del tronco frente a rotación controlada, como accesorio.',[
    'Siéntate con rodillas flexionadas y talones apoyados. Inclina ligeramente el tronco sin redondear la espalda.',
    'Sujeta una carga ligera cerca del pecho y rota suavemente los hombros a un lado manteniendo la pelvis estable.',
    'Vuelve al centro y cambia de lado con control. Respira durante todo el recorrido y limita el giro a un rango cómodo.'
  ],'Balancear una carga pesada de lado a lado o forzar la espalda en flexión y rotación.','Empieza sin disco. Si aparece molestia, sustituye por Pallof o plancha lateral.'),
  base('landing','Aterrizaje técnico desde puntillas','landing'),
  base('vertical-jump','Salto vertical con contramovimiento','vertical'),
  base('lateral-bound','Salto lateral corto con estabilización','lateral'),
  base('medicine-rotation','Lanzamiento rotacional de balón medicinal','rotation'),
  base('shadow-rotation','Rotación técnica de cadera en sombra','shadow'),
  base('split-dumbbell','Sentadilla dividida con mancuernas','split'),
  base('incline-push','Flexión inclinada con empuje rápido','push',['Flexiones con manos elevadas']),
  base('dumbbell-row','Remo unilateral con apoyo','row',['Remo con mancuerna apoyado']),
  base('dumbbell-hinge','Peso muerto rumano con mancuernas','hinge'),
  base('one-arm-floor-press','Press unilateral de suelo con mancuerna','floor'),
  base('side-plank','Plancha lateral','side'),
  {...base('run-walk','Alternar caminar y trotar','run'),
    purpose:'Empezar a correr de forma gradual y practicar un ritmo cómodo.',
    steps:['Empieza caminando.','Alterna los tramos de trote y de marcha de tu sesión.','Acaba con un paseo suave.'],
    mistake:'Acelerar el trote hasta que deje de ser cómodo.',learn:'Mantén un ritmo al que puedas hablar.'},
  {...base('run-easy','Trote cómodo','run'),
    purpose:'Construir una base aeróbica para complementar el boxeo.',
    steps:['Empieza caminando.','Pasa a un trote que te permita hablar y mantén un ritmo estable.','Camina al final para recuperar.'],
    mistake:'Convertir un trote cómodo en una serie rápida.',learn:'Puedes caminar unos minutos si el ritmo deja de ser cómodo.'},
  {...base('run-short','Intervalos de carrera cortos','run'),purpose:'Repetir esfuerzos cortos con recuperaciones completas y una mecánica de carrera estable.'},
  {...base('run-long','Intervalos de carrera sostenidos','run'),purpose:'Acumular trabajo aeróbico exigente pero controlado para sostener esfuerzos y recuperar entre ellos.'},
  entry('goblet-squat','Sentadilla goblet','catalog-a',0,'Fortalecer piernas y practicar una sentadilla estable con carga delante.',[
    'Sujeta una mancuerna vertical junto al pecho y coloca los pies a una anchura cómoda, con talones apoyados.',
    'Flexiona cadera y rodillas como si te sentaras entre los pies. Mantén las rodillas en la dirección de los dedos.',
    'Baja hasta donde conserves equilibrio y control; empuja el suelo para volver sin inclinarte bruscamente.'
  ],'Levantar los talones, colapsar las rodillas hacia dentro o dejar caer el tronco.','Ensaya sin peso y después usa una carga ligera.'),
  entry('barbell-hinge','Peso muerto rumano','catalog-a',1,'Fortalecer la cadena posterior mediante una bisagra de cadera.',[
    'De pie, sujeta la barra delante de los muslos con brazos largos y rodillas ligeramente flexionadas.',
    'Lleva la cadera atrás manteniendo la barra cerca de las piernas y la espalda estable; no busques tocar el suelo.',
    'Vuelve extendiendo la cadera sin arquear la espalda al final. Mantén el recorrido que puedas controlar.'
  ],'Redondear la espalda o alejar la barra del cuerpo.','Aprende la bisagra sin carga antes de usar la barra.'),
  entry('bench-press','Press de banca','catalog-a',2,'Desarrollar fuerza de empuje de pecho, hombros y tríceps.',[
    'Usa un banco y rack estables, topes de seguridad o una persona que supervise. Apoya pies, glúteos y parte alta de la espalda.',
    'Saca la barra con muñecas alineadas y bájala controlando hacia la zona media-baja del pecho, sin rebotes.',
    'Empuja hacia arriba manteniendo los hombros estables y vuelve a colocar la barra en el rack al terminar.'
  ],'Rebotar en el pecho, perder apoyos o entrenar cerca del fallo sin seguridad.','Elige una carga fácil de controlar y deja las repeticiones en reserva indicadas.'),
  entry('floor-press','Press de suelo con mancuernas','catalog-a',3,'Entrenar el empuje limitando el descenso con el suelo.',[
    'Túmbate con rodillas flexionadas, pies apoyados y una mancuerna en cada mano.',
    'Con los brazos a unos 30–45° del tronco, empuja las mancuernas arriba sin chocar entre sí ni girar las muñecas.',
    'Baja despacio hasta apoyar suavemente la parte posterior de los brazos. Pausa y repite sin rebotar.'
  ],'Golpear los codos contra el suelo o doblar las muñecas.','Usa mancuernas que puedas colocar y retirar con seguridad.'),
  entry('cable-row','Remo en polea','catalog-a',4,'Fortalecer espalda y practicar el control de las escápulas.',[
    'Siéntate frente a la polea baja con pies firmes, rodillas algo flexionadas y tronco erguido. Sujeta el agarre con brazos extendidos.',
    'Lleva los codos hacia atrás y el agarre hacia las costillas bajas, sin echar el tronco hacia atrás.',
    'Devuelve el agarre despacio hasta estirar los brazos manteniendo la espalda estable. Repite sin tirones.'
  ],'Balancear todo el cuerpo, encoger los hombros o tirar con la zona lumbar.','Empieza ligero y ajusta el asiento y la distancia a la polea.'),
  entry('lat-pulldown','Jalón al pecho','catalog-a',5,'Trabajar la espalda mediante una tracción vertical.',[
    'Ajusta el apoyo sobre los muslos y toma la barra con un agarre cómodo. Mantén los pies apoyados.',
    'Lleva los codos hacia abajo y la barra hacia la parte alta del pecho, con una ligera inclinación estable del tronco.',
    'Deja subir la barra de forma controlada sin perder el apoyo ni soltar la carga de golpe.'
  ],'Bajar la barra detrás de la nuca o usar el balanceo para mover demasiado peso.','Reduce la carga si no puedes mantener el mismo recorrido.'),
  entry('wide-dumbbell-row','Remo con mancuernas, codos abiertos','catalog-a',6,'Trabajar la espalda alta con una tracción de codos moderadamente separados.',[
    'Inclina el tronco desde la cadera con rodillas suaves y una mancuerna en cada mano.',
    'Lleva los codos hacia atrás y algo hacia fuera, manteniendo hombros lejos de las orejas.',
    'Baja las mancuernas lentamente sin redondear la espalda ni cambiar la inclinación del tronco.'
  ],'Abrir los codos al máximo o dar tirones con la espalda baja.','Usa cargas ligeras; si el tronco pierde estabilidad, elige remo con apoyo.'),
  entry('split-bodyweight','Sentadilla dividida','catalog-a',7,'Aprender a producir fuerza con una pierna adelantada y otra atrasada.',[
    'Separa los pies hacia delante y atrás, conservando anchura lateral y equilibrio.',
    'Flexiona ambas rodillas bajando casi vertical, con el talón delantero apoyado.',
    'Empuja el suelo para volver y completa las repeticiones antes de cambiar de pierna.'
  ],'Colocar los pies en una sola línea o golpear el suelo con la rodilla atrasada.','Puedes usar un apoyo para mantener el equilibrio.',['Sentadilla dividida sin carga']),
  entry('hip-thrust','Hip thrust','catalog-b',0,'Fortalecer los glúteos mediante extensión de cadera con apoyo de espalda.',[
    'Apoya la parte alta de la espalda en un banco que no se deslice y coloca los pies firmes. Protege la pelvis con un acolchado bajo la barra.',
    'Eleva la cadera hasta alinear aproximadamente hombros, cadera y rodillas, manteniendo costillas controladas.',
    'Baja despacio sin perder la posición del banco ni dejar caer la carga.'
  ],'Arquear la zona lumbar al final o colocar el banco contra el cuello.','Aprende primero con el peso corporal.'),
  entry('glute-bridge','Puente de glúteos con mancuerna','catalog-b',1,'Trabajar la extensión de cadera desde el suelo.',[
    'Túmbate con rodillas dobladas y pies apoyados; sujeta una mancuerna acolchada sobre la pelvis.',
    'Empuja con los pies y eleva la cadera sin abrir las costillas ni arquear la espalda.',
    'Pausa brevemente y baja con control. Mantén la mancuerna sujeta durante todo el movimiento.'
  ],'Subir más alto a costa de la espalda o dejar rodar la mancuerna.','Puedes hacerlo sin carga.',['Puente de glúteos']),
  entry('shoulder-press','Press con mancuernas sentado','catalog-b',2,'Fortalecer hombros y tríceps en un empuje vertical.',[
    'Siéntate con respaldo estable, pies apoyados y mancuernas cerca de los hombros.',
    'Empuja hacia arriba dentro de un recorrido cómodo sin arquear la espalda ni encoger el cuello.',
    'Baja despacio a la posición inicial manteniendo antebrazos bajo las mancuernas.'
  ],'Compensar con una gran extensión lumbar o forzar un rango doloroso.','Usa un agarre neutro si te resulta más cómodo y empieza ligero.'),
  entry('lateral-raise','Elevaciones laterales','catalog-b',3,'Dar trabajo específico al hombro con una carga moderada.',[
    'De pie, sujeta mancuernas ligeras con brazos a los lados y codos ligeramente flexionados.',
    'Eleva los brazos hacia los lados y un poco hacia delante, hasta un rango cómodo cercano a los hombros.',
    'Baja controlando, sin balancearte ni dejar caer las mancuernas.'
  ],'Encoger los hombros o convertir la repetición en un impulso de piernas.','La técnica importa más que el peso.'),
  entry('barbell-curl','Curl de bíceps','catalog-b',4,'Fortalecer los flexores del codo.',[
    'Sujeta una barra ligera con palmas hacia delante, codos junto al tronco y muñecas alineadas.',
    'Flexiona los codos para elevar la barra sin mover el tronco ni adelantar mucho los brazos.',
    'Baja hasta un recorrido cómodo de forma lenta y controlada.'
  ],'Balancearte hacia atrás o doblar las muñecas para terminar la repetición.','Puedes usar barra EZ si el agarre recto no resulta cómodo.'),
  entry('dumbbell-curl','Curl de bíceps con mancuernas','catalog-b',5,'Fortalecer los brazos con carga independiente por lado.',[
    'Sujeta una mancuerna en cada mano, con codos próximos al cuerpo y palmas hacia delante.',
    'Flexiona los codos manteniendo el tronco quieto y los hombros relajados.',
    'Desciende despacio y conserva el mismo recorrido en todas las repeticiones.'
  ],'Dar impulso con la cadera o levantar los hombros.','Usa menos peso si tienes que balancearte.'),
  entry('cable-triceps','Extensión de tríceps en polea','catalog-b',6,'Trabajar el tríceps mediante extensión del codo.',[
    'Colócate frente a una polea alta con cuerda o barra y codos cerca del tronco.',
    'Extiende los codos llevando el agarre hacia abajo sin mover los hombros hacia delante.',
    'Deja que los antebrazos vuelvan lentamente, manteniendo los codos en su sitio.'
  ],'Inclinar todo el cuerpo sobre el agarre o transformar el movimiento en un empuje de hombro.','Ajusta una carga que puedas controlar sin bloquear el codo con violencia.'),
  entry('overhead-triceps','Extensión de tríceps con mancuerna','catalog-b',7,'Entrenar la extensión del codo con los brazos elevados.',[
    'Siéntate estable y sujeta una sola mancuerna con ambas manos por encima de la cabeza.',
    'Flexiona los codos para bajar la mancuerna detrás de la cabeza dentro de un recorrido cómodo.',
    'Extiende los codos para volver sin arquear la espalda ni mover de golpe los brazos.'
  ],'Forzar los hombros o usar una carga difícil de colocar y retirar.','Pide ayuda para colocar la carga si es necesario; reduce el recorrido si molesta.'),
  entry('calf-raise','Elevación de gemelos con mancuernas','catalog-c',0,'Fortalecer la flexión plantar y controlar el tobillo.',[
    'Colócate de pie sobre suelo nivelado con pies paralelos; usa carga solo si mantienes el equilibrio.',
    'Eleva los talones apoyándote sobre los dedos y la parte delantera del pie. Pausa arriba sin saltar.',
    'Baja los talones de forma controlada hasta el suelo y repite.'
  ],'Rebotar, girar los tobillos hacia fuera o perder el equilibrio.','Puedes hacerlo sin mancuernas y con un apoyo ligero.',['Elevación de gemelos']),
  entry('machine-leg-curl','Curl femoral en máquina','catalog-c',1,'Fortalecer los isquiosurales mediante flexión de rodilla.',[
    'Ajusta la máquina a tu altura: rodillas alineadas con el eje y rodillo sobre la parte baja de la pantorrilla, no en el tendón de Aquiles.',
    'Flexiona las rodillas llevando los talones hacia atrás sin levantar la pelvis del apoyo.',
    'Extiende las piernas lentamente, manteniendo la carga bajo control.'
  ],'Arquear la espalda o levantar las caderas para mover más peso.','La ilustración muestra la variante tumbada; pide al monitor que ajuste tu máquina.'),
  entry('sliding-leg-curl','Curl femoral deslizante','catalog-c',2,'Trabajar la parte posterior del muslo con el peso corporal.',[
    'Túmbate con talones sobre deslizadores o toallas en un suelo que permita deslizar; rodillas flexionadas.',
    'Eleva la cadera y desliza los talones hacia fuera hasta donde puedas mantener el control.',
    'Acerca de nuevo los talones doblando las rodillas. Baja la cadera entre repeticiones si necesitas facilitarlo.'
  ],'Extender las piernas más allá de tu capacidad o arquear la espalda.','Empieza con recorridos cortos; un puente de glúteos es una regresión más sencilla.'),
  entry('pallof','Pallof press en polea','catalog-c',3,'Resistir la rotación del tronco frente a una fuerza lateral.',[
    'Coloca la polea a la altura del pecho, sitúate de lado al anclaje y separa los pies.',
    'Sujeta el agarre junto al esternón y extiende ambos brazos rectos hacia delante, resistiendo el tirón lateral.',
    'Vuelve al pecho sin girar el tronco. Completa el lado y cambia la orientación para trabajar el otro.'
  ],'Girar hacia la polea, aguantar la respiración o elegir una carga que te desplace.','Empieza ligero. La flecha del dibujo no indica que debas girar: el tronco permanece quieto.',['Pallof press controlado (no equivale a potencia rotacional)']),
  entry('dead-bug','Dead bug','catalog-c',4,'Coordinar brazos y piernas manteniendo el tronco estable.',[
    'Túmbate boca arriba con brazos hacia el techo y caderas y rodillas flexionadas a 90 grados.',
    'Extiende lentamente un brazo y la pierna contraria sin arquear la zona lumbar.',
    'Vuelve al centro, respira y cambia de lado con el mismo control.'
  ],'Bajar demasiado la pierna y perder la posición de la espalda.','Reduce el recorrido o mueve solo las piernas si lo necesitas.'),
  entry('band-row','Remo con banda','catalog-c',5,'Entrenar la tracción horizontal con resistencia elástica.',[
    'Fija una banda en buen estado a un anclaje seguro delante de ti y siéntate erguido.',
    'Tira llevando los codos hacia atrás y las manos hacia las costillas, sin balancear el tronco.',
    'Vuelve despacio manteniendo tensión y control del anclaje.'
  ],'Usar una banda dañada o un anclaje que pueda soltarse.','Comprueba el material antes de empezar y no apuntes la banda hacia tu cara.'),
  entry('reverse-lunge','Zancada hacia atrás','catalog-c',6,'Trabajar fuerza unilateral y control del paso.',[
    'De pie, da un paso hacia atrás manteniendo anchura entre ambos pies.',
    'Flexiona las rodillas bajando la cadera, sin golpear el suelo con la rodilla posterior.',
    'Empuja con el pie delantero y vuelve a la posición inicial con equilibrio.'
  ],'Dar un paso demasiado estrecho o impulsarte sin controlar el retorno.','Empieza sin carga y utiliza apoyo si hace falta.'),
  entry('hammer-curl','Curl martillo','catalog-c',7,'Fortalecer brazos con un agarre neutro.',[
    'Sujeta mancuernas con las palmas enfrentadas y codos junto al tronco.',
    'Flexiona los codos sin girar las muñecas ni mover el cuerpo.',
    'Baja despacio y conserva el agarre neutro durante toda la repetición.'
  ],'Balancear las mancuernas o adelantar los hombros para ayudar.','Elige un peso que permita movimiento controlado.'),
];
const legacyEquipment:Record<string,string[]>={
 'dumbbell-bench':['dumbbells','bench'],'pull-up':['gym'],'trap-bar-deadlift':['gym','trapBar'],
 'kettlebell-swing':['kettlebell'],'landmine-punch':['landmine'],'plate-chop':['gym'],
 'medicine-rotation':['medicineBall'],'split-dumbbell':['dumbbells'],'dumbbell-row':['dumbbells'],
 'dumbbell-hinge':['dumbbells'],'one-arm-floor-press':['dumbbells'],'goblet-squat':['dumbbells'],
 'barbell-hinge':['gym'],'floor-press':['dumbbells'],'lateral-raise':['dumbbells'],'calf-raise':['dumbbells'],
 'pallof':['gym'],'box-jump':['box'],'cone-shuffle':['cones']
};
const baseMetadata=new Map<string,readonly string[]>(boxingBaseMetadata.map(row=>[row[0],row]));
const expanded=new Map(boxingExpansion.map(record=>[record.id,record]));
export const exerciseCatalog:ExerciseRecord[]=[
  ...originalCatalog.map((record):ExerciseRecord=>{
    const replacement=expanded.get(record.id);
    if(replacement)return {...replacement,aliases:[...new Set([...record.aliases,record.name,...replacement.aliases].filter(name=>name!==replacement.name))]};
    const meta=baseMetadata.get(record.id);
    if(!meta&&record.id!=='vertical-jump')return record;
    return {...record,category:(meta?.[1]??'Pliometría') as ExerciseRecord['category'],pattern:meta?.[2]??'vertical',equipment:legacyEquipment[record.id]??['bodyweight'],minLevel:['landing','neck-isometric','bird-dog','dead-bug','split-bodyweight','incline-push','reverse-lunge','boxing-in-out','boxing-pivot'].includes(record.id)?1:2,impact:meta?.[1]==='Pliometría'?'high':'low',version:3};
  }),
  ...boxingExpansion.filter(record=>!originalCatalog.some(old=>old.id===record.id)),
];
export const boxingExerciseIds=new Set([...boxingBaseMetadata.map(row=>row[0]),...boxingExpansion.map(record=>record.id),'vertical-jump']);
export const boxingPhysicalCatalog=exerciseCatalog.filter(record=>boxingExerciseIds.has(record.id));

const normalized=(name:string)=>name.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function findExerciseRecord(ex:{name:string;catalogId?:string},records:ExerciseRecord[]=exerciseCatalog){
  return records.find(r=>r.id===ex.catalogId)??records.find(r=>[r.name,...r.aliases].some(n=>normalized(n)===normalized(ex.name)))??null;
}

/** Published remote records can update a guide, never downgrade its local version. */
export function mergeExerciseCatalog(remote:ExerciseRecord[]){
 const merged=new Map(exerciseCatalog.map(record=>[record.id,record]));
 for(const record of remote)if(record.version>=(merged.get(record.id)?.version??0))merged.set(record.id,record);
 return [...merged.values()];
}
