import { useState } from "react";
import { Receipt } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TablaSemanal from "@/components/costos/TablaSemanal";
import DetalleUnidad from "@/components/costos/DetalleUnidad";
import CapturaCostoDialog from "@/components/costos/CapturaCostoDialog";

export default function CostosUnidad() {
  const [tab, setTab] = useState("semana");
  // prefill vive en estado (referencia estable) porque el dialog se resetea al cambiar.
  const [captura, setCaptura] = useState({ open: false, costo: null, prefill: null });

  const nuevo = (prefill = {}) => setCaptura({ open: true, costo: null, prefill });
  const editar = (costo) => setCaptura({ open: true, costo, prefill: null });

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gm-primary/10 text-yellow-600">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Costos por Unidad</h1>
            <p className="text-sm text-muted-foreground">Llantas, reparaciones, refacciones, aceites y más — semana con semana</p>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-2">
            <TabsTrigger value="semana">Por semana</TabsTrigger>
            <TabsTrigger value="unidad">Por unidad</TabsTrigger>
          </TabsList>
          <TabsContent value="semana">
            <TablaSemanal onEditar={editar} onNuevo={nuevo} />
          </TabsContent>
          <TabsContent value="unidad">
            <DetalleUnidad onEditar={editar} onNuevo={nuevo} />
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
