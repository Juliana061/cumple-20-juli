import { supabase, BUCKET } from './supabase'
import { prepararFoto } from './imagenes'
import { subirArchivo } from './subida'
import { esErrorDeRed, mensajeDeError, MENSAJES } from './errores'

// Máximo de fotos que se pueden elegir de una vez
export const MAXIMO_POR_TANDA = 20

// Ruta única para cada archivo dentro del bucket
function crearRuta(extension) {
  const aleatorio = Math.random().toString(36).slice(2, 10)
  return `fiesta/${Date.now()}-${aleatorio}.${extension}`
}

// =====================================================================
// FOTOS
// =====================================================================

/**
 * Sube varias fotos una por una (así el celular no se queda sin memoria).
 * - onEstado({ total, actual, progreso }) se llama para mover la barra (progreso de 0 a 1).
 * - onFotoLista(foto) se llama apenas cada foto queda guardada.
 * Devuelve { subidas, errores }.
 */
export async function subirFotos(archivos, nombre, { onEstado, onFotoLista } = {}) {
  const total = archivos.length
  const subidas = []
  const errores = []

  for (let i = 0; i < total; i++) {
    const archivo = archivos[i]
    const avisar = (fraccion) => onEstado?.({ total, actual: i + 1, progreso: (i + fraccion) / total })

    try {
      avisar(0)
      const { blob, tipo, extension } = await prepararFoto(archivo)
      avisar(0.15)

      const ruta = crearRuta(extension)
      await subirArchivo(ruta, blob, tipo, (f) => avisar(0.15 + f * 0.8))

      const { data: publica } = supabase.storage.from(BUCKET).getPublicUrl(ruta)
      const { data, error } = await supabase
        .from('fotos')
        .insert({ url: publica.publicUrl, ruta, subido_por: nombre })
        .select()
        .single()
      if (error) throw error

      avisar(1)
      subidas.push(data)
      onFotoLista?.(data)
    } catch (error) {
      errores.push({
        archivo: archivo.name || `Foto ${i + 1}`,
        mensaje: mensajeDeError(error, 'No se pudo subir 😕'),
      })
      // Sin internet no tiene sentido seguir intentando con las demás
      if (esErrorDeRed(error)) {
        const restantes = total - i - 1
        if (restantes > 0) {
          errores.push({ archivo: `${restantes} foto(s) más`, mensaje: MENSAJES.sinConexion })
        }
        break
      }
    }
  }

  return { subidas, errores }
}

// =====================================================================
// SHOTS
// =====================================================================

// Suma (+1) o resta (-1) un shot. Devuelve la fila actualizada del invitado.
export async function cambiarShots(nombre, delta) {
  const { data, error } = await supabase.rpc('cambiar_shots', { p_nombre: nombre, p_delta: delta })
  if (error) throw error
  return data
}

// =====================================================================
// ADMIN
// =====================================================================

export async function verificarAdmin(clave) {
  const { data, error } = await supabase.rpc('verificar_admin', { p_clave: clave })
  if (error) throw error
  return data === true
}

// Borra la foto de la tabla (validando la clave) y luego el archivo del bucket
export async function borrarFoto(clave, id) {
  const { data: ruta, error } = await supabase.rpc('borrar_foto', { p_clave: clave, p_id: id })
  if (error) throw error
  if (ruta) {
    // Si esto fallara, la foto ya no aparece en la app; solo queda el archivo
    await supabase.storage.from(BUCKET).remove([ruta])
  }
}

export async function reiniciarShots(clave) {
  const { error } = await supabase.rpc('reiniciar_shots', { p_clave: clave })
  if (error) throw error
}
