/** SharePoint "Image" columns return JSON like {"fileName":"x.jpg","serverRelativeUrl":"/sites/..."}. */
export function parseImageField(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'object') {
    const o = raw as { serverRelativeUrl?: string; Url?: string };
    return o.serverRelativeUrl || o.Url || '';
  }
  const s = String(raw).trim();
  if (!s) return '';
  if (s.charAt(0) !== '{') return s; // already a URL
  try {
    const o = JSON.parse(s) as { serverRelativeUrl?: string };
    return o.serverRelativeUrl || '';
  } catch {
    return '';
  }
}

const VIDEO_EXT = /\.(mp4|m4v|mov|webm)$/i;
export function isVideoFile(name: string): boolean {
  return VIDEO_EXT.test(name || '');
}
