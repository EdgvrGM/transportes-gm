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
  CalendarDays,
  Package,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Settings2,
  Fuel,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados para controlar qué secciones desplegables están abiertas
  const [openProgramacion, setOpenProgramacion] = useState(false);
  const [openCombustible, setOpenCombustible] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Efecto para cerrar menú móvil al navegar y auto-abrir secciones según la URL
  useEffect(() => {
    setIsMobileMenuOpen(false);

    const path = location.pathname.toLowerCase();

    // Auto-abrir Programación si estamos en sus rutas
    if (path.includes("fuelprogramacargas") || path.includes("clientes")) {
      setOpenProgramacion(true);
    }

    // Auto-abrir Control de Combustible si estamos en sus rutas
    if (
      path.includes("fuelviajes") ||
      path.includes("fuelregistrarviaje") ||
      path.includes("fuelconductores") ||
      path.includes("fuelcamiones") ||
      path.includes("fuelremolques")
    ) {
      setOpenCombustible(true);
    }
  }, [location.pathname]);

  const systemPages = [
    "ControlCombustible",
    "FuelProgramaCargas",
    "FuelRegistrarViaje",
    "FuelViajes",
    "Clientes",
    "FuelConductores",
    "FuelCamiones",
    "FuelRemolques",
  ];

  const isPublicRoute = ["/", "/home", "/login"].includes(
    location.pathname.toLowerCase(),
  );
  const isFuelSystem = currentPageName && systemPages.includes(currentPageName);

  if (isPublicRoute || !isFuelSystem) {
    return <>{children}</>;
  }

  // Estilo común para los botones del menú
  const navItemClass = (isActive) => `
    flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 
    ${
      isActive
        ? "bg-primary text-primary-foreground shadow-md"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }
  `;

  const subItemClass = (isActive) => `
    flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 ml-4 transition-all duration-200 text-sm
    ${
      isActive
        ? "bg-primary/10 text-primary font-bold border-l-2 border-primary rounded-l-none"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }
  `;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background transition-colors duration-300 relative">
      {/* TOP BAR MÓVIL */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/img/LOGO.PNG" alt="Logo" className="h-8 w-auto" />
          <span className="font-bold text-foreground text-lg tracking-tight text-nowrap">
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

      {/* OVERLAY MÓVIL */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
      >
        <div className="border-b border-border p-6 relative">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 md:hidden text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center gap-0 mt-4 md:mt-0">
            <img src="/img/LOGO.PNG" alt="Logo" className="w-28 h-auto mb-2" />
            <h2 className="text-xl font-bold text-center text-foreground">
              Transportes GM
            </h2>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground opacity-70">
              Gestión Integral
            </p>
          </div>
        </div>

        <div className="flex-1 p-3 overflow-y-auto hide-scrollbar">
          <nav className="space-y-1">
            {/* BOTÓN: PANEL DE CONTROL (Directo) */}
            <Link
              to={createPageUrl("controlCombustible")}
              className={navItemClass(
                location.pathname === createPageUrl("controlCombustible"),
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Panel de Control</span>
            </Link>

            {/* SECCIÓN: PROGRAMACIÓN (Desplegable) */}
            <div className="space-y-1">
              <button
                onClick={() => setOpenProgramacion(!openProgramacion)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Settings2 className="w-5 h-5" />
                  <span className="font-medium">Programación</span>
                </div>
                {openProgramacion ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {openProgramacion && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Link
                    to={createPageUrl("FuelProgramaCargas")}
                    className={subItemClass(
                      location.pathname === createPageUrl("FuelProgramaCargas"),
                    )}
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span>Programa de Cargas</span>
                  </Link>
                  <Link
                    to={createPageUrl("Clientes")}
                    className={subItemClass(
                      location.pathname === createPageUrl("Clientes"),
                    )}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Clientes</span>
                  </Link>
                </div>
              )}
            </div>

            {/* SECCIÓN: CONTROL DE COMBUSTIBLE (Desplegable) */}
            <div className="space-y-1">
              <button
                onClick={() => setOpenCombustible(!openCombustible)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Fuel className="w-5 h-5" />
                  <span className="font-medium">Combustible</span>
                </div>
                {openCombustible ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {openCombustible && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Link
                    to={createPageUrl("FuelViajes")}
                    className={subItemClass(
                      location.pathname === createPageUrl("FuelViajes"),
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Registro de Viajes</span>
                  </Link>
                  <Link
                    to={createPageUrl("FuelRegistrarViaje")}
                    className={subItemClass(
                      location.pathname === createPageUrl("FuelRegistrarViaje"),
                    )}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Registrar Viaje</span>
                  </Link>
                  <Link
                    to={createPageUrl("FuelConductores")}
                    className={subItemClass(
                      location.pathname === createPageUrl("FuelConductores"),
                    )}
                  >
                    <Users className="w-4 h-4" />
                    <span>Conductores</span>
                  </Link>
                  <Link
                    to={createPageUrl("FuelCamiones")}
                    className={subItemClass(
                      location.pathname === createPageUrl("FuelCamiones"),
                    )}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Camiones</span>
                  </Link>
                  <Link
                    to={createPageUrl("FuelRemolques")}
                    className={subItemClass(
                      location.pathname === createPageUrl("FuelRemolques"),
                    )}
                  >
                    <Package className="w-4 h-4" />
                    <span>Remolques</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* PIE DEL SIDEBAR */}
        <div className="border-t border-border p-4 space-y-2 bg-muted/5">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg">
            <span className="text-xs font-bold uppercase text-muted-foreground opacity-70">
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

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 md:ml-64 w-full pt-16 md:pt-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
