import { downloadBlob } from '@/utils';

/**
 * CSV Template for student list import.
 * Contains example data with all supported fields.
 */
const CSV_TEMPLATE_CONTENT = `Name,Geschlecht,Körpergröße,Sprachniveau,Soziale Rolle,Unruhig,Schüchtern,Ablenkbarkeit,Vordere Plätze,Fensterplatz,Türplatz,Leistungsstark,Leistungsschwach,Wunschpartner,Distanzwunsch
Max Mustermann,Junge,mittel,Muttersprache,,ja,,ja,,ja,,,ja,Tom Weber,
Anna Beispiel,Mädchen,klein,Fließend,Mediator,,ja,,,ja,,ja,,Lisa Müller,
Tom Weber,Junge,groß,Anfänger,Einzelgänger,,,ja,ja,,,,,Max Mustermann,
Lisa Müller,Mädchen,,Fortgeschritten,Mittelpunkt,,,,,,ja,,,Anna Beispiel,
Kim Fischer,Divers,groß,DaZ-Förderung,Anführer,,ja,,ja,,,ja,,,Tom Weber
`;

/**
 * Downloads a CSV template file for student list import.
 * The template includes all supported fields with example data.
 */
export function downloadCsvTemplate(): void {
  downloadBlob(
    CSV_TEMPLATE_CONTENT,
    'klassenliste_vorlage.csv',
    'text/csv;charset=utf-8',
    {
      logContext: 'downloadCsvTemplate',
      filePickerTypes: [
        {
          description: 'CSV',
          accept: { 'text/csv': ['.csv'] },
        },
      ],
    },
  ).catch(() => undefined);
}
