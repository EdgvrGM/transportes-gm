import { useState } from "react";
import { Receipt } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TIPOS_UNIDAD } from "@/components/costos/costosConfig";
import TablaSemanal from "@/components/costos/TablaSemanal";
import DetalleUnidad from "@/components/costos/DetalleUnidad";
import CapturaCostoDialog from "@/components/costos/CapturaCostoDialog";

export default function CostosUnidad() {
  const [tipo, setTipo] = useState("camion");
  const [tab, setTab] = useState("semana");
  // prefill vive en estado (referencia estable) porque el dialog se resetea al cambiar.
  const [captura, setCaptura] = useState({ open: false, costo: null, prefill: null });

  const nuevo = (prefill = { tipo }) => setCaptura({ open: true, costo: null, prefill });
  const editar = (costo) => setCaptura({ open: true, costo, prefill: null });

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-5">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gm-primary/10 text-yellow-600">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Costos por Unidad</h1>
              <p className="text-sm text-muted-foreground">Llantas, reparaciones, refacciones, rescates y más — semana con semana</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted self-start md:self-auto">
            {Object.entries(TIPOS_UNIDAD).map(([key, t]) => (
              <button
                key={key}
                onClick={() => setTipo(key)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${
                  tipo === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-2">
            <TabsTrigger value="semana">Por semana</TabsTrigger>
            <TabsTrigger value="unidad">Por unidad</TabsTrigger>
          </TabsList>
          <TabsContent value="semana">
            <TablaSemanal tipo={tipo} onEditar={editar} onNuevo={nuevo} />
          </TabsContent>
          <TabsContent value="unidad">
            <DetalleUnidad tipo={tipo} onEditar={editar} onNuevo={nuevo} />
          </TabsContent>
        </Tabs>
      </div>

      <CapturaCostoDialog
        open={captura.open}
        onOpenChange={(open) => setCaptura((c) => ({ ...c, open }))}
        costo={captura.costo}
        prefill={captura.prefill}
      />
    </div>
  );
}
