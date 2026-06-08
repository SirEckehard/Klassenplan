import React from 'react';
import { useTranslation } from 'react-i18next';
import { HammerIcon, XIcon, TrashIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import type {
  TableTemplateType,
  ClassroomTemplate,
  ClassroomTable,
} from '@/types';
import TableTypeSelector from '@/components/ui/controls/TableTypeSelector';
import TemplateNameEditor from '@/components/ui/controls/TemplateNameEditor';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import {
  cardSurfaceClass,
  iconButtonClass,
  panelSurfaceClass,
  quietIconButtonClass,
  secondaryButtonClass,
} from '@/utils';

type ClassroomQuickSetupProps = {
  /**
   * Available classroom templates
   */
  templates: ClassroomTemplate[];
  /**
   * Currently selected template ID
   */
  selectedTemplate: number | null;
  /**
   * Handler for template selection change
   */
  onTemplateChange: (templateId: number | null) => void;
  /**
   * Current table type
   */
  currentType: TableTemplateType;
  /**
   * Handler for table type change
   */
  onTypeChange: (type: TableTemplateType, force?: boolean) => void;
  /**
   * Current scene tables (to determine if visual pre-selection should show)
   */
  sceneTables: ClassroomTable[];
  /**
   * Handler for close button click
   */
  onClose?: () => void;
  /**
   * Handler for saving current layout as template
   */
  onSaveTemplate?: () => void;
  /**
   * Handler for deleting a template
   */
  onDeleteTemplate?: (id: number) => void;
  /**
   * Handler for renaming a template
   */
  onRenameTemplate?: (
    id: number,
    newName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  /**
   * Handler for overwriting/updating a template
   */
  onOverwriteTemplate?: (id: number) => void;
  /**
   * Additional classes for the panel surface wrapper
   */
  panelClassName?: string;
};

/**
 * Quick Setup Panel for initial classroom configuration
 * Displayed when classroom is empty and needs initial setup
 */
export default function ClassroomQuickSetup({
  templates,
  selectedTemplate,
  onTemplateChange,
  currentType,
  onTypeChange,
  sceneTables,
  onClose,
  onDeleteTemplate,
  onRenameTemplate,
  onOverwriteTemplate,
  panelClassName = '',
}: ClassroomQuickSetupProps) {
  const [templatePendingDelete, setTemplatePendingDelete] =
    React.useState<ClassroomTemplate | null>(null);
  const { t } = useTranslation('generator');

  const handleClose = () => {
    onClose?.();
  };

  const hasExistingTables = sceneTables.length > 0;
  const infoMessage = hasExistingTables
    ? t(
        'quickSetup.overwriteHint',
        'Willst du dein aktuelles Layout überschreiben? Dann wähle einen Tischtyp oder eine Vorlage laden.',
      )
    : t(
        'quickSetup.hint',
        'Wähle einen Tischtyp um den Klassenraum automatisch zu erstellen oder ziehe einen Tischtyp aus der Sidebar in den Klassenraum.',
      );

  const deleteConfirmMessage = templatePendingDelete
    ? t(
        'quickSetup.deleteConfirmNamed',
        'Möchtest du die Klassenraum-Vorlage "{{name}}" wirklich löschen?',
        { name: templatePendingDelete.name },
      )
    : t(
        'quickSetup.deleteConfirm',
        'Möchtest du die Klassenraum-Vorlage wirklich löschen?',
      );

  return (
    <>
      <div
        className={`${panelSurfaceClass} relative p-6 sm:p-8 ${panelClassName}`}
      >
        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={handleClose}
            className={`${quietIconButtonClass} absolute top-3 right-3 sm:top-4 sm:right-4`}
            aria-label={t(
              'quickSetup.closeLabel',
              'Klassenraum einrichten schließen',
            )}
          >
            <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center gap-3 sm:mb-4 sm:gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-200 bg-white/80 shadow-sm dark:border-blue-900/40 dark:bg-gray-950/70">
            <HammerIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('quickSetup.title', 'Klassenraum einrichten')}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {t(
                'quickSetup.subtitle',
                'Wähle einen Tischtyp oder (falls verfügbar) eine gespeicherte Vorlage.',
              )}
            </p>
          </div>
        </div>

        {/* TableIcon Type Selector */}
        <div className="mb-4 sm:mb-6">
          <TableTypeSelector
            currentType={currentType}
            onTypeChange={(type) => {
              // Deselect template and force table generation
              onTemplateChange(null);
              onTypeChange(type, true); // force=true to generate tables immediately
            }}
            hasExistingTables={sceneTables.length > 0}
          />
        </div>

        {/* Template Management */}
        {templates.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('sidebar.templates', 'Klassenraum-Vorlagen')}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const isActive = selectedTemplate === template.id;
                const tableCount = template.scene.tables.length;
                const totalSeats = template.scene.tables.reduce(
                  (sum, t) => sum + t.seatCount,
                  0,
                );
                const cardStateClass = isActive
                  ? 'border-blue-600 bg-blue-50/90 shadow-md dark:border-blue-400 dark:bg-blue-900/30'
                  : 'border-blue-100 hover:border-blue-200 hover:shadow-md dark:border-blue-900/40 dark:bg-gray-950/70';

                return (
                  <div
                    key={template.id}
                    className={`${cardSurfaceClass} group relative border transition-all duration-200 ${cardStateClass} p-4`}
                  >
                    {/* Template InfoIcon */}
                    <div className="mb-2">
                      {onRenameTemplate ? (
                        <div
                          className={
                            isActive
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-gray-900 dark:text-gray-100'
                          }
                        >
                          <TemplateNameEditor
                            template={template}
                            allTemplates={templates}
                            onRename={onRenameTemplate}
                          />
                        </div>
                      ) : (
                        <h4
                          className={`
                        text-sm font-medium truncate
                        ${
                          isActive
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }
                      `}
                        >
                          {template.name}
                        </h4>
                      )}
                      <p
                        className={`
                      text-xs mt-1
                      ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }
                    `}
                      >
                        {tableCount} {t('template.tables', 'Tische')} •{' '}
                        {totalSeats} {t('template.seats', 'Plätze')}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onTemplateChange(template.id);
                          // Close Quick Setup after loading template
                          if (onClose) {
                            setTimeout(() => onClose(), 100);
                          }
                        }}
                        className={`${secondaryButtonClass} flex-1 px-3 py-2 text-xs`}
                      >
                        {t('quickSetup.loadButton', 'Laden')}
                      </button>
                      {onOverwriteTemplate && (
                        <button
                          type="button"
                          onClick={() => onOverwriteTemplate(template.id)}
                          className={`${iconButtonClass} p-2 text-green-600 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/30`}
                          title={t(
                            'quickSetup.overwriteTemplate',
                            'Klassenraum-Vorlage überschreiben',
                          )}
                          aria-label={t(
                            'quickSetup.overwriteTemplate',
                            'Klassenraum-Vorlage überschreiben',
                          )}
                        >
                          <FloppyDiskIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteTemplate && (
                        <button
                          type="button"
                          onClick={() => setTemplatePendingDelete(template)}
                          className={`${iconButtonClass} p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30`}
                          title={t(
                            'quickSetup.deleteTemplate',
                            'Klassenraum-Vorlage löschen',
                          )}
                          aria-label={t(
                            'quickSetup.deleteTemplate',
                            'Klassenraum-Vorlage löschen',
                          )}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600 dark:border-gray-950 dark:bg-blue-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* InfoIcon Text */}
        <p className="mt-3 sm:mt-4 text-xs text-center text-gray-600 dark:text-gray-400">
          {infoMessage}
        </p>
      </div>
      {onDeleteTemplate && (
        <ConfirmDialog
          open={Boolean(templatePendingDelete)}
          title={t('quickSetup.deleteDialogTitle', 'Vorlage löschen')}
          message={deleteConfirmMessage}
          confirmLabel={t('common.delete', 'Löschen')}
          cancelLabel={t('common.cancel', 'Abbrechen')}
          onConfirm={() => {
            if (templatePendingDelete) {
              onDeleteTemplate?.(templatePendingDelete.id);
            }
            setTemplatePendingDelete(null);
          }}
          onCancel={() => setTemplatePendingDelete(null)}
        />
      )}
    </>
  );
}
