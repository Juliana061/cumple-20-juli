import { useCallback, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useFotos } from '../hooks/useFotos'
import { subirFotos, MAXIMO_POR_TANDA } from '../lib/api'
import { MENSAJES } from '../lib/errores'
import Aviso from '../components/Aviso'
import BarraProgreso from '../components/BarraProgreso'
import VisorFoto from '../components/VisorFoto'

// Sección 1: subir fotos y ver la galería en tiempo real
export default function Fotos() {
  const { nombre } = useOutletContext()
  const { fotos, cargando, error, agregarLocal, recargar } = useFotos()
  const [subida, setSubida] = useState(null) // { total, actual, progreso }
  const [aviso, setAviso] = useState(null)
  // Se guarda el id (no la posición) para que la foto abierta no cambie si llega una nueva
  const [idVisor, setIdVisor] = useState(null)
  const inputGaleria = useRef(null)
  const inputCamara = useRef(null)

  const cerrarAviso = useCallback(() => setAviso(null), [])
  const cerrarVisor = useCallback(() => setIdVisor(null), [])
  const cambiarVisor = useCallback((i) => setIdVisor(fotos[i]?.id ?? null), [fotos])

  async function alElegirArchivos(e) {
    let archivos = Array.from(e.target.files || [])
    e.target.value = '' // permite volver a elegir la misma foto
    if (archivos.length === 0 || subida) return

    if (!navigator.onLine) {
      setAviso({ tipo: 'error', texto: MENSAJES.sinConexion })
      return
    }

    let avisoExtra = null
    if (archivos.length > MAXIMO_POR_TANDA) {
      avisoExtra = `Solo se suben ${MAXIMO_POR_TANDA} a la vez; elige las demás después.`
      archivos = archivos.slice(0, MAXIMO_POR_TANDA)
    }

    setSubida({ total: archivos.length, actual: 1, progreso: 0 })
    const { subidas, errores } = await subirFotos(archivos, nombre, {
      onEstado: setSubida,
      onFotoLista: agregarLocal,
    })
    setSubida(null)

    const detalle = errores.map((er) => `${er.archivo}: ${er.mensaje}`)
    if (avisoExtra) detalle.push(avisoExtra)

    if (errores.length === 0) {
      setAviso({
        tipo: 'exito',
        texto: subidas.length === 1 ? '¡Foto subida! Ya está en la galería 🎉' : `¡${subidas.length} fotos subidas! 🎉`,
        detalle,
      })
    } else if (subidas.length > 0) {
      setAviso({ tipo: 'error', texto: `Se subieron ${subidas.length}, pero algunas fallaron:`, detalle })
    } else {
      setAviso({
        tipo: 'error',
        texto: archivos.length === 1 ? errores[0].mensaje : 'No se pudo subir ninguna foto:',
        detalle: archivos.length === 1 ? [] : detalle,
      })
    }
  }

  return (
    <section className="seccion">
      <Aviso aviso={aviso} onCerrar={cerrarAviso} />

      {/* ---------- Tarjeta para subir ---------- */}
      <div className="subir">
        <input
          ref={inputGaleria}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={alElegirArchivos}
        />
        <input
          ref={inputCamara}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={alElegirArchivos}
        />

        {subida ? (
          <div className="subir__estado">
            <p className="subir__titulo">Subiendo tus fotos… 🚀</p>
            <BarraProgreso
              valor={subida.progreso}
              texto={subida.total > 1 ? `Foto ${subida.actual} de ${subida.total}` : 'Tu foto'}
            />
            <p className="subir__pista">No cierres la app mientras sube 🙏</p>
          </div>
        ) : (
          <>
            <button
              className="boton boton--fucsia boton--gigante"
              onClick={() => inputGaleria.current?.click()}
            >
              <span className="boton__emoji">📸</span>
              Subir fotos
            </button>
            <button className="boton boton--lima boton--grande" onClick={() => inputCamara.current?.click()}>
              📷 Tomar foto ahora
            </button>
            <p className="subir__pista">Puedes elegir varias a la vez · JPG, PNG, WEBP o HEIC</p>
          </>
        )}
      </div>

      {/* ---------- Galería ---------- */}
      <div className="seccion__cabeza">
        <h2 className="seccion__titulo">La galería</h2>
        {fotos.length > 0 && <span className="pildora">{fotos.length} 📸</span>}
      </div>

      {cargando ? (
        <div className="galeria">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="galeria__esqueleto" />
          ))}
        </div>
      ) : error && fotos.length === 0 ? (
        <div className="vacio">
          <p>{error}</p>
          <button className="boton boton--fantasma" onClick={recargar}>
            Reintentar 🔄
          </button>
        </div>
      ) : fotos.length === 0 ? (
        <div className="vacio">
          <span className="vacio__emoji">🎈</span>
          <p>Todavía no hay fotos. ¡Sé la primera persona en subir una!</p>
        </div>
      ) : (
        <div className="galeria">
          {fotos.map((foto) => (
            <button
              key={foto.id}
              className="galeria__foto"
              onClick={() => setIdVisor(foto.id)}
              aria-label={`Ver foto de ${foto.subido_por}`}
            >
              <img src={foto.url} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {idVisor !== null && (
        <VisorFoto
          fotos={fotos}
          indice={fotos.findIndex((f) => f.id === idVisor)}
          onCambiar={cambiarVisor}
          onCerrar={cerrarVisor}
        />
      )}
    </section>
  )
}
