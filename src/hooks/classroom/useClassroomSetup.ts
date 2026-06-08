// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Student,
  ClassroomScene,
  TableTemplateType,
  ClassroomTemplate,
} from '@/types';
import { getTablePresets } from '@/utils';
import arrangeTables from '@/utils/algorithm/autoArrange';

export interface UseClassroomSetupOptions {
  /**
   * Current students array
   */
  students: Student[];
  /**
   * Optional externally managed templates. When provided the hook stays in sync
   * with that list instead of loading templates on its own.
   */
  templates?: ClassroomTemplate[];
  /**
   * Current classroom scene
   */
  classroomScene: ClassroomScene;
  /**
   * Update classroom scene
   */
  setClassroomScene: React.Dispatch<React.SetStateAction<ClassroomScene>>;
  /**
   * Function to load available templates (optional if templates prop is provided)
   */
  loadTemplate?: () => Promise<ClassroomTemplate[]>;
  /**
   * Currently selected template ID (controlled from outside)
   */
  selectedTemplate: number | null;
  /**
   * If true, disables automatic table generation on student count change
   * @default false
   */
  disableAutoGeneration?: boolean;
}

export interface UseClassroomSetupReturn {
  /**
   * Current table template type
   */
  currentType: TableTemplateType;
  /**
   * Number of seats per table
   */
  seatsPerTable: number;
  /**
   * Number of tables needed
   */
  tableCount: number;
  /**
   * Total number of seats
   */
  totalSeats: number;
  /**
   * Available classroom templates
   */
  templates: ClassroomTemplate[];
  /**
   * Currently selected template ID (null for auto-generated)
   */
  selectedTemplate: number | null;
  /**
   * Change the selected template
   */
  handleTemplateChange: (templateId: number | null) => void;
  /**
   * Change the table type (auto-generates new layout)
   * @param type - The table template type to use
   * @param force - If true, generates tables even when a template is selected
   */
  handleTypeChange: (type: TableTemplateType, force?: boolean) => void;
  /**
   * Manually trigger classroom setup with specified table type
   * Generates tables based on student count
   */
  triggerQuickSetup: (type: TableTemplateType) => void;
}

/**
 * Hook for managing classroom setup (tables, templates, layout).
 * Supports both automatic and manual table generation.
 */
export function useClassroomSetup(
  options: UseClassroomSetupOptions,
): UseClassroomSetupReturn {
  const {
    students,
    templates: externalTemplates,
    classroomScene,
    setClassroomScene,
    loadTemplate,
    selectedTemplate,
    disableAutoGeneration = false,
  } = options;

  const [templatesState, setTemplatesState] = useState<ClassroomTemplate[]>([]);
  const templates = externalTemplates ?? templatesState;

  // Load available templates when component mounts
  useEffect(() => {
    if (externalTemplates) {
      return;
    }

    if (loadTemplate) {
      void loadTemplate().then(setTemplatesState);
    }
  }, [externalTemplates, loadTemplate]);

  // Get current table type
  const currentType = classroomScene.tables[0]?.templateType ?? 'double';

  // Calculate seats per table based on current type
  const seatsPerTable = useMemo(() => {
    return getTablePresets()[currentType].seatCount;
  }, [currentType]);

  // Calculate default table count and seats
  const defaultTableCount = Math.ceil(students.length / seatsPerTable);
  const defaultTotalSeats = defaultTableCount * seatsPerTable;

  // Calculate actual table count and seats (considering template selection)
  const tableCount = useMemo(() => {
    return selectedTemplate !== null
      ? classroomScene.tables.length
      : defaultTableCount;
  }, [selectedTemplate, classroomScene.tables.length, defaultTableCount]);

  const totalSeats = useMemo(() => {
    return selectedTemplate !== null
      ? classroomScene.tables.reduce((sum, t) => sum + t.seatCount, 0)
      : defaultTotalSeats;
  }, [selectedTemplate, classroomScene.tables, defaultTotalSeats]);

  // Ensure table setup matches student count and selected type
  const ensureTables = useCallback(
    (type: TableTemplateType) => {
      const preset = getTablePresets()[type];
      setClassroomScene((prev) => {
        const needed = Math.ceil(students.length / preset.seatCount);
        const tables = arrangeTables(type, needed);
        return { ...prev, totalStudents: students.length, tables };
      });
    },
    [students.length, setClassroomScene],
  );

  // Auto-update tables when student count or type changes (if no template selected)
  // Can be disabled via disableAutoGeneration option
  useEffect(() => {
    if (disableAutoGeneration) return;

    if (students.length === 0) {
      setClassroomScene((prev) => ({ ...prev, totalStudents: 0, tables: [] }));
      return;
    }
    if (selectedTemplate !== null) return;
    ensureTables(currentType);
  }, [
    students.length,
    currentType,
    setClassroomScene,
    ensureTables,
    selectedTemplate,
    disableAutoGeneration,
  ]);

  // Handle template selection change
  // Note: selectedTemplate state is managed externally, this only updates the scene
  const handleTemplateChange = useCallback(
    (templateId: number | null) => {
      if (templateId === null) {
        // Switch to standard layout - clear the classroom scene
        setClassroomScene((prev) => ({ ...prev, tables: [] }));
        return;
      }
      // Load template immediately
      const tmpl = templates.find((t) => t.id === templateId);
      if (tmpl) setClassroomScene(tmpl.scene);
    },
    [templates, setClassroomScene],
  );

  // Handle table type change
  const handleTypeChange = useCallback(
    (type: TableTemplateType, force = false) => {
      // Generate tables if no template is selected OR force is true
      if (force || selectedTemplate === null) {
        ensureTables(type);
      }
    },
    [ensureTables, selectedTemplate],
  );

  // Manually trigger classroom setup (for Quick Setup)
  const triggerQuickSetup = useCallback(
    (type: TableTemplateType) => {
      if (students.length === 0) {
        return; // Cannot setup without students
      }
      // Note: Template state is managed externally
      ensureTables(type);
    },
    [students.length, ensureTables],
  );

  return {
    currentType,
    seatsPerTable,
    tableCount,
    totalSeats,
    templates,
    selectedTemplate,
    handleTemplateChange,
    handleTypeChange,
    triggerQuickSetup,
  };
}
