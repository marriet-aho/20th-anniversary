import * as React from 'react';
import { usePortal } from '../PortalContext';

/** Owners only: opens the list or library that feeds a section. */
export const ManageLink: React.FC<{ name: string; library?: boolean }> = ({ name, library }) => {
  const { user, webUrl } = usePortal();
  if (!user.isOwner) return null;
  const href = library ? webUrl + '/' + name : webUrl + '/Lists/' + name + '/AllItems.aspx';
  return <p className="mgl"><a href={href} target="_blank" rel="noopener noreferrer">Manage content: {name}</a></p>;
};
