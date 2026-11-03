/** Keep provider details out of the UI; give actionable advice for known failures. */
export function loginErrorMessage(error: unknown): string {
  const details = error && typeof error === 'object' ? error as {code?: string; status?: number} : {};
  if (details.code === 'over_email_send_rate_limit') {
    return 'Se ha alcanzado el límite de correos de acceso. El servicio de pruebas permite 2 correos por hora para toda la app. Espera a que se libere el cupo; puede tardar hasta una hora. Después solicita un único enlace nuevo y ábrelo en este mismo navegador.';
  }
  if (details.code === 'email_address_not_authorized') {
    return 'El acceso por correo está en fase de pruebas y este correo todavía no está autorizado. Contacta con el responsable de la app para habilitar el servicio de correo.';
  }
  if (details.code === 'over_request_rate_limit' || details.status === 429) {
    return 'Se han realizado demasiados intentos de acceso. Espera unos minutos antes de volver a solicitar un enlace.';
  }
  if (details.code === 'email_address_invalid') {
    return 'La dirección de correo no es válida. Revísala antes de continuar.';
  }
  return 'No se pudo enviar el enlace. Comprueba tu conexión y vuelve a intentarlo más tarde. Si continúa, contacta con el responsable de la app.';
}
