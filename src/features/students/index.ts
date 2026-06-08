/**
 * Students Feature - Public API
 *
 * This barrel export provides a unified API for all student-related functionality.
 * Import from here for cleaner, feature-oriented imports.
 *
 * @example
 * import { StudentRow, GenderSelector, studentStyleTokens } from '@/features/students';
 */

// ===== Components =====
export { default as StudentRow } from '@/components/students/StudentRow';
export { default as GenderSelector } from '@/components/students/GenderSelector';
export { default as HeightSelector } from '@/components/students/HeightSelector';
export { default as SpecialNeedsToggles } from '@/components/students/SpecialNeedsToggles';
export { default as StudentPreferenceToggles } from '@/components/students/StudentPreferenceToggles';
export { default as StudentNameEditor } from '@/components/students/StudentNameEditor';
export { default as PartnerSelector } from '@/components/students/PartnerSelector';
export { default as AvoidPartnerSelector } from '@/components/students/AvoidPartnerSelector';
export { default as IconWithLabel } from '@/components/students/IconWithLabel';
export { default as ClassSelectionBar } from '@/components/students/ClassSelectionBar';
export { default as FloatingDropdown } from '@/components/students/FloatingDropdown';
export { default as QuickNameEntryDialog } from '@/components/students/QuickNameEntryDialog';
export { default as NameColumnSelectionDialog } from '@/components/students/NameColumnSelectionDialog';
export { default as ClassMetadataDialog } from '@/components/students/ClassMetadataDialog';

// ===== Style Tokens =====
export * from '@/components/students/studentStyleTokens';

// ===== Input Components =====
export { default as StudentInput } from '@/components/StudentInput';
export { default as StudentCsvControls } from '@/components/StudentCsvControls';

// ===== Types =====
export type { Student, SavedPlan, SeatingArrangement } from '@/types';

// ===== Utils =====
export {
  getDisplayName,
  getTooltipName,
  isNameTruncated,
  getNamePreview,
} from '@/utils';

export {
  getWishPartnerIds,
  getAvoidPartnerIds,
} from '@/utils/data/studentMigration';
