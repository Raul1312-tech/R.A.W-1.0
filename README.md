# R.A.W 1.0

Aplicación privada de alimentación y entrenamiento. Next.js en Vercel y Supabase para autenticación y registros. Cada cuenta tiene sus propios perfiles; no hay acceso compartido entre cuentas.

## Funciones

- Menús de lunes a domingo, cinco comidas por día y rotación de toda la semana.
- Alimentación halal, exclusiones, cantidades y lista de compra.
- Registro de comida, agua, peso, pasos, entrenamiento y sueño.
- Acceso por enlace enviado al correo, sin contraseña.
- Guardado en Supabase, actualización cada 30 segundos y al volver a la ventana.
- Protección frente a guardados simultáneos: una revisión antigua no sobrescribe una nueva.
- Exportación e importación JSON con revisión antes de sustituir el historial.

Los perfiles iniciales son ejemplos sin confirmar. Los datos reales se introducen o importan tras iniciar sesión. El código, los archivos públicos y el repositorio no incluyen historiales personales.

## Desarrollo

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

El proveedor de correo de pruebas permite 2 envíos por hora para todo el proyecto. El acceso distingue este límite del exceso de intentos y de una dirección no autorizada. Esperar a que se libere el cupo antes de pedir un enlace nuevo; abrirlo en el mismo navegador donde se solicitó (PKCE). SMTP propio queda pendiente por decisión del propietario.

En Supabase → Authentication → URL Configuration:

- Site URL: `https://raw-1-0.vercel.app`.
- Redirect URL de producción: `https://raw-1-0.vercel.app/auth/callback`.
- Retorno local ya configurado: `http://127.0.0.1:5185/auth/callback`.
- Usar URLs exactas; evitar comodines amplios para producción.

Para verificar el flujo completo, entrar con un correo autorizado, importar el JSON exportado desde la versión local, guardar un registro y abrir la misma cuenta en otro dispositivo. Una sesión nueva no tiene acceso a registros de otra cuenta.

## Estado de validación

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
