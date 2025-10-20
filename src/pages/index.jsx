import Layout from "./Layout.jsx";
import Home from "./Home";
import Unidades from "./Unidades";
import ControlCombustible from "./ControlCombustible.jsx";
import FuelRegistrarViaje from "./FuelRegistrarViaje";
import FuelConductores from "./FuelConductores";
import FuelCamiones from "./FuelCamiones";
import FuelViajes from "./FuelViajes";
import Login from "./Login.jsx"; // <-- AÑADIDO
import ProtectedRoute from "./ProtectedRoute.jsx"; // <-- AÑADIDO
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

const PAGES = {
  Home: Home,
  Unidades: Unidades,
  ControlCombustible: ControlCombustible,
  FuelRegistrarViaje: FuelRegistrarViaje,
  FuelConductores: FuelConductores,
  FuelCamiones: FuelCamiones,
  FuelViajes: FuelViajes,
  Login: Login, // <-- AÑADIDO
};

// ... (la función _getCurrentPage se mantiene igual) ...
function _getCurrentPage(url) {
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split("/").pop();
  if (urlLastPart.includes("?")) {
    urlLastPart = urlLastPart.split("?")[0];
  }
  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || Object.keys(PAGES)[0];
}

function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/unidades" element={<Unidades />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas Protegidas del Sistema de Combustible */}
        <Route element={<ProtectedRoute />}>
          <Route path="/controlcombustible" element={<ControlCombustible />} />
          <Route path="/fuelregistrarviaje" element={<FuelRegistrarViaje />} />
          <Route path="/fuelconductores" element={<FuelConductores />} />
          <Route path="/fuelcamiones" element={<FuelCamiones />} />
          <Route path="/fuelviajes" element={<FuelViajes />} />
        </Route>
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
