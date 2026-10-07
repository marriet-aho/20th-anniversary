export interface IImageContext { webServerRelativeUrl: string; listName: string; itemId: number }

/**
 * SharePoint "Image" columns return JSON. Newer values carry serverRelativeUrl; older ones only a
 * fileName, with the file stored as a list item attachment. Plain URLs and hyperlink objects also work.
 */
export function parseImageField(raw: unknown, ctx?: IImageContext): string {
  if (!raw) return '';
  if (typeof raw === 'object') {
    const o = raw as { serverRelativeUrl?: string; Url?: string };
    return o.serverRelativeUrl || o.Url || '';
  }
  const s = String(raw).trim();
  if (!s) return '';
  if (s.charAt(0) !== '{') return s; // already a URL
  try {
    const o = JSON.parse(s) as { serverRelativeUrl?: string; fileName?: string };
    if (o.serverRelativeUrl) return o.serverRelativeUrl;
    if (o.fileName && ctx) {
      const web = ctx.webServerRelativeUrl.replace(/\/$/, '');
      return web + '/Lists/' + ctx.listName + '/Attachments/' + ctx.itemId + '/' + encodeURIComponent(o.fileName);
    }
    return '';
  } catch {
    return '';
  }
}

const VIDEO_EXT = /\.(mp4|m4v|mov|webm)$/i;
export function isVideoFile(name: string): boolean {
  return VIDEO_EXT.test(name || '');
}
