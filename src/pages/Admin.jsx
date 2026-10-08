import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFotos } from '../hooks/useFotos'
import { useRanking } from '../hooks/useRanking'
import { borrarFoto, reiniciarShots, verificarAdmin } from '../lib/api'
import { MENSAJES, mensajeDeError } from '../lib/errores'
import Aviso from '../components/Aviso'
import BarraProgreso from '../components/BarraProgreso'
import Fondo from '../components/Fondo'

// La contraseña se recuerda solo mientras la pestaña esté abierta
const CLAVE_SESION = 'cumple20juli:admin'

function leerSesion() {
  try {
    return sessionStorage.getItem(CLAVE_SESION) || ''
  } catch {
    return ''
  }
}

function guardarSesion(clave) {
  try {
    if (clave) sessionStorage.setItem(CLAVE_SESION, clave)
    else sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // sin sessionStorage: igual funciona hasta recargar
  }
}

// Sección 4: panel de admin (ruta /admin-juli)
export default function Admin() {
  const [clave, setClave] = useState(leerSesion)

  const entrar = (nueva) => {
    guardarSesion(nueva)
    setClave(nueva)
  }
  const salir = useCallback(() => {
    guardarSesion('')
    setClave('')
  }, [])

  return clave ? <PanelAdmin clave={clave} onSalir={salir} /> : <EntrarAdmin onEntrar={entrar} />
}

// ---------------------------------------------------------------------
// Formulario de contraseña
// ---------------------------------------------------------------------
function EntrarAdmin({ onEntrar }) {
  const [clave, setClave] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [error, setError] = useState('')

  async function enviar(e) {
    e.preventDefault()
    if (!clave) return
    setVerificando(true)
    setError('')
    try {
      const valida = await verificarAdmin(clave)
      if (valida) onEntrar(clave)
      else setError(MENSAJES.claveIncorrecta)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setVerificando(false)
    }
  }

  return (
    <main className="bienvenida">
      <Fondo />
      <div className="bienvenida__tarjeta">
        <div className="insignia-20 insignia-20--grande" aria-hidden="true">
          🔒
        </div>
        <h1 className="bienvenida__titulo">Panel de Juli</h1>
        <p className="bienvenida__texto">Solo para la cumpleañera. Escribe la contraseña de admin.</p>
        <form onSubmit={enviar} className="bienvenida__form">
          <label htmlFor="clave" className="solo-lectores">
            Contraseña
          </label>
          <input
            id="clave"
            className="campo"
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            autoFocus
          />
          {error && <p className="campo__error">{error}</p>}
          <button className="boton boton--fucsia boton--grande" type="submit" disabled={verificando || !clave}>
            {verificando ? 'Verificando…' : 'Entrar 🔑'}
          </button>
        </form>
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------
// Utilidades para el .zip
// ---------------------------------------------------------------------
function nombreSeguro(texto) {
  return (
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'invitado'
  )
}

// Ejecuta una tarea para cada elemento, con varias a la vez (más rápido que de una en una)
async function enParalelo(elementos, simultaneas, tarea) {
  let siguiente = 0
  const trabajador = async () => {
    while (siguiente < elementos.length) {
      const i = siguiente++
      await tarea(elementos[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(simultaneas, elementos.length) }, trabajador))
}

function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// ---------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------
function PanelAdmin({ clave, onSalir }) {
  const { fotos, cargando, quitarLocal } = useFotos(2000)
  const { ranking, recargar: recargarRanking } = useRanking()
  const [aviso, setAviso] = useState(null)
  const [zip, setZip] = useState(null) // { hechas, total, comprimiendo }
  const [borrando, setBorrando] = useState(null) // id de la foto que se está borrando
  const [reiniciando, setReiniciando] = useState(false)

  const cerrarAviso = useCallback(() => setAviso(null), [])

  // Si la contraseña dejó de servir (la cambiaron), se cierra la sesión
  function manejarError(err, texto) {
    if (err?.code === '28P01') {
      onSalir()
      return
    }
    setAviso({ tipo: 'error', texto: mensajeDeError(err, texto) })
  }

  async function descargarZip() {
    if (fotos.length === 0 || zip) return
    const total = fotos.length
    setZip({ hechas: 0, total })
    try {
      // JSZip se carga solo cuando hace falta (no pesa en la app de los invitados)
      const { default: JSZip } = await import('jszip')
      const archivo = new JSZip()
      const enOrden = [...fotos].reverse() // de la primera a la última de la noche
      let hechas = 0
      let fallidas = 0

      await enParalelo(enOrden, 4, async (foto, i) => {
        try {
          const respuesta = await fetch(foto.url)
          if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
          const extension = foto.ruta.split('.').pop()
          const numero = String(i + 1).padStart(3, '0')
          archivo.file(`${numero}-${nombreSeguro(foto.subido_por)}.${extension}`, await respuesta.blob())
        } catch {
          fallidas++
        }
        hechas++
        setZip({ hechas, total })
      })

      if (fallidas === total) throw new Error('Failed to fetch')

      setZip({ hechas: total, total, comprimiendo: true })
      // Las fotos ya vienen comprimidas: STORE las guarda sin recomprimir (mucho más rápido)
      const contenido = await archivo.generateAsync({ type: 'blob', compression: 'STORE' })
      descargarArchivo(contenido, 'cumple-20-juli-fotos.zip')

      setAviso(
        fallidas > 0
          ? { tipo: 'error', texto: `Zip listo, pero ${fallidas} foto(s) no se pudieron descargar.` }
          : { tipo: 'exito', texto: `¡Zip listo con ${total} fotos! 📦` }
      )
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo armar el .zip 😕') })
    } finally {
      setZip(null)
    }
  }

  async function borrar(foto) {
    if (!window.confirm(`¿Borrar la foto de ${foto.subido_por}? No se puede deshacer.`)) return
    setBorrando(foto.id)
    try {
      await borrarFoto(clave, foto.id)
      quitarLocal(foto.id)
      setAviso({ tipo: 'exito', texto: 'Foto borrada 🗑️' })
    } catch (err) {
      manejarError(err, 'No se pudo borrar la foto 😕')
    } finally {
      setBorrando(null)
    }
  }

  async function reiniciar() {
    if (!window.confirm('¿Reiniciar el contador de shots de TODOS? El ranking queda en cero.')) return
    setReiniciando(true)
    try {
      await reiniciarShots(clave)
      await recargarRanking()
      setAviso({ tipo: 'exito', texto: 'Contador de shots reiniciado 🔄' })
    } catch (err) {
      manejarError(err, 'No se pudo reiniciar 😕')
    } finally {
      setReiniciando(false)
    }
  }

  const totalShots = ranking.reduce((suma, f) => suma + f.cantidad, 0)

  return (
    <div className="app app--admin">
      <Fondo cantidad={10} />
      <Aviso aviso={aviso} onCerrar={cerrarAviso} />

      <header className="encabezado">
        <div className="encabezado__marca">
          <span className="insignia-20" aria-hidden="true">
            20
          </span>
          <div>
            <p className="encabezado__ante">Admin</p>
            <h1 className="encabezado__titulo">Panel de Juli</h1>
          </div>
        </div>
        <button className="chip-nombre" onClick={onSalir}>
          Salir 🚪
        </button>
      </header>

      <main className="contenido">
        <div className="admin__stats">
          <div className="stat">
            <strong>{fotos.length}</strong>
            <span>fotos</span>
          </div>
          <div className="stat">
            <strong>{ranking.length}</strong>
            <span>invitados</span>
          </div>
          <div className="stat">
            <strong>{totalShots}</strong>
            <span>shots</span>
          </div>
        </div>

        <div className="admin__acciones">
          {zip ? (
            <BarraProgreso
              valor={zip.hechas / zip.total}
              texto={zip.comprimiendo ? 'Armando el .zip…' : `Descargando ${zip.hechas} de ${zip.total}`}
            />
          ) : (
            <button className="boton boton--lima boton--grande" onClick={descargarZip} disabled={fotos.length === 0}>
              📦 Descargar todas (.zip)
            </button>
          )}
          <button className="boton boton--coral boton--grande" onClick={reiniciar} disabled={reiniciando}>
            {reiniciando ? 'Reiniciando…' : '🔄 Reiniciar contador de shots'}
          </button>
          <div className="admin__enlaces">
            <Link to="/tv" className="boton boton--fantasma">
              📺 Modo TV
            </Link>
            <Link to="/fotos" className="boton boton--fantasma">
              📸 App de invitados
            </Link>
          </div>
        </div>

        <div className="seccion__cabeza">
          <h2 className="seccion__titulo">Fotos</h2>
          <span className="pildora">toca 🗑️ para borrar</span>
        </div>

        {cargando ? (
          <div className="cargando">Cargando fotos…</div>
        ) : fotos.length === 0 ? (
          <div className="vacio">
            <span className="vacio__emoji">🎈</span>
            <p>Todavía no hay fotos.</p>
          </div>
        ) : (
          <div className="galeria galeria--admin">
            {fotos.map((foto) => (
              <div key={foto.id} className={`galeria__foto ${borrando === foto.id ? 'galeria__foto--borrando' : ''}`}>
                <img src={foto.url} alt={`Foto de ${foto.subido_por}`} loading="lazy" decoding="async" />
                <span className="galeria__autor">{foto.subido_por}</span>
                <button
                  className="galeria__borrar"
                  onClick={() => borrar(foto)}
                  disabled={borrando !== null}
                  aria-label={`Borrar foto de ${foto.subido_por}`}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
