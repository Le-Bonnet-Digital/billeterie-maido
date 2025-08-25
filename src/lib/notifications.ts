import { toast } from 'react-hot-toast';

/**
 * Fonction de notification générique.
 * @param type Type de notification
 * @param message Message à afficher
 */
export type NotifyFn = (type: 'success' | 'error', message: string) => void;

/**
 * Implémentation de notification basée sur `react-hot-toast`.
 * @sideeffects Affiche un toast dans l'UI
 */
export const toastNotify: NotifyFn = (type, message) => {
  if (type === 'success') toast.success(message);
  else toast.error(message);
};
