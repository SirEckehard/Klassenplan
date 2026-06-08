// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student, SeatingArrangement } from './base';

/**
 * Available circle arrangement algorithms
 */
export type CircleArrangementMode = 'preserve-neighbors'; // Only neighborhood preservation mode

/**
 * Individual student position in the circle
 */
export type CircleStudentPosition = {
  student: Student;
  angle: number; // Angle in degrees around the circle (0-360°)
  x: number; // Calculated SVG x position
  y: number; // Calculated SVG Y position
  preservedNeighbors: string[]; // IDs of preserved neighbors from the table layout
  lostNeighbors: string[]; // IDs of neighbors lost in the circle layout
  newNeighbors: string[]; // IDs of neighbors gained in the circle layout
};

/**
 * Neighborhood relationship from table layout
 */
export type NeighborhoodPair = {
  student1Id: string;
  student2Id: string;
  strength: number; // Strength score between 0-1 representing neighborhood closeness
  preserved: boolean; // Whether the pair remains adjacent in the circle
};

/**
 * Complete circle layout configuration and results
 */
export type CircleLayout = {
  // Arrangement results
  students: CircleStudentPosition[];

  // Geometry
  radius: {
    horizontal: number; // Horizontal radius of the oval
    vertical: number; // Vertical radius of the oval
  };
  center: { x: number; y: number };

  // Statistics
  preservedNeighborhoods: number; // Count of preserved neighborhoods
  totalOriginalNeighborhoods: number; // Count of neighborhoods in the original seating layout
  newNeighborhoods: number; // Count of neighborhoods created in the circle layout
  preservationRate: number; // Preservation rate between 0-1

  // Configuration used
  mode: CircleArrangementMode;
  timestamp: number;

  // Detailed neighborhood analysis
  neighborhoodPairs: NeighborhoodPair[];
};

/**
 * Configuration for circle generation algorithms
 */
export type CircleGenerationOptions = {
  mode: CircleArrangementMode;
};

/**
 * Result of neighborhood analysis from table layout
 */
export type NeighborhoodAnalysis = {
  totalStudents: number;
  neighborhoodPairs: NeighborhoodPair[];
  studentNeighborMap: Map<string, string[]>; // Mapping of studentId to neighborIds
  studentPartnerMap?: Map<string, string[]>; // Mapping of studentId to direct table partners
  averageNeighbors: number;
  isolatedStudents: string[]; // Students without direct neighbors
  // Additional properties for reporting
  originalNeighborhoods?: Array<{ student1: string; student2: string }>;
  circleNeighborhoods?: Array<{ student1: string; student2: string }>;
  preservedNeighborhoods?: number;
  totalOriginalNeighborhoods?: number;
  newNeighborhoods?: number;
  preservationRate?: number;
  preservedPairs?: Array<{ student1: string; student2: string }>;
};

/**
 * Export data for circle layouts
 */
export type CircleExportData = {
  exportType: 'circle-only' | 'dual-layout';
  circleLayout: CircleLayout;
  tableLayout?: SeatingArrangement; // Reference to original table layout
  comparisonReport: {
    recommendedFor: string[]; // Suggested use cases (e.g., conversation circle)
    warnings: string[]; // Potential drawbacks (e.g., neighbors lost)
    benefits: string[]; // Highlights of the generated layout
    statisticsSummary: string; // Summary of neighborhood preservation statistics
  };
  timestamp: number;
  metadata: {
    generatedBy: string;
    version: string;
    classSize: number;
  };
};

export type CircleGenerationStatus = {
  progress: number;
  stage?: string;
  message?: string;
  startedAt: number;
  updatedAt: number;
};
