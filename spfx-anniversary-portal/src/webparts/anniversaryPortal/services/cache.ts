/** Tiny promise cache so each reference list is read once per page load. */
export class Cache {
  private readonly store: { [key: string]: Promise<unknown> } = {};

  public get<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (!this.store[key]) {
      this.store[key] = load().catch(e => {
        delete this.store[key]; // do not cache failures
        throw e;
      });
    }
    return this.store[key] as Promise<T>;
  }

  public clear(key?: string): void {
    if (key) delete this.store[key];
    else Object.keys(this.store).forEach(k => delete this.store[k]);
  }
}
