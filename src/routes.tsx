import { createBrowserRouter} from "react-router-dom";
import Listado from "./pages/Listado.tsx";
import Detalle from "./pages/Detalle.tsx";
import Catalogo from "./pages/Catalogo.tsx";

export const router = createBrowserRouter([
  { path:'/', element: <Listado /> },
  { path:'/Notidicaciones/:id', element: <Detalle /> },
  { path:'/catalogo',  element: <Catalogo /> }
]);