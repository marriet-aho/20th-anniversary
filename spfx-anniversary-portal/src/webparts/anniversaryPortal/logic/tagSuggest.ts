import { TagKey } from '../models';

export const TAGS: { key: TagKey; emoji: string; pattern: RegExp }[] = [
  { key: 'Leadership', emoji: '🏆', pattern: /lead|vision|mentor|guid|inspir|direction/i },
  { key: 'Teamwork', emoji: '🤝', pattern: /team|together|colleague|collaborat|support|family/i },
  { key: 'Innovation', emoji: '💡', pattern: /innovat|idea|creativ|digital|technolog/i },
  { key: 'Customer Focus', emoji: '🌟', pattern: /customer|client|service|listen/i },
  { key: 'Audacious Steps', emoji: '🚀', pattern: /audacious|bold|brave|courag|step|dare/i },
  { key: 'Appreciation', emoji: '❤️', pattern: /thank|appreciat|grateful|congrat|celebrat|love|proud/i }
];

/** Tags whose keywords appear in the text, in display order. */
export function detectTags(text: string): TagKey[] {
  return TAGS.filter(t => t.pattern.test(text)).map(t => t.key);
}

/** Tags to save: the visitor's own pick wins, then detected tags, then Appreciation. */
export function resolveTags(text: string, chosen: TagKey[]): TagKey[] {
  if (chosen.length) return chosen.slice();
  const d = detectTags(text);
  return d.length ? d : ['Appreciation'];
}

export function tagLabel(key: TagKey): string {
  const t = TAGS.filter(x => x.key === key)[0];
  return t ? t.emoji + ' ' + t.key : key;
}
