import * as React from 'react';

export interface IAsync<T> { data?: T; error?: string; loading: boolean; reload: () => void }

export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList): IAsync<T> {
  const [state, setState] = React.useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let live = true;
    setState(s => ({ data: s.data, loading: true }));
    fn().then(
      data => { if (live) setState({ data, loading: false }); },
      (e: unknown) => { if (live) setState({ loading: false, error: e instanceof Error ? e.message : String(e) }); }
    );
    return () => { live = false; };
  }, [...deps, tick]);
  return { ...state, reload: () => setTick(t => t + 1) };
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => { const h = setTimeout(() => setV(value), ms); return () => clearTimeout(h); }, [value, ms]);
  return v;
}
