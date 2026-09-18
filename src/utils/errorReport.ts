// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Technical half of a bug report the user sends by hand.
 *
 * Nothing here leaves the device on its own (decision 0008 — no telemetry):
 * the error fallbacks prepare a mail, the user reads it and decides whether to
 * send it. This module only collects what makes such a mail useful — a short
 * reference code, the app version, the route and the first stack frames.
 *
 * The labels stay English on purpose so every report arrives in the same shape,
 * no matter which language the app was running in. The prose around them is
 * translated by the caller.
 */

/**
 * The version, read from the `define` directly instead of through
 * `getAppVersion()` in `./version`.
 *
 * This module is imported from the entry graph (the root boundary) and from the
 * lazily loaded wizard (the section fallbacks). An import of `./version` — a
 * module the entry already uses — therefore makes it a shared leaf, and
 * Rolldown answers that by pulling 21 further modules out of the entry chunk
 * into separate shared chunks. The code is the same, the compression is not:
 * the cold-start payload grew from 197 KB to 207 KB brotli (measured
 * 2026-09-19). Keeping this module import-free keeps the chunk layout intact,
 * which is worth the two duplicated lines.
 */
const FALLBACK_VERSION = '0.0.0';

function appVersion(): string {
  return typeof __APP_VERSION__ === 'string' && __APP_VERSION__.length > 0
    ? __APP_VERSION__
    : FALLBACK_VERSION;
}

/** Longest error message kept in a report; the rest is cut off. */
const MAX_MESSAGE_LENGTH = 300;
/** Longest single stack frame kept in a report. */
const MAX_FRAME_LENGTH = 160;
/** Number of stack frames kept in a report. */
const MAX_STACK_FRAMES = 3;
/** Longest user agent string kept in a report. */
const MAX_USER_AGENT_LENGTH = 200;
/**
 * Upper bound for the whole `mailto:` URL. Windows caps a command line at
 * roughly 2,000 characters, and a URL beyond that is silently dropped by some
 * mail clients — so the body is shortened until the URL fits.
 */
const MAX_MAILTO_LENGTH = 1900;

export type ErrorReportInput = {
  error: Error;
  /** Where the error was caught, e.g. `LayoutEditor`. Not translated. */
  area?: string;
  /** Active UI language, for reproducing language-specific bugs. */
  language?: string;
  /** Injectable clock; defaults to now. */
  now?: Date;
};

export type ErrorReport = {
  /** Short reference the user can quote, e.g. `KP-2.2.0-1Z141Z3`. */
  code: string;
  /** Technical lines, ready to be pasted into a mail or an issue. */
  details: string;
};

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

/**
 * FNV-1a over the stable parts of an error. The same bug yields the same code
 * on every device, which is what makes reports groupable.
 */
function hashToken(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).toUpperCase().padStart(7, '0');
}

/**
 * The stack frames without the `Name: message` header V8 puts in front of them.
 * Firefox and Safari start with the first frame already.
 */
function stackFrames(error: Error): string[] {
  const stack = typeof error.stack === 'string' ? error.stack : '';
  const lines = stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const header = `${error.name}: ${error.message}`;
  const frames =
    lines[0] !== undefined && header.startsWith(lines[0])
      ? lines.slice(1)
      : lines;
  return frames
    .slice(0, MAX_STACK_FRAMES)
    .map((frame) => truncate(frame, MAX_FRAME_LENGTH));
}

function currentPage(): string {
  if (typeof window === 'undefined') return 'unknown';
  try {
    return window.location.pathname || '/';
  } catch {
    return 'unknown';
  }
}

function currentUserAgent(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  return truncate(navigator.userAgent || 'unknown', MAX_USER_AGENT_LENGTH);
}

/**
 * Build the reference code and the technical lines for one error.
 */
export function buildErrorReport({
  error,
  area = 'App',
  language = 'unknown',
  now = new Date(),
}: ErrorReportInput): ErrorReport {
  const version = appVersion();
  const message = truncate(error.message || 'unknown', MAX_MESSAGE_LENGTH);
  const frames = stackFrames(error);
  const code = `KP-${version}-${hashToken(`${error.name}|${message}|${frames[0] ?? ''}`)}`;

  const lines = [
    `Code: ${code}`,
    `Version: ${version}`,
    `Area: ${area}`,
    `Error: ${error.name}: ${message}`,
    `Page: ${currentPage()}`,
    `Language: ${language}`,
    `Time: ${now.toISOString()}`,
    `Browser: ${currentUserAgent()}`,
  ];
  if (frames.length > 0) {
    lines.push('Stack:', ...frames.map((frame) => `  ${frame}`));
  }

  return { code, details: lines.join('\n') };
}

function encodeMailPart(value: string): string {
  // Mail clients expect CRLF line breaks inside a mailto body.
  return encodeURIComponent(value.replace(/\r?\n/g, '\r\n'));
}

function composeMailto(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeMailPart(subject)}&body=${encodeMailPart(body)}`;
}

/**
 * A `mailto:` URL with a prepared subject and body, shortened from the end
 * until it fits {@link MAX_MAILTO_LENGTH}. The technical lines come last, so a
 * shortened report loses the stack first and the reference code never.
 */
export function buildErrorReportMailto({
  email,
  subject,
  body,
}: {
  email: string;
  subject: string;
  body: string;
}): string {
  let candidate = body;
  let shortened = false;
  const withMarker = () => (shortened ? `${candidate}…` : candidate);

  while (
    candidate.length > 0 &&
    composeMailto(email, subject, withMarker()).length > MAX_MAILTO_LENGTH
  ) {
    candidate = candidate.slice(0, Math.max(0, candidate.length - 64));
    shortened = true;
  }
  return composeMailto(email, subject, withMarker());
}
