import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { localDateStr } from "@/lib/fechas";
import { CATEGORIAS, TIPOS_UNIDAD } from "./costosConfig";
import { useUnidades, invalidarCostos } from "./useCostos";
import SelectUnidad from "./SelectUnidad";

function formVacio({ tipo = "camion", unidadId = "", fecha, categoria = "" } = {}) {
  return {
    tipo,
    unidadId: unidadId ? String(unidadId) : "",
    fecha: fecha || localDateStr(),
    categoria,
    concepto: "",
    proveedor: "",
    monto: "",
    notas: "",
  };
}

function formDesdeCosto(c) {
  return {
    tipo: c.camion_id ? "camion" : "remolque",
    unidadId: String(c.camion_id ?? c.remolque_id),
    fecha: c.fecha,
    categoria: c.categoria,
    concepto: c.concepto || "",
    proveedor: c.proveedor || "",
    monto: c.monto != null ? String(c.monto) : "",
    notas: c.notas || "",
  };
}

// `costo`: fila a editar (o null para alta). `prefill`: valores iniciales del alta
// (tipo, unidadId, fecha, categoria) cuando se abre desde una celda de la tabla.
export default function CapturaCostoDialog({ open, onOpenChange, costo = null, prefill = null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const editando = Boolean(costo);

  const [form, setForm] = useState(() => formVacio(prefill || {}));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const conceptoRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(costo ? formDesdeCosto(costo) : formVacio(prefill || {}));
    setError("");
  }, [open, costo, prefill]);

  const { data: unidades = [] } = useUnidades(form.tipo);

  const set = (campo) => (e) => {
    const valor = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [campo]: valor }));
  };

  const guardar = async (continuar) => {
    const monto = parseFloat(form.monto);
    if (!form.unidadId) return setError(`Elige el ${TIPOS_UNIDAD[form.tipo].singular.toLowerCase()}.`);
    if (!form.fecha) return setError("Captura la fecha.");
    if (!form.categoria) return setError("Elige la categoría.");
    if (!form.concepto.trim()) return setError("Describe el concepto del gasto.");
    if (!(monto > 0)) return setError("El monto debe ser mayor a cero.");
    setError("");
    setGuardando(true);

    const unidadId = parseInt(form.unidadId, 10);
    try {
      const fila = {
        camion_id: form.tipo === "camion" ? unidadId : null,
        remolque_id: form.tipo === "remolque" ? unidadId : null,
        fecha: form.fecha,
        categoria: form.categoria,
        concepto: form.concepto.trim(),
        proveedor: form.proveedor.trim() || null,
        monto,
        notas: form.notas.trim() || null,
      };

      const { error: dbErr } = editando
        ? await supabase.from("CostoUnidad").update(fila).eq("id", costo.id)
        : await supabase.from("CostoUnidad").insert([fila]);
      if (dbErr) throw dbErr;

      invalidarCostos(queryClient);
      toast({
        title: editando ? "Gasto actualizado" : "Gasto registrado",
        description: `${fila.concepto} · $${monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      });

      if (continuar) {
        // Queda abierto para capturar el siguiente: se conservan unidad, fecha y categoría.
        setForm((f) => ({ ...f, concepto: "", proveedor: "", monto: "", notas: "" }));
        conceptoRef.current?.focus();
      } else {
        onOpenChange(false);
      }
    } catch (e) {
      setError(e.message || "No se pudo guardar el gasto.");
    } finally {
      setGuardando(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    guardar(!editando);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar gasto" : "Registrar gasto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {!editando && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted">
              {Object.entries(TIPOS_UNIDAD).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tipo: key, unidadId: "" }))}
                  className={`py-1.5 rounded-md text-sm font-semibold transition ${
                    form.tipo === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.singular}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{TIPOS_UNIDAD[form.tipo].singular} *</Label>
              <SelectUnidad
                tipo={form.tipo}
                unidades={unidades}
                value={form.unidadId}
                onChange={set("unidadId")}
                placeholder="Seleccionar…"
                disabled={editando}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costo-fecha">Fecha *</Label>
              <Input id="costo-fecha" type="date" value={form.fecha} onChange={set("fecha")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoría *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CATEGORIAS.map((c) => {
                const activa = form.categoria === c.key;
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => set("categoria")(c.key)}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-semibold text-left transition ${
                      activa
                        ? "border-gm-primary bg-gm-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: c.color }} />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="costo-concepto">Concepto *</Label>
            <Input
              id="costo-concepto"
              ref={conceptoRef}
              value={form.concepto}
              onChange={set("concepto")}
              placeholder="Ej. 2 llantas 295/80 eje de tracción"
              autoFocus={!editando}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="costo-monto">Monto *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="costo-monto"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="pl-6"
                  value={form.monto}
                  onChange={set("monto")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costo-proveedor">Proveedor</Label>
              <Input id="costo-proveedor" value={form.proveedor} onChange={set("proveedor")} placeholder="Taller, llantera…" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="costo-notas">Notas</Label>
            <Textarea id="costo-notas" rows={2} value={form.notas} onChange={set("notas")} />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {editando ? (
              <Button type="submit" disabled={guardando} className="bg-primary text-primary-foreground">
                {guardando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar cambios
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={guardando} onClick={() => guardar(false)}>
                  Guardar y cerrar
                </Button>
                <Button type="submit" disabled={guardando} className="bg-primary text-primary-foreground">
                  {guardando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar y capturar otro
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
