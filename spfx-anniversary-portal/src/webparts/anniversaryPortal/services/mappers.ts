import {
  IBoardMessage, IGalleryItem, IKeyStat, ILeadershipMessage, ILegend, IMemory, ITimelineItem, TagKey
} from '../models';
import { IImageContext, isVideoFile, parseImageField } from '../logic/imageField';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any;

const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
/** Department and Branch are plain text; an expanded lookup object is also accepted. */
const text = (v: unknown): string => (v && typeof v === 'object' ? s((v as { Title?: string }).Title) : s(v));
const n = (v: unknown): number => (typeof v === 'number' ? v : parseFloat(s(v)) || 0);

export function mapTimeline(r: Row): ITimelineItem {
  return { id: r.Id, title: s(r.Title), year: n(r.Year), sortOrder: n(r.SortOrder) };
}
export function mapKeyStat(r: Row): IKeyStat {
  return { id: r.Id, label: s(r.Title), value: s(r.Value), sortOrder: n(r.SortOrder) };
}
export function mapLegend(r: Row, ctx?: IImageContext): ILegend {
  return {
    id: r.Id, name: s(r.Title), department: text(r.Department), position: s(r.Position),
    branch: text(r.Branch), joined: s(r.Joined), quote: s(r.Quote),
    highlights: s(r.CareerHighlights), funFact: s(r.FunFact), photo: parseImageField(r.Photo, ctx && { ...ctx, itemId: r.Id }), sortOrder: n(r.SortOrder)
  };
}
export function mapMemory(r: Row, ctx?: IImageContext): IMemory {
  return { id: r.Id, caption: s(r.Title), year: n(r.Year), photo: parseImageField(r.Photo, ctx && { ...ctx, itemId: r.Id }), sortOrder: n(r.SortOrder) };
}
export function mapLeadershipMessage(r: Row): ILeadershipMessage {
  return { id: r.Id, title: s(r.Title), message: s(r.Message), sortOrder: n(r.SortOrder) };
}
export function mapBoardMessage(r: Row): IBoardMessage {
  const tags: unknown = r.Tags;
  const list: string[] = Array.isArray(tags) ? tags : (tags && (tags as any).results) ? (tags as any).results : [];
  return {
    id: r.Id, message: s(r.Message), authorId: n(r.Author && r.Author.Id), authorName: s(r.Author && r.Author.Title),
    created: s(r.Created), celebratingId: r.CelebratingId ? n(r.CelebratingId) : undefined,
    celebratingName: r.Celebrating ? s(r.Celebrating.Title) : undefined,
    tags: list as TagKey[], featured: !!r.Featured, published: r.Published !== false && r.Published !== 0
  };
}
export function mapGalleryItem(r: Row): IGalleryItem {
  const fileName = s(r.File && r.File.Name);
  return {
    id: r.Id, title: s(r.Title) || fileName, category: s(r.Category), branch: s(r.Branch && typeof r.Branch === 'object' ? r.Branch.Title : r.Branch), region: s(r.Region),
    department: s(r.Department && r.Department.Title), departmentId: r.DepartmentId ? +r.DepartmentId : undefined, featured: !!r.Featured,
    published: r.Published !== false && r.Published !== 0, credit: s(r.Credit),
    dateTaken: r.DateTaken ? s(r.DateTaken) : undefined, url: s(r.File && r.File.ServerRelativeUrl),
    fileName, isVideo: isVideoFile(fileName)
  };
}
