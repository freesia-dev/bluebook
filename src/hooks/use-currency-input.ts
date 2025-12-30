// Currency input formatting hook
export const formatCurrencyInput = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  
  // Parse to number and format with thousand separators
  const num = parseInt(digits, 10);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const parseCurrencyValue = (formatted: string): number => {
  // Remove all non-digit characters and parse
  const digits = formatted.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

// Format for display (with currency symbol)
export const formatCurrencyDisplay = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};
