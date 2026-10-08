// Barra de progreso con rayas animadas
export default function BarraProgreso({ valor, texto }) {
  const porcentaje = Math.round(Math.min(1, Math.max(0, valor)) * 100)

  return (
    <div className="progreso">
      <div className="progreso__fila">
        <span>{texto}</span>
        <strong>{porcentaje}%</strong>
      </div>
      <div
        className="progreso__pista"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
      >
        <div className="progreso__relleno" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  )
}
