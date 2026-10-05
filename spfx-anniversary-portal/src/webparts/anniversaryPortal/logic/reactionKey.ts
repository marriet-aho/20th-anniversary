import { ReactionKind } from '../models';

export const REACTIONS: { kind: ReactionKind; emoji: string; label: string }[] = [
  { kind: 'Like', emoji: '♥', label: 'Like' },
  { kind: 'Clap', emoji: '👏', label: 'Clap' },
  { kind: 'Celebrate', emoji: '🎉', label: 'Celebrate' },
  { kind: 'Love', emoji: '❤️', label: 'Love' }
];

/** Unique per item + user + reaction; the list enforces uniqueness on this column. */
export function reactionKey(itemId: number, userId: number, kind: ReactionKind): string {
  return itemId + '-' + userId + '-' + kind;
}
