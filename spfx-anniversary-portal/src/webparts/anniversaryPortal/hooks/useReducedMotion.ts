import * as React from 'react';

export function useReducedMotion(): boolean {
  const get = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [rm, setRm] = React.useState<boolean>(get());
  React.useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = (): void => setRm(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on); };
  }, []);
  return rm;
}
