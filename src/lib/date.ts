export function formatDate(date: string | Date, locale = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  return new Intl.DateTimeFormat(locale).format(d);
}
