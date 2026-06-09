import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getCuentaCliente } from "@/lib/rol";

export default function ProtectedRoute() {
  const [session, setSession] = useState(null);
  const [esCliente, setEsCliente] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      // Un usuario con cuenta de cliente no debe acceder al ERP interno.
      if (session) setEsCliente(!!(await getCuentaCliente()));
      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" />;
  if (esCliente) return <Navigate to="/portal" />;
  return <Outlet />;
}
