# SaaS de preparación física y nutrición

## Alcance acordado

Una plataforma común, con Rise como primera empresa y marcas independientes para cada centro. El propietario conserva el control de empresas, módulos, accesos y contratos. Cada empresa gestiona sus alumnos y su biblioteca.

Oposiciones significa preparación física, carrera, pruebas físicas, recuperación, acompañamiento y nutrición. No habrá temario ni contenidos académicos. Una empresa de oposiciones no debe presentarse como un motor de convocatoria específico hasta disponer de pruebas, baremos y planificación por fecha objetivo.

## Orden de construcción

1. **Base multiempresa y biblioteca propia.** Aislamiento, roles, invitaciones, marca, selección inicial de módulos según actividad, consulta y copia de rutinas completas. Es el bloque de esta entrega, sobre la base existente.
2. **Experiencia específica por actividad.** Onboarding y navegación para boxeo, musculación y preparación física de oposiciones. Compartir componentes y datos comunes; extender las reglas por actividad. Hoy el perfil deportivo sigue teniendo boxeo y musculación; crear una empresa de tipo academia no añade por sí solo un nuevo motor deportivo.
3. **Inventario del centro.** Sedes, máquinas y material, fotos reales, disponibilidad y vínculo con ejercicios compatibles. Sesión de fotos organizada por material y ejercicio; las imágenes de máquinas no sustituyen la explicación de ejecución. El recomendador deberá filtrar por sede y material disponible antes de recomendar.
4. **Pruebas físicas de oposiciones.** Convocatoria y versión de baremos, pruebas exigidas, marcas iniciales, fecha objetivo, progresión y registros. Carrera y fuerza se planifican según las pruebas y carga total. Las reglas se validan con un preparador antes de automatizarlas.
5. **Cobros y suscripciones.** Definir quién vende el servicio al alumno y quién factura; después integrar proveedor, eventos de pago, impagos y conciliación. Separar la suscripción del centro al software del posible cobro del centro a sus alumnos. La elección del flujo de pagos y comisiones queda pendiente; no se ha integrado una pasarela ni se emiten facturas fiscales automáticamente.
6. **Métricas y piloto.** Altas, activación, uso, seguimiento, retención y coste de servicio. Empezar con Rise y un segundo centro piloto, verificar aislamiento y uso real, y ampliar después.

## Decisiones de esta entrega

- Los tipos de empresa existentes se mantienen: boxing, gym, academy y mixed.
- Elegir una actividad al crear una empresa carga módulos sugeridos. Editar la actividad de una empresa existente no desactiva módulos automáticamente; el propietario puede aplicar las sugerencias y revisar antes de guardar.
- La biblioteca utiliza los registros de plantillas existentes y sus permisos actuales; no añade otro almacén de datos.
- Duplicar crea una nueva plantilla en la misma empresa. No cambia la original ni publica cambios en alumnos.
- Se captura la semana elegida, incluidos cambios manuales y doble sesión de fuerza/carrera. Se conserva la prescripción, no historiales personales. La repetición de plantillas mantiene los ejercicios fijos; la rotación automática sigue disponible en rutinas generadas fuera de esta biblioteca.
- El editor distingue cambios pendientes de una sesión del guardado final de la plantilla.
- Las plantillas de nutrición siguen siendo repartos y horarios. No equivalen a una dieta cerrada común para todos los usuarios.
- La aplicación a un alumno conserva los permisos y controles de revisión existentes. No se amplían accesos en este bloque.
- Las funciones específicas pendientes se muestran como próximas, no como capacidades disponibles.

## Verificación

Pruebas de módulos válidos e independientes; conservación de ejercicios y doble sesión al normalizar; semana correcta y cruce de mes; borradores vacíos rechazados; ausencia de competición fechada; conservación de la fuente. Verificación visual en la demostración con datos sintéticos y comprobaciones generales de TypeScript, pruebas y compilación.
