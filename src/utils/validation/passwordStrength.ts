// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/** Minimum length enforced for backup passwords (see docs/backup-format.md). */
export const MIN_BACKUP_PASSWORD_LENGTH = 8;

export type PasswordStrength = 'weak' | 'medium' | 'strong';

/**
 * Coarse strength rating for the backup password field.
 *
 * Deliberately simple and local: it is a hint for the user, not a security
 * control — the actual protection comes from PBKDF2 with 600k iterations.
 * Scores length first (the dominant factor for brute-force cost) and adds a
 * bonus for mixed character classes.
 */
export function ratePasswordStrength(password: string): PasswordStrength {
  if (password.length < MIN_BACKUP_PASSWORD_LENGTH) {
    return 'weak';
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((regex) =>
    regex.test(password),
  ).length;

  if (password.length >= 16 || (password.length >= 12 && classes >= 3)) {
    return 'strong';
  }
  if (password.length >= 12 || classes >= 3) {
    return 'medium';
  }
  return 'weak';
}
