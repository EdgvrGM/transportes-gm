import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Selector único de destino del gasto: camiones, remolques agrupados por tipo y
// generales, cada bloque con su encabezado. El valor es la llave "tipo:id".
// `opcionTodas`: agrega al inicio la opción TODAS ("Toda la flota").
export const TODAS = "todas";

export default function SelectUnidad({ unidades, value, onChange, placeholder, className, disabled, opcionTodas = false }) {
  const grupos = [];
  for (const u of unidades) {
    const g = grupos.at(-1);
    if (g?.nombre === u.seccion) g.items.push(u);
    else grupos.push({ nombre: u.seccion, items: [u] });
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {opcionTodas && (
          <SelectItem value={TODAS} className="font-semibold">
            Toda la flota
          </SelectItem>
        )}
        {grupos.map((g) => (
          <SelectGroup key={g.nombre}>
            {(grupos.length > 1 || opcionTodas) && (
              <SelectLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">{g.nombre}</SelectLabel>
            )}
            {g.items.map((u) => (
              <SelectItem key={u.key} value={u.key}>
                {u.etiqueta}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
