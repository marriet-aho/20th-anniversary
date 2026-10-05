import * as React from 'react';
import { IContentMap, IPortalSettings, IUserInfo, PortalAssets } from '../models';
import { PortalService } from '../services/PortalService';
import { BoardService } from '../services/BoardService';
import { GalleryService } from '../services/GalleryService';
import { ReactionService } from '../services/ReactionService';
import { applyTokens } from '../logic/names';
import { DEFAULT_TEXT } from './defaults';

export interface IPortalContext {
  settings: IPortalSettings;
  webUrl: string;              // absolute web URL
  webServerRelativeUrl: string;
  user: IUserInfo;
  assets: PortalAssets;
  content: IContentMap;
  legendCount: number;
  portal: PortalService;
  board: BoardService;
  gallery: GalleryService;
  reactions: ReactionService;
}

export const PortalCtx = React.createContext<IPortalContext | undefined>(undefined);

export function usePortal(): IPortalContext {
  const c = React.useContext(PortalCtx);
  if (!c) throw new Error('PortalContext missing');
  return c;
}

/** Text for a PortalContent key, with {count} replaced by the number of Active legends. */
export function useText(): (key: string) => string {
  const { content, legendCount } = usePortal();
  return (key: string): string => {
    const v = content[key] && content[key].value ? content[key].value : DEFAULT_TEXT[key] || '';
    return applyTokens(v, { count: legendCount });
  };
}
