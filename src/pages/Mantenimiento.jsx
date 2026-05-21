import { useState } from "react";
import { Wrench } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DashboardMantenimiento from "@/components/mantenimiento/DashboardMantenimiento";
import OrdenesTrabajoTab from "@/components/mantenimiento/OrdenesTrabajoTab";
import CatalogoServicios from "@/components/mantenimiento/CatalogoServicios";

export default function Mantenimiento() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="w-6 h-6 text-yellow-500" />
        <h1 className="text-2xl font-bold">Mantenimiento</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ordenes">Órdenes de Trabajo</TabsTrigger>
          <TabsTrigger value="catalogo">Catálogo de Servicios</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardMantenimiento onVerOrdenes={() => setActiveTab("ordenes")} />
        </TabsContent>

        <TabsContent value="ordenes">
          <OrdenesTrabajoTab />
        </TabsContent>

        <TabsContent value="catalogo">
          <CatalogoServicios />
        </TabsContent>
      </Tabs>
    </div>
  );
}
