import { useLayoutEffect, useState } from "react";
import Layout from "./Layout.jsx";
import Home from "./Home";
import SplashScreen from "@/components/SplashScreen";
import Unidades from "./Unidades";
import ControlCombustible from "./ControlCombustible.jsx";
import FuelRegistrarViaje from "./FuelRegistrarViaje";
import FuelConductores from "./FuelConductores";
import FuelCamiones from "./FuelCamiones";
import FuelRemolques from "./FuelRemolques";
import FuelViajes from "./FuelViajes";
import FuelProgramaCargas from "./FuelProgramaCargas";
import Login from "./Login.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import Clientes from "./Clientes"; // <-- Importado correctamente
import IAAuditorChat from "./IAAuditorChat.jsx";
import ExpertoLogistica from "./ExpertoLogistica.jsx";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Liquidaciones from "./Liquidaciones.jsx";

// AGREGAMOS CLIENTES A LA LISTA DE PÁGINAS ACTIVAS
const PAGES = {
  Home: Home,
  Unidades: Unidades,
  ControlCombustible: ControlCombustible,
  FuelRegistrarViaje: FuelRegistrarViaje,
  FuelConductores: FuelConductores,
  FuelCamiones: FuelCamiones,
  FuelRemolques: FuelRemolques,
  FuelViajes: FuelViajes,
  FuelProgramaCargas: FuelProgramaCargas,
  Login: Login,
  Clientes: Clientes,
  IAAuditorChat: IAAuditorChat,
  ExpertoLogistica: ExpertoLogistica,
  Liquidaciones: Liquidaciones,
};

function _getCurrentPage(url) {
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split("/").pop();
  if (urlLastPart.includes("?")) {
    urlLastPart = urlLastPart.split("?")[0];
  }
  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase(),
  );
  return pageName || Object.keys(PAGES)[0];
}

function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);
  const [showSplash, setShowSplash] = useState(false);

  useLayoutEffect(() => {
    const flag = sessionStorage.getItem("showSplash");
    if (flag) {
      sessionStorage.removeItem("showSplash");
      setShowSplash(true);
    }
  }, [location.pathname]);

  return (
    <>
    {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
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
          <Route path="/fuelremolques" element={<FuelRemolques />} />
          <Route path="/fuelviajes" element={<FuelViajes />} />
          <Route path="/fuelprogramacargas" element={<FuelProgramaCargas />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/liquidaciones" element={<Liquidaciones />} />
          <Route path="/iaauditorchat" element={<IAAuditorChat />} />
          <Route path="/expertologistica" element={<ExpertoLogistica />} />
        </Route>
      </Routes>
    </Layout>
    </>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
