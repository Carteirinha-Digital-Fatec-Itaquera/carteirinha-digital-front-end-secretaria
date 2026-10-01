import { useParams, useLocation } from 'react-router-dom';
import MenuLateral from '../../components/menuLateral/MenuLateral';

export function EventsRouteScaffold() {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  let title = 'Eventos';
  if (location.pathname === '/eventos/novo') {
    title = 'Cadastrar Novo Evento';
  } else if (location.pathname.includes('/editar')) {
    title = `Editar Evento ${id ?? ''}`.trim();
  } else if (location.pathname.includes('/gerenciar')) {
    title = `Gerenciar Evento ${id ?? ''}`.trim();
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <MenuLateral />
      <main style={{ flex: 1, padding: '2rem' }} role="main" aria-label={title}>
        <h1 data-testid="events-scaffold-title">{title}</h1>
        <p data-testid="events-scaffold-path">Rota ativa: {location.pathname}</p>
      </main>
    </div>
  );
}

export default EventsRouteScaffold;
