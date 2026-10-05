import * as React from 'react';
import { usePortal, useText } from '../PortalContext';
import { ManageLink } from './ManageLink';

interface ISectionProps {
  id?: string;
  alt?: boolean;
  k?: string;                 // content key prefix, e.g. "journey" -> journey.heading / journey.sub
  manage?: { name: string; library?: boolean };
  children: React.ReactNode;
}

export const Section: React.FC<ISectionProps> = ({ id, alt, k, manage, children }) => {
  const t = useText();
  return (
    <section id={id} className={alt ? 'alt' : undefined}>
      <div className="w">
        {k ? <><h2>{t(k + '.heading')}</h2>{t(k + '.sub') ? <p className="lead">{t(k + '.sub')}</p> : null}</> : null}
        {manage ? <ManageLink {...manage} /> : null}
        {children}
      </div>
    </section>
  );
};

export { usePortal };
