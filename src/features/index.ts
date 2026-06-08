/**
 * Features - Main Index
 *
 * Re-exports all feature modules for convenient access.
 * Prefer importing from specific feature modules for tree-shaking.
 *
 * @example
 * // Preferred: Import from specific feature
 * import { SimpleCircleView } from '@/features/circle';
 *
 * // Alternative: Import from main features index
 * import { circle, students, seating } from '@/features';
 */

export * as circle from './circle';
export * as students from './students';
export * as classroom from './classroom';
export * as seating from './seating';
