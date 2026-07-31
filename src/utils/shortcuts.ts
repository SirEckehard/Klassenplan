// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export type Shortcut = {
  keysKey: string;
  descriptionKey: string;
};

export type ShortcutContext =
  'students' | 'layout' | 'plan' | 'circle' | 'export' | 'global';

export const shortcutContextLabels: Record<ShortcutContext, string> = {
  global: 'shortcuts.labels.global',
  students: 'shortcuts.labels.students',
  layout: 'shortcuts.labels.layout',
  plan: 'shortcuts.labels.plan',
  circle: 'shortcuts.labels.circle',
  export: 'shortcuts.labels.export',
};

export const shortcutMap: Record<ShortcutContext, Shortcut[]> = {
  global: [
    {
      keysKey: 'shortcuts.keys.global_toggleHelp',
      descriptionKey: 'shortcuts.descriptions.global_toggleHelp',
    },
    {
      keysKey: 'shortcuts.keys.global_closeDialog',
      descriptionKey: 'shortcuts.descriptions.global_closeDialog',
    },
    {
      keysKey: 'shortcuts.keys.global_toggleSidebar',
      descriptionKey: 'shortcuts.descriptions.global_toggleSidebar',
    },
  ],
  students: [
    {
      keysKey: 'shortcuts.keys.students_addStudent',
      descriptionKey: 'shortcuts.descriptions.students_addStudent',
    },
    {
      keysKey: 'shortcuts.keys.students_toClassroom',
      descriptionKey: 'shortcuts.descriptions.students_toClassroom',
    },
  ],
  layout: [
    {
      keysKey: 'shortcuts.keys.layout_toStudentList',
      descriptionKey: 'shortcuts.descriptions.layout_toStudentList',
    },
    {
      keysKey: 'shortcuts.keys.layout_toSeatingPlan',
      descriptionKey: 'shortcuts.descriptions.layout_toSeatingPlan',
    },
    {
      keysKey: 'shortcuts.keys.layout_toggleQuickSetup',
      descriptionKey: 'shortcuts.descriptions.layout_toggleQuickSetup',
    },
    {
      keysKey: 'shortcuts.keys.layout_multiSelect',
      descriptionKey: 'shortcuts.descriptions.layout_multiSelect',
    },
    {
      keysKey: 'shortcuts.keys.layout_moveTables',
      descriptionKey: 'shortcuts.descriptions.layout_moveTables',
    },
    {
      keysKey: 'shortcuts.keys.layout_deleteTables',
      descriptionKey: 'shortcuts.descriptions.layout_deleteTables',
    },
    {
      keysKey: 'shortcuts.keys.layout_cutTables',
      descriptionKey: 'shortcuts.descriptions.layout_cutTables',
    },
    {
      keysKey: 'shortcuts.keys.layout_copyTables',
      descriptionKey: 'shortcuts.descriptions.layout_copyTables',
    },
    {
      keysKey: 'shortcuts.keys.layout_pasteTables',
      descriptionKey: 'shortcuts.descriptions.layout_pasteTables',
    },
    {
      keysKey: 'shortcuts.keys.layout_rotateLeftRight',
      descriptionKey: 'shortcuts.descriptions.layout_rotateLeftRight',
    },
    {
      keysKey: 'shortcuts.keys.layout_rotate90',
      descriptionKey: 'shortcuts.descriptions.layout_rotate90',
    },
    {
      keysKey: 'shortcuts.keys.layout_undo',
      descriptionKey: 'shortcuts.descriptions.layout_undo',
    },
  ],
  plan: [
    {
      keysKey: 'shortcuts.keys.plan_toClassroom',
      descriptionKey: 'shortcuts.descriptions.plan_toClassroom',
    },
    {
      keysKey: 'shortcuts.keys.plan_shuffle',
      descriptionKey: 'shortcuts.descriptions.plan_shuffle',
    },
    {
      keysKey: 'shortcuts.keys.plan_savePlan',
      descriptionKey: 'shortcuts.descriptions.plan_savePlan',
    },
    {
      keysKey: 'shortcuts.keys.plan_openExport',
      descriptionKey: 'shortcuts.descriptions.plan_openExport',
    },
    {
      keysKey: 'shortcuts.keys.plan_undo',
      descriptionKey: 'shortcuts.descriptions.plan_undo',
    },
    {
      keysKey: 'shortcuts.keys.plan_redo',
      descriptionKey: 'shortcuts.descriptions.plan_redo',
    },
  ],
  circle: [
    {
      keysKey: 'shortcuts.keys.circle_toClassroom',
      descriptionKey: 'shortcuts.descriptions.circle_toClassroom',
    },
    {
      keysKey: 'shortcuts.keys.circle_toggleConnections',
      descriptionKey: 'shortcuts.descriptions.circle_toggleConnections',
    },
    {
      keysKey: 'shortcuts.keys.circle_moveStudent',
      descriptionKey: 'shortcuts.descriptions.circle_moveStudent',
    },
    {
      keysKey: 'shortcuts.keys.circle_saveCircle',
      descriptionKey: 'shortcuts.descriptions.circle_saveCircle',
    },
    {
      keysKey: 'shortcuts.keys.circle_openExport',
      descriptionKey: 'shortcuts.descriptions.circle_openExport',
    },
    {
      keysKey: 'shortcuts.keys.plan_undo',
      descriptionKey: 'shortcuts.descriptions.plan_undo',
    },
    {
      keysKey: 'shortcuts.keys.plan_redo',
      descriptionKey: 'shortcuts.descriptions.plan_redo',
    },
  ],
  export: [
    {
      keysKey: 'shortcuts.keys.export_backToPlan',
      descriptionKey: 'shortcuts.descriptions.export_backToPlan',
    },
    {
      keysKey: 'shortcuts.keys.export_exportPdf',
      descriptionKey: 'shortcuts.descriptions.export_exportPdf',
    },
    {
      keysKey: 'shortcuts.keys.export_exportCirclePdf',
      descriptionKey: 'shortcuts.descriptions.export_exportCirclePdf',
    },
    {
      keysKey: 'shortcuts.keys.export_exportPng',
      descriptionKey: 'shortcuts.descriptions.export_exportPng',
    },
    {
      keysKey: 'shortcuts.keys.export_print',
      descriptionKey: 'shortcuts.descriptions.export_print',
    },
  ],
};
