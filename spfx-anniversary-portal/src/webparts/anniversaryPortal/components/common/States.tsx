import * as React from 'react';

export const Loading: React.FC<{ label?: string }> = ({ label }) => (
  <div className="state" role="status" aria-live="polite"><span className="spin-dot" aria-hidden="true" />{label || 'Loading…'}</div>
);

export const ErrorNote: React.FC<{ what: string; detail?: string; onRetry?: () => void }> = ({ what, detail, onRetry }) => (
  <div className="state err" role="alert">
    <b>We could not load {what}.</b> Please refresh the page.
    {detail ? <small>{detail}</small> : null}
    {onRetry ? <button type="button" className="btn" onClick={onRetry}>Try again</button> : null}
  </div>
);

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="state">{children}</p>;
