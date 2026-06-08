import type { Student } from '@/types';
import type { NameColumnMode } from '@/utils/data/csvUtils';

export type StudentInputProps = {
  students: Student[];
  addStudent: (
    name: string,
    gender?: 'boy' | 'girl' | 'diverse',
    restless?: boolean,
    shy?: boolean,
    concentrationIssues?: boolean,
    needsFrontSeat?: boolean,
  ) => Student;
  addBulkPlaceholderStudents: (count: number) => Student[];
  removeStudent: (id: string) => void;
  clearStudents: () => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  importCsv: (file: File, mode?: NameColumnMode) => Promise<Student[]>;
  downloadStudentsCsv: () => void;
  onProceedToLayout: () => void;
  onProceedToPlan: () => void;
};
