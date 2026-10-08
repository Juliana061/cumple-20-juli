import { useConexion } from '../hooks/useConexion'

// Franja que aparece cuando el celular se queda sin internet
export default function AvisoConexion() {
  const enLinea = useConexion()
  if (enLinea) return null

  return (
    <div className="sin-conexion" role="alert">
      📡 Sin conexión. Revisa tu wifi o tus datos; la app se pone al día sola cuando vuelvas.
    </div>
  )
}
