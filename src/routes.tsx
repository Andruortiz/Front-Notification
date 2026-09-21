import { createBrowserRouter} from "react-router-dom";
import Listado from "./pages/Listado.tsx";
import Detalle from "./pages/Detalle.tsx";
import Catalogo from "./pages/Catalogo.tsx";
import Layout from "./components/Layout.tsx";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Listado /> },
      { path: '/notificaciones/:id', element: <Detalle /> },
      { path: '/catalogo', element: <Catalogo /> },
    ],}
]);