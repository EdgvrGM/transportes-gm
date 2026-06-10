import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { WIALON_PROXY_URL } from "@/components/gps/constants";
import { wialonFetch } from "@/lib/wialonFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Users, Plus, Loader2, KeyRound, Power, Truck, Pencil } from "lucide-react";

async function invocar(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("admin-cuentas-cliente", { body: { action, ...payload } });
  if (error) {
    let msg = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch (_) { /* noop */ }
    throw new Error(msg || "Error en la operación");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function CuentasCliente() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: cuentas = [], isLoading } = useQuery({
    queryKey: ["cuentas-cliente"],
    queryFn: () => invocar("list").then((d) => d.cuentas ?? []),
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-proxy"],
    queryFn: async () => {
      const res = await wialonFetch(`${WIALON_PROXY_URL}?action=positions`);
      const all = await res.json();
      return (all || []).map((u) => ({ id: String(u.id), nombre: u.nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
  });

  const [openNueva, setOpenNueva] = useState(false);
  const [editandoUnidades, setEditandoUnidades] = useState(null); // cuenta en edición de unidades
  const [resetCuenta, setResetCuenta] = useState(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cuentas-cliente"] });

  const crear = useMutation({
    mutationFn: (payload) => invocar("create", payload),
    onSuccess: () => { invalidate(); setOpenNueva(false); toast({ title: "Cuenta creada", description: "El cliente ya puede iniciar sesión." }); },
    onError: (e) => toast({ variant: "destructive", title: "Error al crear", description: e.message }),
  });
  const actualizarUnidades = useMutation({
    mutationFn: (payload) => invocar("update-unidades", payload),
    onSuccess: () => { invalidate(); setEditandoUnidades(null); toast({ title: "Unidades actualizadas" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const setActivo = useMutation({
    mutationFn: (payload) => invocar("set-activo", payload),
    onSuccess: () => { invalidate(); toast({ title: "Estado actualizado" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const resetPass = useMutation({
    mutationFn: (payload) => invocar("reset-password", payload),
    onSuccess: () => { setResetCuenta(null); toast({ title: "Contraseña actualizada" }); },
    onError: (e) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" /> Cuentas de Cliente
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Accesos de solo rastreo para tus clientes</p>
          </div>
          <Button onClick={() => setOpenNueva(true)} className="gap-2"><Plus className="w-4 h-4" /> Nueva cuenta</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : cuentas.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Aún no has creado cuentas de cliente.</p>
        ) : (
          <div className="space-y-3">
            {cuentas.map((c) => (
              <div key={c.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.activo ? "bg-green-500" : "bg-red-500"}`} />
                      <p className="font-bold text-foreground truncate">{c.nombre}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {c.unidades.length} unidad{c.unidades.length !== 1 ? "es" : ""} · historial desde {new Date(c.historial_desde).toLocaleDateString("es-MX")}
                    </p>
                    {c.unidades.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                        <Truck className="w-3 h-3 shrink-0" />
                        {c.unidades.map((u) => u.wialon_nombre || u.wialon_unit_id).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="outline" title="Editar unidades" onClick={() => setEditandoUnidades(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="outline" title="Resetear contraseña" onClick={() => setResetCuenta(c)}><KeyRound className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="outline" title={c.activo ? "Desactivar" : "Activar"}
                      onClick={() => setActivo.mutate({ cuenta_id: c.id, activo: !c.activo })}
                      className={c.activo ? "text-red-500" : "text-green-500"}><Power className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openNueva && <DialogNueva unidades={unidades} onClose={() => setOpenNueva(false)} onSubmit={(p) => crear.mutate(p)} loading={crear.isPending} />}
      {editandoUnidades && <DialogUnidades cuenta={editandoUnidades} unidades={unidades} onClose={() => setEditandoUnidades(null)} onSubmit={(u) => actualizarUnidades.mutate({ cuenta_id: editandoUnidades.id, unidades: u })} loading={actualizarUnidades.isPending} />}
      {resetCuenta && <DialogReset cuenta={resetCuenta} onClose={() => setResetCuenta(null)} onSubmit={(pw) => resetPass.mutate({ cuenta_id: resetCuenta.id, password: pw })} loading={resetPass.isPending} />}
    </div>
  );
}

function SelectorUnidades({ unidades, seleccion, setSeleccion }) {
  const toggle = (u) => setSeleccion((prev) =>
    prev.find((x) => x.wialon_unit_id === Number(u.id))
      ? prev.filter((x) => x.wialon_unit_id !== Number(u.id))
      : [...prev, { wialon_unit_id: Number(u.id), wialon_nombre: u.nombre }]
  );
  return (
    <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
      {unidades.map((u) => {
        const checked = !!seleccion.find((x) => x.wialon_unit_id === Number(u.id));
        return (
          <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent text-sm">
            <input type="checkbox" checked={checked} onChange={() => toggle(u)} className="accent-primary" />
            <span className="text-foreground">{u.nombre}</span>
          </label>
        );
      })}
      {unidades.length === 0 && <p className="p-3 text-xs text-muted-foreground">Cargando unidades...</p>}
    </div>
  );
}

function DialogNueva({ unidades, onClose, onSubmit, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [seleccion, setSeleccion] = useState([]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva cuenta de cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre / Razón social</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Cliente S.A." /></div>
          <div><Label>Correo (usuario)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@correo.com" /></div>
          <div><Label>Contraseña</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" /></div>
          <div><Label>Unidades visibles ({seleccion.length})</Label><SelectorUnidades unidades={unidades} seleccion={seleccion} setSeleccion={setSeleccion} /></div>
          <Button className="w-full gap-2" disabled={loading || !email || !password || !nombre} onClick={() => onSubmit({ email, password, nombre, unidades: seleccion })}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear cuenta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogUnidades({ cuenta, unidades, onClose, onSubmit, loading }) {
  const [seleccion, setSeleccion] = useState([]);
  useEffect(() => {
    setSeleccion((cuenta.unidades || []).map((u) => ({ wialon_unit_id: Number(u.wialon_unit_id), wialon_nombre: u.wialon_nombre })));
  }, [cuenta]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Unidades de {cuenta.nombre}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <SelectorUnidades unidades={unidades} seleccion={seleccion} setSeleccion={setSeleccion} />
          <Button className="w-full gap-2" disabled={loading} onClick={() => onSubmit(seleccion)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Guardar ({seleccion.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogReset({ cuenta, onClose, onSubmit, loading }) {
  const [pw, setPw] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nueva contraseña</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Para <strong>{cuenta.nombre}</strong> ({cuenta.email})</p>
          <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="nueva contraseña" />
          <Button className="w-full" disabled={loading || pw.length < 6} onClick={() => onSubmit(pw)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualizar contraseña"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
