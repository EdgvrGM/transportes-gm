import React, { useState, useEffect } from "react";
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
  Menu,
  X,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  // ESTADO NUEVO: Controla si el menú móvil está abierto o cerrado
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Cierra el menú móvil automáticamente si el usuario cambia de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    <div className="min-h-screen flex bg-slate-50 dark:bg-background transition-colors duration-300 relative">
      {/* 1. TOP BAR MÓVIL (Solo visible en celulares) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-transparent p-1 rounded-lg">
            <img
              src="/img/LOGO.PNG"
              alt="Logo de Transportes GM"
              className="h-8 w-auto"
            />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">
            Transportes GM
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* 2. OVERLAY OSCURO (Para hacer clic y cerrar el menú en móvil) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 3. SIDEBAR (Menú lateral responsivo) */}
      {/* En desktop siempre está visible (md:translate-x-0). En móvil entra y sale. */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-border p-6 relative">
          {/* Botón para cerrar menú en móvil */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 md:hidden text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center gap-0 mt-4 md:mt-0">
            <div className="bg-white/90 dark:bg-transparent p-1 rounded-lg transition-colors">
              <img
                src="/img/LOGO.PNG"
                alt="Logo de Transportes GM"
                className="w-32 h-auto transition-all"
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

      {/* 4. MAIN CONTENT */}
      {/* pt-16 agrega el espacio superior en móviles para que la Top Bar no oculte el título */}
      <main className="flex-1 md:ml-64 w-full pt-16 md:pt-0">{children}</main>
    </div>
  );
}
