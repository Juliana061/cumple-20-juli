import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function hora(fecha) {
  return new Date(fecha).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
}

/**
 * Foto en grande, con el nombre de quien la subió.
 * Se navega con flechas, deslizando el dedo o con el teclado.
 */
export default function VisorFoto({ fotos, indice, onCambiar, onCerrar }) {
  const toqueInicial = useRef(null)
  const foto = fotos[indice]
  const hayAnterior = indice > 0
  const haySiguiente = indice < fotos.length - 1

  // Teclado + bloquear el scroll de la página de atrás
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowLeft' && hayAnterior) onCambiar(indice - 1)
      if (e.key === 'ArrowRight' && haySiguiente) onCambiar(indice + 1)
    }
    window.addEventListener('keydown', alTeclear)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflowAnterior
    }
  }, [indice, hayAnterior, haySiguiente, onCambiar, onCerrar])

  // Si borran la foto mientras está abierta, cerramos
  useEffect(() => {
    if (!foto) onCerrar()
  }, [foto, onCerrar])

  if (!foto) return null

  // Deslizar con el dedo para pasar de foto
  const alEmpezarToque = (e) => (toqueInicial.current = e.touches[0].clientX)
  const alTerminarToque = (e) => {
    if (toqueInicial.current == null) return
    const distancia = e.changedTouches[0].clientX - toqueInicial.current
    toqueInicial.current = null
    if (distancia > 50 && hayAnterior) onCambiar(indice - 1)
    if (distancia < -50 && haySiguiente) onCambiar(indice + 1)
  }

  // Portal: se dibuja directo en <body> para quedar encima de encabezado y pestañas
  return createPortal(
    <div
      className="visor"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${foto.subido_por}`}
      onClick={onCerrar}
      onTouchStart={alEmpezarToque}
      onTouchEnd={alTerminarToque}
    >
      <button className="visor__cerrar" onClick={onCerrar} aria-label="Cerrar">
        ✕
      </button>

      <img key={foto.id} className="visor__img" src={foto.url} alt={`Foto de ${foto.subido_por}`} onClick={(e) => e.stopPropagation()} />

      <div className="visor__pie" onClick={(e) => e.stopPropagation()}>
        <button
          className="visor__flecha"
          onClick={() => onCambiar(indice - 1)}
          disabled={!hayAnterior}
          aria-label="Foto anterior"
        >
          ‹
        </button>
        <div className="visor__autor">
          <span className="visor__etiqueta">📸 Subida por</span>
          <strong>{foto.subido_por}</strong>
          <span className="visor__hora">{hora(foto.created_at)}</span>
        </div>
        <button
          className="visor__flecha"
          onClick={() => onCambiar(indice + 1)}
          disabled={!haySiguiente}
          aria-label="Foto siguiente"
        >
          ›
        </button>
      </div>
    </div>,
    document.body
  )
}
