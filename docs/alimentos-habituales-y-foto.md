# Alimentos habituales y registro por foto

Actualización del 14 de noviembre de 2026.

## Flujo

- Onboarding → Alimentación: selección visible de hidratos y proteínas con botones Habitual / Ocasional / Evitar. Repetir un botón quita la selección.
- Comidas → Mis alimentos y preferencias: editar y guardar. Se genera la semana y se revisan las comidas automáticas pendientes; los consumos, días cerrados y meses fijados conservan su contenido.
- El generador penaliza alimentos fuera de los básicos elegidos por grupo. Los ocasionales siguen disponibles; activar «Quiero descubrir» permite un reparto abierto. La frecuencia no es una garantía porcentual: depende de platos compatibles, restricciones y objetivos.
- Comí otra cosa → Fotografiar mi comida: cámara trasera en móviles compatibles o archivo JPG/PNG/WebP, nota opcional, consentimiento de envío a OpenAI, análisis y borrador editable. Confirmar el registro usa el flujo de comida alternativa existente y su ajuste de comidas pendientes.

## API y privacidad

- POST /api/foods/photo exige mismo origen y usuario verificado. No admite URLs externas de imágenes.
- Imagen reducida en navegador a 1280 px, convertida a JPEG sin metadatos. Límite de archivo original 15 MB y cuerpo JSON limitado en servidor.
- OpenAI Responses con gpt-4.1-mini, formato estructurado, store:false y secreto de servidor OPENAI_FOOD_API_KEY. La clave nueva se creó mediante el flujo seguro y solo se guardó en .env.local ignorado por Git. No sustituye la clave del coordinador.
- La foto no se guarda en el historial de la app. Se registra su hash; el resultado compacto puede guardarse en el registro privado de consultas.
- Registro independiente food_photo_reviews: hasta 12 análisis por cuenta/día UTC. No consume el cupo del coordinador. Reserva atómica por propietario, fecha y slot; hash único por propietario y fecha. Las peticiones fallidas consumen su reserva. RLS de propietario; sin acceso anónimo, borrado ni modificación del propietario desde el cliente.
- Se cachean resultados inferiores a 15 kB. Una repetición idéntica recupera el resultado sin otra llamada pagada. Los resultados mayores guardan recibo; el borrador recibido permanece en el editor hasta cerrarlo.
- Cantidades y macros son aproximados. No se deducen alérgenos, ingredientes ocultos ni identidad de personas. El usuario debe revisar el plato y confirmar antes de registrarlo.

## Varias fotos y balance diario

- Cada foto añade ingredientes al borrador existente, sin sustituir los anteriores. Admite alimentos manuales y hasta 20 ingredientes por comida. Al superar el límite se conserva el borrador anterior.
- «Añadir otro plato con foto» sirve para segundo plato o postre. Guardar, volver a editar y añadir otra foto conserva los alimentos de esa comida y reemplaza el registro completo al guardar, sin duplicarlo. Revisar posibles fotografías repetidas del mismo plato: no se deduplican raciones automáticamente.
- Los totales confirmados por foto o manualmente entran en el mismo balance. El ajuste usa calorías, proteína, hidratos y grasa conjuntamente, sobre la base original del día para no acumular escalados.
- Solo modifica comidas sin registrar de esa fecha. Las comidas previas sin marcar siguen pendientes: hay que omitirlas si no se van a consumir. Nunca modifica lo ya consumido ni arrastra diferencias a mañana.
- Límites de producto: raciones variables entre 50 y 200 % de su base, topes por densidad nutricional, energía por comida entre 60 y 175 % antes del redondeo. Fruta y verdura permanecen fijas. No son límites clínicos. Las diferencias inviables se muestran explícitamente; no se promete compensar un exceso ya consumido.
- Hoy muestra consumo real y objetivos arriba, comidas en agenda compacta, agua y próximo entrenamiento. El balance desplegable muestra previsión, diferencias y opción de desactivar el ajuste.

## Verificación

- 198 pruebas correctas, incluyendo compensación de los cuatro objetivos, límites por ración y comida, inmutabilidad, cierre del día y varios platos fotografiados entre guardados y recargas.
- Compilación webpack correcta; comprobación TypeScript tras ajustes finales.
- Una prueba real con una imagen ilustrativa pública de la app devolvió arroz, pollo y verduras separados, con cantidades y supuestos. No se enviaron fotos personales.
- En navegador local se probó guardar cinco hidratos habituales y dos ocasionales, el cambio de menús y el acceso al formulario de cámara.
- OPENAI_FOOD_API_KEY está configurada como secreto de producción. La demo local no omite autenticación para hacer llamadas de pago.
- Verificación de la tabla nueva: RLS activada; tres políticas de propietario con USING/WITH CHECK; anónimo sin SELECT; usuario autenticado sin DELETE ni UPDATE(owner), solo UPDATE(choice). El asesor no indica problemas en la tabla nueva. Avisos previos ajenos a este cambio: [pg_net en public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) y [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Referencia de integración: https://developers.openai.com/api/docs/guides/images-vision?api-mode=responses
