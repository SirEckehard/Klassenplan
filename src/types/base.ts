/**
 * Base type definitions shared across the application.
 * This file contains primitive types with no circular dependencies.
 */

/**
 * Gender options for students
 */
export type Gender = 'boy' | 'girl' | 'diverse';

/**
 * Height category for students (affects front/back placement)
 */
export type HeightCategory = 'small' | 'medium' | 'tall';

/**
 * Language skill level for students (affects partner pairing)
 */
export type LanguageSkillLevel =
  | 'native' // Muttersprache Deutsch
  | 'fluent' // Fließend (C1/C2)
  | 'intermediate' // Fortgeschritten (B1/B2)
  | 'beginner' // Anfänger (A1/A2)
  | 'daz'; // DaZ-Förderung

/**
 * Social role for students (affects table/seat distribution)
 */
export type SocialRole =
  | 'mediator' // Schlichtend, beruhigend
  | 'leader' // Führungspersönlichkeit
  | 'loner' // Einzelgänger/introvertiert
  | 'socialHub'; // Beliebter Mittelpunkt

/**
 * Base student properties without performance flags
 */
interface StudentBase {
  id: string;
  name: string;
  gender?: Gender;
  height?: HeightCategory;
  restless: boolean;
  shy: boolean;
  concentrationIssues: boolean;
  needsFrontSeat: boolean;
  /**
   * @deprecated Use wishPartnerIds instead. Kept for backward compatibility during migration.
   */
  wishPartnerId?: string | null;
  /**
   * @deprecated Use avoidPartnerIds instead. Kept for backward compatibility during migration.
   */
  avoidPartnerId?: string | null;
  /**
   * Ordered list of preferred partner IDs (index 0 = highest priority).
   * Limited to MAX_PARTNER_WISHES entries in the UI.
   */
  wishPartnerIds?: string[];
  /**
   * Ordered list of partner IDs to avoid (index 0 = highest priority).
   * Limited to MAX_PARTNER_WISHES entries in the UI.
   */
  avoidPartnerIds?: string[];
  prefersWindow?: boolean;
  prefersDoor?: boolean;
  /**
   * Language skill level for partner pairing optimization.
   * undefined = not specified (no language-based constraints)
   */
  languageSkill?: LanguageSkillLevel;
  /**
   * Social role for table/seat distribution optimization.
   * undefined = neutral (no special role constraints)
   */
  socialRole?: SocialRole;
}

/**
 * Mutually exclusive performance flags
 */
type PerformanceFlags =
  | { performanceStrong: true; performanceWeak?: false }
  | { performanceStrong?: false; performanceWeak: true }
  | { performanceStrong?: false; performanceWeak?: false };

/**
 * Complete student type with all properties
 */
export type Student = StudentBase & PerformanceFlags;

/**
 * Seating arrangement types
 */
export type SeatingSeat = Student | null;
export type SeatingTable = SeatingSeat[];
export type SeatingArrangement = SeatingTable[];

/**
 * State for class collection management.
 * Defined here to avoid circular dependency between ClassManagement and SeatingPlan.
 */
export interface ClassCollectionState {
  version: number;
  activeClassId: string | null;
  classes: unknown[]; // ClassRecord[] - typed as unknown to avoid circular import
}
