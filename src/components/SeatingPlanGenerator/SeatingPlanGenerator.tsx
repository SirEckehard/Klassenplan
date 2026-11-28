// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/shell/AppShell';
import PlanControls from '@/components/SeatingPlanGenerator/PlanControls';
import Seo from '@/components/Seo';
import { usePageSeo } from '@/hooks/usePageSeo';
import PostUpdateNotice from '@/components/ui/feedback/PostUpdateNotice';
import BackupReminder from '@/components/ui/feedback/BackupReminder';
import MarkerReviewReminder from '@/components/ui/feedback/MarkerReviewReminder';

// Compound components. The header and the status bar belong to `AppShell`,
// which frames every layer; only the layer itself is composed here.
const SeatingPlanGeneratorCompound = {
  Controls: PlanControls,
};

// The `featureList` entries a crawler reads. Kept as keys so the prerendered
// /en/generator page ships English structured data instead of the German
// original.
const SCHEMA_FEATURE_KEYS = [
  'generator.schema.featureAlgorithm',
  'generator.schema.featureCriteria',
  'generator.schema.featurePdfExport',
  'generator.schema.featureCsvImport',
  'generator.schema.featurePrivacy',
] as const;

// Main exported component (provider is now at app level)
export default function SeatingPlanGenerator() {
  const metadata = usePageSeo('/generator');
  const { t } = useTranslation('pages');
  return (
    <>
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'WebApplication',
          name: t('generator.schema.name'),
          description: metadata.description,
          applicationCategory: 'EducationApplication',
          applicationSubCategory: 'Classroom Management',
          operatingSystem: 'Web',
          inLanguage: metadata.lang,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          featureList: SCHEMA_FEATURE_KEYS.map((key) => t(key)),
        }}
      />
      <AppShell>
        {/* Transient notices above the layer. They keep a gutter of their own:
            the shell has none from `lg` up, where its columns are the margins.
            `empty:hidden` keeps the gutter from showing when none fires. One
            at a time, in this order — each renders nothing until it is due,
            so the first child is the one to show: stacked, they pushed the
            plan off a phone (review of 2026-11-14). */}
        <div
          className="empty:hidden lg:px-5 lg:pt-5 *:not-first:hidden"
          data-workspace-notices=""
        >
          <PostUpdateNotice />
          <BackupReminder />
          <MarkerReviewReminder />
        </div>
        <SeatingPlanGenerator.Controls />
      </AppShell>
    </>
  );
}

// Attach compound components to main component
SeatingPlanGenerator.Controls = SeatingPlanGeneratorCompound.Controls;
