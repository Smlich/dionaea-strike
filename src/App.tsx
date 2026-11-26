import { CarnivoraShmupGame } from './components/CarnivoraShmupGame';

/**
 * En tu web React, pasa `isAdmin={usuarioActual?.rol === 'admin'}` desde tu sistema de cuentas.
 * Para previsualizar el modo administrador aquí sin mostrarlo a clientes normales, añade `?admin=1` a la URL.
 */
export default function App() {
  const isAdmin =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('admin') === '1';

  return <CarnivoraShmupGame isAdmin={isAdmin} />;
}
