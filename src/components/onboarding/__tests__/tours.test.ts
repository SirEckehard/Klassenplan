// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import deGenerator from '@/i18n/locales/de/generator.json';
import enGenerator from '@/i18n/locales/en/generator.json';
import { TOURS, resolveTourId } from '../tours';

/** Reads a dotted key such as `tour.plan.mix.title` out of a bundle. */
const lookup = (bundle: unknown, key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      bundle,
    );

describe('resolveTourId', () => {
  it('greets a teacher without a class and explains the class list once there is one', () => {
    expect(resolveTourId(1, false, 'table')).toBe('welcome');
    expect(resolveTourId(1, true, 'table')).toBe('students');
    expect(resolveTourId(2, true, 'table')).toBe('layout');
  });

  it('holds the plan tour back while the first plan is being shuffled', () => {
    // The statistics mark needs a plan; a tour keeps the marks it started with.
    expect(resolveTourId(3, true, 'table', true)).toBeNull();
    expect(resolveTourId(3, true, 'table', false)).toBe('plan');
  });

  it('has no tour for the seating circle', () => {
    expect(resolveTourId(3, true, 'circle')).toBeNull();
  });
});

describe('TOURS', () => {
  // Tour texts are looked up with computed keys, which `check:i18n` cannot see.
  it('has a title and a body for every mark in both languages', () => {
    for (const marks of Object.values(TOURS)) {
      for (const { textKey } of marks) {
        for (const bundle of [deGenerator, enGenerator]) {
          expect(lookup(bundle, `${textKey}.title`)).toEqual(
            expect.any(String),
          );
          expect(lookup(bundle, `${textKey}.body`)).toEqual(expect.any(String));
        }
      }
    }
  });

  it('points at each element at most once per tour', () => {
    for (const marks of Object.values(TOURS)) {
      const anchors = marks.map((mark) => mark.anchor);
      expect(new Set(anchors).size).toBe(anchors.length);
    }
  });
});
