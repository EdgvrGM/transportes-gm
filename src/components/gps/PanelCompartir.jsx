import { useState } from "react";
import { addHours } from "date-fns";
import { supabase } from "@/supabaseClient";
import { Loader2, Copy, Check, Share2, ExternalLink, AlertCircle } from "lucide-react";

const DURACIONES = [
  { label: "4h",  horas: 4 },
  { label: "8h",  horas: 8 },
  { label: "24h", horas: 24 },
  { label: "3d",  horas: 72 },
  { label: "7d",  horas: 168 },
];

export default function PanelCompartir({ unidad, onClose }) {
  const [duracion,     setDuracion]     = useState(8);
  const [generando,    setGenerando]    = useState(false);
  const [linkGenerado, setLinkGenerado] = useState(null);
  const [linkCopiado,  setLinkCopiado]  = useState(false);
  const [errorShare,   setErrorShare]   = useState(null);

  const generarLink = async () => {
    setGenerando(true);
    setErrorShare(null);
    try {
      const token = (crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
      ).replace(/-/g, "");
      const expira = addHours(new Date(), duracion).toISOString();
      const payload = {
        token,
        wialon_unit_id: parseInt(unidad.id, 10),
        wialon_nombre:  unidad.nombre,
        expires_at:     expira,
      };
      const { data, error } = await supabase
        .from("RastreoCompartido")
        .insert(payload)
        .select("token")
        .single();
      if (error) throw error;
      setLinkGenerado(`${window.location.origin}/rastreo/${data.token}`);
    } catch (err) {
      console.error("[RastreoCompartido] error:", err);
      const msg = err?.code === "42P01"
        ? "La tabla RastreoCompartido no existe. Ejecuta el SQL en Supabase."
        : err?.message ?? "Error al generar el enlace";
      setErrorShare(msg);
    } finally {
      setGenerando(false);
    }
  };

  const copiarLink = () => {
    if (!linkGenerado) return;
    navigator.clipboard.writeText(linkGenerado).then(() => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    });
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/10 px-3 py-2.5">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
        Compartir enlace de rastreo
      </p>

      {!linkGenerado ? (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Vigencia del enlace:</p>
          <div className="flex gap-1 mb-3">
            {DURACIONES.map((d) => (
              <button
                key={d.horas}
                onClick={() => setDuracion(d.horas)}
                className={`flex-1 text-xs py-1 rounded border transition-colors ${
                  duracion === d.horas
                    ? "bg-gm-primary/20 text-yellow-700 dark:text-yellow-400 border-gm-primary/40 font-semibold"
                    : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {errorShare && (
            <div className="flex items-start gap-1.5 mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-600 dark:text-red-400 leading-snug">{errorShare}</p>
            </div>
          )}
          <button
            onClick={generarLink}
            disabled={generando}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-gm-primary text-slate-900 hover:bg-yellow-400 transition-colors disabled:opacity-60"
          >
            {generando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
            {generando ? "Generando..." : "Generar enlace"}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-1 font-mono">
              {linkGenerado}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={copiarLink}
              className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
            >
              {linkCopiado
                ? <><Check className="w-3 h-3 text-green-500" /> Copiado</>
                : <><Copy className="w-3 h-3" /> Copiar</>
              }
            </button>
            <a
              href={linkGenerado}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-gm-primary text-slate-900 hover:bg-yellow-400 transition-colors font-semibold"
            >
              <ExternalLink className="w-3 h-3" /> Abrir
            </a>
          </div>
          <button
            onClick={() => { setLinkGenerado(null); setLinkCopiado(false); setErrorShare(null); }}
            className="w-full text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Generar nuevo enlace
          </button>
        </div>
      )}
    </div>
  );
}
