import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Pencil, Trash2 } from "lucide-react";
import { formatearFecha } from "@/lib/fechas";
import { formatCurrency } from "@/lib/formato";
import { getCategoria } from "./costosConfig";
import { useEliminarCosto } from "./useCostos";

// `nombreUnidad(costo)` opcional: muestra la unidad en cada fila (útil cuando
// la lista mezcla varias unidades).
export default function ListaGastos({ gastos, onEditar, nombreUnidad, vacio = "Sin gastos registrados." }) {
  const eliminar = useEliminarCosto();
  const [porBorrar, setPorBorrar] = useState(null);

  if (!gastos.length) {
    return <div className="text-sm text-muted-foreground text-center py-6">{vacio}</div>;
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {gastos.map((g) => {
          const cat = getCategoria(g.categoria);
          const Icon = cat.icon;
          return (
            <li key={g.id} className="flex items-start gap-3 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4" style={{ color: cat.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{g.concepto}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {formatearFecha(g.fecha)} · {cat.label}
                  {nombreUnidad ? ` · ${nombreUnidad(g)}` : ""}
                  {g.proveedor ? ` · ${g.proveedor}` : ""}
                </div>
                {g.notas && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{g.notas}</div>}
              </div>
              <div className="text-sm font-bold text-foreground tabular-nums shrink-0">${formatCurrency(g.monto)}</div>
              <div className="flex items-center shrink-0 -mr-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditar(g)} aria-label="Editar gasto" title="Editar">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setPorBorrar(g)} aria-label="Eliminar gasto" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog open={Boolean(porBorrar)} onOpenChange={(o) => !o && setPorBorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              {porBorrar?.concepto} · ${formatCurrency(porBorrar?.monto)}. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                eliminar.mutate(porBorrar);
                setPorBorrar(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
