import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeDeError } from '../lib/errores'

let contadorCanales = 0

// Más shots primero; en empate, quien llegó primero
function ordenar(filas) {
  return [...filas].sort(
    (a, b) =>
      b.cantidad - a.cantidad ||
      new Date(a.updated_at) - new Date(b.updated_at) ||
      a.nombre.localeCompare(b.nombre)
  )
}

/**
 * Ranking de shots en tiempo real (tabla `shots`).
 * Ante cualquier cambio se recarga la tabla completa (son pocos invitados).
 */
export function useRanking() {
  const [ranking, setRanking] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const espera = useRef(null)

  const cargar = useCallback(async () => {
    const { data, error: errorCarga } = await supabase.from('shots').select('*')
    if (errorCarga) {
      setError(mensajeDeError(errorCarga, 'No pudimos cargar el ranking 😕'))
    } else {
      setRanking(ordenar(data))
      setError('')
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()

    // Si llegan muchos cambios seguidos, recargamos una sola vez
    const recargarPronto = () => {
      clearTimeout(espera.current)
      espera.current = setTimeout(cargar, 250)
    }

    const canal = supabase
      .channel(`shots-${++contadorCanales}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shots' }, recargarPronto)
      .subscribe((estado) => {
        if (estado === 'SUBSCRIBED') cargar()
      })

    const alVolver = () => document.visibilityState === 'visible' && cargar()
    window.addEventListener('online', cargar)
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      clearTimeout(espera.current)
      supabase.removeChannel(canal)
      window.removeEventListener('online', cargar)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cargar])

  // Actualiza al instante la fila propia con lo que devolvió la función RPC
  const actualizarLocal = useCallback((fila) => {
    if (!fila) return
    setRanking((prev) => ordenar([...prev.filter((f) => f.nombre !== fila.nombre), fila]))
  }, [])

  return { ranking, cargando, error, recargar: cargar, actualizarLocal }
}
