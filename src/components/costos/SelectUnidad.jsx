import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { etiquetaUnidad } from "./costosConfig";

// Remolques agrupados por tipo (Caja Seca, Chasis…) y luego por placas; el
// orden ya viene de useUnidades. Camiones van en lista simple.
export default function SelectUnidad({ tipo, unidades, value, onChange, placeholder, className, disabled }) {
  const grupos = [];
  if (tipo === "remolque") {
    for (const u of unidades) {
      const nombre = u.tipo || "Sin tipo";
      const g = grupos.at(-1);
      if (g?.nombre === nombre) g.items.push(u);
      else grupos.push({ nombre, items: [u] });
    }
  }

  const item = (u) => (
    <SelectItem key={u.id} value={String(u.id)}>
      {etiquetaUnidad(tipo, u)}
    </SelectItem>
  );

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {tipo === "remolque"
          ? grupos.map((g) => (
              <SelectGroup key={g.nombre}>
                <SelectLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">{g.nombre}</SelectLabel>
                {g.items.map(item)}
              </SelectGroup>
            ))
          : unidades.map(item)}
      </SelectContent>
    </Select>
  );
}
