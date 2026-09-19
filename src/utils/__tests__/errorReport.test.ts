// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, test } from 'vitest';
import { buildErrorReport, buildErrorReportMailto } from '../errorReport';

const FIXED_NOW = new Date('2026-09-19T08:30:00.000Z');

function errorWithStack(message: string, stack: string): Error {
  const error = new Error(message);
  error.stack = stack;
  return error;
}

describe('buildErrorReport', () => {
  test('reports code, version, area, page and time', () => {
    const report = buildErrorReport({
      error: new Error('boom'),
      area: 'LayoutEditor',
      language: 'de',
      now: FIXED_NOW,
    });

    expect(report.code).toMatch(/^KP-\d+\.\d+\.\d+-[0-9A-Z]{7}$/);
    expect(report.details).toContain(`Code: ${report.code}`);
    expect(report.details).toContain('Area: LayoutEditor');
    expect(report.details).toContain('Error: Error: boom');
    expect(report.details).toContain('Language: de');
    expect(report.details).toContain('Time: 2026-09-19T08:30:00.000Z');
    expect(report.details).toContain('Page: /');
  });

  test('gives the same code to the same error and a different one otherwise', () => {
    const stack = 'Error: boom\n    at render (app.js:1:1)';
    const first = buildErrorReport({
      error: errorWithStack('boom', stack),
      now: FIXED_NOW,
    });
    const again = buildErrorReport({
      error: errorWithStack('boom', stack),
      now: new Date('2026-10-01T00:00:00.000Z'),
    });
    const other = buildErrorReport({
      error: errorWithStack('kaboom', stack),
      now: FIXED_NOW,
    });

    expect(again.code).toBe(first.code);
    expect(other.code).not.toBe(first.code);
  });

  test('keeps the first stack frames without the message header', () => {
    const report = buildErrorReport({
      error: errorWithStack(
        'boom',
        [
          'Error: boom',
          '    at render (app.js:1:1)',
          '    at mount (app.js:2:2)',
          '    at start (app.js:3:3)',
          '    at boot (app.js:4:4)',
        ].join('\n'),
      ),
      now: FIXED_NOW,
    });

    expect(report.details).toContain('Stack:');
    expect(report.details).toContain('at render (app.js:1:1)');
    expect(report.details).toContain('at start (app.js:3:3)');
    // Only three frames are kept, and the header is not one of them.
    expect(report.details).not.toContain('at boot (app.js:4:4)');
    expect(report.details.split('Stack:')[1]).not.toContain('Error: boom');
  });

  test('keeps a multi-line message out of the stack frames', () => {
    const report = buildErrorReport({
      error: errorWithStack(
        'boom\nsecond line of the message',
        [
          'Error: boom',
          'second line of the message',
          '    at render (app.js:1:1)',
        ].join('\n'),
      ),
      now: FIXED_NOW,
    });

    const stack = report.details.split('Stack:')[1] ?? '';
    expect(stack).toContain('at render (app.js:1:1)');
    expect(stack).not.toContain('second line of the message');
  });

  test('drops the header of an error without a message', () => {
    const report = buildErrorReport({
      error: errorWithStack('', 'Error\n    at render (app.js:1:1)'),
      now: FIXED_NOW,
    });

    const stack = report.details.split('Stack:')[1] ?? '';
    expect(stack).toContain('at render (app.js:1:1)');
    expect(stack.trim().startsWith('Error')).toBe(false);
  });

  test('shortens an overlong message', () => {
    const report = buildErrorReport({
      error: new Error('x'.repeat(500)),
      now: FIXED_NOW,
    });

    expect(report.details).toContain(`Error: Error: ${'x'.repeat(300)}…`);
  });

  test('never cuts an emoji in half', () => {
    // The cut lands between the two halves of the surrogate pair; a lone half
    // would make the mailto encoding throw inside the error screen.
    const report = buildErrorReport({
      error: new Error(`${'x'.repeat(299)}🙂${'y'.repeat(50)}`),
      now: FIXED_NOW,
    });

    expect(report.details).toContain(`Error: Error: ${'x'.repeat(299)}…`);
    expect(report.details).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });
});

describe('buildErrorReportMailto', () => {
  test('encodes subject and body with CRLF line breaks', () => {
    const href = buildErrorReportMailto({
      email: 'someone@example.com',
      subject: 'Klassenplan error KP-1.0.0-ABCDEFG',
      body: 'Hello,\nCode: KP-1.0.0-ABCDEFG',
    });

    expect(href.startsWith('mailto:someone@example.com?')).toBe(true);
    expect(href).toContain('subject=Klassenplan%20error%20KP-1.0.0-ABCDEFG');
    expect(href).toContain('body=Hello%2C%0D%0ACode%3A%20KP-1.0.0-ABCDEFG');
  });

  test('shortens the body until the URL fits a mail client', () => {
    const href = buildErrorReportMailto({
      email: 'someone@example.com',
      subject: 'Klassenplan error',
      body: 'a'.repeat(5000),
    });

    expect(href.length).toBeLessThanOrEqual(1900);
    expect(decodeURIComponent(href)).toContain('…');
  });

  test('shortens a body full of emoji without breaking the encoding', () => {
    const href = buildErrorReportMailto({
      email: 'someone@example.com',
      subject: 'Klassenplan error',
      body: '🙂'.repeat(2000),
    });

    expect(href.length).toBeLessThanOrEqual(1900);
    expect(() => decodeURIComponent(href)).not.toThrow();
  });

  test('survives a message that already carries a lone surrogate', () => {
    const href = buildErrorReportMailto({
      email: 'someone@example.com',
      subject: 'Klassenplan error',
      body: 'Code: KP-1.0.0-ABCDEFG\uD83D',
    });

    expect(href).toContain('body=Code');
    expect(() => decodeURIComponent(href)).not.toThrow();
  });
});
