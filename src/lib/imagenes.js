import { ErrorAmigable, MENSAJES } from './errores'

// Límites de las fotos
export const TAMANO_MAXIMO = 10 * 1024 * 1024 // 10 MB (igual que el bucket)
const TAMANO_MAXIMO_ORIGINAL = 40 * 1024 * 1024 // antes de comprimir (para no colgar el celular)
const LADO_MAXIMO = 1600 // px
const CALIDAD_JPG = 0.82

// Formatos permitidos (extensión → tipo MIME)
const EXTENSIONES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}
const TIPOS_PERMITIDOS = new Set(Object.values(EXTENSIONES))
const EXTENSION_DE_TIPO = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

// Averigua el tipo real de la foto. Algunos celulares mandan el tipo vacío
// (pasa con HEIC en Windows/Android), así que también miramos la extensión.
function detectarTipo(archivo) {
  const tipo = (archivo.type || '').toLowerCase()
  if (tipo === 'image/jpg') return 'image/jpeg'
  if (TIPOS_PERMITIDOS.has(tipo)) return tipo
  if (!tipo || tipo === 'application/octet-stream') {
    const extension = (archivo.name || '').split('.').pop().toLowerCase()
    return EXTENSIONES[extension] || null
  }
  return null
}

// Abre la imagen respetando la orientación de la cámara (EXIF)
async function decodificar(archivo) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    } catch {
      // Algunos Safari viejos no aceptan opciones: probamos con <img>
    }
  }
  const url = URL.createObjectURL(archivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Reduce la foto a máximo 1600 px por lado y la convierte a JPG liviano
async function comprimir(archivo) {
  const imagen = await decodificar(archivo)
  const ancho = imagen.naturalWidth || imagen.width
  const alto = imagen.naturalHeight || imagen.height
  const escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(ancho * escala)
  canvas.height = Math.round(alto * escala)

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // fondo blanco para PNG con transparencia
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height)
  imagen.close?.()

  const blob = await new Promise((resolver) => canvas.toBlob(resolver, 'image/jpeg', CALIDAD_JPG))
  canvas.width = canvas.height = 0 // libera memoria en celulares
  if (!blob) throw new Error('No se pudo comprimir')
  return blob
}

/**
 * Valida y comprime una foto antes de subirla.
 * Devuelve { blob, tipo, extension } listo para el bucket.
 */
export async function prepararFoto(archivo) {
  const tipo = detectarTipo(archivo)
  if (!tipo) throw new ErrorAmigable(MENSAJES.formato)
  if (archivo.size > TAMANO_MAXIMO_ORIGINAL) {
    throw new ErrorAmigable('Archivo muy pesado 🐘 Elige una foto de menos de 40 MB.')
  }

  let comprimida = null
  try {
    comprimida = await comprimir(archivo)
  } catch {
    // Pasa con HEIC en navegadores que no lo entienden: se sube el original
  }

  if (comprimida) return { blob: comprimida, tipo: 'image/jpeg', extension: 'jpg' }

  if (archivo.size > TAMANO_MAXIMO) throw new ErrorAmigable(MENSAJES.muyPesado)
  return { blob: archivo, tipo, extension: EXTENSION_DE_TIPO[tipo] }
}
