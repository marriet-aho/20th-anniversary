export interface ICountdown { days: number; hours: number; minutes: number; seconds: number; done: boolean }

export function countdownTo(target: string | Date | undefined, now: number = Date.now()): ICountdown {
  const t = target ? new Date(target).getTime() : NaN;
  const secs = isNaN(t) ? 0 : Math.max(0, Math.floor((t - now) / 1000));
  return {
    days: Math.floor(secs / 86400),
    hours: Math.floor((secs % 86400) / 3600),
    minutes: Math.floor((secs % 3600) / 60),
    seconds: secs % 60,
    done: secs <= 0
  };
}

export function pad(n: number): string {
  return n > 99 ? String(n) : ('0' + n).slice(-2);
}
