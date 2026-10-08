import * as React from 'react';
import { usePortal } from './PortalContext';
import { useAudio } from './AudioProvider';
import { Section } from './common/Section';

function embedUrl(u: string): string {
  const m = u.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  return m ? 'https://www.youtube.com/embed/' + m[1] : u;
}

export const AnniversaryVideo: React.FC = () => {
  const { assets, content } = usePortal();
  const audio = useAudio();
  const url = content['video.url'] && content['video.url'].value.trim();
  return (
    <Section id="video" k="video">
      <div className="vid">
        {url ? (
          <iframe title="Anniversary video" allowFullScreen src={embedUrl(url)} loading="lazy" />
        ) : assets.AnniversaryVideo ? (
          <video controls playsInline preload="metadata" aria-label="Anniversary video" poster={assets.VideoPoster}
            src={assets.AnniversaryVideo} onPlay={audio.hold} onPause={audio.release} onEnded={audio.release} />
        ) : <p>The anniversary film will appear here.</p>}
      </div>
    </Section>
  );
};
