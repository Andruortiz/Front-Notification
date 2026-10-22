import { createBrowserRouter } from 'react-router-dom';
import Listado from './pages/Listado.tsx';
import Detalle from './pages/Detalle.tsx';
import Catalogo from './pages/Catalogo.tsx';
import CatalogoDetalle from './pages/CatalogoDetalle.tsx';
import NuevaNotificacion from './pages/NuevaNotificacion.tsx';
import Seguridad from './pages/Seguridad.tsx';
import Layout from './components/Layout.tsx';

export const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            { path: '/', element: <Listado /> },
            { path: '/notificaciones/nueva', element: <NuevaNotificacion /> },
            { path: '/notificaciones/:id', element: <Detalle /> },
            { path: '/catalogo', element: <Catalogo /> },
            { path: '/catalogo/:channelType', element: <CatalogoDetalle /> },
            { path: '/seguridad', element: <Seguridad /> },
        ],
    },
]);
