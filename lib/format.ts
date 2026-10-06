export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'USD', label: 'USD — Dólar estadounidense' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'MXN', label: 'MXN — Peso mexicano' },
  { code: 'ARS', label: 'ARS — Peso argentino' },
  { code: 'COP', label: 'COP — Peso colombiano' },
  { code: 'CLP', label: 'CLP — Peso chileno' },
  { code: 'PEN', label: 'PEN — Sol peruano' },
  { code: 'BRL', label: 'BRL — Real brasileño' },
  { code: 'GBP', label: 'GBP — Libra esterlina' },
];

/** Formatea un monto con el símbolo y separadores de la moneda (Intl nativo). */
export function formatMoney(amount: unknown, currency = 'USD'): string {
  const value = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}
