const MEDALLAS = ['🥇', '🥈', '🥉']

/**
 * Ranking de shots. variante "movil" (pestaña Shots) o "tv" (pantalla grande).
 * En la TV cada fila tiene una barra proporcional al primer lugar.
 */
export default function ListaRanking({ ranking, nombreActual, limite, variante = 'movil' }) {
  const filas = limite ? ranking.slice(0, limite) : ranking
  const maximo = Math.max(1, ...ranking.map((f) => f.cantidad))

  if (filas.length === 0) {
    return (
      <p className="ranking__vacio">
        Nadie ha registrado shots todavía… ¿quién abre la pista? 🥃
      </p>
    )
  }

  return (
    <ol className={`ranking ranking--${variante}`}>
      {filas.map((fila, i) => {
        const esYo = fila.nombre === nombreActual
        return (
          <li key={fila.nombre} className={`ranking__fila ${esYo ? 'ranking__fila--yo' : ''}`}>
            <span className="ranking__puesto">{MEDALLAS[i] || i + 1}</span>
            <div className="ranking__info">
              <span className="ranking__nombre">
                {fila.nombre}
                {esYo && <em className="ranking__tu"> (tú)</em>}
              </span>
              {variante === 'tv' && (
                <span className="ranking__barra">
                  <span style={{ width: `${(fila.cantidad / maximo) * 100}%` }} />
                </span>
              )}
            </div>
            <span className="ranking__dato ranking__dato--shots" title="Shots">
              🥃 {fila.cantidad}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
