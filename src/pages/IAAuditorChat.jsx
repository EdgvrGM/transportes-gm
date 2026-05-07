import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Send, Loader2, ArrowLeft, Bot, User } from "lucide-react";

// ── Renderizador de Markdown ───────────────────────────────────────────────
function MarkdownMessage({ content }) {
  const parseInline = (text) => {
    // Limpieza de asteriscos huérfanos
    let cleanText = text.replace(/^(\*\*|\*)\s+|\s+(\*\*|\*)$/g, "");
    const parts = cleanText.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return <code key={i} className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
      }
      return part.replace(/\*\*|\*/g, "");
    });
  };

  const lines = content.split("\n");
  const elements = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2">
          {listBuffer.map((item, i) => {
            const isAlert = /⚠️|CRÍTICO|crítico|bajo|fuga/i.test(item);
            const isGood  = /✅|Bueno|bueno|excelente|ahorro/i.test(item);
            return (
              <li key={i} className={`flex items-start gap-2 text-sm px-3 py-2 rounded-xl ${
                isAlert ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300"
                : isGood ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 text-green-800 dark:text-green-300"
                : "bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40"
              }`}>
                <span className="mt-0.5 shrink-0 text-base leading-none">
                  {isAlert ? "🔴" : isGood ? "🟢" : "🔹"}
                </span>
                <span>{parseInline(item)}</span>
              </li>
            );
          })}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (/^---+$/.test(t)) {
      flushList();
      elements.push(<hr key={i} className="my-3 border-border" />);
      return;
    }
    if (/^#{1,3} /.test(t)) {
      flushList();
      const level = t.match(/^(#+)/)[1].length;
      const text = t.replace(/^#+\s*/, "");
      const cls = level === 1 ? "text-base font-black mt-4 mb-1" : "text-sm font-black text-indigo-600 dark:text-indigo-400 mt-3 mb-1 uppercase tracking-wide";
      elements.push(<p key={i} className={cls}>{parseInline(text)}</p>);
      return;
    }
    if (/^[*\-] /.test(t)) {
      listBuffer.push(t.replace(/^[\s*\-]+/, ""));
      return;
    }
    if (t === "") {
      flushList();
      elements.push(<div key={i} className="h-2" />);
      return;
    }
    flushList();
    elements.push(<p key={i} className="text-sm leading-relaxed mb-1">{parseInline(line)}</p>);
  });

  flushList();
  return <div>{elements}</div>;
}

export default function IAAuditorChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const programaId = location.state?.programaId;
  const programaTitulo = location.state?.programaTitulo;

  const [messages, setMessages] = useState([
    { role: "assistant", content: `¡Hola! Soy tu Auditor Logístico IA. Estoy listo para analizar la semana "${programaTitulo || 'seleccionada'}" con todos los datos de consumo registrados. ¿Qué deseas revisar?` }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // Obtener datos completos: programa + consumos reales + catálogos
  const { data: auditData, isLoading: isLoadingData } = useQuery({
    queryKey: ["auditContextFull", programaId],
    enabled: !!programaId,
    queryFn: async () => {
      // 1. Viajes del programa (lo que estaba planeado)
      const { data: viajesRegistrados } = await supabase
        .from("viajes_registrados")
        .select("*")
        .eq("programa_id", programaId);

      // 2. Vista de auditoría (rendimiento calculado)
      const { data: auditorias } = await supabase
        .from("auditoria_viajes_view")
        .select("*")
        .eq("programa_id", programaId);

      // 3. Consumos reales de la tabla Viaje (km, litros, casetas, costo)
      //    Filtramos por las fechas del programa para no traer todo el historial
      const fechas = (viajesRegistrados || []).map(v => v.fecha_viaje).filter(Boolean);
      let viajesConsumo = [];
      if (fechas.length > 0) {
        const fechaMin = fechas.sort()[0];
        const fechaMax = fechas.sort().slice(-1)[0];
        const { data: consumos } = await supabase
          .from("Viaje")
          .select("id, fecha, conductor_nombre, camion_nombre, camion_placas, ruta_ida, ruta_regreso, kilometros_total, litros_combustible, km_por_litro, costo_combustible, casetas_ida, casetas_regreso, tipo_viaje, notas")
          .gte("fecha", `${fechaMin}T00:00:00`)
          .lte("fecha", `${fechaMax}T23:59:59`);
        viajesConsumo = consumos || [];
      }

      // 4. Catálogos para resolver nombres
      const [{ data: conductores }, { data: camiones }] = await Promise.all([
        supabase.from("Conductor").select("id, nombre"),
        supabase.from("Camion").select("id, nombre, placas"),
      ]);

      const getConductorNombre = (id) => conductores?.find(c => String(c.id) === String(id))?.nombre || `ID:${id}`;
      const getCamionNombre = (id) => {
        const c = camiones?.find(c => String(c.id) === String(id));
        return c ? `${c.nombre} (${c.placas})` : `ID:${id}`;
      };

      // 5. Construir el JSON enriquecido para la IA
      const viajesProgramados = (viajesRegistrados || []).map(v => {
        const audit = auditorias?.find(a => a.viaje_registrado_id === v.id);
        
        // CORRECCIÓN: Si existe auditoría (consumo), forzamos el estado a true
        // Esto evita que la IA detecte discrepancias si el registro manual no actualizó el flag.
        const estaRegistrado = v.combustible_registrado || !!audit?.consumo_id;

        return {
          tipo: "PROGRAMADO",
          id: v.id,
          fecha: v.fecha_viaje,
          destino: v.destino,
          conductor: getConductorNombre(v.conductor_id),
          unidad: getCamionNombre(v.camion_id),
          combustible_registrado: estaRegistrado,
          rendimiento_km_l: audit?.rendimiento_real ? Number(audit.rendimiento_real).toFixed(2) : "Sin consumo",
          gasto_casetas: audit?.gasto_casetas || 0,
          costo_total: audit?.costo_total_viaje || 0,
          alerta: audit?.rendimiento_real && audit.rendimiento_real < 2.0 ? "⚠️ Rendimiento bajo" : null,
        };
      });

      const viajesReales = viajesConsumo.map(v => ({
        tipo: "CONSUMO_REAL",
        id: v.id,
        fecha: v.fecha?.split("T")[0],
        conductor: v.conductor_nombre,
        unidad: `${v.camion_nombre} (${v.camion_placas})`,
        ruta: `${v.ruta_ida} → ${v.ruta_regreso || "regreso"}`,
        km_total: v.kilometros_total,
        litros: v.litros_combustible,
        km_por_litro: v.km_por_litro ? Number(v.km_por_litro).toFixed(2) : null,
        costo_combustible: v.costo_combustible,
        casetas_ida: v.casetas_ida,
        casetas_regreso: v.casetas_regreso,
        costo_total: (v.costo_combustible || 0) + (v.casetas_ida || 0) + (v.casetas_regreso || 0),
        tipo_viaje: v.tipo_viaje,
        notas: v.notas,
        alerta: v.km_por_litro && v.km_por_litro < 2.0 ? "⚠️ Rendimiento bajo (<2.0 km/L)" : null,
      }));

      return {
        semana: programaTitulo,
        resumen: {
          total_viajes_programados: viajesProgramados.length,
          total_consumos_registrados: viajesReales.length,
          promedio_rendimiento: viajesReales.length > 0
            ? (viajesReales.reduce((s, v) => s + (parseFloat(v.km_por_litro) || 0), 0) / viajesReales.filter(v => v.km_por_litro).length).toFixed(2)
            : "N/A",
          alertas_rendimiento_bajo: viajesReales.filter(v => v.alerta).length,
        },
        viajes_programados: viajesProgramados,
        consumos_reales: viajesReales,
      };
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text) => {
    if (!text.trim() || !auditData) return;
    
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-logistics", {
        body: { auditData, userQuestion: text }
      });

      if (error) throw error;
      
      setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: "Ocurrió un error al consultar a la IA. Verifica que la Edge Function esté desplegada y configurada correctamente." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const chips = [
    "¿Detectas rendimientos bajos esta semana?",
    "Dame un resumen de costos por conductor.",
    "¿Qué viajes programados no tienen consumo registrado?",
    "Compara lo programado vs lo ejecutado.",
  ];

  if (!programaId) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <Brain className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
        <h2 className="text-xl font-bold mb-2">No hay semana seleccionada</h2>
        <p className="text-muted-foreground mb-4">Debes acceder a esta herramienta desde el Programa de Cargas.</p>
        <Button onClick={() => navigate("/fuelprogramacargas")}>Regresar</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/fuelprogramacargas")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Auditoría IA
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Analizando: {programaTitulo}</p>
          </div>
        </div>

        <Card className="flex flex-col h-[75vh] shadow-xl border-border/50 rounded-[2rem] overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/30 dark:bg-zinc-950/50"
          >
            {isLoadingData && (
              <div className="flex items-center justify-center h-full flex-col gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm font-bold animate-pulse">Recopilando datos de la semana...</p>
              </div>
            )}
            
            {!isLoadingData && messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'ml-auto flex-row-reverse max-w-[80%]' : 'max-w-[92%]'}`}>
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                }`}>
                  {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`rounded-2xl text-sm overflow-hidden ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm px-4 py-3'
                    : 'bg-white dark:bg-card border border-border shadow-sm rounded-tl-sm'
                }`}>
                  {m.role === 'user' ? (
                    <p className="text-sm">{m.content}</p>
                  ) : (
                    <div className="px-4 py-3">
                      <MarkdownMessage content={m.content} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-card border border-border shadow-sm rounded-tl-sm text-sm flex items-center gap-2 text-indigo-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analizando datos con IA...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-card border-t border-border">
            <div className="flex flex-wrap gap-2 mb-3">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip)}
                  disabled={isTyping || isLoadingData}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex items-center gap-2 relative"
            >
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pregúntale a la IA sobre esta semana..."
                className="pr-12 h-12 rounded-xl bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
                disabled={isTyping || isLoadingData}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isTyping || isLoadingData}
                className="absolute right-1.5 h-9 w-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
