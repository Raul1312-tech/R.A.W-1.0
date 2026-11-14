# Alimentos habituales y registro por foto

Implementación local, 13 de noviembre de 2026. No publicada.

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
- Se reutiliza el registro coach_reviews y sus políticas de propietario, sin modificar esquemas ni permisos. Límite inicial: tres consultas IA por cuenta/día UTC, compartidas con el coordinador. La reserva es atómica; peticiones fallidas consumen su reserva para no permitir reintentos de pago ilimitados.
- Resultados superiores al límite de 2 kB de ese registro guardan solo un recibo; una repetición idéntica no vuelve a cobrar ni reconstruye el resultado grande. El borrador recibido permanece en el editor hasta cerrar la pantalla.
- Cantidades y macros son aproximados. No se deducen alérgenos, ingredientes ocultos ni identidad de personas. El usuario debe revisar el plato y confirmar antes de registrarlo.

## Verificación y publicación pendiente

- 195 pruebas correctas. Nuevas pruebas: prioridad de básicos en doce semillas, actualización de comidas pendientes, conservación de días cerrados, validación nutricional, conversión y persistencia de ingredientes, respuesta vacía, respuesta incompleta y errores del proveedor.
- Compilación webpack correcta; comprobación TypeScript tras ajustes finales.
- Una prueba real con una imagen ilustrativa pública de la app devolvió arroz, pollo y verduras separados, con cantidades y supuestos. No se enviaron fotos personales.
- En navegador local se probó guardar cinco hidratos habituales y dos ocasionales, el cambio de menús y el acceso al formulario de cámara.
- Pendiente antes de usar la foto en producción: configurar OPENAI_FOOD_API_KEY como secreto de servidor en Vercel, desplegar y comprobar el flujo autenticado completo (incluida la reserva en Supabase). La demo local no omite autenticación para hacer llamadas de pago.

Referencia de integración: https://developers.openai.com/api/docs/guides/images-vision?api-mode=responses
