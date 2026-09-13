/**
 * Currency utilities tailored for Indian School Finance ERP (INR - ₹)
 */

export function roundINR(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function addINR(a: number, b: number): number {
  const pa = Math.round((a || 0) * 100);
  const pb = Math.round((b || 0) * 100);
  return (pa + pb) / 100;
}

export function subINR(a: number, b: number): number {
  const pa = Math.round((a || 0) * 100);
  const pb = Math.round((b || 0) * 100);
  return (pa - pb) / 100;
}

export function mulINR(amount: number, factor: number): number {
  return roundINR(roundINR(amount) * factor);
}

/**
 * Formats a number to Indian numbering currency format (e.g. ₹1,50,000.00 or ₹1,500)
 */
export function formatINR(amount: number, showDecimals: boolean = true): string {
  const val = roundINR(amount || 0);
  const sign = val < 0 ? '-' : '';
  const absVal = Math.abs(val);

  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(absVal);
    return `${sign}₹${formatted}`;
  } catch {
    return `${sign}₹${absVal.toFixed(showDecimals ? 2 : 0)}`;
  }
}

/**
 * Formats a number in compact Indian representation (e.g. ₹2.5L, ₹50K)
 */
export function formatINRCompact(amount: number): string {
  const val = roundINR(amount || 0);
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (absVal >= 10000000) {
    return `${sign}₹${(absVal / 10000000).toFixed(2)} Cr`;
  }
  if (absVal >= 100000) {
    return `${sign}₹${(absVal / 100000).toFixed(2)} L`;
  }
  if (absVal >= 1000) {
    return `${sign}₹${(absVal / 1000).toFixed(1)} K`;
  }
  return `${sign}₹${absVal.toFixed(0)}`;
}

/**
 * Converts a numeric INR amount into Indian words representation.
 * Example: 152350 -> "One Lakh Fifty Two Thousand Three Hundred Fifty Rupees Only"
 */
export function numberToWordsINR(amount: number): string {
  const val = roundINR(amount);
  if (val === 0) return 'Zero Rupees Only';

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return singleDigits[n];
    const ten = Math.floor(n / 10);
    const rest = n % 10;
    return `${tens[ten]}${rest ? ' ' + singleDigits[rest] : ''}`;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) {
      str += `${singleDigits[hundred]} Hundred`;
      if (rest > 0) str += ' ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  const absAmount = Math.abs(val);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let result = '';

  const crores = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;

  const lakhs = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousands = Math.floor(rem / 1000);
  rem = rem % 1000;

  const hundreds = rem;

  if (crores > 0) {
    result += `${convertTwoDigits(crores)} Crore `;
  }
  if (lakhs > 0) {
    result += `${convertTwoDigits(lakhs)} Lakh `;
  }
  if (thousands > 0) {
    result += `${convertTwoDigits(thousands)} Thousand `;
  }
  if (hundreds > 0) {
    result += `${convertThreeDigits(hundreds)} `;
  }

  result = result.trim() + ' Rupees';

  if (paise > 0) {
    result += ` and ${convertTwoDigits(paise)} Paise`;
  }

  return (val < 0 ? 'Minus ' : '') + result + ' Only';
}
