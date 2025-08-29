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

