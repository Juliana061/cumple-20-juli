import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeDeError } from '../lib/errores'

// Cada uso del hook abre su propio canal de Realtime
let contadorCanales = 0

// Más recientes primero
function ordenar(fotos) {
  return [...fotos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function agregarSinRepetir(lista, foto) {
  if (lista.some((f) => f.id === foto.id)) return lista
  return ordenar([foto, ...lista])
}

/**
 * Lista de fotos que se actualiza sola en tiempo real.
 * Se usa en la galería, en el modo TV y en el panel de admin.
 */
export function useFotos(limite = 500) {
  const [fotos, setFotos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    const { data, error: errorCarga } = await supabase
      .from('fotos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (errorCarga) {
      setError(mensajeDeError(errorCarga, 'No pudimos cargar las fotos 😕'))
    } else {
      setFotos(data)
      setError('')
    }
    setCargando(false)
  }, [limite])

  useEffect(() => {
    cargar()

    // Realtime: fotos nuevas y fotos borradas
    const canal = supabase
      .channel(`fotos-${++contadorCanales}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fotos' }, ({ new: foto }) =>
        setFotos((prev) => agregarSinRepetir(prev, foto))
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'fotos' }, ({ old }) =>
        setFotos((prev) => prev.filter((f) => f.id !== old.id))
      )
      .subscribe((estado) => {
        // Al (re)conectar recargamos por si nos perdimos algo
        if (estado === 'SUBSCRIBED') cargar()
      })

    // El celular "se duerme" en la fiesta: al volver, refrescamos
    const alVolver = () => document.visibilityState === 'visible' && cargar()
    window.addEventListener('online', cargar)
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      supabase.removeChannel(canal)
      window.removeEventListener('online', cargar)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cargar])

  // Para mostrar al instante la foto que uno mismo acaba de subir
  const agregarLocal = useCallback((foto) => setFotos((prev) => agregarSinRepetir(prev, foto)), [])
  const quitarLocal = useCallback((id) => setFotos((prev) => prev.filter((f) => f.id !== id)), [])

  return { fotos, cargando, error, recargar: cargar, agregarLocal, quitarLocal }
}
