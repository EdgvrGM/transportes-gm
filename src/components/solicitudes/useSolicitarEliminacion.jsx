import { useCallback, useState } from "react";
import { Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useCrearSolicitud, useSolicitudesPendientes } from "./useSolicitudes";

// Para el operativo: en lugar de eliminar, pide la eliminación al admin.
//   const { solicitar, dialogo, estaPendiente } = useSolicitarEliminacion("Cliente");
//   esAdmin ? setClienteAEliminar(c) : solicitar(c.id, `Cliente ${c.nombre}`)
//   ...y renderizar {dialogo} una vez en la página.
export function useSolicitarEliminacion(tabla) {
  const { toast } = useToast();
  const pendientes = useSolicitudesPendientes(tabla);
  const [objetivo, setObjetivo] = useState(null);

  const estaPendiente = useCallback((id) => pendientes.has(String(id)), [pendientes]);

  const solicitar = useCallback(
    (id, descripcion) => {
      if (pendientes.has(String(id))) {
        toast({ title: "Ya solicitada", description: "Este registro ya tiene una solicitud de eliminación pendiente." });
        return;
      }
      setObjetivo({ id: String(id), descripcion });
    },
    [pendientes, toast],
  );

  const dialogo = (
    <SolicitarEliminacionDialog tabla={tabla} objetivo={objetivo} onClose={() => setObjetivo(null)} />
  );

  return { solicitar, dialogo, estaPendiente };
}

function SolicitarEliminacionDialog({ tabla, objetivo, onClose }) {
  const [motivo, setMotivo] = useState("");
  const crear = useCrearSolicitud();

  const cerrar = () => {
    setMotivo("");
    onClose();
  };

  const enviar = () => {
    if (!motivo.trim()) return;
    crear.mutate(
      { tabla, registroId: objetivo.id, descripcion: objetivo.descripcion, motivo },
      { onSuccess: cerrar },
    );
  };

  return (
    <Dialog open={!!objetivo} onOpenChange={(open) => !open && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar eliminación</DialogTitle>
          <DialogDescription>
            Tu cuenta no puede eliminar registros. El administrador revisará la solicitud.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground">
            {objetivo?.descripcion}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-eliminacion">Motivo *</Label>
            <Textarea
              id="motivo-eliminacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Se capturó dos veces"
              rows={3}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={cerrar}>Cancelar</Button>
          <Button
            onClick={enviar}
            disabled={!motivo.trim() || crear.isPending}
            className="bg-primary text-primary-foreground gap-2"
          >
            {crear.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EtiquetaSolicitada({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 ${className}`}
    >
      Eliminación solicitada
    </span>
  );
}
