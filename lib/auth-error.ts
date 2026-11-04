/** Keep provider details out of the UI; give actionable advice for known failures. */
export function loginErrorMessage(error: unknown): string {
  const details = error && typeof error === 'object' ? error as {code?: string; status?: number} : {};
  if (details.code === 'email_origin_required') return 'Solicita el correo desde raw-1-0.vercel.app y abre el enlace en ese mismo navegador.';
  if (details.code === 'invalid_credentials' || details.code === 'user_not_found') return 'Correo o contraseña incorrectos. Si antes entrabas con un enlace, utiliza «No tengo contraseña / La he olvidado» para establecerla.';
  if (details.code === 'email_not_confirmed') return 'Confirma tu correo antes de entrar. Revisa el mensaje de confirmación y ábrelo en el navegador donde creaste la cuenta.';
  if (details.code === 'password_length') return 'La contraseña debe tener entre 12 y 128 caracteres.';
  if (details.code === 'password_mismatch') return 'Las contraseñas no coinciden. Escríbelas de nuevo.';
  if (details.code === 'weak_password') return 'Elige una contraseña más segura: larga, única y difícil de adivinar.';
  if (details.code === 'same_password') return 'Esa ya es tu contraseña. Puedes continuar a tu plan o elegir una distinta.';
  if (['session_not_found','session_expired','reauthentication_needed','reauth_nonce_missing','reauthentication_not_valid'].includes(details.code??'')) return 'Vuelve a iniciar sesión o solicita un correo de recuperación nuevo para establecer la contraseña.';
  if (['user_already_exists','email_exists'].includes(details.code??'')) return 'Si ya tienes cuenta, entra con tu contraseña o utiliza la opción de recuperarla.';
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
  return 'No se pudo completar la operación. Comprueba tu conexión y vuelve a intentarlo más tarde. Si continúa, contacta con el responsable de la app.';
}
