/**
 * Money is represented as an integer number of minor units (santeem for DZD,
 * cents for EUR/USD). Floating point never touches a price. All arithmetic in the
 * commerce layer goes through these helpers so rounding is defined in exactly one
 * place.
 */

export type Cents = number;

export interface Currency {
  code: string;
  /** Minor units per major unit, e.g. 100 for DZD/EUR/USD. */
  subunit: number;
  symbol: string;
  /** true → "1 000 DZD", false → "€1,000.00" */
  symbolAfter: boolean;
}

export const CURRENCIES: Record<string, Currency> = {
  DZD: { code: "DZD", subunit: 100, symbol: "DA", symbolAfter: true },
  EUR: { code: "EUR", subunit: 100, symbol: "€", symbolAfter: false },
  USD: { code: "USD", subunit: 100, symbol: "$", symbolAfter: false },
  MAD: { code: "MAD", subunit: 100, symbol: "DH", symbolAfter: true },
  TND: { code: "TND", subunit: 1000, symbol: "DT", symbolAfter: true },
};

export function getCurrency(code: string): Currency {
  return CURRENCIES[code] ?? CURRENCIES.DZD!;
}

/** Round to a whole number of minor units using banker's-free half-up rounding. */
export function roundCents(value: number): Cents {
  return Math.round(value);
}

/** Apply a percentage (0–100) to a cents amount, rounded to whole minor units. */
export function applyPercentage(amount: Cents, percent: number): Cents {
  return roundCents((amount * percent) / 100);
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((total, v) => total + v, 0);
}

export function clampCents(value: Cents, min: Cents, max?: Cents): Cents {
  const lower = Math.max(value, min);
  return max === undefined ? lower : Math.min(lower, max);
}

/**
 * Format a cents amount for display. Uses Intl where possible and falls back to a
 * deterministic manual format so unit tests are locale-independent.
 */
export function formatMoney(
  amount: Cents,
  currencyCode: string,
  locale = "fr-DZ",
): string {
  const currency = getCurrency(currencyCode);
  const major = amount / currency.subunit;
  const fractionDigits = currency.subunit === 1000 ? 3 : currency.subunit === 1 ? 0 : 2;
  // DZD conventionally shows no decimals in retail contexts.
  const digits = currencyCode === "DZD" ? 0 : fractionDigits;

  let number: string;
  try {
    number = new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major);
  } catch {
    number = major.toFixed(digits);
  }

  return currency.symbolAfter
    ? `${number} ${currency.symbol}`
    : `${currency.symbol}${number}`;
}

/** Parse a major-unit user input ("1 500", "1500.50") into cents. Returns null on invalid. */
export function parseMoneyToCents(input: string, currencyCode: string): Cents | null {
  const currency = getCurrency(currencyCode);
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  if (normalized === "" || !/^-?\d*\.?\d+$/.test(normalized)) return null;
  const major = Number(normalized);
  if (!Number.isFinite(major)) return null;
  return roundCents(major * currency.subunit);
}
