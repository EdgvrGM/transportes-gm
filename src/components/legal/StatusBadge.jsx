import { AlertTriangle, CheckCircle2, Clock, FileX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getEstadoVencimiento, getBadgeClasses, getBadgeLabel } from "./vencimientos";

const ICONO_ESTADO = {
  vencido: AlertTriangle,
  por_vencer: Clock,
  vigente: CheckCircle2,
  sin_registro: FileX,
};

export default function StatusBadge({ fechaStr, className = "" }) {
  const estado = getEstadoVencimiento(fechaStr);
  const Icono = ICONO_ESTADO[estado];
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getBadgeClasses(estado)} ${className}`}
    >
      <Icono className="w-3 h-3" />
      {getBadgeLabel(estado, fechaStr)}
    </Badge>
  );
}
