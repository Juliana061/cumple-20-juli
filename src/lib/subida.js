import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './supabase'
import { ErrorAmigable, MENSAJES } from './errores'

// Traduce la respuesta de error de Supabase Storage a un mensaje claro
function interpretarError(xhr) {
  let cuerpo = {}
  try {
    cuerpo = JSON.parse(xhr.responseText || '{}')
  } catch {
    // respuesta no era JSON
  }
  const codigo = String(cuerpo.statusCode || xhr.status)
  const texto = `${cuerpo.error || ''} ${cuerpo.message || ''}`

  if (codigo === '413' || /too large|exceeded the maximum/i.test(texto)) {
    return new ErrorAmigable(MENSAJES.muyPesado)
  }
  if (codigo === '415' || /mime|content type|not supported/i.test(texto)) {
    return new ErrorAmigable(MENSAJES.formato)
  }
  if (codigo === '403' || /row-level security|unauthorized/i.test(texto)) {
    return new ErrorAmigable('El servidor no aceptó esta foto 🙅 Revisa que sea JPG, PNG, WEBP o HEIC.')
  }
  return new ErrorAmigable(MENSAJES.generico)
}

/**
 * Sube un archivo al bucket mostrando el progreso.
 * Se usa XMLHttpRequest (y no supabase-js) porque es la única forma de
 * saber cuántos bytes van subidos y así mover la barra de progreso.
 */
export function subirArchivo(ruta, blob, tipo, onProgreso) {
  return new Promise((resolver, rechazar) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${ruta}`)
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
    xhr.setRequestHeader('Content-Type', tipo)
    xhr.setRequestHeader('cache-control', 'max-age=31536000')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.timeout = 3 * 60 * 1000

    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) onProgreso?.(evento.loaded / evento.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgreso?.(1)
        resolver()
      } else {
        rechazar(interpretarError(xhr))
      }
    }
    xhr.onerror = () => rechazar(new ErrorAmigable(MENSAJES.sinConexion, { red: true }))
    xhr.ontimeout = () =>
      rechazar(new ErrorAmigable('La subida tardó demasiado ⏳ Revisa tu conexión.', { red: true }))

    xhr.send(blob)
  })
}
