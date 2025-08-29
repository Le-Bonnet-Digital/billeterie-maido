import React, { useState } from 'react';
import { CheckCircle, QrCode, XCircle } from 'lucide-react';
import { validateReservation, type ValidationActivity } from '../../lib/validation';
import { toast } from 'react-hot-toast';

interface Props {
  activity: ValidationActivity;
  title: string;
  help?: string;
}

export default function ReservationValidationForm({ activity, title, help }: Props) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    setMessage('');
    try {
      const res = await validateReservation(code, activity);
      if (res.ok) {
        setStatus('success');
        setMessage('Validation enregistrée');
        toast.success('Validation réussie');
        setCode('');
      } else {
        setStatus('error');
        setMessage(res.reason);
        toast.error(res.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-4">
        <QrCode className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {help && <p className="text-sm text-gray-600 mb-4">{help}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro de réservation (QR)
          </label>
          <input
            autoFocus
            inputMode="text"
            placeholder="Scannez ou saisissez le code..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Un lecteur code-barres/QR agit comme un clavier: cliquez dans le champ et scannez.</p>
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Valider
        </button>
      </form>
      {status !== 'idle' && (
        <div className={`mt-4 flex items-center gap-2 ${status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
          {status === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span className="text-sm">{message}</span>
        </div>
      )}
    </div>
  );
}

