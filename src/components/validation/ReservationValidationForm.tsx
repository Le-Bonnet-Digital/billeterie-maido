import { useRef, useState, type FormEvent } from 'react';
import { CheckCircle, QrCode, XCircle } from 'lucide-react';
import {
  validateReservation,
  type ValidationActivity,
} from '../../lib/validation';
import { toast } from 'react-hot-toast';

interface Props {
  activity: ValidationActivity;
  title: string;
  help?: string;
}

export default function ReservationValidationForm({
  activity,
  title,
  help,
}: Props) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stopScan = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  const startScan = async () => {
    if (scanning) return;
    if (typeof window === 'undefined') return;
    
    // Vérifier la disponibilité de la caméra
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Caméra non disponible sur cet appareil');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        await videoRef.current.play();
      }
      
      // Utiliser BarcodeDetector si disponible, sinon mode manuel
      if ('BarcodeDetector' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- BarcodeDetector types not widely supported
        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        });
        const scan = async () => {
          if (!videoRef.current || !scanning) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              setCode(codes[0].rawValue);
              stopScan();
              return;
            }
          } catch {
            /* continue */
          }
          if (scanning) {
            requestAnimationFrame(scan);
          }
        };
        requestAnimationFrame(scan);
      } else {
        // Mode manuel : afficher la caméra pour que l'utilisateur puisse voir et saisir manuellement
        toast.info('Scanner automatique non disponible. Utilisez la saisie manuelle.');
      }
    } catch {
      toast.error('Accès caméra refusé');
    }
  };

  const onSubmit = async (e: FormEvent) => {
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
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <QrCode className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {help && <p className="text-sm text-gray-600 mb-4 leading-relaxed">{help}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro de réservation (QR)
          </label>
          <input
            autoFocus
            inputMode="search"
            placeholder="Scannez ou saisissez le code..."
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onFocus={startScan}
          />
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">
              Un lecteur code-barres/QR agit comme un clavier: cliquez dans le champ et scannez.
            </p>
            <button
              type="button"
              onClick={startScan}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Activer la caméra pour scanner
            </button>
          </div>
          {scanning && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Caméra active</span>
                <button
                  type="button"
                  onClick={stopScan}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Arrêter
                </button>
              </div>
              <video
                ref={videoRef}
                className="w-full h-auto max-h-64 rounded-md bg-black"
                autoPlay
                muted
                playsInline
                style={{ objectFit: 'cover' }}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Pointez la caméra vers le QR code. La détection se fait automatiquement.
              </p>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-md text-base font-medium transition-colors"
        >
          {loading ? 'Validation...' : 'Valider le billet'}
        </button>
      </form>
      {status !== 'idle' && (
        <div className={`mt-4 p-3 rounded-md ${status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className={`flex items-center gap-2 ${status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {status === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
