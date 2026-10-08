// Guarda el nombre del invitado en el celular para no volver a pedirlo.
// Todo va en try/catch: en modo incógnito localStorage puede fallar.

const CLAVE = 'cumple20juli:nombre'

export const LARGO_MAXIMO_NOMBRE = 30

export function limpiarNombre(texto) {
  return String(texto || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LARGO_MAXIMO_NOMBRE)
}

export function leerNombre() {
  try {
    return limpiarNombre(localStorage.getItem(CLAVE))
  } catch {
    return ''
  }
}

export function guardarNombre(nombre) {
  try {
    localStorage.setItem(CLAVE, nombre)
  } catch {
    // Si no se puede guardar, igual funciona durante esta visita
  }
}
