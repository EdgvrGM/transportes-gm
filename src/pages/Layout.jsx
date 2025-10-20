import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // <-- Añadir useNavigate
import { createPageUrl } from "@/utils";
import { supabase } from "@/supabaseClient"; // <-- Añadir supabase
import {
  LayoutDashboard,
  PlusCircle,
  Truck,
  Users,
  Home,
  FileText,
  LogOut,
} from "lucide-react"; // <-- Añadir LogOut

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate(); // <-- Hook para navegar

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login"); // Redirige al login después de cerrar sesión
  };

  const isFuelSystem =
    currentPageName &&
    [
      "ControlCombustible",
      "FuelRegistrarViaje",
      "FuelViajes",
      "FuelConductores",
      "FuelCamiones",
    ].includes(currentPageName);

  if (!isFuelSystem) {
    return <>{children}</>;
  }

  const navigationItems = [
    {
      title: "Panel de Control",
      url: createPageUrl("controlCombustible"),
      icon: LayoutDashboard,
    },
    {
      title: "Registrar Viaje",
      url: createPageUrl("FuelRegistrarViaje"),
      icon: PlusCircle,
    },
    {
      title: "Registro de Viajes",
      url: createPageUrl("FuelViajes"),
      icon: FileText,
    },
    {
      title: "Conductores",
      url: createPageUrl("FuelConductores"),
      icon: Users,
    },
    { title: "Camiones", url: createPageUrl("FuelCamiones"), icon: Truck },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100">
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-slate-200 fixed h-screen">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col items-center gap-2">
            {/* Logo */}
            <img
              src="/img/LOGO.PNG"
              alt="Logo de Transportes GM"
              className="h-12 w-auto"
            />
            {/* Títulos */}
            <div>
              <h2 className="text-xl font-bold text-center text-slate-800">
                Transportes GM
              </h2>
              <p className="text-sm text-center text-slate-500">
                Gestión de Combustible
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-3 overflow-y-auto">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 ${
                  location.pathname === item.url
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                    : "hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4">
          <Link
            to={createPageUrl("Home")}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            <Home className="w-5 h-5 text-slate-600" />
            <span className="font-medium text-slate-700">Volver al Sitio</span>
          </Link>
          {/* Botón de Cerrar Sesión */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64">{children}</main>
    </div>
  );
}
