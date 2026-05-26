import { useState, useRef, useEffect } from "react";
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
  let tableBuffer = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2">
          {listBuffer.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40">
              <span className="mt-0.5 shrink-0 text-base leading-none text-indigo-500">🔹</span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const rows = tableBuffer.map(line => 
        line.split("|").filter(cell => cell.trim() !== "").map(cell => cell.trim())
      ).filter(row => row.length > 0);

      if (rows.length > 1) {
        elements.push(
          <div key={`table-${elements.length}`} className="my-4 overflow-hidden border border-border rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border">
                <tr>
                  {rows[0].map((header, i) => (
                    <th key={i} className="px-4 py-2.5 font-black text-xs uppercase tracking-wider text-muted-foreground">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(1).filter(row => !row.every(cell => cell.includes("---"))).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 font-medium">{parseInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    
    // Tabla detect
    if (t.startsWith("|") && t.endsWith("|")) {
      flushList();
      tableBuffer.push(t);
      return;
    } else {
      flushTable();
    }

    if (/^---+$/.test(t)) { flushList(); elements.push(<hr key={i} className="my-3 border-border" />); return; }
    if (/^#{1,3} /.test(t)) {
      flushList();
      const level = t.match(/^(#+)/)[1].length;
      const text = t.replace(/^#+\s*/, "");
      const cls = level === 1 ? "text-base font-black mt-4 mb-1" : "text-sm font-black text-indigo-600 dark:text-indigo-400 mt-3 mb-1 uppercase tracking-wide";
      elements.push(<p key={i} className={cls}>{parseInline(text)}</p>);
      return;
    }
    if (/^[*-] /.test(t)) { listBuffer.push(t.replace(/^[\s*-]+/, "")); return; }
    if (t === "") { flushList(); elements.push(<div key={i} className="h-2" />); return; }
    
    flushList();
    elements.push(<p key={i} className="text-sm leading-relaxed mb-1">{parseInline(line)}</p>);
  });

  flushList();
  flushTable();
  return <div>{elements}</div>;
}

// ── Chips de sugerencia ──────────────────────────────────────────────────────
const CHIPS = [
  { label: "¿Qué viajes están pendientes de entregar remisión?", icon: "📄" },
  { label: "Muéstrame los viajes con rendimiento crítico.", icon: "⚠️" },
  { label: "¿Qué viajes están registrados pero sin diesel cargado?", icon: "⛽" },
  { label: "Resume los costos de combustible y casetas.", icon: "📊" },
  { label: "¿Qué conductor tiene mejor rendimiento promedio?", icon: "🏆" },
  { label: "¿Qué unidad gasta más en casetas?", icon: "🚛" },
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
      // Calcular rango de 30 días para comparativas
      const fechaLimite30 = new Date();
      fechaLimite30.setDate(fechaLimite30.getDate() - 30);
      const fechaISO30 = fechaLimite30.toISOString().split('T')[0];

      // Obtener viajes reales (consumos registrados)
      let viajesQuery = supabase
        .from("Viaje")
        .select("*")
        .gte("fecha", FECHA_LIMITE_ARCHIVO)
        .order("fecha", { ascending: false });

      // Si es "todo el historial", limitamos a los últimos 30 días para no saturar tokens
      if (semanaSeleccionada === "all") {
        viajesQuery = viajesQuery.gte("fecha", fechaISO30);
      }

      // Si hay semana seleccionada, filtrar por fechas específicas
      let programa = null;
      if (semanaSeleccionada !== "all") {
        programa = semanas.find(s => String(s.id) === String(semanaSeleccionada));
        if (programa) {
          viajesQuery = viajesQuery
            .gte("fecha", programa.fecha_inicio)
            .lte("fecha", programa.fecha_fin);
        }
      }

      const { data: viajes } = await viajesQuery;

      const { data: conductores } = await supabase.from("Conductor").select("id, nombre");
      const { data: camiones } = await supabase.from("Camion").select("id, nombre, placas");
      const { data: clientes } = await supabase.from("Cliente").select("id, nombre");
      const { data: remolques } = await supabase.from("Remolque").select("id, placas");

      // Filtrar planeación por el mismo periodo
      let planeacionQuery = supabase
        .from("viajes_registrados")
        .select("*")
        .gte("fecha_viaje", FECHA_LIMITE_ARCHIVO);

      if (semanaSeleccionada === "all") {
        planeacionQuery = planeacionQuery.gte("fecha_viaje", fechaISO30);
      } else if (programa) {
        planeacionQuery = planeacionQuery
          .gte("fecha_viaje", programa.fecha_inicio)
          .lte("fecha_viaje", programa.fecha_fin);
      }

      const { data: vRegistrados } = await planeacionQuery;

      // Evidencias (remisiones) ligadas a viajes_registrados
      const vrIds = (vRegistrados || []).map(v => v.id);
      let evidencias = [];
      if (vrIds.length > 0) {
        const { data: evData } = await supabase
          .from("Evidencia")
          .select("viaje_id, num_remision, entregada, fecha_entrega")
          .in("viaje_id", vrIds);
        evidencias = evData || [];
      }

      const viajesData = (viajes || []).map(v => {
        const fechaV = v.fecha?.split("T")[0];
        
        // Match con viajes_registrados para sacar el nombre del cliente
        let reg = null;
        
        // 1. Intento por ID directo (vínculo oficial): prioriza viaje_registrado_id (nuevo) sobre viaje_id (legacy)
        const fkId = v.viaje_registrado_id ?? v.viaje_id;
        if (fkId) {
          reg = vRegistrados?.find(r => String(r.id) === String(fkId));
        }

        // 2. Fallback por Fecha/Conductor/Camión utilizando IDs directos
        if (!reg) {
          reg = vRegistrados?.find(r => {
            return r.fecha_viaje === fechaV && 
                   String(r.conductor_id) === String(v.conductor_id) && 
                   String(r.camion_id) === String(v.camion_id);
          });
        }

        const clienteObj = reg ? clientes?.find(c => String(c.id) === String(reg.cliente_id)) : null;
        const litrosVal = parseFloat(v.litros_combustible || 0);
        const rutaIda = v.ruta_ida || v.ruta || "";
        const rutaTexto = v.ruta_regreso ? `${rutaIda} → ${v.ruta_regreso}` : rutaIda;

        return {
          _vrId: v.viaje_registrado_id ?? v.viaje_id ?? null,
          fecha: fechaV,
          cliente: clienteObj?.nombre || "N/A",
          conductor: v.conductor_nombre,
          unidad: `${v.camion_nombre} (${v.camion_placas})`,
          ruta: rutaTexto,
          km: v.kilometros_total,
          litros: litrosVal,
          estado_combustible: litrosVal > 0 ? "Registrado" : "PENDIENTE (Registro Parcial)",
          km_por_litro: v.km_por_litro ? Number(v.km_por_litro).toFixed(2) : null,
          costo_combustible: v.costo_combustible,
          casetas: (v.casetas_ida || 0) + (v.casetas_regreso || 0),
          costo_total: (v.costo_combustible || 0) + (v.casetas_ida || 0) + (v.casetas_regreso || 0),
          tipo_viaje: v.tipo_viaje,
          notas: v.notas,
          alerta: v.km_por_litro && v.km_por_litro < 2.0 ? "Rendimiento crítico" : null,
        };
      });

      // Datos de Planeación (lo que se programó)
      const planeacionData = (vRegistrados || []).map(pr => {
        const cond = conductores?.find(c => String(c.id) === String(pr.conductor_id));
        const cam = camiones?.find(c => String(c.id) === String(pr.camion_id));
        const cli = clientes?.find(c => String(c.id) === String(pr.cliente_id));
        const rem1 = remolques?.find(r => String(r.id) === String(pr.remolque_id));
        const rem2 = remolques?.find(r => String(r.id) === String(pr.remolque2_id));

        // Vínculo directo por FK con la ejecución (no por fecha)
        const viajeEjecutado = viajesData.find(v => v._vrId != null && String(v._vrId) === String(pr.id));

        let estado_registro;
        if (!viajeEjecutado) {
          estado_registro = "No iniciado (Falta Registro)";
        } else if (viajeEjecutado.litros > 0) {
          estado_registro = "Completado";
        } else {
          estado_registro = "Parcial (Falta Diesel)";
        }

        // Evidencias / remisiones de este viaje
        const evsViaje = evidencias.filter(e => String(e.viaje_id) === String(pr.id));
        const evEntregadas = evsViaje.filter(e => e.entregada).length;

        return {
          fecha: pr.fecha_viaje,
          cliente: cli?.nombre || "N/A",
          conductor: cond?.nombre || "N/A",
          unidad: cam ? `${cam.nombre} (${cam.placas})` : "N/A",
          remolques: [rem1?.placas, rem2?.placas].filter(Boolean).join(" / ") || "Sencillo",
          destino: pr.destino,
          modalidad: pr.modalidad,
          estado_registro,
          combustible_registrado: pr.combustible_registrado || false,
          remisiones: {
            total: evsViaje.length,
            entregadas: evEntregadas,
            pendientes: evsViaje.length - evEntregadas,
            estado: evsViaje.length === 0
              ? "Sin remisiones registradas"
              : evEntregadas === evsViaje.length
                ? "Todas entregadas"
                : evEntregadas === 0
                  ? "Todas pendientes"
                  : `${evEntregadas}/${evsViaje.length} entregadas`,
          },
        };
      });

      // Resumen calculado
      const conRendimiento = viajesData.filter(v => v.km_por_litro);
      const promedio = conRendimiento.length > 0
        ? (conRendimiento.reduce((s, v) => s + parseFloat(v.km_por_litro), 0) / conRendimiento.length).toFixed(2)
        : "N/A";

      // Totales de evidencias en el periodo
      const totalRemisiones = planeacionData.reduce((s, p) => s + p.remisiones.total, 0);
      const remisionesEntregadas = planeacionData.reduce((s, p) => s + p.remisiones.entregadas, 0);
      const viajesSinRemision = planeacionData.filter(p => p.remisiones.total === 0).length;

      return {
        periodo: programa ? `Semana: ${programa.titulo}` : "Últimos 30 días (Historial)",
        resumen: {
          total_viajes_ejecutados: viajesData.length,
          total_viajes_planeados: planeacionData.length,
          viajes_pendientes_de_registro: planeacionData.filter(p => p.estado_registro !== "Completado").length,
          lista_pendientes: planeacionData.filter(p => p.estado_registro !== "Completado"),
          promedio_rendimiento_km_l: promedio,
          alertas_criticas_en_ejecucion: viajesData.filter(v => v.alerta).length,
          costo_total_ejecutado: viajesData.reduce((s, v) => s + (v.costo_total || 0), 0).toFixed(2),
          clientes_activos: [...new Set(viajesData.map(v => v.cliente))].filter(c => c !== "N/A"),
          remisiones: {
            total: totalRemisiones,
            entregadas: remisionesEntregadas,
            pendientes: totalRemisiones - remisionesEntregadas,
            viajes_sin_remision: viajesSinRemision,
          },
        },
        ejecucion: viajesData,
        planeacion: planeacionData,
      };
    },
    enabled: semanas.length > 0 || semanaSeleccionada === "all",
  });

  // Mensaje de bienvenida dinámico
  useEffect(() => {
    if (contexto && messages.length === 0) {
      const r = contexto.resumen;
      const rendimientoTexto = r.promedio_rendimiento_km_l === "N/A"
        ? "Aún no hay viajes con rendimiento calculado en este periodo."
        : `El rendimiento promedio es **${r.promedio_rendimiento_km_l} km/L**.`;
      const remisionesTexto = r.remisiones.total > 0
        ? ` ${r.remisiones.entregadas}/${r.remisiones.total} remisiones entregadas.`
        : "";

      setMessages([{
        role: "assistant",
        content: `¡Hola! Soy el **Experto en Logística Transportes GM**. Tengo acceso a la planeación (${r.total_viajes_planeados} viajes) y ejecución (${r.total_viajes_ejecutados} consumos) de este periodo.\n\n${rendimientoTexto} Quedan **${r.viajes_pendientes_de_registro} viajes pendientes** por registrar combustible.${remisionesTexto}\n\n¿Qué te gustaría analizar hoy?`
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
    } catch (_e) {
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
