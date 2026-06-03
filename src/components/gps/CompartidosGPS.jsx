import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInHours, differenceInMinutes, addHours, format } from "date-fns";
import { supabase } from "@/supabaseClient";
import {
  Link2, Clock, Trash2, Check, Plus, Share2, AlertCircle, Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DURACIONES = [
  { label: "4h",  horas: 4 },
  { label: "8h",  horas: 8 },
  { label: "24h", horas: 24 },
  { label: "3d",  horas: 72 },
];

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

function TiempoRestante({ expiresAt }) {
  const ahora = new Date();
  const expira = new Date(expiresAt);
  if (expira <= ahora) {
    return <span className="text-xs text-destructive">Expirado</span>;
  }
  const h = differenceInHours(expira, ahora);
  const m = differenceInMinutes(expira, ahora) % 60;
  const texto = h > 0 ? `Quedan ${h}h${m > 0 ? ` ${m}m` : ""}` : `Quedan ${m}m`;
  return (
    <span className={`text-xs ${h < 1 ? "text-red-500" : "text-muted-foreground"}`}>
      {texto}
    </span>
  );
}

export default function CompartidosGPS({ positions = [] }) {
  const queryClient = useQueryClient();

  const { data: sesiones = [], refetch } = useQuery({
    queryKey: ["rastreo-compartido"],
    queryFn: async () => {
      const { data } = await supabase
        .from("RastreoCompartido")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Limpiar expirados silenciosamente al montar
  useEffect(() => {
    supabase
      .from("RastreoCompartido")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .then(() => refetch());
  }, []);

  const ahora = new Date();
  const activas   = sesiones.filter((s) => new Date(s.expires_at) > ahora);
  const expiradas = sesiones.filter((s) => new Date(s.expires_at) <= ahora);

  const [copiedId, setCopiedId]               = useState(null);
  const [popoverId, setPopoverId]             = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showNueva, setShowNueva]             = useState(false);
  const [selectedUnitId, setSelectedUnitId]   = useState("");
  const [duracion, setDuracion]               = useState(8);
  const [generando, setGenerando]             = useState(false);
  const [linkNuevo, setLinkNuevo]             = useState(null);
  const [linkNuevoCopiado, setLinkNuevoCopiado] = useState(false);
  const [errorNuevo, setErrorNuevo]           = useState(null);

  const rutaPublica = (sesion) =>
    sesion.tipo === "historial" ? `/historial/${sesion.token}` : `/rastreo/${sesion.token}`;

  const copyLink = (sesion) => {
    const base = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
    navigator.clipboard.writeText(`${base}${rutaPublica(sesion)}`).then(() => {
      setCopiedId(sesion.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const extender = async (sesion, horas) => {
    const base = new Date(sesion.expires_at) > new Date() ? new Date(sesion.expires_at) : new Date();
    await supabase
      .from("RastreoCompartido")
      .update({ expires_at: addHours(base, horas).toISOString() })
      .eq("id", sesion.id);
    setPopoverId(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["rastreo-compartido-count"] });
  };

  const revocar = async (id) => {
    await supabase.from("RastreoCompartido").delete().eq("id", id);
    setConfirmDeleteId(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["rastreo-compartido-count"] });
  };

  const generarNuevo = async () => {
    if (!selectedUnitId) return;
    setGenerando(true);
    setErrorNuevo(null);
    try {
      const unidad = positions.find((p) => String(p.id) === selectedUnitId);
      const { data, error } = await supabase
        .from("RastreoCompartido")
        .insert({
          token:          generateToken(),
          wialon_unit_id: parseInt(selectedUnitId, 10),
          wialon_nombre:  unidad?.nombre ?? selectedUnitId,
          expires_at:     addHours(new Date(), duracion).toISOString(),
        })
        .select("token")
        .single();
      if (error) throw error;
      const base = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
      setLinkNuevo(`${base}/rastreo/${data.token}`);
      queryClient.invalidateQueries({ queryKey: ["rastreo-compartido"] });
      queryClient.invalidateQueries({ queryKey: ["rastreo-compartido-count"] });
    } catch (err) {
      setErrorNuevo(err?.message ?? "Error al generar el enlace");
    } finally {
      setGenerando(false);
    }
  };

  const cerrarNueva = () => {
    setShowNueva(false);
    setSelectedUnitId("");
    setDuracion(8);
    setLinkNuevo(null);
    setLinkNuevoCopiado(false);
    setErrorNuevo(null);
  };

  const renderCard = (sesion) => {
    const activa = new Date(sesion.expires_at) > new Date();
    const esHistorial = sesion.tipo === "historial";
    const base = import.meta.env.VITE_PUBLIC_URL ?? window.location.origin;
    return (
      <div key={sesion.id} className="p-3 border-b border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${activa ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm font-bold text-foreground truncate flex-1">
            {sesion.wialon_nombre}
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 ${
            esHistorial
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          }`}>
            {esHistorial ? "Historial" : "En vivo"}
          </span>
        </div>
        <TiempoRestante expiresAt={sesion.expires_at} />
        {esHistorial && sesion.historial_desde && (
          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
            Recorrido: {format(new Date(sesion.historial_desde), "dd/MM HH:mm")} → {format(new Date(sesion.historial_hasta), "dd/MM HH:mm")}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {format(new Date(sesion.created_at), "yyyy-MM-dd HH:mm")} → {format(new Date(sesion.expires_at), "yyyy-MM-dd")}
        </p>
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => copyLink(sesion)}
            title="Copiar enlace"
            className="flex items-center justify-center w-7 h-7 rounded border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            {copiedId === sesion.id
              ? <Check className="w-3.5 h-3.5 text-green-500" />
              : <Link2 className="w-3.5 h-3.5" />
            }
          </button>
          <a
            href={`${base}${rutaPublica(sesion)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir enlace"
            className="flex items-center justify-center w-7 h-7 rounded border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Share2 className="w-3.5 h-3.5" />
          </a>
          <div className="relative">
            <button
              onClick={() => setPopoverId(popoverId === sesion.id ? null : sesion.id)}
              title="Extender vigencia"
              className="flex items-center justify-center w-7 h-7 rounded border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            {popoverId === sesion.id && (
              <div className="absolute left-0 top-8 z-50 bg-card border border-border rounded-lg shadow-lg p-1.5 flex gap-1">
                {[
                  { label: "+4h",  h: 4  },
                  { label: "+8h",  h: 8  },
                  { label: "+24h", h: 24 },
                  { label: "+3d",  h: 72 },
                ].map((opt) => (
                  <button
                    key={opt.h}
                    onClick={() => extender(sesion, opt.h)}
                    className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors text-foreground whitespace-nowrap"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setConfirmDeleteId(sesion.id)}
            title="Revocar"
            className="flex items-center justify-center w-7 h-7 rounded border border-border hover:bg-red-500/10 hover:border-red-500/40 transition-colors text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b border-border shrink-0 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Enlaces compartidos
        </h3>
        <button
          onClick={() => setShowNueva(true)}
          className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-500 font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva
        </button>
      </div>

      {/* Lista */}
      {sesiones.length === 0 && (
        <p className="p-4 text-xs text-muted-foreground text-center">Sin enlaces compartidos</p>
      )}
      {activas.map(renderCard)}

      {/* Divisor + expirados */}
      {expiradas.length > 0 && (
        <>
          <div className="px-3 py-1.5 flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground shrink-0">Expirados</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {expiradas.map(renderCard)}
        </>
      )}

      {/* AlertDialog — confirmar revocar */}
      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar enlace?</AlertDialogTitle>
            <AlertDialogDescription>
              El enlace dejará de funcionar inmediatamente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revocar(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog — nueva sesión */}
      <Dialog open={showNueva} onOpenChange={(open) => !open && cerrarNueva()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Compartir rastreo</DialogTitle>
          </DialogHeader>

          {!linkNuevo ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Unidad</label>
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una unidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {positions
                      .filter((p) => !(p.lat === 0 && p.lng === 0))
                      .map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Vigencia del enlace</label>
                <div className="flex gap-1">
                  {DURACIONES.map((d) => (
                    <button
                      key={d.horas}
                      onClick={() => setDuracion(d.horas)}
                      className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                        duracion === d.horas
                          ? "bg-gm-primary/20 text-yellow-700 dark:text-yellow-400 border-gm-primary/40 font-semibold"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {errorNuevo && (
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400">{errorNuevo}</p>
                </div>
              )}

              <button
                onClick={generarNuevo}
                disabled={!selectedUnitId || generando}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-lg bg-gm-primary text-slate-900 hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {generando
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Share2 className="w-4 h-4" />
                }
                {generando ? "Generando..." : "Generar enlace"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center bg-muted rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground truncate font-mono flex-1">
                  {linkNuevo}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(linkNuevo).then(() => {
                      setLinkNuevoCopiado(true);
                      setTimeout(() => setLinkNuevoCopiado(false), 2000);
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  {linkNuevoCopiado
                    ? <><Check className="w-4 h-4 text-green-500" /> Copiado</>
                    : <><Link2 className="w-4 h-4" /> Copiar</>
                  }
                </button>
                <a
                  href={linkNuevo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-lg bg-gm-primary text-slate-900 hover:bg-yellow-400 transition-colors"
                >
                  Abrir
                </a>
              </div>
              <button
                onClick={() => { setLinkNuevo(null); setLinkNuevoCopiado(false); setErrorNuevo(null); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Generar otro enlace
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
