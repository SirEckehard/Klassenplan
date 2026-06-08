import type { ScoringContext } from './scoringContext';
import type { SocialRole } from '@/types';

/**
 * Social role configurations for balanced distribution.
 * Goal: Distribute social roles evenly across tables to create balanced group dynamics.
 */
const SOCIAL_ROLE_IMPACT: Record<
  SocialRole,
  { type: 'positive' | 'challenging' | 'neutral'; weight: number }
> = {
  mediator: { type: 'positive', weight: 1.0 }, // Helps resolve conflicts
  leader: { type: 'positive', weight: 0.8 }, // Provides direction
  loner: { type: 'neutral', weight: 0.7 }, // Independent; benefits from nearby mediators but is not inherently challenging
  socialHub: { type: 'positive', weight: 0.6 }, // Creates connections
};

/**
 * Score social role distribution to create balanced table dynamics.
 * - Avoids clustering the same roles at one table
 * - Ensures positive influence students are distributed
 * - Pairs loners with supportive roles where possible
 */
export function scoreSocialRoles(context: ScoringContext): number {
  const weight = context.settings.distributeSocialRoles ?? 0;
  if (weight === 0) return 0;

  const studentRole = context.student.socialRole;
  if (!studentRole) return 0;

  const table = context.arrangement[context.tableIndex];
  if (!table) return 0;

  let score = 0;
  const neighbors = table.filter((s) => s !== null && s.socialRole);

  // Check what roles already exist at this table
  const existingRoles = new Map<SocialRole, number>();
  for (const neighbor of neighbors) {
    const role = neighbor?.socialRole;
    if (role) {
      existingRoles.set(role, (existingRoles.get(role) ?? 0) + 1);
    }
  }

  // Avoid clustering same roles (except mediators who help balance)
  const sameRoleCount = existingRoles.get(studentRole) ?? 0;
  if (sameRoleCount > 0 && studentRole !== 'mediator') {
    score += weight * 0.5 * sameRoleCount; // Penalty for clustering
  }

  // Loners benefit from having mediators or social hubs nearby
  if (studentRole === 'loner') {
    const hasMediator = existingRoles.has('mediator');
    const hasSocialHub = existingRoles.has('socialHub');
    if (hasMediator || hasSocialHub) {
      score -= weight * 0.4; // Reward: supportive environment
    }
    // Avoid pairing multiple loners
    const lonerCount = existingRoles.get('loner') ?? 0;
    if (lonerCount > 0) {
      score += weight * 0.6; // Strong penalty
    }
  }

  // Leaders work well with mediators but may clash with other leaders
  if (studentRole === 'leader') {
    const hasMediator = existingRoles.has('mediator');
    const leaderCount = existingRoles.get('leader') ?? 0;
    if (hasMediator) {
      score -= weight * 0.3; // Good combination
    }
    if (leaderCount > 0) {
      score += weight * 0.5; // Potential conflict
    }
  }

  // Mediators are valuable everywhere, but distribute them
  if (studentRole === 'mediator') {
    const mediatorCount = existingRoles.get('mediator') ?? 0;
    if (mediatorCount > 0) {
      score += weight * 0.3; // Spread them out
    }
    // Mediators work well near leaders and loners who benefit from calm support
    const hasLoner = existingRoles.has('loner');
    const hasLeader = existingRoles.has('leader');
    if (hasLoner || hasLeader) {
      score -= weight * 0.4; // Reward: mediators complement independent or assertive roles
    }
  }

  return score;
}

/**
 * Check if a student has a positive social influence role.
 */
export function hasPositiveSocialRole(role: SocialRole | undefined): boolean {
  if (!role) return false;
  return SOCIAL_ROLE_IMPACT[role].type === 'positive';
}

/**
 * Check if a student has a challenging social role.
 */
export function hasChallengingSocialRole(
  role: SocialRole | undefined,
): boolean {
  if (!role) return false;
  return SOCIAL_ROLE_IMPACT[role].type === 'challenging';
}
