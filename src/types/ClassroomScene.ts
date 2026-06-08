/**
 * Available table template types for classroom layout
 * - 'single': Individual desk (1 seat)
 * - 'double': Pair desk (2 seats)
 * - 'group4': Small group table (4 seats)
 * - 'group6': Large group table (6 seats)
 */
export type TableTemplateType = 'double' | 'single' | 'group4' | 'group6';

export type ClassroomFeatureType = 'window' | 'door' | 'board' | 'podium';

export type ClassroomFeatureAnchor =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'free';

export interface ClassroomFeature {
  /** Unique identifier for the feature */
  id: string;
  /** Feature type (window or door) */
  type: ClassroomFeatureType;
  /** Whether the feature should be rendered */
  visible?: boolean;
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Movement constraint anchor */
  anchor: ClassroomFeatureAnchor;
  /** Whether the element may be repositioned freely */
  movable: boolean;
  /** Optional label shown in the UI */
  label?: string;
  /** Optional rotation in degrees for orientation */
  rotation?: number;
}

/**
 * Represents a table in the classroom layout
 */
export interface ClassroomTable {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Rotation angle in degrees */
  rotation: number;
  /** Number of available seats */
  seatCount: number;
  /** Whether the table position is locked */
  locked: boolean;
  /** Z-index for layering */
  zIndex: number;
  /** Table template type */
  templateType?: TableTemplateType;
}

/**
 * Complete classroom scene configuration
 */
export interface ClassroomScene {
  tables: ClassroomTable[];
  totalStudents: number;
  /** Optional structural features such as windows or doors */
  features?: ClassroomFeature[];
}
