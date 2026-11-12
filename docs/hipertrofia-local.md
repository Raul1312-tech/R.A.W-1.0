# RISE: Boxeo e Hipertrofia — revisión local

Fecha: 12 de noviembre de 2026. Rama: `codex/hipertrofia-local`.
No se ha subido ni desplegado esta implementación. No modifica Supabase, Vercel ni las credenciales.

## Cómo revisar

- Entrada con elección de modalidad: http://127.0.0.1:5194/demo
- Ejemplos de gimnasio: http://127.0.0.1:5194/review
- En Perfil → Perfil activo se puede alternar entre cinco y seis días.
- Los ejemplos son sintéticos y se guardan en una clave local independiente de la demo habitual. El perfil de cinco días contiene una sesión parcial de prueba usada para verificar el guardado.
- El servidor local debe estar en marcha. Para reiniciarlo desde este directorio: `node node_modules/next/dist/bin/next dev --webpack --port 5194 --hostname 127.0.0.1`.

## Implementado

1. Entrada común con elección Boxeo / Hipertrofia por perfil. Los perfiles antiguos con rutina de boxeo conservan su modalidad.
2. Cambio de modalidad mediante onboarding y propuesta revisada. Conserva planes históricos y registros; genera calendarios de la nueva modalidad para los meses futuros ya existentes.
3. Rama de gimnasio sin selección de carrera, sparring ni competición. Identidad RISE Hipertrofia y contenidos propios.
4. Generador propio: cuerpo completo, torso/pierna, cinco días combinados y seis días empuje/tirón/pierna A/B. Se permite elegir hasta siete días con avisos de recuperación.
5. Selección por material, tiempo disponible por día, nivel, fase y hasta dos prioridades musculares. Exclusión de movimientos que no se desean.
6. Series, rangos de repeticiones, descansos y RIR. Los kilos iniciales no se inventan. Resumen desplegable de volumen directo e indirecto por músculo.
7. Calendario mensual editable y ejecución en Hoy. Las sesiones iniciadas conservan su prescripción.
8. Registro opcional de kilos, repeticiones y RIR por serie. Solo las series marcadas se guardan como trabajo realizado. Temporizador de descanso y referencia a cargas anteriores.
9. Sustitución de un ejercicio pendiente por otro del mismo patrón, respetando material y exclusiones. La carga anterior no se copia a otro ejercicio.
10. Movimiento de una sesión no iniciada a un día libre. Actualiza menús automáticos pendientes de las semanas afectadas; respeta comidas registradas, dietas personalizadas y meses fijados.
11. Progreso de gimnasio con sesiones, series realizadas y referencias por ejercicio. Perímetros opcionales y las fotos existentes.
12. Menús, comidas habituales, suplementos, lista de compra y seguimiento compartidos. Superávit inicial más moderado para ganar masa en gimnasio; sin reglas de pesaje del boxeo.
13. Coordinador adaptado a gimnasio: el esfuerzo alto habitual no dispara por sí solo una descarga. Puede proponer un incremento pequeño de carga tras dos registros completos con repeticiones y RIR suficientes. La propuesta muestra kilos y explicación y requiere aceptación. No escribe rendimiento ficticio.
14. Ocho lecturas de hipertrofia con acciones pequeñas y referencias. Se conservan las herramientas nutricionales comunes y las ilustraciones permanentes de los ejercicios.

## Verificación

- 191 pruebas automatizadas: generación, medidas por serie, sustituciones, movimiento de sesiones y nutrición, progresión de cargas, cambio de modalidad y conservación de históricos.
- TypeScript sin errores y compilación Next.js con webpack correcta.
- Comparación de 45 configuraciones de boxeo contra `ddea700`: rutinas idénticas.
- Navegador local: entrada de modalidad, calendarios de cinco y seis días, registro parcial con kilos/repeticiones/RIR, guardado y recuperación tras recargar, navegación a Aprende y selección de perfiles.

## Alcance y límites explícitos

- Es un generador por reglas y catálogo curado; no una valoración individual de un entrenador. El tiempo por ejercicio es una estimación y el volumen efectivo depende de ejecución, descansos y recuperación.
- El catálogo reutiliza las ilustraciones existentes; no se han generado fotos nuevas ni añadido todas las máquinas posibles. Las nuevas lecturas son textuales.
- No calcula composición corporal ni porcentaje de grasa a partir de fotos o perímetros.
- Las pruebas locales no ejecutan llamadas pagadas a OpenAI ni el trabajo programado en producción. Se ha adaptado y probado el contexto y las propuestas que utiliza esa integración.
- Los precios de compra, proveedor de autenticación y almacenamiento privado conservan su implementación anterior. No se han consultado precios nuevos ni cambiado permisos cloud en esta tarea.
- Cambiar un plan no modifica consumos registrados ni una dieta mensual fijada. Esas decisiones explícitas se revisan desde Comidas.
- No se ha realizado una validación clínica ni una prueba exhaustiva en todos los móviles.

Antes de publicar: revisión del usuario en local y prueba autenticada de persistencia con una cuenta de ensayo, sin alterar los datos reales.
