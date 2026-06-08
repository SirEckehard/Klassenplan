import i18n from '@/i18n';
import { showToast } from './toast';

export function announcePlanSaved(finalName: string): void {
  showToast('success', i18n.t('toast:plan.saved', { name: finalName }));
}
