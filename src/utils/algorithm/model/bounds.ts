// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What the room and the class allow at most, for the cases the fulfilment
 * counts against (decision 0031). A table group and a join of desks pushed
 * together in a row share seats — the student in the middle of a row sits at
 * the joins on either side, the one at a desk's end at the desk and at the
 * join — so neither bound may count them apart.
 */

/**
 * The most pairs that can sit at once: a matching of the largest size in a
 * graph of seats (Edmonds' blossom algorithm; a class has at most 36
 * students, so the cubic run time costs nothing).
 *
 * @param vertexCount - Number of seats; edges name them from 0
 * @param edges - The seat pairs where two students count as a pair
 */
export function maxMatching(
  vertexCount: number,
  edges: ReadonlyArray<readonly [number, number]>,
): number {
  const n = vertexCount;
  const adjacent: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    if (a === b) continue;
    adjacent[a]!.push(b);
    adjacent[b]!.push(a);
  }
  const match = new Int32Array(n).fill(-1);
  const parent = new Int32Array(n);
  const base = new Int32Array(n);
  const inTree = new Uint8Array(n);
  const inBlossom = new Uint8Array(n);
  const onPath = new Uint8Array(n);
  const queue = new Int32Array(n);

  const commonBase = (first: number, second: number): number => {
    onPath.fill(0);
    let a = first;
    for (;;) {
      a = base[a]!;
      onPath[a] = 1;
      if (match[a] === -1) break;
      a = parent[match[a]!]!;
    }
    let b = second;
    for (;;) {
      b = base[b]!;
      if (onPath[b]) return b;
      b = parent[match[b]!]!;
    }
  };

  const markBlossom = (start: number, blossomBase: number, child: number) => {
    let v = start;
    let next = child;
    while (base[v] !== blossomBase) {
      inBlossom[base[v]!] = 1;
      inBlossom[base[match[v]!]!] = 1;
      parent[v] = next;
      next = match[v]!;
      v = parent[match[v]!]!;
    }
  };

  /** The free seat an augmenting path from `root` ends at, or -1. */
  const augmentingPathEnd = (root: number): number => {
    inTree.fill(0);
    parent.fill(-1);
    for (let v = 0; v < n; v++) base[v] = v;
    inTree[root] = 1;
    let head = 0;
    let tail = 0;
    queue[tail++] = root;
    while (head < tail) {
      const v = queue[head++]!;
      for (const to of adjacent[v]!) {
        if (base[v] === base[to] || match[v] === to) continue;
        if (to === root || (match[to] !== -1 && parent[match[to]!] !== -1)) {
          const blossomBase = commonBase(v, to);
          inBlossom.fill(0);
          markBlossom(v, blossomBase, to);
          markBlossom(to, blossomBase, v);
          for (let u = 0; u < n; u++) {
            if (!inBlossom[base[u]!]) continue;
            base[u] = blossomBase;
            if (!inTree[u]) {
              inTree[u] = 1;
              queue[tail++] = u;
            }
          }
        } else if (parent[to] === -1) {
          parent[to] = v;
          if (match[to] === -1) return to;
          inTree[match[to]!] = 1;
          queue[tail++] = match[to]!;
        }
      }
    }
    return -1;
  };

  let size = 0;
  for (let root = 0; root < n; root++) {
    if (match[root] !== -1) continue;
    let v = augmentingPathEnd(root);
    if (v === -1) continue;
    size += 1;
    while (v !== -1) {
      const previous = parent[v]!;
      const following = match[previous]!;
      match[v] = previous;
      match[previous] = v;
      v = following;
    }
  }
  return size;
}

/**
 * The most units — table groups, joins of desks in a row — that can be
 * balanced at once: a unit is balanced while at least half of its seats,
 * rounded down, hold a student outside the class's largest gender, and
 * `others` such students are there to seat. A unit of fewer than two seats is
 * no case. Exact: the seats are walked unit after unit, so a unit's seats lie
 * close together, and for the units begun and not yet finished every state
 * keeps how far each has come — in a classroom a handful at most.
 *
 * @param units - The seats of every unit that hold a student of a stated gender
 * @param others - How many students outside the largest gender are seated
 */
export function mostBalancedUnits(
  units: ReadonlyArray<readonly number[]>,
  others: number,
): number {
  const cases = units.filter((seats) => seats.length >= 2);
  const unitsOf = new Map<number, number[]>();
  cases.forEach((seats, unit) => {
    for (const seat of seats) {
      const list = unitsOf.get(seat);
      if (list) list.push(unit);
      else unitsOf.set(seat, [unit]);
    }
  });

  const order: number[] = [];
  const placed = new Set<number>();
  const reached = new Uint8Array(cases.length);
  for (let start = 0; start < cases.length; start++) {
    if (reached[start]) continue;
    reached[start] = 1;
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      for (const seat of cases[queue[head]!]!) {
        if (placed.has(seat)) continue;
        placed.add(seat);
        order.push(seat);
        for (const unit of unitsOf.get(seat)!) {
          if (reached[unit]) continue;
          reached[unit] = 1;
          queue.push(unit);
        }
      }
    }
  }
  const position = new Map(order.map((seat, index) => [seat, index]));
  const last = cases.map((seats) =>
    Math.max(...seats.map((seat) => position.get(seat)!)),
  );
  const need = cases.map((seats) => Math.floor(seats.length / 2));

  type State = { used: number; progress: number[]; balanced: number };
  let states = new Map<string, State>([
    ['0|', { used: 0, progress: [], balanced: 0 }],
  ]);
  let open: number[] = [];
  order.forEach((seat, step) => {
    const touching = unitsOf.get(seat)!;
    const current = [
      ...open,
      ...touching.filter((unit) => !open.includes(unit)),
    ];
    const next = new Map<string, State>();
    for (const state of states.values()) {
      for (const take of state.used < others ? [false, true] : [false]) {
        const progress = current.map((_, index) => state.progress[index] ?? 0);
        if (take) {
          for (const unit of touching) {
            const index = current.indexOf(unit);
            progress[index] = Math.min(need[unit]!, progress[index]! + 1);
          }
        }
        let balanced = state.balanced;
        const kept: number[] = [];
        current.forEach((unit, index) => {
          if (last[unit] !== step) kept.push(progress[index]!);
          else if (progress[index]! >= need[unit]!) balanced += 1;
        });
        const used = state.used + (take ? 1 : 0);
        const key = `${used}|${kept.join(',')}`;
        const known = next.get(key);
        if (!known || known.balanced < balanced) {
          next.set(key, { used, progress: kept, balanced });
        }
      }
    }
    states = next;
    open = current.filter((unit) => last[unit] !== step);
  });

  let best = 0;
  for (const state of states.values()) best = Math.max(best, state.balanced);
  return best;
}

/**
 * The fewest pairs a group of students must form at one table when spread
 * over tables that take `capacity` of them each — evenly, a student at a time
 * to the table holding fewest of them that has room: each one more at a table
 * pairs with everyone already there, so the even spread is the least
 * (decision 0054). The tables together hold at least the group.
 *
 * @param members - How many students the group has
 * @param capacity - How many of them each table can take
 */
export function fewestPairsTogether(
  members: number,
  capacity: readonly number[],
): number {
  const counts = capacity.map(() => 0);
  let pairs = 0;
  for (let placed = 0; placed < members; placed++) {
    let best = -1;
    for (let table = 0; table < counts.length; table++) {
      if (counts[table]! >= capacity[table]!) continue;
      if (best < 0 || counts[table]! < counts[best]!) best = table;
    }
    if (best < 0) break;
    pairs += counts[best]!;
    counts[best]! += 1;
  }
  return pairs;
}
