import { useState } from "react";
import { Download, ExternalLink, Loader2, FileWarning } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import VisorImagen from "@/components/fuel/VisorImagen";
import { descargarDocumento } from "./storageDocs";
import { esImagen, esPDF, formatoTamano, tipoDoc, tituloDoc } from "./documentosConfig";

// Recibe la URL ya firmada: quien abre el documento la resuelve antes, para que
// el visor no tenga estado de carga y no haya un Dialog intermedio que aparezca
// y desaparezca antes de mostrar la imagen.
export default function VisorDocumento({ doc, url, entidadTipo, titulo, onClose }) {
  const { toast } = useToast();
  const [bajando, setBajando] = useState(false);

  if (!doc || !url) return null;

  // Las imágenes usan el visor del proyecto (zoom con rueda, paneo, giro).
  if (esImagen(doc.mime_type)) {
    return <VisorImagen url={url} onClose={onClose} />;
  }

  const meta = tipoDoc(entidadTipo, doc.tipo_doc);
  const pdf = esPDF(doc.mime_type);

  const handleDescargar = async () => {
    setBajando(true);
    try {
      await descargarDocumento(doc);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo descargar",
        description: err?.message || "El archivo ya no está en el almacenamiento.",
      });
    } finally {
      setBajando(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 pr-12 border-b border-border shrink-0">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <meta.icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <DialogTitle className="text-sm font-bold truncate">
              {tituloDoc(entidadTipo, doc)}
            </DialogTitle>
            <p className="text-xs text-muted-foreground truncate">
              {titulo ? `${titulo} · ` : ""}
              {doc.nombre_archivo} · {formatoTamano(doc.tamano_bytes)}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Abrir</span>
          </Button>
          <Button size="sm" className="gap-2 shrink-0" onClick={handleDescargar} disabled={bajando}>
            {bajando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Descargar</span>
          </Button>
        </div>

        <div className="flex-1 min-h-0 bg-muted/40">
          {pdf ? (
            <iframe src={url} title={doc.nombre_archivo} className="w-full h-full bg-white" />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <FileWarning className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                Este formato no se puede previsualizar
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Descarga el archivo para abrirlo con la aplicación correspondiente.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
