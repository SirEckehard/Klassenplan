// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useRef } from 'react';

/**
 * The inspector's own UI state: editing the name, and the two partner lists.
 *
 * Everything else a student has is a switch or a chip group now and needs no
 * state of its own — the four dropdowns for gender, height, language level and
 * social role went with the variants that used them.
 */
export function useStudentRowState() {
  // Name editing state
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  // Dropdown visibility state
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [showAvoidDropdown, setShowAvoidDropdown] = useState(false);

  // Refs for click-outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avoidDropdownRef = useRef<HTMLDivElement>(null);

  return {
    // Name editing
    isEditing,
    setIsEditing,
    draftName,
    setDraftName,

    // Dropdowns
    showPartnerDropdown,
    setShowPartnerDropdown,
    showAvoidDropdown,
    setShowAvoidDropdown,

    // Refs
    dropdownRef,
    avoidDropdownRef,
  };
}
