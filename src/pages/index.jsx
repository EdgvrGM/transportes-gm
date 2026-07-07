import { lazy, Suspense, useLayoutEffect, useState } from "react";
import Layout from "./Layout.jsx";
import SplashScreen from "@/components/SplashScreen";
import ProtectedRoute from "./ProtectedRoute.jsx";
import PortalRoute from "./PortalRoute.jsx";
import { Loader2, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

// Code-splitting por ruta: cada página se descarga solo cuando se visita.
// Crítico para las rutas públicas (/rastreo/:token) que abre gente externa.
const Home = lazy(() => import("./Home"));
const Unidades = lazy(() => import("./Unidades"));
const ControlCombustible = lazy(() => import("./ControlCombustible.jsx"));
const FuelRegistrarViaje = lazy(() => import("./FuelRegistrarViaje"));
const FuelConductores = lazy(() => import("./FuelConductores"));
const FuelCamiones = lazy(() => import("./FuelCamiones"));
const FuelRemolques = lazy(() => import("./FuelRemolques"));
const FuelViajes = lazy(() => import("./FuelViajes"));
const FuelProgramaCargas = lazy(() => import("./FuelProgramaCargas"));
const Login = lazy(() => import("./Login.jsx"));
const Clientes = lazy(() => import("./Clientes"));
const IAAuditorChat = lazy(() => import("./IAAuditorChat.jsx"));
const ExpertoLogistica = lazy(() => import("./ExpertoLogistica.jsx"));
const Liquidaciones = lazy(() => import("./Liquidaciones.jsx"));
const DocumentacionLegal = lazy(() => import("./DocumentacionLegal.jsx"));
const RastreoGPS = lazy(() => import("./RastreoGPS.jsx"));
const RastreoPublico = lazy(() => import("./RastreoPublico.jsx"));
const HistorialPublico = lazy(() => import("./HistorialPublico.jsx"));
const Mantenimiento = lazy(() => import("./Mantenimiento"));
const ControlVacios = lazy(() => import("./ControlVacios"));
const CuentasCliente = lazy(() => import("./CuentasCliente.jsx"));
const PortalCliente = lazy(() => import("./PortalCliente.jsx"));

// Solo se usan los nombres (para decidir si la ruta lleva sidebar en Layout).
const PAGE_NAMES = [
  "Home",
  "Unidades",
  "ControlCombustible",
  "FuelRegistrarViaje",
  "FuelConductores",
  "FuelCamiones",
  "FuelRemolques",
  "FuelViajes",
  "FuelProgramaCargas",
  "Login",
  "Clientes",
  "IAAuditorChat",
  "ExpertoLogistica",
  "Liquidaciones",
  "DocumentacionLegal",
  "RastreoGPS",
  "Mantenimiento",
  "ControlVacios",
  "CuentasCliente",
  "PortalCliente",
];

function _getCurrentPage(url) {
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split("/").pop();
  if (urlLastPart.includes("?")) {
    urlLastPart = urlLastPart.split("?")[0];
  }
  const pageName = PAGE_NAMES.find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase(),
  );
  return pageName || PAGE_NAMES[0];
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8">
      <Compass className="w-14 h-14 text-muted-foreground/40 mb-4" />
      <h1 className="text-2xl font-black text-foreground mb-1">Página no encontrada</h1>
      <p className="text-sm text-muted-foreground mb-6">
        La dirección que buscas no existe o fue movida.
      </p>
      <Link
        to="/controlcombustible"
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
      >
        Ir al Panel de Control
      </Link>
    </div>
  );
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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/unidades" element={<Unidades />} />
          <Route path="/login" element={<Login />} />
          <Route path="/rastreo/:token" element={<RastreoPublico />} />
          <Route path="/historial/:token" element={<HistorialPublico />} />

          {/* Portal de Cliente (cuenta espejo) — guard propio */}
          <Route element={<PortalRoute />}>
            <Route path="/portal" element={<PortalCliente />} />
          </Route>

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
            <Route path="/documentacionlegal" element={<DocumentacionLegal />} />
            <Route path="/rastreogps" element={<RastreoGPS />} />
            <Route path="/mantenimiento" element={<Mantenimiento />} />
            <Route path="/controlvacios" element={<ControlVacios />} />
            <Route path="/cuentascliente" element={<CuentasCliente />} />
            <Route path="/iaauditorchat" element={<IAAuditorChat />} />
            <Route path="/expertologistica" element={<ExpertoLogistica />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
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
