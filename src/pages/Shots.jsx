import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext } from 'react-router-dom'
import { useRanking } from '../hooks/useRanking'
import { cambiarShots } from '../lib/api'
import { mensajeDeError, MENSAJES } from '../lib/errores'
import Aviso from '../components/Aviso'
import ListaRanking from '../components/ListaRanking'

// Mensajes de fiesta que salen cada 3 shots
const MENSAJES_FIESTA = [
  '¡Salud por los 20 de Juli! 🥂',
  'Esto ya se prendió 🔥 ¡Que siga la rumba!',
  'Nivel desbloqueado: alma de la fiesta 🕺💃',
  '¡Que viva la cumpleañera! 🎂🎉',
  'Los 20 se celebran una sola vez… ¡y se están celebrando bien! 🥳',
  'Tu hígado pidió un minuto de silencio… y una arepita 🫓',
  'Ya vas en modo leyenda 😎 Quien maneja, no toma 🚗',
  '¡Arriba, abajo, al centro y pa’ dentro! 🥃',
]

// Vaso de shot que se llena de a tercios hasta el siguiente recordatorio
function VasoShot({ cantidad }) {
  const nivel = cantidad === 0 ? 0 : (((cantidad - 1) % 3) + 1) / 3
  const ALTO = 112

  return (
    <svg className="vaso" viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <clipPath id="vaso-forma">
          <path d="M16 16 H104 L92 124 Q91 132 83 132 H37 Q29 132 28 124 Z" />
        </clipPath>
        <linearGradient id="vaso-liquido" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc83d" />
          <stop offset="1" stopColor="#ff6a4d" />
        </linearGradient>
      </defs>
      <g clipPath="url(#vaso-forma)">
        <rect x="0" y="0" width="120" height="140" fill="rgba(255,255,255,0.08)" />
        <rect
          className="vaso__liquido"
          x="0"
          y={20}
          width="120"
          height="130"
          fill="url(#vaso-liquido)"
          style={{ transform: `translateY(${ALTO * (1 - nivel)}px)` }}
        />
      </g>
      <path className="vaso__borde" d="M16 16 H104 L92 124 Q91 132 83 132 H37 Q29 132 28 124 Z" fill="none" />
      <path d="M30 28 L38 112" className="vaso__brillo" />
    </svg>
  )
}

// Sección 2: contador de shots y ranking en vivo
export default function Shots() {
  const { nombre } = useOutletContext()
  const { ranking, cargando, error, actualizarLocal, recargar } = useRanking()
  const [aviso, setAviso] = useState(null)
  const [recordatorio, setRecordatorio] = useState(null)
  const [burbujas, setBurbujas] = useState([]) // "+1" que flotan al tocar
  const idBurbuja = useRef(0)
  const ultimaSolicitud = useRef(0)

  const yo = ranking.find((f) => f.nombre === nombre)
  const cantidad = yo?.cantidad ?? 0
  const puesto = yo ? ranking.indexOf(yo) + 1 : null

  const cerrarAviso = useCallback(() => setAviso(null), [])

  function lanzarBurbuja(texto) {
    const id = ++idBurbuja.current
    setBurbujas((prev) => [...prev, { id, texto }])
    setTimeout(() => setBurbujas((prev) => prev.filter((b) => b.id !== id)), 1000)
  }

  // Envuelve cada acción y muestra errores claros. Se permiten toques rápidos seguidos:
  // cada suma es atómica en el servidor y solo la respuesta más reciente actualiza la pantalla.
  async function ejecutar(accion) {
    if (!navigator.onLine) {
      setAviso({ tipo: 'error', texto: MENSAJES.sinConexion })
      return
    }
    const numero = ++ultimaSolicitud.current
    try {
      const fila = await accion()
      if (numero === ultimaSolicitud.current) actualizarLocal(fila)
      return fila
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo guardar 😕 Intenta otra vez.') })
    }
  }

  async function masUnShot() {
    const fila = await ejecutar(() => cambiarShots(nombre, 1))
    if (!fila) return
    lanzarBurbuja('+1 🥃')
    navigator.vibrate?.(30)
    if (fila.cantidad > 0 && fila.cantidad % 3 === 0) {
      const mensaje = MENSAJES_FIESTA[Math.floor(Math.random() * MENSAJES_FIESTA.length)]
      setRecordatorio({ cantidad: fila.cantidad, mensaje })
    }
  }

  async function menosUnShot() {
    const fila = await ejecutar(() => cambiarShots(nombre, -1))
    if (fila) lanzarBurbuja('−1')
  }

  return (
    <section className="seccion">
      <Aviso aviso={aviso} onCerrar={cerrarAviso} />

      {/* ---------- Mi contador ---------- */}
      <div className="contador">
        <VasoShot cantidad={cantidad} />

        <div className="contador__datos">
          <span className="contador__etiqueta">Tus shots</span>
          <span key={cantidad} className="contador__numero">
            {cantidad}
          </span>
          {puesto && <span className="contador__puesto">Puesto #{puesto} del ranking</span>}
        </div>

        <div className="burbujas" aria-hidden="true">
          {burbujas.map((b) => (
            <span key={b.id} className="burbuja">
              {b.texto}
            </span>
          ))}
        </div>
      </div>

      {/* ---------- Botones ---------- */}
      <div className="botonera">
        <button className="boton boton--fucsia boton--gigante" onClick={masUnShot}>
          <span className="boton__emoji">🥃</span>
          +1 shot
        </button>
        <button
          className="boton boton--fantasma boton--grande"
          onClick={menosUnShot}
          disabled={cantidad === 0}
        >
          −1 (me equivoqué)
        </button>
        <p className="botonera__nota">Cada 3 shots hay sorpresa 😉 · Toma con responsabilidad 💛</p>
      </div>

      {/* ---------- Ranking ---------- */}
      <div className="seccion__cabeza">
        <h2 className="seccion__titulo">Ranking en vivo</h2>
        <span className="en-vivo">● en vivo</span>
      </div>

      {cargando ? (
        <div className="cargando">Cargando ranking…</div>
      ) : error && ranking.length === 0 ? (
        <div className="vacio">
          <p>{error}</p>
          <button className="boton boton--fantasma" onClick={recargar}>
            Reintentar 🔄
          </button>
        </div>
      ) : (
        <ListaRanking ranking={ranking} nombreActual={nombre} />
      )}

      {/* ---------- Mensaje de fiesta cada 3 shots ---------- */}
      {recordatorio &&
        createPortal(
          <div className="modal-fondo" onClick={() => setRecordatorio(null)}>
            <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <span className="modal__emoji">🥃</span>
              <h3 className="modal__titulo">¡Van {recordatorio.cantidad} shots!</h3>
              <p className="modal__texto">{recordatorio.mensaje}</p>
              <button className="boton boton--fucsia boton--grande" onClick={() => setRecordatorio(null)}>
                ¡Salud! 🥂
              </button>
            </div>
          </div>,
          document.body,
        )}
    </section>
  )
}
