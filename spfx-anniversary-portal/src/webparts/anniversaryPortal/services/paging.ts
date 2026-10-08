import { IPage } from '../models';

/* eslint-disable @typescript-eslint/no-explicit-any */
// PnPjs v4 has no getPaged(); a collection is an async iterator that follows the server's next link.
const ASYNC_ITERATOR: symbol = (Symbol as unknown as { asyncIterator: symbol }).asyncIterator;

function iterate(query: any, size: number): { next: () => Promise<{ done?: boolean; value?: any[] }> } {
  return query.top(size)[ASYNC_ITERATOR]();
}

type Step = { done?: boolean; value?: any[] };

/** First page now, further pages on demand. Looks one page ahead so `hasMore` is exact. */
export async function pageOf<T>(query: any, size: number, map: (row: any) => T): Promise<IPage<T>> {
  const it = iterate(query, size);
  const build = async (current: Step): Promise<IPage<T>> => {
    const rows: any[] = current.done || !current.value ? [] : current.value;
    const ahead: Step = current.done ? { done: true } : await it.next();
    const more = !ahead.done && !!ahead.value && ahead.value.length > 0;
    return { items: rows.map(map), hasMore: more, next: () => build(more ? ahead : { done: true }) };
  };
  return build(await it.next());
}

/** Visit every page; return false from the callback to stop early. */
export async function eachPage(query: any, size: number, visit: (rows: any[]) => boolean | void): Promise<void> {
  const it = iterate(query, size);
  for (;;) {
    const r = await it.next();
    if (r.done || !r.value) return;
    if (visit(r.value) === false) return;
  }
}
