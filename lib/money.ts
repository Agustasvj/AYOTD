export const KES_DELIVERY_FEE = 50; // Standard campus delivery fee in KES

export const kes = (amount: number | string | null | undefined): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(isNaN(num) ? 0 : num);
};

export const toCents = (amount: number): number => Math.round(amount * 100);
export const fromCents = (cents: number): number => cents / 100;

export const formatKenyanPhone = (phone: string): string => {
  const clean = phone.replace(/[\s\-\+]/g, "");
  if (clean.startsWith("0")) {
    return "254" + clean.slice(1);
  }
  if (clean.startsWith("254")) {
    return clean;
  }
  return clean;
};
