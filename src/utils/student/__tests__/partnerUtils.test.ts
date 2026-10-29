// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { createMockStudent } from '@/__tests__/utils';
import {
  dropMissingPartners,
  getWishPartnerIds,
  getAvoidPartnerIds,
  isWishPair,
  withoutPartners,
} from '../partnerUtils';

describe('partnerUtils', () => {
  describe('getWishPartnerIds', () => {
    it('reads the list', () => {
      const student = createMockStudent({ wishPartnerIds: ['a', 'b'] });
      expect(getWishPartnerIds(student)).toEqual(['a', 'b']);
    });

    it('falls back to the legacy single-value field', () => {
      const student = createMockStudent({
        wishPartnerId: 'a',
        wishPartnerIds: [],
      });
      expect(getWishPartnerIds(student)).toEqual(['a']);
    });

    it('prefers the list over the legacy field', () => {
      const student = createMockStudent({
        wishPartnerId: 'a',
        wishPartnerIds: ['b'],
      });
      expect(getWishPartnerIds(student)).toEqual(['b']);
    });

    it('returns an empty list for a record that carries neither', () => {
      expect(getWishPartnerIds(createMockStudent())).toEqual([]);
    });

    // A hand-edited backup can put anything in there; callers iterate the result
    it('ignores a list field that is not a list', () => {
      const broken = {
        ...createMockStudent({ wishPartnerId: 'a' }),
        wishPartnerIds: 'b' as unknown as string[],
      };
      expect(getWishPartnerIds(broken)).toEqual(['a']);
    });
  });

  describe('getAvoidPartnerIds', () => {
    it('reads the list before the legacy field', () => {
      const student = createMockStudent({
        avoidPartnerId: 'a',
        avoidPartnerIds: ['b', 'c'],
      });
      expect(getAvoidPartnerIds(student)).toEqual(['b', 'c']);
    });
  });

  describe('isWishPair', () => {
    const alice = createMockStudent({ id: 'alice', wishPartnerIds: ['bob'] });
    const bob = createMockStudent({ id: 'bob' });

    it('holds when only one side wrote the wish down', () => {
      expect(isWishPair(alice, bob)).toBe(true);
      expect(isWishPair(bob, alice)).toBe(true);
    });

    it('is false when neither side wishes for the other', () => {
      expect(isWishPair(bob, createMockStudent({ id: 'carl' }))).toBe(false);
    });
  });

  describe('withoutPartners', () => {
    it('takes the gone students out of both lists, the legacy fields too', () => {
      const anna = createMockStudent({
        id: 'anna',
        wishPartnerIds: ['ben', 'cem'],
        wishPartnerId: 'ben',
        avoidPartnerIds: ['ben'],
        avoidPartnerId: 'ben',
      });

      const [after] = withoutPartners([anna], new Set(['ben']));

      expect(after).toMatchObject({
        wishPartnerIds: ['cem'],
        wishPartnerId: 'cem',
        avoidPartnerIds: [],
        avoidPartnerId: null,
      });
    });

    it('clears a link kept only in the legacy field', () => {
      const anna = createMockStudent({ id: 'anna', wishPartnerId: 'ben' });

      const [after] = withoutPartners([anna], new Set(['ben']));

      expect(getWishPartnerIds(after!)).toEqual([]);
    });

    it('returns the same list when nobody named them', () => {
      const students = [
        createMockStudent({ id: 'anna', wishPartnerIds: ['cem'] }),
        createMockStudent({ id: 'cem' }),
      ];

      expect(withoutPartners(students, new Set(['ben']))).toBe(students);
    });
  });

  describe('dropMissingPartners', () => {
    it('drops the links to students no longer in the class', () => {
      const students = [
        createMockStudent({ id: 'anna', wishPartnerIds: ['gone', 'cem'] }),
        createMockStudent({ id: 'cem', avoidPartnerIds: ['gone'] }),
      ];

      const after = dropMissingPartners(students);

      expect(getWishPartnerIds(after[0]!)).toEqual(['cem']);
      expect(getAvoidPartnerIds(after[1]!)).toEqual([]);
    });
  });
});
