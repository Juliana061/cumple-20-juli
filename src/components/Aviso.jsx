import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const ICONOS = { exito: '🎉', error: '⚠️', info: '💬' }

/**
 * Mensaje flotante arriba de la pantalla. Se cierra solo o al tocarlo.
 * aviso = { tipo: 'exito' | 'error' | 'info', texto, detalle?: string[] }
 */
export default function Aviso({ aviso, onCerrar }) {
  useEffect(() => {
    if (!aviso) return
    const tiempo = aviso.tipo === 'error' ? 8000 : 4000
    const t = setTimeout(onCerrar, tiempo)
    return () => clearTimeout(t)
  }, [aviso, onCerrar])

  if (!aviso) return null

  // Portal: así queda siempre encima de todo
  return createPortal(
    <div
      className={`aviso aviso--${aviso.tipo}`}
      role={aviso.tipo === 'error' ? 'alert' : 'status'}
      onClick={onCerrar}
    >
      <span className="aviso__icono">{ICONOS[aviso.tipo] || '💬'}</span>
      <div>
        <p className="aviso__texto">{aviso.texto}</p>
        {aviso.detalle?.length > 0 && (
          <ul className="aviso__detalle">
            {aviso.detalle.map((linea, i) => (
              <li key={i}>{linea}</li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  )
}
