/**
 * Sensitive Data Masking Utilities
 * Follows FIC Security & Data Protection Guidelines:
 * - PAN: ABCDE••••F
 * - GSTIN: 29••••••••••1ZX
 * - Bank account: •••• •••• 5678
 */

export const maskPAN = (pan?: string): string => {
  if (!pan) return '••••••••••';
  const clean = pan.trim().toUpperCase();
  if (clean.length < 10) {
    return clean.slice(0, 2) + '••••' + clean.slice(-2);
  }
  return `${clean.slice(0, 5)}••••${clean.slice(9, 10)}`;
};

export const maskGSTIN = (gstin?: string): string => {
  if (!gstin) return '•••••••••••••••';
  const clean = gstin.trim().toUpperCase();
  if (clean.length < 15) {
    return clean.slice(0, 2) + '••••••••••' + clean.slice(-3);
  }
  return `${clean.slice(0, 2)}••••••••••${clean.slice(12)}`;
};

export const maskBankAccount = (accountNo?: string): string => {
  if (!accountNo) return '•••• •••• ••••';
  const clean = accountNo.trim();
  if (clean.length < 4) return '•••• •••• ••••';
  const lastFour = clean.slice(-4);
  return `•••• •••• ${lastFour}`;
};
