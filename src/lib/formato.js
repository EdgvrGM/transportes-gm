// Moneda con separador de miles y 2 decimales, sin símbolo (el símbolo lo pone
// cada vista). Única fuente: la usan la calculadora de liquidaciones, el
// historial y los PDF/Excel — si divergieran, el mismo monto se vería distinto
// en el recibo y en el listado.
export function formatCurrency(num) {
  const n = Number(num) || 0;
  const [entero, decimal] = n.toFixed(2).split(".");
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + decimal;
}
