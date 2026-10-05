import * as React from 'react';
import { useInView } from '../../hooks/useInView';
import { Loading } from './States';

/** Renders children only once the placeholder nears the viewport. */
export const LazyMount: React.FC<{ minHeight?: number; children: React.ReactNode }> = ({ minHeight = 320, children }) => {
  const [ref, seen] = useInView<HTMLDivElement>('500px');
  return seen ? <>{children}</> : <div ref={ref} style={{ minHeight }} aria-hidden="true"><Loading /></div>;
};
