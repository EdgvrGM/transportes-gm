import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/supabaseClient";
import {
  LayoutDashboard,
  PlusCircle,
  Truck,
  Users,
  Home,
  FileText,
  LogOut,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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
    <div className="min-h-screen flex bg-slate-50 dark:bg-background transition-colors duration-300">
      <aside className="hidden md:flex md:flex-col w-64 bg-card border-r border-border fixed h-screen z-20">
        <div className="border-b border-border p-6">
          <div className="flex flex-col items-center gap-2">
            {/* CAMBIO: Fondo transparente en modo oscuro para que se fusione */}
            <div className="bg-white/90 dark:bg-transparent p-2 rounded-lg transition-colors">
              <img
                src="/img/LOGO.PNG"
                alt="Logo de Transportes GM"
                className="h-8 w-auto transition-all"
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-center text-foreground">
                Transportes GM
              </h2>
              <p className="text-sm text-center text-muted-foreground">
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
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-border p-4 space-y-2">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">
              Tema
            </span>
            <ModeToggle />
          </div>

          <Link
            to={createPageUrl("Home")}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Volver al Sitio</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 w-full">{children}</main>
    </div>
  );
}
