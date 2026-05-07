import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sparkles, Bot, User, Database, ChevronDown } from "lucide-react";

// ── Renderizador de Markdown ──────────────────────────────────────────────
const FECHA_LIMITE_ARCHIVO = '2026-04-24';

function MarkdownMessage({ content }) {
  const parseInline = (text) => {
    let cleanText = text.replace(/^(\*\*|\*)\s+|\s+(\*\*|\*)$/g, "");
    const parts = cleanText.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
        return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
        return <code key={i} className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
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
            const isGood = /✅|Bueno|bueno|excelente|ahorro/i.test(item);
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
    if (/^---+$/.test(t)) { flushList(); elements.push(<hr key={i} className="my-3 border-border" />); return; }
    if (/^#{1,3} /.test(t)) {
      flushList();
      const level = t.match(/^(#+)/)[1].length;
      const text = t.replace(/^#+\s*/, "");
      const cls = level === 1 ? "text-base font-black mt-4 mb-1" : "text-sm font-black text-indigo-600 dark:text-indigo-400 mt-3 mb-1 uppercase tracking-wide";
      elements.push(<p key={i} className={cls}>{parseInline(text)}</p>);
      return;
    }
    if (/^[*\-] /.test(t)) { listBuffer.push(t.replace(/^[\s*\-]+/, "")); return; }
    if (t === "") { flushList(); elements.push(<div key={i} className="h-2" />); return; }
    flushList();
    elements.push(<p key={i} className="text-sm leading-relaxed mb-1">{parseInline(line)}</p>);
  });

  flushList();
  return <div>{elements}</div>;
}

// ── Chips de sugerencia ──────────────────────────────────────────────────────
const CHIPS = [
  { label: "¿Cuál conductor tiene mejor rendimiento?", icon: "🏆" },
  { label: "Muéstrame los viajes con rendimiento crítico.", icon: "⚠️" },
  { label: "Resume los costos de esta semana.", icon: "📊" },
  { label: "¿Qué unidad consume más combustible?", icon: "🚛" },
  { label: "¿Hay viajes sin combustible registrado?", icon: "🔍" },
  { label: "Compara el rendimiento de los conductores.", icon: "📈" },
];

export default function ExpertoLogistica() {
  const scrollRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState("all");
  const [showSemanas, setShowSemanas] = useState(false);

  // Cargar todas las semanas disponibles
  const { data: semanas = [] } = useQuery({
    queryKey: ["programas-experto"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ProgramaCargas")
        .select("id, titulo, fecha_inicio, fecha_fin")
        .gte("fecha_inicio", FECHA_LIMITE_ARCHIVO)
        .order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  // Cargar contexto completo del sistema o de la semana seleccionada
  const { data: contexto, isLoading: cargandoContexto } = useQuery({
    queryKey: ["experto-contexto", semanaSeleccionada],
    queryFn: async () => {
      // Obtener viajes reales (consumos registrados)
      let viajesQuery = supabase
        .from("Viaje")
        .select("id, fecha, conductor_nombre, camion_nombre, camion_placas, ruta_ida, ruta_regreso, kilometros_total, litros_combustible, km_por_litro, costo_combustible, casetas_ida, casetas_regreso, tipo_viaje, notas")
        .gte("fecha", `${FECHA_LIMITE_ARCHIVO}T00:00:00`)
        .order("fecha", { ascending: false })
        .limit(100);

      // Si hay semana seleccionada, filtrar por fechas
      let programa = null;
      if (semanaSeleccionada !== "all") {
        programa = semanas.find(s => String(s.id) === String(semanaSeleccionada));
        if (programa) {
          viajesQuery = viajesQuery
            .gte("fecha", `${programa.fecha_inicio}T00:00:00`)
            .lte("fecha", `${programa.fecha_fin}T23:59:59`);
        }
      }

      const { data: viajes } = await viajesQuery;

      // Estadísticas globales de conductores
      const { data: conductores } = await supabase.from("Conductor").select("id, nombre");
      const { data: camiones } = await supabase.from("Camion").select("id, nombre, placas");

      const viajesData = (viajes || []).map(v => ({
        fecha: v.fecha?.split("T")[0],
        conductor: v.conductor_nombre,
        unidad: `${v.camion_nombre} (${v.camion_placas})`,
        ruta: `${v.ruta_ida} → ${v.ruta_regreso || ""}`,
        km: v.kilometros_total,
        litros: v.litros_combustible,
        km_por_litro: v.km_por_litro ? Number(v.km_por_litro).toFixed(2) : null,
        costo_combustible: v.costo_combustible,
        casetas: (v.casetas_ida || 0) + (v.casetas_regreso || 0),
        costo_total: (v.costo_combustible || 0) + (v.casetas_ida || 0) + (v.casetas_regreso || 0),
        tipo_viaje: v.tipo_viaje,
        notas: v.notas,
        alerta: v.km_por_litro && v.km_por_litro < 2.0 ? "Rendimiento crítico" : null,
      }));

      // Resumen calculado
      const conRendimiento = viajesData.filter(v => v.km_por_litro);
      const promedio = conRendimiento.length > 0
        ? (conRendimiento.reduce((s, v) => s + parseFloat(v.km_por_litro), 0) / conRendimiento.length).toFixed(2)
        : "N/A";

      return {
        periodo: programa ? `Semana: ${programa.titulo}` : "Todo el historial",
        resumen: {
          total_viajes: viajesData.length,
          promedio_rendimiento_km_l: promedio,
          alertas_criticas: viajesData.filter(v => v.alerta).length,
          costo_total_flota: viajesData.reduce((s, v) => s + (v.costo_total || 0), 0).toFixed(2),
        },
        viajes: viajesData,
      };
    },
    enabled: semanas.length > 0 || semanaSeleccionada === "all",
  });

  // Mensaje de bienvenida dinámico
  useEffect(() => {
    if (contexto && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `¡Hola! Soy el **Experto en Logística Transportes GM**. Tengo acceso a **${contexto.resumen.total_viajes} viajes** registrados (${contexto.periodo}).\n\nEl rendimiento promedio de la flota es **${contexto.resumen.promedio_rendimiento_km_l} km/L** y hay **${contexto.resumen.alertas_criticas} alertas críticas** activas.\n\n¿Qué te gustaría analizar hoy?`
      }]);
    }
  }, [contexto]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text) => {
    const msg = text || input;
    if (!msg.trim() || !contexto || isTyping) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setIsTyping(true);

    try {
      const now = new Date();
      const { data, error } = await supabase.functions.invoke("analyze-logistics", {
        body: { 
          auditData: contexto, 
          userQuestion: msg,
          fechaActual: now.toISOString().split('T')[0],
          diaSemana: now.toLocaleDateString('es-MX', { weekday: 'long' })
        },
      });
      if (error) throw error;
      setMessages(prev => [...prev, { role: "assistant", content: data.text || "Sin respuesta." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Ocurrió un error al consultar al experto. Por favor intenta de nuevo." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const semanaLabel = semanaSeleccionada === "all"
    ? "Todo el historial"
    : semanas.find(s => String(s.id) === semanaSeleccionada)?.titulo || "Semana";

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-zinc-950 overflow-hidden">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-base text-foreground leading-none">Experto en Logística</h1>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5 leading-none">Transportes GM · IA Analítica</p>
            </div>
          </div>

          {/* Selector de semana */}
          <div className="relative">
            <button
              onClick={() => setShowSemanas(!showSemanas)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border text-sm font-medium text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Database className="w-4 h-4 text-violet-500" />
              <span className="max-w-[160px] truncate">{semanaLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSemanas ? "rotate-180" : ""}`} />
            </button>
            {showSemanas && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-1.5">
                  <button
                    onClick={() => { setSemanaSeleccionada("all"); setShowSemanas(false); setMessages([]); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${semanaSeleccionada === "all" ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    🗂️ Todo el historial
                  </button>
                  {semanas.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSemanaSeleccionada(String(s.id)); setShowSemanas(false); setMessages([]); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${String(semanaSeleccionada) === String(s.id) ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                    >
                      <div className="font-semibold">{s.titulo}</div>
                      <div className="text-[11px] text-muted-foreground">{s.fecha_inicio} → {s.fecha_fin}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CHAT AREA ──────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {cargandoContexto && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              <p className="text-sm font-bold animate-pulse">Cargando datos de la flota...</p>
            </div>
          )}

          {/* Chips de sugerencia (solo si no hay mensajes del usuario aún) */}
          {!cargandoContexto && messages.length <= 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {CHIPS.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(chip.label)}
                  disabled={isTyping || cargandoContexto}
                  className="flex items-center gap-2.5 text-left px-4 py-3 rounded-2xl bg-white dark:bg-card border border-border hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all duration-200 text-sm font-medium text-foreground group disabled:opacity-50"
                >
                  <span className="text-lg shrink-0">{chip.icon}</span>
                  <span className="group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors leading-snug">{chip.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Mensajes */}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse max-w-[80%] ml-auto" : "max-w-[90%]"}`}>
              <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/20"
              }`}>
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`rounded-2xl text-sm overflow-hidden ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm px-4 py-3"
                  : "bg-white dark:bg-card border border-border shadow-sm rounded-tl-sm px-4 py-3"
              }`}>
                {m.role === "user"
                  ? <p>{m.content}</p>
                  : <MarkdownMessage content={m.content} />
                }
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3 max-w-[90%]">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-card border border-border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-violet-600 dark:text-violet-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Analizando datos...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── INPUT AREA ─────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-card border-t border-border px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-violet-400 transition-all"
          >
            <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pregunta sobre cualquier semana, conductor o unidad..."
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 text-sm placeholder:text-muted-foreground/60"
              disabled={isTyping || cargandoContexto}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isTyping || cargandoContexto}
              className="h-8 w-8 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-sm disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
          <p className="text-center text-[10px] text-muted-foreground/50 mt-2 font-medium">
            Experto en Logística Transportes GM · Powered by Gemini 2.5
          </p>
        </div>
      </div>
    </div>
  );
}
