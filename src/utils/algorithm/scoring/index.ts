// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Modular scoring system for seating algorithm.
 *
 * This module provides a strategy-based approach to scoring seat placements,
 * breaking down the complex scoring logic into testable, maintainable components.
 */

export * from './scoringContext';
export * from './scoringHelpers';
export * from './genderMixScoring';
export * from './partnerScoring';
export * from './specialNeedsScoring';
export * from './historyScoring';
export * from './performanceScoring';
export * from './heightScoring';
export * from './environmentScoring';
export * from './languageScoring';
export * from './socialRoleScoring';
export * from './tableScoring';
