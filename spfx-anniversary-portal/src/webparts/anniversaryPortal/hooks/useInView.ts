import * as React from 'react';

/** True once the element has come within `margin` of the viewport (stays true: used to lazy-mount). */
export function useInView<T extends Element>(margin: string = '300px'): [React.RefObject<T>, boolean] {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState<boolean>(typeof IntersectionObserver === 'undefined');
  React.useEffect(() => {
    if (seen || !ref.current) return undefined;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setSeen(true); io.disconnect(); } },
      { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, margin]);
  return [ref, seen];
}
