import { useMemo } from 'react'

// Fondo festivo: un "20" gigante y confeti cayendo despacio detrás de todo.
const COLORES = ['var(--fucsia)', 'var(--lima)', 'var(--cian)', 'var(--sol)', 'var(--coral)']
const FORMAS = ['circulo', 'tira', 'triangulo', 'tira']

export default function Fondo({ cantidad = 18 }) {
  // Se calcula una sola vez para que el confeti no "salte" en cada render
  const piezas = useMemo(
    () =>
      Array.from({ length: cantidad }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        tamano: 8 + Math.random() * 12,
        duracion: 14 + Math.random() * 16,
        retraso: -Math.random() * 30,
        giro: Math.round(Math.random() * 360),
        color: COLORES[i % COLORES.length],
        forma: FORMAS[i % FORMAS.length],
      })),
    [cantidad]
  )

  return (
    <div className="fondo" aria-hidden="true">
      <span className="fondo__veinte">20</span>
      {piezas.map((p) => (
        <span
          key={p.id}
          className={`confeti confeti--${p.forma}`}
          style={{
            left: `${p.x}%`,
            animationDuration: `${p.duracion}s`,
            animationDelay: `${p.retraso}s`,
            '--tamano': `${p.tamano}px`,
            '--color': p.color,
            '--giro': `${p.giro}deg`,
          }}
        />
      ))}
    </div>
  )
}
