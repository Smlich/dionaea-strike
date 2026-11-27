import { CarnivoraShmupGame } from './components/CarnivoraShmupGame';

/**
 * En producción el panel de administración permanece desactivado salvo que el sitio anfitrión pase `isAdmin`.
 * En desarrollo local (`npm run dev`), añade `?admin=1` a la URL para previsualizar el panel.
 */
export default function App() {
  const isAdmin =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('admin') === '1';

  return <CarnivoraShmupGame isAdmin={isAdmin} />;
}
