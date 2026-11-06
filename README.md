# R.A.W 1.0

Aplicación privada de alimentación y entrenamiento. Next.js en Vercel y Supabase para autenticación y registros. Cada cuenta tiene sus propios perfiles; no hay acceso compartido entre cuentas.

## Funciones

- Perfil deportivo con disciplina, experiencia, objetivo, horarios y peso pendiente para competición.
- Menús de lunes a domingo, de tres a seis comidas por día según el perfil y rotación de toda la semana.
- Alimentación halal, exclusiones, cantidades y lista de compra.
- Registro de comida, agua, peso, pasos, entrenamiento y sueño.
- «Mi rutina»: hipertrofia de 2–5 días y preparación física de boxeo con 2 sesiones de fuerza/potencia y 0–2 de carrera por intervalos.
- Configuración de experiencia, fase, material, tiempo y carga técnica/sparring; revisión de propuesta antes de activar.
- Versiones de rutina y sesiones reales con series, repeticiones/tiempos, carga, minutos, RPE y notas. Editar una sesión ajusta sus minutos en el registro diario sin duplicarlos.
- Acceso con correo y contraseña, sin correo en cada inicio de sesión.
- Alta con confirmación de correo y recuperación para crear/restablecer contraseña.
- Guardado en Supabase, actualización cada 30 segundos y al volver a la ventana.
- Protección frente a guardados simultáneos: una revisión antigua no sobrescribe una nueva.
- Exportación e importación JSON con revisión antes de sustituir el historial.

Los perfiles iniciales son ejemplos sin confirmar. Los datos reales se introducen o importan tras iniciar sesión. El código, los archivos públicos y el repositorio no incluyen historiales personales.

## Desarrollo

### Perfil del deportista

El formulario recoge deporte, experiencia, objetivo, datos físicos, actividad habitual, entre tres y seis comidas diarias, horario, presupuesto, alergias, exclusiones y observaciones. La rutina se diseña en «Mi rutina»; el perfil no pide un excedente de kcal ni un texto duplicado de entrenamiento. El objetivo elegido determina la estimación inicial; un objetivo energético acordado con el equipo conserva su prioridad.

El peso de competición puede guardarse sin conocer todavía la fecha del pesaje. Se muestra en «Mi día» y sirve para completar después las fechas de combate y pesaje en «Mi rutina». No activa un déficit automático. Si ya existen fechas detalladas, la categoría se comparte y esas fechas se conservan.

Guardar un perfil confirmado genera una nueva semana y actualiza los menús mensuales pendientes desde la fecha actual. Los días pasados y las fechas con comidas registradas conservan sus objetivos y comidas. Las comidas habituales mantienen su franja (por ejemplo, la cena), aunque cambie el número de tomas. Los perfiles antiguos siguen siendo compatibles; las nuevas preferencias se validan en el mismo JSON privado, sin cambios de tablas.

### Modo de prueba sin cuenta

`/demo` abre la app con un perfil ficticio editable y un menú semanal de ejemplo. No consulta ni escribe `/api/journal` y no requiere Supabase. Guarda únicamente en `localStorage` bajo `raw-1-0:demo:v1`, separado de las cuentas. No sincroniza dispositivos ni pestañas: usar una pestaña de prueba a la vez. Exportar para conservar una copia o importarla después, de forma explícita, en la cuenta privada. Borrar los datos del navegador elimina esta copia. El acceso principal y la API conservan la autenticación y RLS.

### Rutinas

`workouts` es opcional en cada perfil: los historiales anteriores siguen siendo válidos. Incluye hasta 12 propuestas guardadas y 200 sesiones realizadas; los registros conservan el nombre y la prescripción de los ejercicios, aunque se cambie la rutina. Se valida en importación, lectura y guardado con el mismo esquema tanto en demo como en la API privada; continúa dentro del payload JSON con RLS existente, sin nuevas tablas ni permisos.

El generador usa plantillas deterministas explicadas en la interfaz. La recomendación de 0–2 días de carrera es una regla conservadora según experiencia, técnica y sparring declarado, no una prescripción clínica validada. Bloquea limitaciones declaradas y conflictos físicos el mismo día o víspera de sparring, incluso domingo/lunes. No interpreta texto libre ni fechas de combate, no programa sparring y no automatiza una puesta a punto competitiva. Los tiempos son aproximados. La carga RPE × minutos es descriptiva y no predice lesiones.

Referencias de entrenamiento: ACSM 2026 y ASCA sobre fuerza/potencia para boxeo, enlazadas dentro de «Mi rutina». La programación concreta es una propuesta inicial revisable con el entrenador.

Node 22.13 o superior (verificado con Node 24.22.1).

```sh
npm ci
cp .env.example .env.local
# Completar NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Dirección local: http://127.0.0.1:5185

```sh
npm test
npm run typecheck
npm run build
```

## Supabase

- Organización: `r.a.w 1.0` (`cfltqcaxlpymjbfgalrg`).
- Proyecto: `R.A.W 1.0` (`lzkbddtsrwpsvsnzkqdi`), región `eu-west-1`.
- La aplicación solo necesita URL y clave **publishable**. No requiere contraseña de Postgres ni una clave `service_role`/secret.
- Las migraciones de `supabase/migrations` están aplicadas mediante el editor SQL del dashboard. Antes de usar `supabase db push` contra este proyecto, reconciliar su historial de migraciones con los archivos aplicados, verificando el esquema; no volver a ejecutarlas a ciegas.
- `supabase/verify-isolation.sql` comprueba dos identidades sintéticas, aislamiento, control de revisiones y rechazo de acceso anónimo. Todo dato de prueba se revierte en la misma transacción.

RLS está activado y forzado en `journals`. Las políticas verifican `auth.uid() = owner`. Los usuarios anónimos no tienen acceso. La función de guardado usa `SECURITY INVOKER`. Las rutas verifican la identidad con `getUser`, validan entradas, limitan el cuerpo a 2 MB y rechazan escrituras de otro origen. Las respuestas privadas no se almacenan en caché.

## Correo y despliegue

El correo predeterminado de Supabase es para pruebas y solo entrega a miembros del equipo del proyecto. Para el acceso de usuarios externos, configurar un proveedor SMTP propio en Authentication → Emails → SMTP Settings. No desactivar la confirmación de correo ni añadir deportistas como administradores de Supabase para evitar esta limitación.

El proyecto `raw-1-0` está desplegado en https://raw-1-0.vercel.app dentro de `raul1312-tech's projects`, plan Hobby, conectado a la rama `main` del repositorio privado. Las dos variables de `.env.example` están configuradas en Production y Preview.

El proveedor de correo de pruebas permite 2 envíos por hora para todo el proyecto. El inicio de sesión con contraseña no envía correos. La confirmación inicial y la recuperación sí consumen ese cupo: esperar a que se libere antes de pedir un enlace nuevo y abrirlo en el mismo navegador donde se solicitó (PKCE). SMTP propio queda pendiente por decisión del propietario.

Las cuentas anteriores, creadas por enlace, deben usar «No tengo contraseña / La he olvidado» una vez para establecer una contraseña. Una cuenta con sesión válida también puede abrir `/auth/password`. Esta ruta valida `getUser()` en el servidor; la contraseña se envía directamente a Supabase mediante `updateUser`, no se guarda en registros de la app. Los callbacks de correo terminan en esta pantalla protegida; quienes ya eligieron contraseña al registrarse pueden continuar a su plan. No se han desactivado la confirmación de correo ni RLS.

En Supabase → Authentication → URL Configuration:

- Site URL: `https://raw-1-0.vercel.app`.
- Redirect URL de producción: `https://raw-1-0.vercel.app/auth/callback`.
- Retorno local ya configurado: `http://127.0.0.1:5185/auth/callback`.
- Usar URLs exactas; evitar comodines amplios para producción.

Para verificar el flujo completo, entrar con un correo autorizado, importar el JSON exportado desde la versión local, guardar un registro y abrir la misma cuenta en otro dispositivo. Una sesión nueva no tiene acceso a registros de otra cuenta.

## Estado de validación

Catálogo compartido: 45 fichas ilustradas persistidas en `public.exercise_catalog`, con lectura de contenido publicado y sin permisos de escritura para usuarios. `/api/exercises` obtiene las fichas y mantiene una copia incluida como respaldo. Los archivos de imagen están guardados en `public/training`; cada ficha referencia su imagen y posición, sin regenerarla al crear rutinas. Tanto la demo como las cuentas consultan este contenido no personal; los registros de la demo siguen siendo exclusivamente locales. Detalles y prompts en `docs/exercise-catalog.md`.

El resumen de boxeo refleja la selección real (por ejemplo, 2 de físico + 2 de carrera). La recomendación conservadora aparece como consejo opcional. Antes de validar se recalculan los campos derivados desde los calendarios explícitos; los mensajes indican el campo concreto. Pruebas: 210 distribuciones distintas de 2+2, edición de calendarios antiguos, todas las variantes de ejercicios y resolución de imágenes por nombre histórico.

Boxeo: los calendarios `physicalDays` (dos sesiones) y `runningDays` (cero a dos) son independientes. El campo `days` conserva su unión para compatibilidad. Los planes anteriores derivan su reparto original sin modificar sesiones ni registros; al crear otra versión se guardan los nuevos campos. Coincidir con sparring o su víspera produce avisos identificando día y tipo de sesión, sin bloquear el guardado. Físico y carrera se programan en días distintos.

Las nuevas sesiones físicas trabajan potencia vertical/lateral, rotación, fuerza unilateral, empuje, cadena posterior y control del tronco. Cada ejercicio generado de boxeo y carrera tiene una guía desplegable con objetivo, tres pasos, error habitual y una ilustración generada. Recursos y prompts: `docs/training-illustrations.md`. Son plantillas revisables de R.A.W, sin atribución a entrenadores de deportistas profesionales.

- Compilación Next.js y TypeScript correctos.
- Pruebas automatizadas: menús, variedad, macros, restricciones, historial, límites, origen y mensajes de error de acceso.
- Verificación SQL real: aislamiento de propietarios, revisiones obsoletas y rechazo anónimo.
- Asesores de seguridad y rendimiento de Supabase: 0 errores y 0 avisos tras corregir los permisos de la función interna de RLS automático.
- Comprobación HTTP: `/` redirige al acceso; API sin sesión devuelve 401; escritura de otro origen devuelve 403; acceso directo anónimo a `journals` denegado.
- Pendiente de comprobación con el usuario: correo de acceso, sesión real y sincronización desde dos dispositivos.
- Despliegue inicial y retorno de autenticación verificados en el dominio de producción.
- Pendiente para usuarios externos: configurar SMTP propio.

## Importar datos previos

En la versión anterior, pulsar **Exportar datos**. En R.A.W, iniciar sesión y pulsar **Importar historial**, seleccionar el JSON y confirmar tras revisar el resumen. El archivo puede ser un estado exportado o una copia local con `{ state, revision }`. La revisión antigua se ignora y se usa la de la cuenta de destino.

La importación sustituye los perfiles de esa cuenta. Exportar primero si ya hay datos que se quieran conservar. Los historiales locales existentes permanecen en su carpeta original y no se suben a GitHub.
