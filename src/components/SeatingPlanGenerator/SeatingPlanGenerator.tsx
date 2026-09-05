// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import SeatingPlanHeader from '@/components/SeatingPlanGenerator/SeatingPlanHeader';
import PlanControls from '@/components/SeatingPlanGenerator/PlanControls';
import Seo from '@/components/Seo';
import { usePageSeo } from '@/hooks/usePageSeo';
import PostUpdateNotice from '@/components/ui/feedback/PostUpdateNotice';
import BackupReminder from '@/components/ui/feedback/BackupReminder';

// Compound components
const SeatingPlanGeneratorCompound = {
  Header: SeatingPlanHeader,
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
      <main
        id="main"
        tabIndex={-1}
        className="min-h-[80vh] bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-12"
      >
        <div className="mx-auto max-w-7xl dark:text-gray-100">
          <PostUpdateNotice />
          <BackupReminder />
          <SeatingPlanGenerator.Header />
          <SeatingPlanGenerator.Controls />
        </div>
      </main>
    </>
  );
}

// Attach compound components to main component
SeatingPlanGenerator.Header = SeatingPlanGeneratorCompound.Header;
SeatingPlanGenerator.Controls = SeatingPlanGeneratorCompound.Controls;
