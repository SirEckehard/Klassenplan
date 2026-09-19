// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { createMockStudent } from '@/__tests__/utils';
import {
  getWishPartnerIds,
  getAvoidPartnerIds,
  isWishPair,
  isMutualWish,
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

    it('is wider than a mutual wish', () => {
      expect(isMutualWish(alice, bob)).toBe(false);
      expect(isWishPair(alice, bob)).toBe(true);
    });
  });
});
