const CURRENCY_TOKEN = String.raw`(?:A\$|AU\$|NZ\$|US\$|[$€£¥₹]|\b(?:AUD|USD|NZD|EUR|GBP|CAD|SGD|JPY)\b)`;
const MONEY_AMOUNT = String.raw`\d(?:[\d,]*(?:\.\d{1,2})?)?`;

const PRICE_PATTERNS = Object.freeze([
  new RegExp(String.raw`${CURRENCY_TOKEN}\s*${MONEY_AMOUNT}`, 'i'),
  new RegExp(String.raw`${MONEY_AMOUNT}\s*(?:${CURRENCY_TOKEN}|dollars?|cents?|euros?|pounds?|yen|rupees?|bucks?)\b`, 'i'),
  /\b(?:AUD|USD|NZD|EUR|GBP|CAD|SGD|JPY)\b/i,
  /\b(?:dollars?|cents?|euros?|pounds?|yen|rupees?|bucks?)\b/i,
  /\b(?:price|prices|priced|pricing|cost|costs|costing)\b/i,
  /\b(?:charge|charges|charged|charging|surcharge|surcharges)\b/i,
  /\bfees?\b/i,
  /\b(?:free|complimentary|gratis)\b/i,
]);

export function containsPriceLanguage(value: string): boolean {
  return PRICE_PATTERNS.some((pattern) => pattern.test(value));
}

export function containsEmDash(value: string): boolean {
  return /—|&(?:mdash|#0*8212|#x0*2014);/i.test(value);
}
