// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import PartnerListSelector, {
  type PartnerListSelectorProps,
} from './PartnerListSelector';

/**
 * The classmates a student should sit apart from (Distanzwunsch), up to
 * MAX_PARTNER_WISHES in order of priority.
 */
export default function AvoidPartnerSelector(props: PartnerListSelectorProps) {
  return <PartnerListSelector kind="avoid" {...props} />;
}
