import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowRight,
  Container,
  FileCode2,
  FileDown,
  Loader2,
  MoreVertical,
  Pencil,
  ScrollText,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useRol } from "@/hooks/useRol";
import { lunesDeSemana, sumarDias } from "@/lib/semana";
import { eliminarRegistro, invalidarEliminacion, mensajeEliminacion } from "@/lib/eliminaciones";
import { useSolicitarEliminacion, EtiquetaSolicitada } from "@/components/solicitudes/useSolicitarEliminacion";
import {
  parsearCartaPorte,
  filaCartaPorte,
  ErrorCartaPorte,
  TIPOS_REFERENCIA,
  textoReferencia,
} from "@/components/cartaporte/parsearCartaPorte";
import { generarPDFCartaPorte, nombreArchivoCartaPorte } from "@/components/cartaporte/pdfCartaPorte";
import { razonSocial, RAZONES_SOCIALES } from "@/components/cartaporte/razonesSociales";

const QK = ["cartas-porte"];
const COLUMNAS_BASE =
  "id, uuid, serie, folio, referencia_tipo, referencia, referencia_editada, contenedores, receptor_nombre, origen, destino, fecha_salida, fecha_llegada, placas, operador_nombre, created_at";
// Columnas de 20261106_carta_porte_emisor.sql. Si esa migración no se ha corrido,
// la página sigue funcionando sin ellas (sin separar por razón social).
const COLUMNAS_EMISOR = ["emisor_rfc", "emisor_nombre", "distancia_total"];
const MAX_XML_BYTES = 2 * 1024 * 1024;

const esColumnaFaltante = (error) => error?.code === "42703" || error?.code === "PGRST204";

function parseFecha(s) {
  if (!s) return null;
  try {
    return parseISO(s);
  } catch {
    return null;
  }
}

const fechaCorta = (s) => {
  const d = parseFecha(s);
  return d ? format(d, "dd MMM · HH:mm", { locale: es }) : "—";
};

function tituloDia(d, hoy) {
  if (!d) return "Sin fecha de salida";
  if (isSameDay(d, hoy)) return "Hoy";
  if (isSameDay(d, sumarDias(hoy, -1))) return "Ayer";
  if (isSameDay(d, sumarDias(hoy, 1))) return "Mañana";
  return format(d, "EEEE dd 'de' MMMM yyyy", { locale: es });
}

const factura = (c) => [c.serie, c.folio].filter(Boolean).join("-") || c.uuid.slice(0, 8);
const referencia = (c) => textoReferencia(c.referencia_tipo, c.referencia);
const refDeFila = (c) => ({ tipo: c.referencia_tipo, valor: c.referencia });
const descripcion = (c) =>
  [`Carta porte ${referencia(c) || factura(c)}`, `Factura ${factura(c)}`, c.placas, c.operador_nombre]
    .filter(Boolean)
    .join(" · ");

function descargarBlob(contenido, nombre, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function leerXml(id) {
  const { data, error } = await supabase.from("carta_porte").select("xml").eq("id", id).single();
  if (error) throw error;
  return data.xml;
}

// ── Piezas de la UI (fuera del componente principal) ──────────────────────────

function Contador({ valor, etiqueta, activo, onClick, punto }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
        activo ? "ring-2 ring-gm-primary bg-gm-primary/5 border-gm-primary/30" : "bg-card border-border hover:border-gm-primary/40"
      }`}
    >
      <p className="text-2xl font-black text-foreground tabular-nums">{valor}</p>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground leading-tight mt-1">
        {punto && <span className={`w-2 h-2 rounded-full shrink-0 ${punto}`} />}
        <span className="truncate">{etiqueta}</span>
      </p>
    </button>
  );
}

function ChipReferencia({ c }) {
  if (!c.referencia) {
    return <span className="text-lg font-black tracking-tight text-muted-foreground">Factura {factura(c)}</span>;
  }
  return (
    <span className="inline-flex items-baseline gap-1.5 min-w-0">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
        {TIPOS_REFERENCIA[c.referencia_tipo]?.opcion || "Ref."}
      </span>
      <span className="text-lg font-black tracking-tight text-foreground break-all">{c.referencia}</span>
      {c.referencia_editada && (
        <span className="text-[9px] font-bold uppercase text-muted-foreground shrink-0" title="Corregida a mano">
          manual
        </span>
      )}
    </span>
  );
}

function Dato({ icon: Icon, children, mono = false }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className={`truncate ${mono ? "font-mono" : ""}`}>{children}</span>
    </span>
  );
}

function TarjetaCarta({ c, generando, pendiente, onPDF, onXML, onEditar, onEliminar }) {
  const rs = razonSocial(c.emisor_rfc, c.emisor_nombre);
  const km = c.distancia_total != null ? `${Number(c.distancia_total).toLocaleString("es-MX")} km` : null;

  // Móvil/tablet: tarjeta apilada (referencia + acciones, ruta, datos).
  // lg+: una sola fila a todo lo ancho — referencia │ ruta │ datos │ acciones —
  // para no dejar media pantalla vacía cuando un día tiene una sola carta.
  return (
    <div className="flex bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:border-gm-primary/40 transition-all duration-200">
      <div className={`w-1.5 shrink-0 ${c.emisor_rfc ? rs.franja : "bg-border"}`} />
      <div className="flex-1 min-w-0 p-4 lg:py-3 grid gap-3 grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,210px)_minmax(0,1fr)_minmax(0,230px)_auto] lg:items-center lg:gap-5">
        {/* Referencia */}
        <div className="min-w-0 col-start-1 row-start-1">
          <ChipReferencia c={c} />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            {c.referencia && <span className="text-xs text-muted-foreground">Factura {factura(c)}</span>}
            {c.emisor_rfc && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rs.chip}`}>{rs.corto}</span>
            )}
          </div>
          {c.receptor_nombre && (
            <p className="text-xs text-muted-foreground truncate mt-1" title={`Cliente: ${c.receptor_nombre}`}>
              {c.receptor_nombre}
            </p>
          )}
          {pendiente && <EtiquetaSolicitada className="mt-1.5" />}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0 col-start-2 row-start-1 self-start lg:self-center lg:col-start-4">
            <Button
              size="sm"
              onClick={() => onPDF(c)}
              disabled={generando}
              className="h-9 rounded-xl gap-1.5 font-bold bg-gm-primary text-black hover:bg-gm-primary/90"
              title="Descargar carta porte (PDF)"
            >
              {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label="Más acciones">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => onEditar(c)} className="gap-2 cursor-pointer">
                  <Pencil className="w-4 h-4" /> Corregir referencia
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onXML(c)} className="gap-2 cursor-pointer">
                  <FileCode2 className="w-4 h-4" /> Descargar XML
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEliminar(c)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Ruta — celular: vertical (lado a lado no caben los nombres) */}
        <div className="sm:hidden col-span-2 row-start-2 rounded-xl bg-muted/40 px-3 py-2.5 flex gap-3">
          <div className="flex flex-col items-center pt-1.5 pb-1 text-muted-foreground/60">
            <span className="w-2 h-2 rounded-full bg-current shrink-0" />
            <span className="flex-1 border-l border-dashed border-current my-1" />
            <ArrowRight className="w-3.5 h-3.5 rotate-90 shrink-0" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{c.origen || "—"}</p>
              <p className="text-[11px] text-muted-foreground">Sale {fechaCorta(c.fecha_salida)}</p>
            </div>
            {km && <p className="text-[10px] font-bold text-muted-foreground">{km}</p>}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{c.destino || "—"}</p>
              <p className="text-[11px] text-muted-foreground">Llega {fechaCorta(c.fecha_llegada)}</p>
            </div>
          </div>
        </div>

        {/* Ruta — sm+: horizontal */}
        <div className="hidden sm:grid col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 min-w-0 grid-cols-[minmax(0,max-content)_minmax(56px,1fr)_minmax(0,max-content)] items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Origen</p>
            <p className="text-sm font-semibold text-foreground truncate" title={c.origen || ""}>{c.origen || "—"}</p>
            <p className="text-[11px] text-muted-foreground">Sale {fechaCorta(c.fecha_salida)}</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 min-w-0">
            {km && <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{km}</span>}
            <div className="flex items-center w-full text-muted-foreground/60">
              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
              <span className="flex-1 border-t border-dashed border-current" />
              <ArrowRight className="w-3.5 h-3.5 -ml-0.5 shrink-0" />
            </div>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destino</p>
            <p className="text-sm font-semibold text-foreground truncate" title={c.destino || ""}>{c.destino || "—"}</p>
            <p className="text-[11px] text-muted-foreground">Llega {fechaCorta(c.fecha_llegada)}</p>
          </div>
        </div>

        {/* Unidad, operador, contenedores */}
        <div className="col-span-2 row-start-3 lg:col-span-1 lg:col-start-3 lg:row-start-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 lg:flex-col lg:flex-nowrap lg:items-start lg:gap-1">
          <Dato icon={Truck}>{c.placas}</Dato>
          <Dato icon={UserRound}>{c.operador_nombre}</Dato>
          <Dato icon={Container} mono>{c.contenedores}</Dato>
        </div>
      </div>
    </div>
  );
}

const PASOS = [
  { icon: Upload, titulo: "Sube el XML", texto: "El de la factura de flete, tal como sale de CONTPAQi." },
  { icon: ScrollText, titulo: "Se lee la carta porte", texto: "Ubicaciones, mercancía, unidad, remolques y operador." },
  { icon: ShieldCheck, titulo: "Descarga el PDF", texto: "Listo para el operador, sin importes del flete." },
];

// `compacta`: con cartas ya cargadas basta una barra; los pasos sólo se
// explican mientras la lista está vacía (probado: con pasos se veía saturado).
function ZonaSubida({ compacta = false, procesando, arrastrando, onElegir, onArchivos, setArrastrando }) {
  const handlers = {
    onDragOver: (e) => {
      e.preventDefault();
      setArrastrando(true);
    },
    onDragLeave: () => setArrastrando(false),
    onDrop: (e) => {
      e.preventDefault();
      setArrastrando(false);
      onArchivos(e.dataTransfer.files);
    },
  };
  const borde = arrastrando
    ? "border-gm-primary bg-gm-primary/10 scale-[1.01]"
    : "border-border bg-card hover:border-gm-primary/50 hover:bg-gm-primary/5";
  const titulo = procesando ? "Leyendo la factura…" : arrastrando ? "Suelta el XML aquí" : "Arrastra aquí el XML de la factura";

  if (compacta) {
    return (
      <button
        type="button"
        onClick={onElegir}
        disabled={procesando}
        {...handlers}
        className={`w-full flex items-center gap-5 rounded-2xl border-2 border-dashed px-5 py-7 md:px-6 md:py-9 text-left transition-all ${borde}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-gm-primary/15 flex items-center justify-center shrink-0">
          {procesando ? <Loader2 className="w-7 h-7 animate-spin text-yellow-600" /> : <Upload className="w-7 h-7 text-yellow-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground">
            {procesando ? "Leyendo la factura…" : arrastrando ? "Suelta el XML aquí" : "Arrastra el XML de la factura o haz clic para elegirlo"}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">Se guarda el XML y se descarga la carta porte al instante. Puedes subir varios.</p>
        </div>
        <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground border border-border rounded-full px-2 py-1 shrink-0">
          CFDI 4.0 · Carta Porte 3.x
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onElegir}
      disabled={procesando}
      {...handlers}
      className={`w-full rounded-3xl border-2 border-dashed px-6 py-10 md:py-14 text-center transition-all ${borde}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-gm-primary/15 flex items-center justify-center mx-auto mb-4">
        {procesando ? <Loader2 className="w-8 h-8 animate-spin text-yellow-600" /> : <Upload className="w-8 h-8 text-yellow-600" />}
      </div>
      <p className="text-lg font-black text-foreground">{titulo}</p>
      <p className="text-sm text-muted-foreground mt-1">o haz clic para elegirlo de tu computadora</p>
      <div className="grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto mt-8 text-left">
        {PASOS.map((p, i) => (
          <div key={p.titulo} className="rounded-2xl bg-muted/40 border border-border p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-gm-primary text-black text-xs font-black flex items-center justify-center">{i + 1}</span>
              <p.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">{p.titulo}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.texto}</p>
          </div>
        ))}
      </div>
    </button>
  );
}

function ListaCargando() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// El dato se edita en la fila; el XML no se toca (es el documento timbrado).
function EditarReferenciaDialog({ carta, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tipo, setTipo] = useState(carta?.referencia_tipo || "remision");
  const [valor, setValor] = useState(carta?.referencia || "");

  const guardar = useMutation({
    mutationFn: async () => {
      const limpio = valor.trim().toUpperCase();
      const { data, error } = await supabase
        .from("carta_porte")
        .update({ referencia_tipo: limpio ? tipo : null, referencia: limpio || null, referencia_editada: true })
        .eq("id", carta.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No se guardó: no tienes permiso o el registro ya no existe.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      toast({ title: "Referencia actualizada" });
      onClose();
    },
    onError: (e) => toast({ variant: "destructive", title: "No se pudo guardar", description: e.message }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Referencia del viaje</DialogTitle>
          <DialogDescription>
            Factura {factura(carta)}. Se usa en la lista, en la búsqueda y en el PDF; el XML no cambia.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            guardar.mutate();
          }}
        >
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS_REFERENCIA).map(([clave, t]) => (
                    <SelectItem key={clave} value={clave}>
                      {t.opcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-valor">Número</Label>
              <Input id="ref-valor" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus placeholder="13404" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {guardar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function CartaPorte() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { esAdmin } = useRol();
  const solicitudes = useSolicitarEliminacion("carta_porte");
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [soloSemana, setSoloSemana] = useState(false);
  const [emisorFiltro, setEmisorFiltro] = useState(null);
  const [generandoId, setGenerandoId] = useState(null);
  const [porBorrar, setPorBorrar] = useState(null);
  const [editando, setEditando] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const consulta = (columnas) =>
        supabase
          .from("carta_porte")
          .select(columnas)
          .order("fecha_salida", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(300);
      let res = await consulta(`${COLUMNAS_BASE}, ${COLUMNAS_EMISOR.join(", ")}`);
      let conEmisor = true;
      if (esColumnaFaltante(res.error)) {
        res = await consulta(COLUMNAS_BASE);
        conEmisor = false;
      }
      if (res.error) throw res.error;
      return { cartas: res.data || [], conEmisor };
    },
  });
  const cartas = useMemo(() => data?.cartas ?? [], [data]);
  const conEmisor = data?.conEmisor ?? true;

  const hoy = new Date();
  const lunes = lunesDeSemana(hoy);
  const domingoSig = sumarDias(lunes, 7);
  const enSemana = (c) => {
    const d = parseFecha(c.fecha_salida);
    return d && d >= lunes && d < domingoSig;
  };

  // Las razones sociales de la empresa siempre aparecen (aunque tengan 0) para
  // que la fila de contadores no cambie de forma; un RFC ajeno se agrega al final.
  const emisores = useMemo(() => {
    if (!conEmisor) return [];
    const mapa = new Map(Object.keys(RAZONES_SOCIALES).map((rfc) => [rfc, { rfc, nombre: null, total: 0 }]));
    for (const c of cartas) {
      if (!c.emisor_rfc) continue;
      const e = mapa.get(c.emisor_rfc) || { rfc: c.emisor_rfc, nombre: c.emisor_nombre, total: 0 };
      e.total += 1;
      mapa.set(c.emisor_rfc, e);
    }
    return [...mapa.values()];
  }, [cartas, conEmisor]);

  const totalSemana = cartas.filter(enSemana).length;

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return cartas.filter((c) => {
      if (emisorFiltro && c.emisor_rfc !== emisorFiltro) return false;
      if (soloSemana && !enSemana(c)) return false;
      if (!q) return true;
      return [factura(c), referencia(c), c.contenedores, c.placas, c.operador_nombre, c.origen, c.destino, c.receptor_nombre, c.uuid]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(q));
    });
    // enSemana depende de `lunes`, que cambia sólo de un día a otro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartas, busqueda, emisorFiltro, soloSemana, lunes.getTime()]);

  const grupos = useMemo(() => {
    const out = [];
    for (const c of filtradas) {
      const d = parseFecha(c.fecha_salida);
      const clave = d ? format(d, "yyyy-MM-dd") : "sin-fecha";
      const ultimo = out.at(-1);
      if (ultimo?.clave === clave) ultimo.items.push(c);
      else out.push({ clave, fecha: d, items: [c] });
    }
    return out;
  }, [filtradas]);

  const descargarPDF = async (xml, ref) => {
    const { doc, datos } = await generarPDFCartaPorte(xml, ref);
    doc.save(nombreArchivoCartaPorte(datos));
  };

  // Una factura ya cargada no es error: se genera su PDF igual (con la
  // referencia guardada, por si se corrigió a mano).
  const subirMutation = useMutation({
    mutationFn: async (archivos) => {
      const resultados = [];
      for (const archivo of archivos) {
        if (!/\.xml$/i.test(archivo.name)) throw new ErrorCartaPorte(`${archivo.name}: sólo se aceptan archivos .xml`);
        if (archivo.size > MAX_XML_BYTES) throw new ErrorCartaPorte(`${archivo.name}: el archivo es demasiado grande.`);
        const xml = await archivo.text();
        let datos;
        try {
          datos = parsearCartaPorte(xml);
        } catch (e) {
          throw new ErrorCartaPorte(`${archivo.name}: ${e.message}`);
        }
        const fila = filaCartaPorte(datos, xml);
        let { error } = await supabase.from("carta_porte").insert(fila);
        if (esColumnaFaltante(error)) {
          const sinEmisor = Object.fromEntries(Object.entries(fila).filter(([k]) => !COLUMNAS_EMISOR.includes(k)));
          ({ error } = await supabase.from("carta_porte").insert(sinEmisor));
        }
        if (error && error.code !== "23505") throw error;
        let ref;
        if (error) {
          const { data: previa } = await supabase
            .from("carta_porte")
            .select("referencia_tipo, referencia")
            .eq("uuid", datos.timbre.uuid)
            .maybeSingle();
          if (previa) ref = refDeFila(previa);
        }
        resultados.push({ xml, ref, estado: error ? "existente" : "nueva" });
      }
      return resultados;
    },
    onSuccess: async (resultados) => {
      queryClient.invalidateQueries({ queryKey: QK });
      const nuevas = resultados.filter((r) => r.estado === "nueva").length;
      const existentes = resultados.length - nuevas;
      toast({
        title: nuevas ? `${nuevas} carta${nuevas > 1 ? "s" : ""} porte guardada${nuevas > 1 ? "s" : ""}` : "Ya estaba cargada",
        description: existentes && nuevas ? `${existentes} ya estaba${existentes > 1 ? "n" : ""} cargada${existentes > 1 ? "s" : ""}.` : undefined,
      });
      if (resultados.length === 1) {
        try {
          await descargarPDF(resultados[0].xml, resultados[0].ref);
        } catch (e) {
          toast({ variant: "destructive", title: "No se pudo generar el PDF", description: e.message });
        }
      }
    },
    onError: (e) => toast({ variant: "destructive", title: "No se pudo cargar el XML", description: e.message }),
  });

  const eliminarMutation = useMutation({
    mutationFn: (c) => eliminarRegistro("carta_porte", c.id),
    onSuccess: () => {
      invalidarEliminacion(queryClient, "carta_porte");
      toast({ title: "Carta porte eliminada" });
    },
    onError: (e) => toast({ variant: "destructive", title: "No se pudo eliminar", description: mensajeEliminacion(e) }),
  });

  const recibirArchivos = (lista) => {
    const archivos = Array.from(lista || []);
    if (archivos.length) subirMutation.mutate(archivos);
  };
  const elegirArchivos = () => inputRef.current?.click();

  const onPDF = async (c) => {
    setGenerandoId(c.id);
    try {
      await descargarPDF(await leerXml(c.id), refDeFila(c));
    } catch (e) {
      toast({ variant: "destructive", title: "No se pudo generar el PDF", description: e.message });
    } finally {
      setGenerandoId(null);
    }
  };

  const onXML = async (c) => {
    try {
      descargarBlob(await leerXml(c.id), `${factura(c)}.xml`, "application/xml");
    } catch (e) {
      toast({ variant: "destructive", title: "No se pudo descargar el XML", description: e.message });
    }
  };

  const onEliminar = (c) => (esAdmin ? setPorBorrar(c) : solicitudes.solicitar(c.id, descripcion(c)));

  const hayFiltros = Boolean(busqueda.trim() || soloSemana || emisorFiltro);
  const limpiarFiltros = () => {
    setBusqueda("");
    setSoloSemana(false);
    setEmisorFiltro(null);
  };

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gm-primary/15 flex items-center justify-center shrink-0">
              <ScrollText className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground">Carta Porte</h1>
              <p className="text-sm text-muted-foreground font-medium">
                Del XML de la factura al PDF para el operador, sin importes
              </p>
            </div>
          </div>
          <Button
            onClick={elegirArchivos}
            disabled={subirMutation.isPending}
            className="rounded-xl font-bold gap-2 bg-gm-primary text-black hover:bg-gm-primary/90"
          >
            {subirMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Subir XML
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            multiple
            className="hidden"
            onChange={(e) => {
              recibirArchivos(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[74px] rounded-2xl" />
              ))}
            </div>
            <ListaCargando />
          </>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            No se pudieron cargar las cartas porte: {error.message}
          </div>
        ) : cartas.length === 0 ? (
          <ZonaSubida
            procesando={subirMutation.isPending}
            arrastrando={arrastrando}
            setArrastrando={setArrastrando}
            onElegir={elegirArchivos}
            onArchivos={recibirArchivos}
          />
        ) : (
          <>
            {/* Contadores (también son filtros) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Contador valor={cartas.length} etiqueta="Todas" activo={!hayFiltros} onClick={limpiarFiltros} />
              <Contador valor={totalSemana} etiqueta="Salen esta semana" activo={soloSemana} onClick={() => setSoloSemana((v) => !v)} />
              {emisores.map((e) => {
                const rs = razonSocial(e.rfc, e.nombre);
                return (
                  <Contador
                    key={e.rfc}
                    valor={e.total}
                    etiqueta={rs.corto}
                    punto={rs.punto}
                    activo={emisorFiltro === e.rfc}
                    onClick={() => setEmisorFiltro((v) => (v === e.rfc ? null : e.rfc))}
                  />
                );
              })}
            </div>

            {!conEmisor && (
              <p className="mb-4 text-xs text-muted-foreground rounded-xl border border-dashed border-border px-3 py-2">
                Para separar por razón social corre la migración <span className="font-mono">20261106_carta_porte_emisor.sql</span> en Supabase.
              </p>
            )}

            {/* En celular no se arrastran archivos y ya está el botón "Subir XML". */}
            <div className="mb-4 hidden sm:block">
              <ZonaSubida
                compacta
                procesando={subirMutation.isPending}
                arrastrando={arrastrando}
                setArrastrando={setArrastrando}
                onElegir={elegirArchivos}
                onArchivos={recibirArchivos}
              />
            </div>

            {/* Búsqueda */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar remisión, servicio, factura, contenedor, placas, operador…"
                  aria-label="Buscar cartas porte"
                  className="pl-9 h-11 rounded-xl bg-card"
                />
              </div>
              {hayFiltros && (
                <Button variant="ghost" onClick={limpiarFiltros} className="rounded-xl gap-1.5 text-muted-foreground shrink-0">
                  <X className="w-4 h-4" /> Limpiar
                </Button>
              )}
            </div>

            {/* Lista agrupada por día de salida */}
            {grupos.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-bold text-foreground">Sin resultados</p>
                <p className="text-sm text-muted-foreground mt-1">Prueba con otra búsqueda o quita los filtros.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {grupos.map((g) => (
                  <section key={g.clave}>
                    <h2 className="flex items-center gap-2 mb-2.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
                      <span>{tituloDia(g.fecha, hoy)}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums">{g.items.length}</span>
                      <span className="flex-1 h-px bg-border" />
                    </h2>
                    <div className="grid gap-2.5">
                      {g.items.map((c) => (
                        <TarjetaCarta
                          key={c.id}
                          c={c}
                          generando={generandoId === c.id}
                          pendiente={solicitudes.estaPendiente(c.id)}
                          onPDF={onPDF}
                          onXML={onXML}
                          onEditar={setEditando}
                          onEliminar={onEliminar}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {solicitudes.dialogo}

      {editando && <EditarReferenciaDialog key={editando.id} carta={editando} onClose={() => setEditando(null)} />}

      <AlertDialog open={Boolean(porBorrar)} onOpenChange={(o) => !o && setPorBorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta carta porte?</AlertDialogTitle>
            <AlertDialogDescription>
              {porBorrar && descripcion(porBorrar)}. Se borra el XML guardado; la factura en el SAT no se afecta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                eliminarMutation.mutate(porBorrar);
                setPorBorrar(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
