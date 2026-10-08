// Mensajes de error claros y amigables (la gente va a estar de fiesta 🥳)

export const MENSAJES = {
  sinConexion: 'Sin conexión 📡 Revisa tu wifi o tus datos e intenta otra vez.',
  muyPesado: 'Archivo muy pesado 🐘 El máximo es 10 MB.',
  formato: 'Formato no permitido 🙅 Solo fotos JPG, PNG, WEBP o HEIC.',
  generico: 'Algo salió mal 😵 Intenta de nuevo en un momento.',
  claveIncorrecta: 'Contraseña incorrecta 🔒',
}

// Error "esperado" con un mensaje listo para mostrar al usuario
export class ErrorAmigable extends Error {
  constructor(mensaje, { red = false } = {}) {
    super(mensaje)
    this.name = 'ErrorAmigable'
    this.red = red
  }
}

// ¿El error fue por falta de internet?
export function esErrorDeRed(error) {
  if (error?.red) return true
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const texto = String(error?.message || error || '')
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(texto)
}

// Convierte cualquier error en un texto para mostrar
export function mensajeDeError(error, porDefecto = MENSAJES.generico) {
  if (!error) return porDefecto
  if (esErrorDeRed(error)) return MENSAJES.sinConexion
  if (error instanceof ErrorAmigable) return error.message
  if (error.code === '28P01' || /contraseña incorrecta/i.test(error.message || '')) {
    return MENSAJES.claveIncorrecta
  }
  return porDefecto
}
