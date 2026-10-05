export interface ITopLegend { id: number; count: number }

/** Top N legends by message count; ties keep first-seen order (stable). */
export function tallyTopLegends(celebratingIds: (number | undefined)[], n: number = 3): ITopLegend[] {
  const counts = new Map<number, number>();
  celebratingIds.forEach(id => { if (id) counts.set(id, (counts.get(id) || 0) + 1); });
  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
