export interface IPortalSettings {
  contentList: string;
  timelineList: string;
  keyStatsList: string;
  legendsList: string;
  memoryList: string;
  messagesList: string;
  boardList: string;
  boardStatsList: string;
  galleryLibrary: string;
  reactionsList: string;
  commentsList: string;
  branchesList: string;
  departmentsList: string;
  assetsLibrary: string;
  ownersGroup: string;
  /** Visitors can post on the board. Owners always can. */
  allowPosting: boolean;
  /** Visitors can react to and comment on gallery photos. Owners always can. */
  allowReactions: boolean;
}

export const DEFAULT_SETTINGS: IPortalSettings = {
  contentList: 'PortalContent',
  timelineList: 'Timeline',
  keyStatsList: 'KeyStats',
  legendsList: 'Legends',
  memoryList: 'MemoryLane',
  messagesList: 'LeadershipMessages',
  boardList: 'BoardMessages',
  boardStatsList: 'BoardStats',
  galleryLibrary: 'GalleryMedia',
  reactionsList: 'GalleryReactions',
  commentsList: 'GalleryComments',
  branchesList: 'Branches',
  departmentsList: 'Departments',
  assetsLibrary: 'PortalAssets',
  ownersGroup: 'Portal Owners',
  allowPosting: true,
  allowReactions: true
};

export type AssetType =
  | 'HeroVideo' | 'HeroPoster' | 'Logo' | 'Watermark' | 'BackgroundMusic'
  | 'AnniversaryVideo' | 'VideoPoster' | 'Other';

export type PortalAssets = Partial<Record<AssetType, string>>;

export interface IContentMap { [key: string]: { value: string; date?: string } }

export interface ITimelineItem { id: number; title: string; year: number; sortOrder: number }
export interface IKeyStat { id: number; label: string; value: string; sortOrder: number }
export interface ILegend {
  id: number; name: string; department: string; position: string; branch: string;
  joined: string; quote: string; highlights: string; funFact: string; photo: string; sortOrder: number;
}
export interface IMemory { id: number; caption: string; year: number; photo: string; sortOrder: number }
export interface ILeadershipMessage { id: number; title: string; message: string; sortOrder: number }
export interface ILookupOption { id: number; title: string; region?: string }

export type TagKey = 'Leadership' | 'Teamwork' | 'Innovation' | 'Customer Focus' | 'Audacious Steps' | 'Appreciation';

export interface IBoardMessage {
  id: number; message: string; authorId: number; authorName: string; created: string;
  celebratingId?: number; celebratingName?: string; tags: TagKey[]; featured: boolean; published: boolean;
}

export type ReactionKind = 'Like' | 'Clap' | 'Celebrate' | 'Love';

export interface IGalleryItem {
  id: number; title: string; category: string; branch: string; region: string; department: string; departmentId?: number; featured: boolean;
  published: boolean; credit: string; dateTaken?: string; url: string; fileName: string; isVideo: boolean;
}

export interface IReactionSummary {
  counts: Record<ReactionKind, number>;
  mine: Record<ReactionKind, number | undefined>; // list item id of my reaction row, when set
}

export interface IGalleryComment { id: number; text: string; authorName: string; created: string }

export interface IPage<T> { items: T[]; hasMore: boolean; next: () => Promise<IPage<T>> }

export interface IUserInfo { id: number; displayName: string; isOwner: boolean }
