import { useState, useRef } from 'react';

/**
 * State management hook for StudentRow component
 *
 * Centralizes all UI state for name editing and dropdown interactions.
 * This hook reduces complexity in StudentRow by extracting state logic.
 *
 * @returns Object containing state values and refs
 *
 * @example
 * ```tsx
 * const rowState = useStudentRowState();
 *
 * // Name editing
 * rowState.setIsEditing(true);
 * rowState.setDraftName('New Name');
 *
 * // Dropdown control
 * rowState.setShowPartnerDropdown(true);
 * ```
 */
export function useStudentRowState() {
  // Name editing state
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  // Dropdown visibility state
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [showAvoidDropdown, setShowAvoidDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showHeightDropdown, setShowHeightDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showSocialRoleDropdown, setShowSocialRoleDropdown] = useState(false);

  // Refs for click-outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avoidDropdownRef = useRef<HTMLDivElement>(null);
  const genderDropdownRef = useRef<HTMLDivElement>(null);
  const heightDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const socialRoleDropdownRef = useRef<HTMLDivElement>(null);

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
    showGenderDropdown,
    setShowGenderDropdown,
    showHeightDropdown,
    setShowHeightDropdown,
    showLanguageDropdown,
    setShowLanguageDropdown,
    showSocialRoleDropdown,
    setShowSocialRoleDropdown,

    // Refs
    dropdownRef,
    avoidDropdownRef,
    genderDropdownRef,
    heightDropdownRef,
    languageDropdownRef,
    socialRoleDropdownRef,
  };
}
