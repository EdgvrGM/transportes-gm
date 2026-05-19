import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { FileText, Download, Loader2, BarChart3, Clock, AlertTriangle, Truck } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const today     = new Date().toISOString().split("T")[0];
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

function fmtDuracion(minutos) {
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function generarDatosMock(unidades, from, to) {
  const dias = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));
  return unidades.map((u, i) => {
    const seed = (u.wialon_unit_id % 10) + i;
    const kmDia = 150 + seed * 40;
    const kmTotal = Math.round(kmDia * dias * (0.8 + Math.random() * 0.4));
    const minMovimiento = Math.round(dias * (5 * 60 + seed * 20));
    const minDetenido   = Math.round(dias * (3 * 60 - seed * 10));
    const alertasCount  = Math.floor(Math.random() * 5);
    const nombre = u.Camion ? u.Camion.nombre : u.wialon_nombre;
    const placas = u.Camion?.placas || "—";
    return {
      wialon_unit_id: u.wialon_unit_id,
      nombre,
      placas,
      kmTotal,
      minMovimiento,
      minDetenido,
      pctMovimiento: Math.round((minMovimiento / (minMovimiento + minDetenido)) * 100),
      velocidadMax: 80 + seed * 5,
      velocidadProm: 55 + seed * 3,
      alertasCount,
    };
  });
}

const REPORTES = [
  {
    id: "kilometraje",
    label: "Kilometraje",
    icon: BarChart3,
    desc: "Kilómetros recorridos por unidad en el periodo seleccionado",
  },
  {
    id: "tiempos",
    label: "Tiempos",
    icon: Clock,
    desc: "Tiempo en movimiento vs detenido por unidad",
  },
  {
    id: "alertas",
    label: "Alertas",
    icon: AlertTriangle,
    desc: "Resumen de alertas generadas por unidad",
  },
];

export default function ReportesGPS() {
  const [tipoReporte, setTipoReporte] = useState("kilometraje");
  const [from, setFrom] = useState(lastMonth);
  const [to,   setTo]   = useState(today);
  const [generando, setGenerando] = useState(false);

  const { data: unidades = [], isLoading: cargandoUnidades } = useQuery({
    queryKey: ["unidades-gps-reportes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("UnidadGPS")
        .select("wialon_unit_id, wialon_nombre, Camion(nombre, placas)")
        .eq("activo", true);
      if (error) throw error;
      return data || [];
    },
  });

  const datos = generarDatosMock(unidades, from, to);

  const exportarPDF = useCallback(async () => {
    setGenerando(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const amarillo = [234, 179, 8];
      const oscuro   = [15, 15, 15];
      const gris     = [100, 116, 139];

      doc.setFillColor(...amarillo);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(...oscuro);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Transportes GM", 14, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Reporte de ${REPORTES.find((r) => r.id === tipoReporte)?.label}`, 14, 20);

      doc.setFontSize(8);
      doc.setTextColor(...oscuro);
      doc.text(`Periodo: ${fmtFecha(from)} — ${fmtFecha(to)}`, 196, 12, { align: "right" });
      doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, 196, 18, { align: "right" });

      doc.setDrawColor(...amarillo);
      doc.setLineWidth(0.5);
      doc.line(14, 32, 196, 32);

      if (tipoReporte === "kilometraje") {
        autoTable(doc, {
          startY: 36,
          head: [["Unidad", "Placas", "Km totales", "Vel. máx", "Vel. prom"]],
          body: datos.map((d) => [
            d.nombre,
            d.placas,
            `${d.kmTotal.toLocaleString("es-MX")} km`,
            `${d.velocidadMax} km/h`,
            `${d.velocidadProm} km/h`,
          ]),
          headStyles: { fillColor: amarillo, textColor: oscuro, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: oscuro },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          columnStyles: {
            0: { cellWidth: 60 },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
        });

        const totalKm = datos.reduce((a, d) => a + d.kmTotal, 0);
        const finalY  = doc.lastAutoTable.finalY + 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...oscuro);
        doc.text(`Total flota: ${totalKm.toLocaleString("es-MX")} km`, 196, finalY, { align: "right" });
      }

      if (tipoReporte === "tiempos") {
        autoTable(doc, {
          startY: 36,
          head: [["Unidad", "Placas", "En movimiento", "Detenido", "% Activo"]],
          body: datos.map((d) => [
            d.nombre,
            d.placas,
            fmtDuracion(d.minMovimiento),
            fmtDuracion(d.minDetenido),
            `${d.pctMovimiento}%`,
          ]),
          headStyles: { fillColor: amarillo, textColor: oscuro, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: oscuro },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          columnStyles: {
            0: { cellWidth: 60 },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
        });
      }

      if (tipoReporte === "alertas") {
        autoTable(doc, {
          startY: 36,
          head: [["Unidad", "Placas", "Total alertas", "Estado"]],
          body: datos.map((d) => [
            d.nombre,
            d.placas,
            d.alertasCount,
            d.alertasCount === 0 ? "Sin incidencias" : d.alertasCount < 3 ? "Normal" : "Atención requerida",
          ]),
          headStyles: { fillColor: amarillo, textColor: oscuro, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: oscuro },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          columnStyles: {
            0: { cellWidth: 60 },
            2: { halign: "center" },
          },
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 3) {
              const val = data.cell.raw;
              if (val === "Atención requerida") {
                doc.setTextColor(220, 38, 38);
              } else if (val === "Normal") {
                doc.setTextColor(234, 179, 8);
              } else {
                doc.setTextColor(34, 197, 94);
              }
            }
          },
        });
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(...gris);
        doc.text(
          `Transportes GM · Rastreo GPS · Página ${i} de ${pageCount}`,
          105, 290, { align: "center" }
        );
      }

      const nombre = REPORTES.find((r) => r.id === tipoReporte)?.label ?? "Reporte";
      doc.save(`TransportesGM_${nombre}_${from}_${to}.pdf`);
    } finally {
      setGenerando(false);
    }
  }, [tipoReporte, from, to, datos]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controles */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Tipo de reporte */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Tipo de reporte
            </label>
            <div className="flex gap-2 flex-wrap">
              {REPORTES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => setTipoReporte(r.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      tipoReporte === r.id
                        ? "bg-yellow-400 border-yellow-400 text-slate-900"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Desde</label>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hasta</label>
              <input
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => setTo(e.target.value)}
                className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <button
              onClick={exportarPDF}
              disabled={generando || cargandoUnidades || datos.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-200 disabled:text-slate-400 text-slate-900 text-sm font-semibold transition-colors"
            >
              {generando
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Exportar PDF
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          {REPORTES.find((r) => r.id === tipoReporte)?.desc}
          {" · "}<span className="text-yellow-600 font-medium">Datos simulados</span>
          {" — conectar Wialon para datos reales"}
        </p>
      </div>

      {/* Tabla de preview */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Vista previa · {REPORTES.find((r) => r.id === tipoReporte)?.label}
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {fmtFecha(from)} — {fmtFecha(to)} · {datos.length} unidades
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          {cargandoUnidades ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Cargando datos...
            </div>
          ) : datos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Truck className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">No hay unidades vinculadas</p>
              <p className="text-xs mt-1">Configura las unidades primero desde el botón "Configurar"</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                {tipoReporte === "kilometraje" && (
                  <tr>
                    {["Unidad", "Placas", "Km totales", "Vel. máx", "Vel. prom"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                )}
                {tipoReporte === "tiempos" && (
                  <tr>
                    {["Unidad", "Placas", "En movimiento", "Detenido", "% Activo"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                )}
                {tipoReporte === "alertas" && (
                  <tr>
                    {["Unidad", "Placas", "Total alertas", "Estado"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {datos.map((d) => (
                  <tr key={d.wialon_unit_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {tipoReporte === "kilometraje" && (
                      <>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.nombre}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.placas}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{d.kmTotal.toLocaleString("es-MX")} km</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{d.velocidadMax} km/h</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{d.velocidadProm} km/h</td>
                      </>
                    )}
                    {tipoReporte === "tiempos" && (
                      <>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.nombre}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.placas}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-green-500 h-1.5 rounded-full"
                                style={{ width: `${d.pctMovimiento}%` }}
                              />
                            </div>
                            <span className="text-slate-700 dark:text-slate-300 text-xs w-16">{fmtDuracion(d.minMovimiento)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{fmtDuracion(d.minDetenido)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${d.pctMovimiento >= 60 ? "text-green-600" : "text-amber-600"}`}>
                            {d.pctMovimiento}%
                          </span>
                        </td>
                      </>
                    )}
                    {tipoReporte === "alertas" && (
                      <>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.nombre}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.placas}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            d.alertasCount === 0 ? "bg-green-100 text-green-700" :
                            d.alertasCount < 3   ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {d.alertasCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${
                            d.alertasCount === 0 ? "text-green-600" :
                            d.alertasCount < 3   ? "text-yellow-600" :
                            "text-red-600"
                          }`}>
                            {d.alertasCount === 0 ? "Sin incidencias" :
                             d.alertasCount < 3   ? "Normal" :
                             "Atención requerida"}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              {tipoReporte === "kilometraje" && (
                <tfoot className="bg-yellow-50 dark:bg-yellow-900/10 border-t-2 border-yellow-200 dark:border-yellow-800">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200" colSpan={2}>
                      Total flota
                    </td>
                    <td className="px-4 py-3 font-bold text-yellow-700 dark:text-yellow-400">
                      {datos.reduce((a, d) => a + d.kmTotal, 0).toLocaleString("es-MX")} km
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
