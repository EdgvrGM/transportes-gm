import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { ShieldCheck, LogIn, LogOut, Truck } from "lucide-react";
import { PATIO_LAT, PATIO_LNG, PATIO_RADIO_M } from "@/components/gps/constants";

function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R    = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function estaEnPatio(lat, lng) {
  return distanciaMetros(lat, lng, PATIO_LAT, PATIO_LNG) <= PATIO_RADIO_M;
}

function tiempoRelativo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)  return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

export default function GeocercaGPS({ positions = [] }) {
  const hoyInicio = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); })();

  useEffect(() => {
    const corte = new Date();
    corte.setDate(corte.getDate() - 7);
    supabase.from("EventoGeocerca").delete().lt("created_at", corte.toISOString()).then(() => {});
  }, []);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["geocerca-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("EventoGeocerca")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const eventosHoy  = eventos.filter((e) => e.created_at >= hoyInicio);
  const entradasHoy = eventosHoy.filter((e) => e.tipo === "entrada").length;
  const salidasHoy  = eventosHoy.filter((e) => e.tipo === "salida").length;

  const unidadesEnPatio = positions.filter(
    (p) => p.lat !== 0 && p.lng !== 0 && estaEnPatio(p.lat, p.lng)
  );

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-1">Entradas hoy</p>
          <div className="flex items-center gap-2">
            <LogIn className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-xl font-bold text-foreground">{entradasHoy}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-1">Salidas hoy</p>
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-xl font-bold text-foreground">{salidasHoy}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-1">En patio ahora</p>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gm-primary shrink-0" />
            <span className="text-xl font-bold text-foreground">{unidadesEnPatio.length}</span>
          </div>
        </div>
      </div>

      {/* Info del patio */}
      <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-gm-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Patio Transportes GM</p>
          <p className="text-xs text-muted-foreground">
            {PATIO_LAT.toFixed(4)}, {PATIO_LNG.toFixed(4)} · radio {PATIO_RADIO_M} m
          </p>
        </div>
      </div>

      {/* Unidades en patio */}
      {unidadesEnPatio.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Unidades en patio ahora
          </p>
          <div className="space-y-1.5">
            {unidadesEnPatio.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-sm font-bold text-foreground uppercase truncate flex-1">
                  {p.nombre}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {p.velocidad} km/h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de eventos */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Últimos eventos
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando eventos...</p>
        ) : eventos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">Sin eventos registrados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {eventos.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 p-3 rounded-xl border bg-card border-border"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  ev.tipo === "entrada"
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30"
                }`}>
                  {ev.tipo === "entrada"
                    ? <LogIn  className="w-3.5 h-3.5 text-green-600" />
                    : <LogOut className="w-3.5 h-3.5 text-blue-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {(() => {
                    const fecha = new Date(ev.created_at);
                    const esHoy = fecha.toDateString() === new Date().toDateString();
                    const hora = fecha.toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                    const fechaStr = fecha.toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                    });
                    const colorTipo = ev.tipo === "entrada"
                      ? "text-green-600 dark:text-green-400"
                      : "text-blue-600 dark:text-blue-400";
                    const label = ev.tipo === "entrada" ? "Entrada" : "Salida";
                    if (esHoy) {
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold uppercase tracking-wide ${colorTipo}`}>
                            {label}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {hora}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold uppercase tracking-wide ${colorTipo}`}>
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {fechaStr} · {hora}
                        </span>
                      </div>
                    );
                  })()}
                  <p className="text-sm font-medium text-foreground truncate">
                    {ev.wialon_nombre}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tiempoRelativo(ev.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
