import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import EstadoFlota from "@/components/panel/EstadoFlota";
import ColaCargaCompacta from "@/components/panel/ColaCargaCompacta";
import Pendientes from "@/components/panel/Pendientes";
import PulsoDia from "@/components/panel/PulsoDia";
import FlotaMantenimiento from "@/components/panel/FlotaMantenimiento";

export default function ControlCombustible() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ predicate: (q) => String(q.queryKey?.[0] || "").startsWith("panel-") });
    setTimeout(() => setRefreshing(false), 600);
  };

  const hora = format(now, "HH:mm");
  const fechaLabel = format(now, "EEE dd MMM", { locale: es });

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-5">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Panel de Control
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vista operativa en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="capitalize">En vivo · {fechaLabel} · {hora}</span>
            </div>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-card border border-border hover:bg-muted/50 transition disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <EstadoFlota />

        <ColaCargaCompacta />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <Pendientes />
          </div>
          <div className="lg:col-span-2">
            <PulsoDia />
          </div>
        </div>

        <FlotaMantenimiento />
      </div>
    </div>
  );
}
