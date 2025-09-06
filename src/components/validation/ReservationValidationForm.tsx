import { useRef, useState, useEffect, type FormEvent } from 'react';
import { CheckCircle, QrCode, XCircle, Camera, Smartphone } from 'lucide-react';
import {
  validateReservation,
  type ValidationActivity,
} from '../../lib/validation';
import { toast } from 'react-hot-toast';

// Détection du type d'appareil
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
};

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

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
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  const stopScan = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  // Pour mobile : utiliser l'input file avec capture
  const handleMobileCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Créer un canvas pour traiter l'image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      // Ici on pourrait intégrer une bibliothèque de lecture QR
      // Pour l'instant, on demande à l'utilisateur de saisir manuellement
      toast.info('Veuillez saisir manuellement le code visible sur l\'image');
    };

    img.src = URL.createObjectURL(file);
  };

  // Pour desktop : utiliser la webcam
  const startWebcamScan = async () => {
    if (scanning || isMobileDevice) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Caméra frontale pour desktop
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        await videoRef.current.play();
      }
      
      toast.info('Caméra activée. Présentez le QR code devant la caméra ou saisissez le code manuellement.');
    } catch (error) {
      console.error('Erreur caméra:', error);
      toast.error('Impossible d\'accéder à la caméra. Utilisez la saisie manuelle.');
    }
  };

  const handleInputFocus = () => {
    // Sur mobile, ne pas activer automatiquement la caméra au focus
    if (isMobileDevice) {
      return;
    }
    
    // Sur desktop, ne pas activer automatiquement non plus
    // L'utilisateur doit cliquer explicitement sur le bouton caméra
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
            Numéro de réservation
          </label>
          <input
            autoFocus
            inputMode="search"
            placeholder={isMobileDevice ? "Saisissez le code de réservation..." : "Saisissez le code ou utilisez la caméra..."}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onFocus={handleInputFocus}
          />
          
          {/* Options de scan selon l'appareil */}
          <div className="mt-3 space-y-2">
            {isMobileDevice ? (
              <>
                <p className="text-xs text-gray-500">
                  Utilisez un lecteur QR externe ou saisissez le code manuellement.
                </p>
                <button
                  type="button"
                  onClick={handleMobileCapture}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  Prendre une photo du QR code
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileCapture}
                  className="hidden"
                />
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  Saisissez le code manuellement ou utilisez la webcam pour scanner.
                </p>
                <button
                  type="button"
                  onClick={startWebcamScan}
                  disabled={scanning}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  {scanning ? 'Caméra active' : 'Activer la webcam'}
                </button>
              </>
            )}
          </div>
          
          {/* Aperçu webcam (desktop uniquement) */}
          {scanning && !isMobileDevice && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Webcam active</span>
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
                className="w-full h-48 rounded-md bg-black object-cover"
                autoPlay
                muted
                playsInline
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Présentez le QR code devant la webcam ou saisissez le code manuellement ci-dessus.
              </p>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-md text-base font-medium transition-colors"
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
      
      {/* Instructions d'utilisation */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          {isMobileDevice ? (
            <Smartphone className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          ) : (
            <QrCode className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="text-xs text-blue-800">
            {isMobileDevice ? (
              <>
                <strong>Mobile :</strong> Utilisez "Prendre une photo" pour capturer le QR code avec l'appareil photo arrière, 
                ou saisissez directement le numéro de réservation dans le champ ci-dessus.
              </>
            ) : (
              <>
                <strong>Ordinateur :</strong> Saisissez le numéro de réservation manuellement ou utilisez 
                "Activer la webcam\" pour scanner avec votre caméra d'ordinateur.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
