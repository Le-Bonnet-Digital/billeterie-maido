import { toast } from 'react-hot-toast';

export type NotifyFn = (type: 'success' | 'error', message: string) => void;

export const toastNotify: NotifyFn = (type, message) => {
  if (type === 'success') toast.success(message);
  else toast.error(message);
};
