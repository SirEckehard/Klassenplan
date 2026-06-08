// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import SeatingPlanHeader from '@/components/SeatingPlanGenerator/SeatingPlanHeader';
import PlanControls from '@/components/SeatingPlanGenerator/PlanControls';
import Seo from '@/components/Seo';
import { usePageSeo } from '@/hooks/usePageSeo';
import PostUpdateNotice from '@/components/ui/feedback/PostUpdateNotice';

// Compound components
const SeatingPlanGeneratorCompound = {
  Header: SeatingPlanHeader,
  Controls: PlanControls,
};

// Main exported component (provider is now at app level)
export default function SeatingPlanGenerator() {
  const metadata = usePageSeo('/generator');
  return (
    <>
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'WebApplication',
          name: 'Klassenplan – Sitzplan-Generator',
          description: metadata.description,
          applicationCategory: 'EducationApplication',
          applicationSubCategory: 'Classroom Management',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          featureList: [
            'Intelligenter Mischalgorithmus',
            'Pädagogische Kriterien (Konzentration, Unruhe, Wunschpartner)',
            'PDF-Export',
            'CSV-Import',
            'Datenschutzkonform – alle Daten lokal im Browser',
          ],
        }}
      />
      <main id="main" tabIndex={-1} className="min-h-[80vh] bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-12">
        <div className="mx-auto max-w-7xl dark:text-gray-100">
          <PostUpdateNotice />
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
