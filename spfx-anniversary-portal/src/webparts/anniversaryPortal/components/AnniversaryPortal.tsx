import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import {
  IContentMap, IKeyStat, ILeadershipMessage, ILegend, IMemory, IPortalSettings, ITimelineItem, IUserInfo, PortalAssets
} from '../models';
import { SPFI } from '../services/sp';
import { PortalService } from '../services/PortalService';
import { BoardService } from '../services/BoardService';
import { GalleryService } from '../services/GalleryService';
import { ReactionService } from '../services/ReactionService';
import { IPortalContext, PortalCtx } from './PortalContext';
import { AudioProvider } from './AudioProvider';
import { EntryOverlay } from './Overlay';
import { Hero } from './Hero/Hero';
import { Countdown } from './Countdown';
import { KeyStats } from './KeyStats';
import { Journey } from './Journey';
import { TreeOfLegacy } from './Tree';
import { LegendCards } from './LegendCards';
import { MemoryLane } from './MemoryLane';
import { Voices } from './Voices';
import { AnniversaryVideo } from './AnniversaryVideo';
import { Footer } from './Footer';
import { LazyMount } from './common/LazyMount';
import { ErrorNote, Loading } from './common/States';
import styles from '../styles/portal.module.scss';

const Gallery = React.lazy(() => import(/* webpackChunkName: 'gallery' */ './Gallery/Gallery'));
const Board = React.lazy(() => import(/* webpackChunkName: 'board' */ './Board/Board'));

export interface IAnniversaryPortalProps {
  context: WebPartContext;
  sp: SPFI;
  settings: IPortalSettings;
  isDarkTheme: boolean;
}

interface ILoaded<T> { value: T; error?: string }
async function settle<T>(p: Promise<T>, fallback: T): Promise<ILoaded<T>> {
  try { return { value: await p }; } catch (e) { return { value: fallback, error: e instanceof Error ? e.message : String(e) }; }
}

interface IData {
  content: ILoaded<IContentMap>; assets: ILoaded<PortalAssets>; user: ILoaded<IUserInfo>;
  timeline: ILoaded<ITimelineItem[]>; stats: ILoaded<IKeyStat[]>; legends: ILoaded<ILegend[]>;
  memory: ILoaded<IMemory[]>; voices: ILoaded<ILeadershipMessage[]>;
}

const AnniversaryPortal: React.FC<IAnniversaryPortalProps> = ({ context, sp, settings, isDarkTheme }) => {
  const page = context.pageContext;
  const svc = React.useMemo(() => {
    const userId = (page.legacyPageContext as { userId: number }).userId;
    const me = { id: userId, displayName: page.user.displayName };
    return {
      portal: new PortalService(sp, settings, me), board: new BoardService(sp, settings),
      gallery: new GalleryService(sp, settings), reactions: new ReactionService(sp, settings, userId), me
    };
  }, [sp, settings, page]);

  const [data, setData] = React.useState<IData | undefined>();
  const [sel, setSel] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    const p = svc.portal;
    Promise.all([
      settle(p.getContent(), {}), settle(p.getAssets(), {}),
      settle(p.getUser(), { ...svc.me, isOwner: false }),
      settle(p.getTimeline(), []), settle(p.getKeyStats(), []), settle(p.getLegends(), []),
      settle(p.getMemoryLane(), []), settle(p.getLeadershipMessages(), [])
    ]).then(([content, assets, user, timeline, stats, legends, memory, voices]) => {
      if (live) setData({ content, assets, user, timeline, stats, legends, memory, voices });
    }).catch(() => undefined);
    return () => { live = false; };
  }, [svc]);

  const rootProps = { className: styles.root, 'data-theme': isDarkTheme ? 'dark' : undefined };
  if (!data) return <div {...rootProps} style={{ minHeight: 400 }}><Loading label="Loading the celebration…" /></div>;

  const ctx: IPortalContext = {
    settings, webUrl: page.web.absoluteUrl.replace(/\/$/, ''), webServerRelativeUrl: page.web.serverRelativeUrl,
    user: data.user.value, assets: data.assets.value, content: data.content.value, legendCount: data.legends.value.length,
    portal: svc.portal, board: svc.board, gallery: svc.gallery, reactions: svc.reactions
  };
  const failed = (what: string, e?: string): React.ReactNode =>
    e ? <section><div className="w"><ErrorNote what={what} detail={ctx.user.isOwner ? e : undefined} /></div></section> : null;
  const legends = data.legends.value;
  const pick = (i: number): void => {
    setSel(i);
    const el = document.getElementById('tree');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <PortalCtx.Provider value={ctx}>
      <AudioProvider src={ctx.assets.BackgroundMusic}>
        <div {...rootProps}>
          <EntryOverlay />
          <Hero />
          <Countdown />
          {failed('the key figures', data.stats.error) || <KeyStats stats={data.stats.value} />}
          {failed('the timeline', data.timeline.error) || <Journey items={data.timeline.value} />}
          {failed('the legends', data.legends.error) || (
            <>
              <TreeOfLegacy legends={legends} selected={sel} onSelect={setSel} />
              <LegendCards legends={legends} onPick={pick} />
            </>
          )}
          {failed('Memory Lane', data.memory.error) || <MemoryLane items={data.memory.value} />}
          <LazyMount minHeight={500}>
            <React.Suspense fallback={<Loading />}><Gallery /></React.Suspense>
          </LazyMount>
          {failed('the messages', data.voices.error) || <Voices items={data.voices.value} />}
          <AnniversaryVideo />
          <LazyMount minHeight={600}>
            <React.Suspense fallback={<Loading />}><Board legends={legends} keyStats={data.stats.value} /></React.Suspense>
          </LazyMount>
          <Footer />
        </div>
      </AudioProvider>
    </PortalCtx.Provider>
  );
};

export default AnniversaryPortal;
