# Plataforma de empresas

La aplicación comparte el motor de planificación entre empresas independientes. Rise es la primera empresa y conserva los registros anteriores.

## Acceso y rutas

- /superadmin: empresas, configuración de módulos y plazas, directorio de vínculos, métricas comerciales, facturas y actividad.
- /admin/rise y /admin/<empresa>: equipo, clientes, seguimiento autorizado, marca, plantillas, suscripción y actividad de esa empresa.
- /empresas: empresas a las que pertenece la cuenta.
- /o/<empresa>: app privada con logo, nombre, colores y módulos de la empresa.
- /login?company=<empresa>: acceso con su marca.
- /join/<token>: aceptación de invitaciones asociadas al correo confirmado.
- /demo/gestion: demostración sin acceso a datos reales; Team Alache solo existe como ejemplo local del panel. /demo?company=team-alache muestra su marca.

El superadmin inicial se asigna exclusivamente al UUID y correo del propietario previamente verificado de la aplicación. Los roles no se obtienen de metadatos del navegador ni se pueden elegir al registrarse. Nuevos superadmins requieren una operación administrativa de confianza en la base de datos.

## Permisos

Superadmin gestiona empresas, marca, módulos, límites, contratos y facturación. Dispone de una ficha de supervisión de solo lectura para cuentas activas de empresas activas, mediante platform_client_detail. Esta consulta está auditada y permite revisar dietas por fecha, registros, entrenos, sensaciones y revisiones guardadas. No incluye fotografías originales. El acceso no cambia share_followup. La cuenta de propietario puede editar planes de Rise. En otras empresas la edición requiere rol de administrador de esa empresa para sus alumnos, o acceso profesional asignado y autorizado. Las notas y las plantillas que modifican preferencias de perfil conservan el permiso adicional de seguimiento.

Los administradores gestionan equipo, clientes, invitaciones, marca y planes de los alumnos de su propia empresa. Pueden consultar y editar la planificación de esos alumnos sin activar por ellos share_followup. Los entrenadores conservan la asignación y el permiso adicional del usuario. Los privilegios de supervisión de otras empresas pertenecen exclusivamente al superadmin de plataforma. Los entrenadores consultan únicamente clientes asignados que hayan compartido su seguimiento. Cada usuario puede revocar ese permiso. El permiso cubre los perfiles de su cuenta dentro de esa empresa. Las fotografías siguen siendo privadas incluso con seguimiento compartido.

Los paneles tienen directorios paginados (100 registros), hasta 200 acciones recientes y 300 facturas recientes. Las cifras agregadas se calculan en la base de datos. El seguimiento muestra registros, peso, sesiones, menú/rutina y notas internas, sin inventar cumplimiento cuando faltan datos. No constituye un sistema de analítica ilimitada.

## Datos y aislamiento

organizations, organization_members y platform_admins definen empresas, roles y acceso. Una persona puede tener varios vínculos. Los registros históricos de Rise permanecen en journals; los de otras empresas se guardan en organization_journals con clave (organization_id, owner). Las operaciones usan revisiones para evitar sobrescribir cambios simultáneos. Marca y configuración también requieren la versión updated_at cargada por el editor.

Las peticiones derivan la empresa de /o/<slug>, de modo que dos pestañas no dependan de una cookie global de empresa activa. La API valida identidad con Supabase getUser y las funciones de base de datos vuelven a comprobar membresía, estado, rol y permiso. Suspender empresa o miembro bloquea inmediatamente los registros y servicios privados.

Las fotos nuevas de otras empresas usan owner/organizations/organization_id/profile/nombre; Rise conserva su ruta anterior. IA diaria, revisión semanal, trabajos en segundo plano y sus cachés incluyen organization_id. Desactivar IA o fotos bloquea sus API y acceso correspondiente; desactivar nutrición/entrenamiento impide modificar prescripciones existentes. Las modificaciones de perfil conservan esos campos mientras el módulo esté desactivado.

Las tablas administrativas tienen RLS forzado y permisos directos revocados: acceso únicamente mediante funciones verificadas. El aviso informativo RLS enabled no policy en estas tablas es intencional (denegación por defecto); no se deben añadir políticas permisivas para silenciarlo. Las funciones con privilegios están en raw_platform, que no se expone en Data API. Los wrappers públicos se ejecutan como llamante.

## Incorporar una empresa

1. Crear empresa en Superadmin, configurar nombre, identificador, colores, logo, módulos y plazas.
2. Abrir su panel e invitar al responsable como administrador.
3. Copiar el enlace y compartirlo por el canal elegido. El panel no envía correos.
4. El responsable entra con Google o una cuenta existente verificada del mismo correo y acepta la invitación en siete días. El token se almacena como hash, es de un uso y puede revocarse. Cambiar roles de miembros existentes se hace desde Equipo, no reutilizando invitaciones.
5. Invitar clientes y entrenadores; asignar entrenador al cliente. El cliente decide si comparte seguimiento.

Los usuarios nuevos verificados pueden incorporarse a Rise si está activada su admisión de nuevas cuentas. Las otras empresas requieren invitación; no se puede entrar solo con conocer su enlace. El acceso Google mantiene el selector de cuenta. Una invitación no envía datos a un tercero por sí sola.

## Plantillas y módulos

Se guardan plantillas semanales de entrenamiento y de distribución de comidas/horarios. Aplicarlas requiere permiso de seguimiento y la revisión actual del registro. Alimentación recalcula usando el perfil, restricciones e historial del cliente; no impone calorías iguales a todos. Entrenamiento conserva pasado, registros, borradores y calendario técnico/sparring. Una competición o limitación declarada obliga a revisar el plan individual antes de aplicar una rutina genérica.

Módulos: alimentación, entrenamiento, boxeo, competición, mentor IA, fotos, aprende y seguimiento. Boxeo depende de entrenamiento; competición depende de alimentación y entrenamiento. El tipo academia usa los módulos existentes de preparación física/hábitos; no incorpora todavía planificación de estudio, temarios ni simulacros.

## Facturación y límites de esta entrega

Contratos mensuales en EUR, plazas, estado de suscripción, datos de facturación, renovación, facturas y estados borrador/pendiente/pagada/anulada. El ingreso mensual contratado no es un cobro realizado. La empresa ve su contrato y facturas; solo superadmin los modifica. Se puede exportar la vista de facturas y directorios en CSV.

No hay cobros automáticos, pasarela de pagos, emisión fiscal electrónica ni envío automático de invitaciones. Las facturas son un registro administrativo manual. Los dominios propios de cada empresa y aplicaciones móviles independientes tampoco se provisionan: cada empresa usa /o/<slug> en el mismo despliegue.

## Verificación

npm test, npm run typecheck y npm run build. tests/platform.test.mjs comprueba rutas, validación de marcas y módulos, métricas y conservación de datos al aplicar plantillas. supabase/verify-platform.sql ejecuta aislamiento entre empresas, roles, consentimiento, asignación de entrenador, invitaciones, concurrencia y suspensiones. supabase/verify-isolation.sql conserva la comprobación del historial de Rise. Ambos scripts usan identidades sintéticas dentro de una transacción que se revierte por completo.


## Edición mensual de alumnos

En Usuarios → Ver ficha, Dieta y Entrenos abren el calendario del mes y una lista mensual alternativa. Una propuesta calculada se distingue de un día con planificación guardada. Los meses pasados se consultan; no se rellenan retrospectivamente como si hubiesen estado guardados.

El administrador de una empresa puede administrar los planes de sus miembros con rol usuario. La cuenta de propietario puede hacerlo en Rise. Un superadmin sin membresía profesional en otra empresa conserva supervisión de lectura. Los entrenadores mantienen asignación y permiso adicional del alumno. Estas capacidades no activan share_followup por el alumno ni dan acceso a otros gimnasios.

La edición de comida cambia ingredientes, cantidades y nombre de una toma pendiente. Puede aplicarse a esa fecha, a las siguientes coincidencias del día de la semana, o a la misma franja durante el resto del mes. Omite días cerrados y tomas registradas. «Guardar las propuestas pendientes» persiste las fechas con menú calculado que todavía no tienen un snapshot guardado. El menú nuevo se guarda en days[fecha].foodPlan y lo lee la misma vista diaria del deportista. Se puede mantener la prescripción o permitir el ajuste automático de las cantidades pendientes.

La rutina reutiliza el editor de calendario y ejercicios. Se prepara en borrador y se revisan fechas, sesiones, series, dosis, descansos e intensidad antes de confirmar. Al publicar se añade una versión mensual, conservando el pasado y las fechas con sesiones iniciadas, realizadas o boxeo registrado; no se cambian logs, drafts ni registros diarios.

La API vuelve a calcular la propuesta con el estado persistido y la revisión cargada. El token de revisión identifica comando, empresa, alumno, perfil, fecha y revisión; no es un permiso de acceso. El guardado usa CAS, autorización en servidor y función PostgreSQL independiente que limita las diferencias a prescripciones y rechaza cambios en consumos, medidas, comentarios del usuario, días pasados y versiones anteriores. Los metadatos antiguos que la UI no interpreta se conservan. No hay guardados al escribir en un campo o generar una propuesta: solo al confirmar.

Las plantillas que cambian preferencias del perfil y las notas internas conservan su permiso anterior, independiente de esta edición de planes. Verificación adicional: tests/client-plan-editor.test.mjs y supabase/verify-student-plans.sql.
