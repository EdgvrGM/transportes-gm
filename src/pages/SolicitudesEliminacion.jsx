import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Inbox, Loader2, Trash2, X, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useRol } from "@/hooks/useRol";
import { ELIMINACIONES } from "@/lib/eliminaciones";
import { useResolverSolicitud, useSolicitudes } from "@/components/solicitudes/useSolicitudes";

const ESTADOS = {
  pendiente: { label: "Pendiente", clase: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  aprobada:  { label: "Eliminada", clase: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" },
  rechazada: { label: "Rechazada", clase: "bg-muted text-muted-foreground border-border" },
};

const fechaHora = (iso) => (iso ? format(new Date(iso), "d MMM yyyy, HH:mm", { locale: es }) : "");

export default function SolicitudesEliminacion() {
  const { esAdmin } = useRol();
  const { data: solicitudes = [], isLoading, error } = useSolicitudes();
  const resolver = useResolverSolicitud();
  const [tab, setTab] = useState("pendiente");
  const [aprobar, setAprobar] = useState(null);
  const [rechazar, setRechazar] = useState(null);
  const [nota, setNota] = useState("");

  const pendientes = useMemo(() => solicitudes.filter((s) => s.estado === "pendiente"), [solicitudes]);
  const historial = useMemo(() => solicitudes.filter((s) => s.estado !== "pendiente"), [solicitudes]);
  const lista = tab === "pendiente" ? pendientes : historial;

  const confirmarRechazo = () => {
    resolver.mutate(
      { solicitud: rechazar, accion: "rechazar", nota },
      { onSettled: () => { setRechazar(null); setNota(""); } },
    );
  };

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Inbox className="w-7 h-7 text-primary" /> Solicitudes de eliminación
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {esAdmin
              ? "Las cuentas operativas no pueden eliminar: aquí apruebas o rechazas lo que piden."
              : "Aquí ves el estado de las eliminaciones que pediste."}
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pendiente">Pendientes ({pendientes.length})</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : error ? (
          <p className="text-center text-red-600 py-16">No se pudieron cargar las solicitudes: {error.message}</p>
        ) : lista.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            {tab === "pendiente" ? "No hay solicitudes pendientes." : "Aún no hay solicitudes resueltas."}
          </p>
        ) : (
          <div className="space-y-3">
            {lista.map((s) => {
              const estado = ESTADOS[s.estado] ?? ESTADOS.pendiente;
              const ocupada = resolver.isPending && resolver.variables?.solicitud?.id === s.id;
              return (
                <div key={s.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        {ELIMINACIONES[s.tabla]?.etiqueta ?? s.tabla}
                      </p>
                      <p className="font-bold text-foreground break-words">{s.descripcion}</p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${estado.clase}`}>
                      {estado.label}
                    </span>
                  </div>

                  <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                    <span className="font-semibold">Motivo: </span>{s.motivo}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Pedida por {s.solicitado_por_email || "usuario"} · {fechaHora(s.created_at)}
                    {s.resuelto_at && ` · resuelta ${fechaHora(s.resuelto_at)}`}
                  </p>
                  {s.nota_resolucion && (
                    <p className="text-xs text-muted-foreground"><span className="font-semibold">Nota: </span>{s.nota_resolucion}</p>
                  )}

                  {esAdmin && s.estado === "pendiente" && (
                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      <Button variant="outline" size="sm" className="gap-2" disabled={ocupada} onClick={() => setRechazar(s)}>
                        <X className="w-4 h-4" /> Rechazar
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                        disabled={ocupada}
                        onClick={() => setAprobar(s)}
                      >
                        {ocupada ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Aprobar y eliminar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!aprobar} onOpenChange={(open) => !open && setAprobar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-red-600" /> ¿Eliminar definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <span className="font-bold text-foreground">{aprobar?.descripcion}</span>, junto con sus
              archivos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                resolver.mutate({ solicitud: aprobar, accion: "aprobar" });
                setAprobar(null);
              }}
            >
              Aprobar y eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rechazar} onOpenChange={(open) => { if (!open) { setRechazar(null); setNota(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><XCircle className="w-5 h-5 text-muted-foreground" /> Rechazar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-bold text-foreground">{rechazar?.descripcion}</span> no se eliminará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nota-rechazo">Nota para quien la pidió (opcional)</Label>
            <Textarea id="nota-rechazo" value={nota} onChange={(e) => setNota(e.target.value)} rows={3} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarRechazo}>Rechazar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
