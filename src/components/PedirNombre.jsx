import { useState } from 'react'
import Fondo from './Fondo'
import { guardarNombre, limpiarNombre, LARGO_MAXIMO_NOMBRE } from '../lib/nombre'

// Pantalla de entrada: se pide el nombre una sola vez y queda guardado en el celular
export default function PedirNombre({ nombreInicial = '', onListo }) {
  const [nombre, setNombre] = useState(nombreInicial)
  const [error, setError] = useState('')

  function entrar(e) {
    e.preventDefault()
    const limpio = limpiarNombre(nombre)
    if (limpio.length < 2) {
      setError('Escribe al menos 2 letras 😉')
      return
    }
    guardarNombre(limpio)
    onListo(limpio)
  }

  return (
    <main className="bienvenida">
      <Fondo cantidad={24} />

      <div className="bienvenida__tarjeta">
        <div className="insignia-20 insignia-20--grande" aria-hidden="true">
          20
        </div>
        <p className="bienvenida__ante">Estás en el</p>
        <h1 className="bienvenida__titulo">
          Cumple 20 <span>de Juli</span>
        </h1>
        <p className="bienvenida__texto">
          Sube tus fotos 📸, cuenta tus shots 🥃 y sal en la pantalla grande. Primero, ¿cómo te llamas?
        </p>

        <form onSubmit={entrar} className="bienvenida__form">
          <label htmlFor="nombre" className="solo-lectores">
            Tu nombre
          </label>
          <input
            id="nombre"
            className="campo"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              setError('')
            }}
            placeholder="Tu nombre"
            maxLength={LARGO_MAXIMO_NOMBRE}
            autoComplete="given-name"
            autoFocus
            enterKeyHint="go"
          />
          {error && <p className="campo__error">{error}</p>}
          <button className="boton boton--fucsia boton--grande" type="submit">
            ¡Entrar a la fiesta! 🎉
          </button>
        </form>

        <p className="bienvenida__pista">Si alguien tiene tu mismo nombre, agrega tu apellido.</p>
      </div>
    </main>
  )
}
