/** First letter of the first two words, upper-cased (e.g. "Selom Cofie Atta" -> "SC"). */
export function initials(name: string): string {
  return String(name || '').trim().split(/\s+/).map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
}

export function firstName(name: string): string {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

/** Replace the {count} token used in headings and button labels. */
export function applyTokens(text: string, tokens: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in tokens ? String(tokens[k]) : m));
}

export function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+$/, '') + '…';
}
