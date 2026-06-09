import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getCuentaCliente } from "@/lib/rol";

// Guard del Portal de Cliente: requiere sesión Y que sea una cuenta de cliente.
// Un usuario interno que intente entrar al portal se manda al ERP.
export default function PortalRoute() {
  const [estado, setEstado] = useState("cargando"); // cargando | ok | sin-sesion | interno | desactivada

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setEstado("sin-sesion"); return; }
      const cuenta = await getCuentaCliente();
      if (!cuenta) { setEstado("interno"); return; }
      if (!cuenta.activo) { setEstado("desactivada"); return; }
      setEstado("ok");
    })();
  }, []);

  if (estado === "cargando") {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }
  if (estado === "sin-sesion") return <Navigate to="/login" />;
  if (estado === "interno")    return <Navigate to="/controlcombustible" />;
  if (estado === "desactivada") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-2">Cuenta desactivada</h1>
          <p className="text-slate-400 text-sm mb-4">Tu acceso fue suspendido. Contacta a Transportes GM.</p>
          <button
            onClick={() => supabase.auth.signOut().then(() => { window.location.href = "/login"; })}
            className="text-xs px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
