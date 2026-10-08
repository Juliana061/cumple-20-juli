import { useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { configuracionCompleta } from './lib/supabase'
import { leerNombre } from './lib/nombre'
import Fondo from './components/Fondo'
import PedirNombre from './components/PedirNombre'
import AvisoConexion from './components/AvisoConexion'
import Fotos from './pages/Fotos'
import Shots from './pages/Shots'
import Tv from './pages/Tv'
import Admin from './pages/Admin'

export default function App() {
  if (!configuracionCompleta) return <ConfiguracionFaltante />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/tv" element={<Tv />} />
        <Route path="/admin-juli" element={<Admin />} />

        {/* Zona de invitados: pide el nombre y muestra las pestañas de abajo */}
        <Route element={<ZonaInvitados />}>
          <Route index element={<Navigate to="/fotos" replace />} />
          <Route path="fotos" element={<Fotos />} />
          <Route path="shots" element={<Shots />} />
        </Route>

        <Route path="*" element={<Navigate to="/fotos" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// Encabezado + contenido de la pestaña + barra de pestañas
function ZonaInvitados() {
  const [nombre, setNombre] = useState(leerNombre)
  const [cambiando, setCambiando] = useState(false)

  if (!nombre || cambiando) {
    return (
      <PedirNombre
        nombreInicial={nombre}
        onListo={(nuevo) => {
          setNombre(nuevo)
          setCambiando(false)
        }}
      />
    )
  }

  return (
    <div className="app">
      <Fondo />
      <AvisoConexion />

      <header className="encabezado">
        <div className="encabezado__marca">
          <span className="insignia-20" aria-hidden="true">
            20
          </span>
          <div>
            <p className="encabezado__ante">Cumple</p>
            <h1 className="encabezado__titulo">20 de Juli</h1>
          </div>
        </div>
        <button
          className="chip-nombre"
          onClick={() => setCambiando(true)}
          title="Cambiar nombre"
        >
          👋 <span>{nombre}</span>
        </button>
      </header>

      <main className="contenido">
        <Outlet context={{ nombre }} />
      </main>

      <nav className="pestanas" aria-label="Secciones">
        <NavLink to="/fotos" className="pestanas__item">
          <span className="pestanas__emoji">📸</span>
          Fotos
        </NavLink>
        <NavLink to="/shots" className="pestanas__item">
          <span className="pestanas__emoji">🥃</span>
          Shots
        </NavLink>
      </nav>
    </div>
  )
}

// Pantalla de ayuda si faltan las variables de entorno
function ConfiguracionFaltante() {
  return (
    <main className="bienvenida">
      <Fondo />
      <div className="bienvenida__tarjeta">
        <h1 className="bienvenida__titulo">Falta configurar Supabase 🔧</h1>
        <p className="bienvenida__texto">
          Crea un archivo <code>.env</code> (copia <code>.env.example</code>) con{' '}
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, y reinicia{' '}
          <code>npm run dev</code>. En Vercel, agrégalas en Settings → Environment Variables.
        </p>
      </div>
    </main>
  )
}
