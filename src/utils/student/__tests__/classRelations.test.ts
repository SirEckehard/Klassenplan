// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { createMockStudent } from '@/__tests__/utils';
import { describeClassRelations } from '../classRelations';

const ids = (students: { id: string }[]) => students.map(({ id }) => id);

describe('describeClassRelations', () => {
  const students = [
    createMockStudent({ id: 'emma', wishPartnerIds: ['aylin', 'lea'] }),
    createMockStudent({
      id: 'ben',
      wishPartnerIds: ['aylin'],
      avoidPartnerIds: ['luca'],
    }),
    createMockStudent({
      id: 'aylin',
      wishPartnerIds: ['emma'],
      avoidPartnerIds: ['ben'],
    }),
    createMockStudent({ id: 'lea', wishPartnerIds: ['emma'] }),
    createMockStudent({ id: 'luca', wishPartnerIds: ['ben', 'gone'] }),
    createMockStudent({ id: 'elif' }),
  ];
  const relations = describeClassRelations(students);

  it('keeps the wishes in their order and notes who named whom', () => {
    expect(relations.byId.get('emma')?.wishes).toEqual(['aylin', 'lea']);
    expect(relations.byId.get('aylin')?.namedBy).toEqual(['emma', 'ben']);
    expect(relations.byId.get('emma')?.mutual).toEqual(
      new Set(['aylin', 'lea']),
    );
  });

  it('finds a wish the other side keeps apart from, either way round', () => {
    expect(
      relations.contradictions.map(({ from, to }) => [from.id, to.id]),
    ).toEqual([
      ['ben', 'aylin'],
      ['luca', 'ben'],
    ]);
    expect(relations.byId.get('aylin')?.inContradiction).toBe(true);
    expect(relations.byId.get('luca')?.inContradiction).toBe(true);
    expect(relations.byId.get('emma')?.inContradiction).toBe(false);
  });

  it('names who nobody named and who named nobody', () => {
    expect(ids(relations.namedByNobody)).toEqual(['luca', 'elif']);
    expect(ids(relations.withoutWish)).toEqual(['elif']);
  });

  it('counts a mutual pair once', () => {
    expect(relations.mutualPairs.map(([a, b]) => [a.id, b.id])).toEqual([
      ['emma', 'aylin'],
      ['emma', 'lea'],
    ]);
  });

  // A partner who has left the class leaves the id behind in the record.
  it('leaves out a partner who is no longer in the class', () => {
    expect(relations.byId.get('luca')?.wishes).toEqual(['ben']);
  });

  it('says nobody is unnamed in a class without a wish', () => {
    const quiet = describeClassRelations([
      createMockStudent({ id: 'a', avoidPartnerIds: ['b'] }),
      createMockStudent({ id: 'b' }),
    ]);
    expect(quiet.hasAny).toBe(true);
    expect(quiet.namedByNobody).toEqual([]);
    expect(describeClassRelations([createMockStudent({})]).hasAny).toBe(false);
  });
});
