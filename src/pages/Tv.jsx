import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useFotos } from '../hooks/useFotos'
import { useRanking } from '../hooks/useRanking'
import ListaRanking from '../components/ListaRanking'
import AvisoConexion from '../components/AvisoConexion'
import Fondo from '../components/Fondo'

const SEGUNDOS_POR_FOTO = 5

// Link que abre el QR (en Vercel: la URL pública; también se puede fijar en .env)
const URL_APP = import.meta.env.VITE_URL_PUBLICA || window.location.origin

// Una diapositiva: la foto completa encima de una copia borrosa que llena el fondo
function Diapositiva({ foto, activa }) {
  return (
    <div className={`diapositiva ${activa ? 'diapositiva--activa' : 'diapositiva--anterior'}`}>
      <img className="diapositiva__fondo" src={foto.url} alt="" />
      <img className="diapositiva__img" src={foto.url} alt={`Foto de ${foto.subido_por}`} />
    </div>
  )
}

// Sección 3: pantalla para proyectar en el televisor (ruta /tv)
export default function Tv() {
  const { fotos } = useFotos()
  const { ranking } = useRanking()
  // Se guardan ids (no posiciones) porque las fotos nuevas entran al inicio de la lista
  const [slide, setSlide] = useState({ actual: null, anterior: null })
  const [nueva, setNueva] = useState(null)
  const primeraConocida = useRef(null)
  const fotoActualRef = useRef(null)

  const fotoActual = fotos.find((f) => f.id === slide.actual) || fotos[0] || null
  const fotoAnterior = fotos.find((f) => f.id === slide.anterior && f.id !== fotoActual?.id) || null
  fotoActualRef.current = fotoActual?.id ?? null

  // Cambia de foto dejando la anterior debajo para hacer el fundido
  const mostrar = useCallback((id, desdeId) => {
    setSlide((prev) => (prev.actual === id ? prev : { actual: id, anterior: desdeId ?? prev.actual }))
  }, [])

  // Cuando alguien sube una foto, se muestra de inmediato con un letrero de "nueva"
  useEffect(() => {
    const primera = fotos[0]
    if (!primera) return
    if (primeraConocida.current && primeraConocida.current !== primera.id) {
      mostrar(primera.id, fotoActualRef.current)
      setNueva(primera.id)
    }
    primeraConocida.current = primera.id
  }, [fotos, mostrar])

  // El letrero de "nueva" se quita solo
  useEffect(() => {
    if (!nueva) return
    const t = setTimeout(() => setNueva(null), 6000)
    return () => clearTimeout(t)
  }, [nueva])

  // Avanza a la siguiente foto cada 5 segundos (de la más nueva a la más vieja, en bucle)
  useEffect(() => {
    if (fotos.length < 2 || !fotoActual) return
    const posicion = fotos.findIndex((f) => f.id === fotoActual.id)
    const siguiente = fotos[(posicion + 1) % fotos.length]

    // Precarga la siguiente para que no aparezca a medias
    const precarga = new Image()
    precarga.src = siguiente.url

    const t = setTimeout(() => mostrar(siguiente.id, fotoActual.id), SEGUNDOS_POR_FOTO * 1000)
    return () => clearTimeout(t)
  }, [fotos, fotoActual, mostrar])

  // Evita que el computador/TV apague la pantalla durante la fiesta
  useEffect(() => {
    let candado = null
    const pedir = async () => {
      try {
        candado = await navigator.wakeLock?.request('screen')
      } catch {
        // No todos los navegadores lo permiten; no pasa nada
      }
    }
    pedir()
    const alVolver = () => document.visibilityState === 'visible' && pedir()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      candado?.release?.()
    }
  }, [])

  function pantallaCompleta() {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const totalShots = ranking.reduce((suma, f) => suma + f.cantidad, 0)

  return (
    <div className="tv">
      <Fondo cantidad={16} />
      <AvisoConexion />

      {/* ---------- Izquierda: slideshow ---------- */}
      <section className="tv__fotos">
        {fotoAnterior && <Diapositiva key={fotoAnterior.id} foto={fotoAnterior} />}
        {fotoActual && <Diapositiva key={fotoActual.id} foto={fotoActual} activa />}

        {fotoActual ? (
          <>
            {nueva === fotoActual.id && <div className="tv__nueva">✨ ¡Foto nueva!</div>}
            <div key={`credito-${fotoActual.id}`} className="tv__credito">
              📸 <strong>{fotoActual.subido_por}</strong>
            </div>
            <div className="tv__conteo">{fotos.length} fotos</div>
          </>
        ) : (
          <div className="tv__vacio">
            <span>📸</span>
            <p>Escanea el QR y sube la primera foto de la noche</p>
          </div>
        )}

        <button className="tv__pantalla-completa" onClick={pantallaCompleta} title="Pantalla completa">
          ⛶
        </button>
      </section>

      {/* ---------- Derecha: ranking + QR ---------- */}
      <aside className="tv__panel">
        <header className="tv__titulo">
          <span className="insignia-20 insignia-20--tv" aria-hidden="true">
            20
          </span>
          <div>
            <p className="tv__ante">Cumple</p>
            <h1>20 de Juli</h1>
          </div>
        </header>

        <div className="tv__ranking">
          <div className="tv__ranking-cabeza">
            <h2>🥃 Ranking de shots</h2>
            <span className="en-vivo">● en vivo</span>
          </div>
          <ListaRanking ranking={ranking} limite={8} variante="tv" />
        </div>

        <div className="tv__pie">
          <div className="tv__totales">
            <span>
              <strong>{totalShots}</strong> shots
            </span>
            <span>
              <strong>{ranking.length}</strong> en el ranking
            </span>
          </div>
          <div className="tv__qr">
            <div className="tv__qr-codigo">
              <QRCodeSVG
                value={URL_APP}
                size={256}
                level="M"
                marginSize={0}
                bgColor="#ffffff"
                fgColor="#150427"
              />
            </div>
            <p>
              ¡Escanéame!
              <span>Sube tus fotos y suma tus shots</span>
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
