export function formatPrice(amount: number): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback simple formatting
    return `${amount.toFixed(2)} €`;
  }
}

export function parsePrice(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  const normalized = value
    .replace(/[\s\u00A0]/g, '')
    .replace('€', '')
    .replace(',', '.');
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid price format');
  }
  return parsed;
}
