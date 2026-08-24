import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  Loader2,
  Eye,
  Download,
  Trash2,
  FolderOpen,
  Plus,
  CalendarDays,
  X,
} from "lucide-react";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useToast } from "@/components/ui/use-toast";
import { formatearFecha } from "@/lib/fechas";
import VisorDocumento from "./VisorDocumento";
import { descargarDocumento, urlFirmada, urlsFirmadas } from "./storageDocs";
import StatusBadge from "./StatusBadge";
import { QK_DOCS, useDocumentosLegales } from "./useDocumentosLegales";
import {
  BUCKET_DOCS,
  URL_FIRMADA_SEG,
  ACCEPT_ATTR,
  MAX_MB,
  TIPOS_DOC,
  TABLA_ENTIDAD,
  tipoDoc,
  tituloDoc,
  esImagen,
  formatoTamano,
  nombreSeguro,
  validarArchivo,
} from "./documentosConfig";

// ─── Diálogo del expediente ───────────────────────────────────────────────────

export default function DocumentosDialog({
  open,
  onClose,
  entidadTipo,
  entidad,
  titulo,
  subtitulo,
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef(null);
  // Qué apartado disparó el selector de archivo: el tipo ya no se elige en un
  // combo, lo determina la sección donde el usuario subió el documento.
  const tipoDestinoRef = useRef(null);

  // Referencia estable: TIPOS_DOC[...] || [] crearía un array nuevo por render
  // y reharía los useMemo/useCallback que lo tienen como dependencia.
  const tipos = useMemo(() => TIPOS_DOC[entidadTipo] || [], [entidadTipo]);

  const [pendiente, setPendiente] = useState(null); // { file, tipo, fecha, descripcion }
  const [arrastrandoEn, setArrastrandoEn] = useState(null); // key del apartado
  const [verDoc, setVerDoc] = useState(null); // { doc, url }
  const [borrarDoc, setBorrarDoc] = useState(null);
  const [abriendo, setAbriendo] = useState(null);
  const [bajando, setBajando] = useState(null);

  const { data: todos = [], isLoading } = useDocumentosLegales();

  const docs = useMemo(() => {
    if (!entidad) return [];
    return todos.filter(
      (d) => d.entidad_tipo === entidadTipo && d.entidad_id === entidad.id,
    );
  }, [todos, entidadTipo, entidad]);

  // Un cubo por apartado. Los tipos que ya no existan en el catálogo (p. ej. si
  // se renombra uno) caen en "otro" en vez de desaparecer de la vista.
  const porTipo = useMemo(() => {
    const cubos = {};
    tipos.forEach((t) => {
      cubos[t.key] = [];
    });
    docs.forEach((d) => {
      const destino = cubos[d.tipo_doc] ? d.tipo_doc : "otro";
      (cubos[destino] || (cubos[destino] = [])).push(d);
    });
    return cubos;
  }, [docs, tipos]);

  // Miniaturas: una sola llamada firmada para todas las imágenes del expediente.
  const rutasImagen = useMemo(
    () => docs.filter((d) => esImagen(d.mime_type)).map((d) => d.storage_path),
    [docs],
  );

  const { data: miniaturas = {} } = useQuery({
    queryKey: ["documentos_legales_thumbs", rutasImagen],
    enabled: open && rutasImagen.length > 0,
    staleTime: (URL_FIRMADA_SEG - 30) * 1000,
    queryFn: () => urlsFirmadas(rutasImagen),
  });

  // ── Subida ──────────────────────────────────────────────────────────────────

  const prepararArchivo = useCallback(
    (file, tipoKey) => {
      const problema = validarArchivo(file);
      if (problema) {
        toast({ variant: "destructive", title: "Archivo no válido", description: problema });
        return;
      }
      const campoVenc = tipoDoc(entidadTipo, tipoKey).venc;
      setPendiente({
        file,
        tipo: tipoKey,
        // Prellenar con la fecha ya capturada evita recapturarla y, si el
        // usuario la corrige aquí, se sincroniza de vuelta al guardar.
        fecha: (campoVenc && entidad?.[campoVenc]) || "",
        descripcion: "",
      });
    },
    [entidadTipo, entidad, toast],
  );

  const abrirSelector = (tipoKey) => {
    tipoDestinoRef.current = tipoKey;
    inputRef.current?.click();
  };

  const soltarEn = (e, tipoKey) => {
    e.preventDefault();
    setArrastrandoEn(null);
    const file = e.dataTransfer?.files?.[0];
    if (file) prepararArchivo(file, tipoKey);
  };

  const subirMutation = useMutation({
    mutationFn: async ({ file, tipo, fecha, descripcion }) => {
      const ruta = `${entidadTipo}/${entidad.id}/${Date.now()}_${nombreSeguro(file.name)}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET_DOCS)
        .upload(ruta, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("documentos_legales").insert({
        entidad_tipo: entidadTipo,
        entidad_id: entidad.id,
        tipo_doc: tipo,
        nombre_archivo: file.name,
        storage_path: ruta,
        mime_type: file.type || null,
        tamano_bytes: file.size,
        fecha_vencimiento: fecha || null,
        notas: descripcion?.trim() || null,
      });
      // Si falla el INSERT, el objeto quedaría huérfano en el bucket.
      if (insErr) {
        await supabase.storage.from(BUCKET_DOCS).remove([ruta]);
        throw insErr;
      }

      // El tipo enlazado a una columna venc_* mantiene los semáforos al día.
      const campoVenc = tipoDoc(entidadTipo, tipo).venc;
      if (campoVenc && fecha) {
        await supabase
          .from(TABLA_ENTIDAD[entidadTipo])
          .update({ [campoVenc]: fecha })
          .eq("id", entidad.id);
      }
      return { sincronizoFecha: Boolean(campoVenc && fecha) };
    },
    onSuccess: ({ sincronizoFecha }) => {
      queryClient.invalidateQueries({ queryKey: QK_DOCS });
      queryClient.invalidateQueries({ queryKey: [TABLA_ENTIDAD[entidadTipo]] });
      setPendiente(null);
      toast({
        title: "Documento subido",
        description: sincronizoFecha
          ? "Se guardó el archivo y se actualizó la fecha de vencimiento."
          : "El archivo quedó guardado en el expediente.",
      });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "No se pudo subir el documento",
        description: err?.message || "Revisa tu conexión e intenta de nuevo.",
      });
    },
  });

  const borrarMutation = useMutation({
    mutationFn: async (doc) => {
      const { error } = await supabase.from("documentos_legales").delete().eq("id", doc.id);
      if (error) throw error;
      // La fila es la fuente de verdad; el objeto se borra después para que un
      // fallo de Storage no deje el documento visible pero ya inaccesible.
      await supabase.storage.from(BUCKET_DOCS).remove([doc.storage_path]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK_DOCS });
      setBorrarDoc(null);
      toast({ title: "Documento eliminado" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: err?.message || "Intenta de nuevo.",
      });
    },
  });

  const handleVer = async (doc) => {
    setAbriendo(doc.id);
    const { url, error } = await urlFirmada(doc.storage_path);
    setAbriendo(null);
    if (!url) {
      toast({
        variant: "destructive",
        title: "No se pudo abrir el documento",
        description: error?.message || "El archivo ya no está en el almacenamiento.",
      });
      return;
    }
    setVerDoc({ doc, url });
  };

  const handleDescargar = async (doc) => {
    setBajando(doc.id);
    try {
      await descargarDocumento(doc);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo descargar",
        description: err?.message || "El archivo ya no está en el almacenamiento.",
      });
    } finally {
      setBajando(null);
    }
  };

  const cerrar = () => {
    setPendiente(null);
    onClose();
  };

  if (!entidad) return null;

  const conArchivo = tipos.filter((t) => (porTipo[t.key] || []).length > 0).length;

  return (
    <>
      <Dialog open={open} onOpenChange={cerrar}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">
          {/* Encabezado */}
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent space-y-0">
            <div className="flex items-center gap-3 pr-8">
              <div className="p-2.5 rounded-xl bg-primary/15 shrink-0">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 text-left">
                <DialogTitle className="text-base font-black truncate">{titulo}</DialogTitle>
                <DialogDescription className="text-xs truncate">
                  {subtitulo ? `${subtitulo} · ` : ""}
                  {docs.length === 0
                    ? "Expediente sin documentos"
                    : `${docs.length} archivo${docs.length === 1 ? "" : "s"} en ${conArchivo} apartado${conArchivo === 1 ? "" : "s"}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
              ))
            ) : (
              tipos.map((t) => (
                <ApartadoDocumento
                  key={t.key}
                  tipo={t}
                  entidadTipo={entidadTipo}
                  docs={porTipo[t.key] || []}
                  vencEntidad={t.venc ? entidad[t.venc] : null}
                  pendiente={pendiente?.tipo === t.key ? pendiente : null}
                  bloqueado={!!pendiente && pendiente.tipo !== t.key}
                  arrastrando={arrastrandoEn === t.key}
                  subiendo={subirMutation.isPending}
                  miniaturas={miniaturas}
                  abriendo={abriendo}
                  bajando={bajando}
                  onElegir={() => abrirSelector(t.key)}
                  onArrastrar={(activo) => setArrastrandoEn(activo ? t.key : null)}
                  onSoltar={(e) => soltarEn(e, t.key)}
                  onFecha={(fecha) => setPendiente((p) => ({ ...p, fecha }))}
                  onDescripcion={(descripcion) => setPendiente((p) => ({ ...p, descripcion }))}
                  onCancelar={() => setPendiente(null)}
                  onSubir={() => subirMutation.mutate(pendiente)}
                  onVer={handleVer}
                  onDescargar={handleDescargar}
                  onBorrar={setBorrarDoc}
                />
              ))
            )}

            {!isLoading && (
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                PDF o imagen (JPG, PNG, WEBP, HEIC) · máximo {MAX_MB} MB por archivo
              </p>
            )}

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && tipoDestinoRef.current) {
                  prepararArchivo(file, tipoDestinoRef.current);
                }
                e.target.value = "";
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <VisorDocumento
        doc={verDoc?.doc}
        url={verDoc?.url}
        entidadTipo={entidadTipo}
        titulo={titulo}
        onClose={() => setVerDoc(null)}
      />

      <AlertDialog open={!!borrarDoc} onOpenChange={(v) => !v && setBorrarDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará <span className="font-semibold">{borrarDoc?.nombre_archivo}</span> del
              expediente de {titulo}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={borrarMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                borrarMutation.mutate(borrarDoc);
              }}
              disabled={borrarMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {borrarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando…
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Un apartado por tipo de documento ────────────────────────────────────────

function ApartadoDocumento({
  tipo,
  entidadTipo,
  docs,
  vencEntidad,
  pendiente,
  bloqueado,
  arrastrando,
  subiendo,
  miniaturas,
  abriendo,
  bajando,
  onElegir,
  onArrastrar,
  onSoltar,
  onFecha,
  onDescripcion,
  onCancelar,
  onSubir,
  onVer,
  onDescargar,
  onBorrar,
}) {
  const Icono = tipo.icon;
  const lleno = docs.length > 0;

  // dragleave burbujea desde los hijos: sin el contains() el resaltado parpadea
  // al pasar el archivo por encima de los renglones ya subidos.
  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        if (!bloqueado) onArrastrar(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onArrastrar(false);
      }}
      onDrop={(e) => (bloqueado ? e.preventDefault() : onSoltar(e))}
      className={`rounded-2xl border overflow-hidden transition-colors ${
        arrastrando
          ? "border-primary bg-primary/10"
          : pendiente
            ? "border-primary/40 bg-card"
            : "border-border bg-card"
      } ${bloqueado ? "opacity-60" : ""}`}
    >
      {/* Cabecera del apartado */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/70 bg-muted/30">
        <div className={`p-2 rounded-lg shrink-0 ${lleno ? "bg-primary/15" : "bg-muted"}`}>
          <Icono className={`w-4 h-4 ${lleno ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">
            {tipo.labelSeccion || tipo.label}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {lleno ? `${docs.length} archivo${docs.length === 1 ? "" : "s"}` : "Sin archivo"}
          </p>
        </div>

        {tipo.venc && <StatusBadge fechaStr={vencEntidad} className="hidden sm:inline-flex" />}

        <Button
          variant={lleno ? "ghost" : "outline"}
          size="sm"
          className="gap-1.5 shrink-0 h-8"
          onClick={onElegir}
          disabled={bloqueado || !!pendiente}
        >
          <Plus className="w-3.5 h-3.5" />
          Subir
        </Button>
      </div>

      <div className="p-3 space-y-2">
        {tipo.venc && (
          <div className="sm:hidden flex justify-end">
            <StatusBadge fechaStr={vencEntidad} />
          </div>
        )}

        {docs.map((doc) => (
          <FilaDocumento
            key={doc.id}
            doc={doc}
            entidadTipo={entidadTipo}
            miniatura={miniaturas[doc.storage_path]}
            mostrarVenc={!tipo.venc}
            abriendo={abriendo === doc.id}
            bajando={bajando === doc.id}
            onVer={() => onVer(doc)}
            onDescargar={() => onDescargar(doc)}
            onBorrar={() => onBorrar(doc)}
          />
        ))}

        {pendiente ? (
          <PanelSubida
            pendiente={pendiente}
            tipo={tipo}
            subiendo={subiendo}
            onFecha={onFecha}
            onDescripcion={onDescripcion}
            onCancelar={onCancelar}
            onSubir={onSubir}
          />
        ) : (
          !lleno && (
            <button
              type="button"
              onClick={onElegir}
              disabled={bloqueado}
              className="w-full rounded-xl border-2 border-dashed border-border p-3 flex items-center justify-center gap-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:pointer-events-none"
            >
              <UploadCloud className="w-4 h-4" />
              Arrastra el archivo aquí o haz clic para elegirlo
            </button>
          )
        )}
      </div>
    </section>
  );
}

// ─── Confirmación previa a subir (dentro del apartado) ────────────────────────

function PanelSubida({ pendiente, tipo, subiendo, onFecha, onDescripcion, onCancelar, onSubir }) {
  const { file, fecha, descripcion } = pendiente;
  const idFecha = `venc-${tipo.key}`;
  const idDesc = `desc-${tipo.key}`;

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <UploadCloud className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
          <p className="text-[11px] text-muted-foreground">{formatoTamano(file.size)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onCancelar}
          disabled={subiendo}
          aria-label="Descartar archivo"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className={`grid gap-3 ${tipo.libre ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {tipo.libre && (
          <div className="space-y-1.5">
            <Label htmlFor={idDesc} className="text-xs font-medium">
              ¿Qué documento es?
            </Label>
            <Input
              id={idDesc}
              value={descripcion || ""}
              onChange={(e) => onDescripcion(e.target.value)}
              placeholder="Ej. Constancia de situación fiscal"
              disabled={subiendo}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={idFecha} className="text-xs font-medium">
            Vence el {tipo.venc ? "" : "(opcional)"}
          </Label>
          <Input
            id={idFecha}
            type="date"
            value={fecha || ""}
            onChange={(e) => onFecha(e.target.value)}
            disabled={subiendo}
          />
        </div>
      </div>

      {tipo.venc && (
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 shrink-0 mt-px" />
          Esta fecha también actualiza el semáforo de vencimientos de la tabla.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancelar} disabled={subiendo}>
          Cancelar
        </Button>
        <Button size="sm" onClick={onSubir} disabled={subiendo} className="gap-2">
          {subiendo ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Subiendo…
            </>
          ) : (
            "Guardar documento"
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Renglón de un documento ──────────────────────────────────────────────────

function FilaDocumento({
  doc,
  entidadTipo,
  miniatura,
  mostrarVenc,
  abriendo,
  bajando,
  onVer,
  onDescargar,
  onBorrar,
}) {
  const meta = tipoDoc(entidadTipo, doc.tipo_doc);
  const Icono = meta.icon;
  const encabezado = tituloDoc(entidadTipo, doc);

  return (
    <div className="rounded-xl border border-border bg-background p-2.5 flex items-center gap-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
      <button
        type="button"
        onClick={onVer}
        className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-border bg-muted flex items-center justify-center"
        aria-label={`Ver ${encabezado}`}
      >
        {miniatura ? (
          <img src={miniatura} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icono className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{encabezado}</p>
          {mostrarVenc && doc.fecha_vencimiento && (
            <StatusBadge fechaStr={doc.fecha_vencimiento} />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {formatoTamano(doc.tamano_bytes)}
          {doc.created_at && <> · subido {formatearFecha(doc.created_at)}</>}
        </p>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onVer}
          disabled={abriendo}
          title="Ver documento"
          aria-label="Ver documento"
        >
          {abriendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDescargar}
          disabled={bajando}
          title="Descargar"
          aria-label="Descargar documento"
        >
          {bajando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-red-600"
          onClick={onBorrar}
          title="Eliminar"
          aria-label="Eliminar documento"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
