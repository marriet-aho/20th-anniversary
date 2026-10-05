import { applyTokens, firstName, initials, truncate } from '../names';
import { detectTags, resolveTags } from '../tagSuggest';
import { tallyTopLegends } from '../topLegends';
import { countdownTo, pad } from '../countdown';
import { isVideoFile, parseImageField } from '../imageField';
import { reactionKey } from '../reactionKey';

describe('names', () => {
  it('derives initials from the first two words', () => {
    expect(initials('Selom Cofie Atta')).toBe('SC');
    expect(initials('  Kwaku K. Barnafo ')).toBe('KK');
    expect(initials('Madonna')).toBe('M');
    expect(initials('')).toBe('');
  });
  it('derives the first name', () => {
    expect(firstName('Juliana Owusu-Ansah')).toBe('Juliana');
    expect(firstName('')).toBe('');
  });
  it('replaces the {count} token and leaves unknown tokens alone', () => {
    expect(applyTokens('Our {count} Legends', { count: 13 })).toBe('Our 13 Legends');
    expect(applyTokens('Hi {who}', { count: 1 })).toBe('Hi {who}');
  });
  it('truncates to a length with an ellipsis', () => {
    expect(truncate('short', 80)).toBe('short');
    const t = truncate('x'.repeat(200), 80);
    expect(t.length).toBe(80);
    expect(t.charAt(79)).toBe('…');
  });
});

describe('tag auto-suggestion', () => {
  it('detects tags from the keyword map', () => {
    expect(detectTags('Thank you for leading the team')).toEqual(['Leadership', 'Teamwork', 'Appreciation']);
    expect(detectTags('Great customer service and bold ideas')).toEqual(['Innovation', 'Customer Focus', 'Audacious Steps']);
    expect(detectTags('zzz')).toEqual([]);
  });
  it('defaults to Appreciation when nothing matches', () => {
    expect(resolveTags('zzz', [])).toEqual(['Appreciation']);
  });
  it('lets a manual selection win over detection', () => {
    expect(resolveTags('Thank you for leading the team', ['Innovation'])).toEqual(['Innovation']);
  });
  it('uses detected tags when none are chosen', () => {
    expect(resolveTags('what a brave step', [])).toEqual(['Audacious Steps']);
  });
});

describe('top legends tally', () => {
  it('returns the top three by count', () => {
    const r = tallyTopLegends([1, 2, 2, 3, 3, 3, 4, undefined, undefined]);
    expect(r).toEqual([{ id: 3, count: 3 }, { id: 2, count: 2 }, { id: 1, count: 1 }]);
  });
  it('ignores messages with no legend and handles empty input', () => {
    expect(tallyTopLegends([undefined, undefined])).toEqual([]);
    expect(tallyTopLegends([])).toEqual([]);
  });
});

describe('countdown', () => {
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  it('splits the remaining time', () => {
    const c = countdownTo(new Date(now + ((2 * 86400) + (3 * 3600) + (4 * 60) + 5) * 1000), now);
    expect(c).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
  });
  it('reports done at and after the target, and for an invalid date', () => {
    expect(countdownTo(new Date(now), now).done).toBe(true);
    expect(countdownTo('2020-01-01T00:00:00Z', now).done).toBe(true);
    expect(countdownTo(undefined, now).done).toBe(true);
    expect(countdownTo('not a date', now).days).toBe(0);
  });
  it('pads to two digits but never truncates three', () => {
    expect(pad(5)).toBe('05');
    expect(pad(123)).toBe('123');
  });
});

describe('image field and media helpers', () => {
  it('parses an Image column value', () => {
    expect(parseImageField('{"fileName":"a.jpg","serverRelativeUrl":"/sites/x/a.jpg"}')).toBe('/sites/x/a.jpg');
    expect(parseImageField('/sites/x/b.jpg')).toBe('/sites/x/b.jpg');
    expect(parseImageField('{bad json')).toBe('');
    expect(parseImageField(null)).toBe('');
  });
  it('recognises video files', () => {
    expect(isVideoFile('clip.MP4')).toBe(true);
    expect(isVideoFile('photo.jpg')).toBe(false);
  });
  it('builds the unique reaction key', () => {
    expect(reactionKey(12, 7, 'Clap')).toBe('12-7-Clap');
  });
});
