import * as React from 'react';
import { useText } from './PortalContext';

export const Footer: React.FC = () => {
  const t = useText();
  return <footer><h2>{t('footer.heading')}</h2><p>{t('footer.sub')}</p></footer>;
};
