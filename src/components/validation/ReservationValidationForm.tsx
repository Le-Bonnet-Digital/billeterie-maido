import { useRef, useState, useEffect, useMemo, type FormEvent } from 'react';
import { CheckCircle, QrCode, XCircle, Camera, Smartphone, Flashlight, RefreshCw, ClipboardPaste } from 'lucide-react';
import { BrowserMultiFormatReader, Result } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { toast } from 'react-hot-toast';
import { validateReservation, type ValidationActivity } from '../../lib/validation';

// ---- helpers détection ----
const isMobile = () => typeof window !== 'undefined'
  && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth <= 768);

const preferBackCamera = (labels: string) =>
  /(back|rear|trás|arrière|environment)/i.test(labels);

// ---- composant ----
interface Props {
  activity: ValidationActivity;
  title: string;
  help?: string;
  autoValidate?: boolean; // déclencher la validation automatiquement à la lecture d'un QR
}

export default function ReservationValidationForm({
  activity,
  title,
  help,
  autoValidate = true,
}: Props) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [lastDecoded, setLastDecoded] = useState<string>('');
  const [lastDecodedAt, setLastDecodedAt] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const currentTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // init list devices
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    (async () => {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const cams = mediaDevices.filter((d) => d.kind === 'videoinput');
      setDevices(cams);
      // pick back cam if possible
      const back = cams.find((d) => preferBackCamera(d.label));
      setSelectedDeviceId(back?.deviceId ?? cams[0]?.deviceId);
    })();
  }, []);

  // ZXing instance memo
  const reader = useMemo(() => {
    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }
    return readerRef.current;
  }, []);

  const stopScan = () => {
    try {
      reader?.reset();
    } catch {}
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    currentTrackRef.current = null;
    setTorchSupported(false);
    setTorchOn(false);
    setScanning(false);
  };

  const applyTorch = async (track: MediaStreamTrack, on: boolean) => {
    // Torch via constraints si supporté
    const cap = (track.getCapabilities?.() ?? {}) as any;
    if (cap.torch) {
      await track.applyConstraints?.({ advanced: [{ torch: on }] } as any);
      setTorchSupported(true);
      setTorchOn(on);
    } else {
      setTorchSupported(false);
    }
  };

  const startWebcamScan = async () => {
    if (scanning) return;
    if (!selectedDeviceId && devices.length === 0) {
      toast.error('Aucune caméra détectée');
      return;
    }

    try {
      setStatus('idle');
      setMessage('');
      const deviceId = selectedDeviceId ?? devices[0]?.deviceId;

      // Démarre le flux + decode en continu
      const resultCallback = (res: Result | undefined, err: unknown) => {
        if (res) {
          handleDecoded(res.getText());
        } else if (err && !(err instanceof NotFoundException)) {
          console.error('Decode error', err);
        }
      };

      await reader.decodeFromVideoDevice(deviceId, videoRef.current!, resultCallback);
      setScanning(true);

      // Torch capability?
      const stream = videoRef.current!.srcObject as MediaStream;
      const track = stream?.getVideoTracks?.()[0];
      if (track) {
        currentTrackRef.current = track;
        try {
          await applyTorch(track, false); // juste pour détecter support
        } catch {
          setTorchSupported(false);
        }
      }

      toast.success('Caméra active. Présentez le QR code.');
    } catch (error) {
      console.error('Erreur caméra:', error);
      toast.error("Impossible d'accéder à la caméra. Essayez la saisie manuelle ou une photo.");
    }
  };

  const toggleTorch = async () => {
    const track = currentTrackRef.current;
    if (!track) return;
    try {
      await applyTorch(track, !torchOn);
    } catch {
      toast.error("La torche n'est pas supportée par cet appareil.");
    }
  };

  const handleMobileCapture = () => fileInputRef.current?.click();

  const handleFileCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      // ZXing: decodeFromImageUrl
      const url = URL.createObjectURL(file);
      const res = await reader.decodeFromImageUrl(url);
      URL.revokeObjectURL(url);
      handleDecoded(res.getText());
    } catch (e) {
      console.error(e);
      toast.error('QR non reconnu sur la photo. Réessayez en cadrant mieux.');
    } finally {
      // reset input pour pouvoir reprendre la même photo si besoin
      event.target.value = '';
    }
  };

  const handleDecoded = async (text: string) => {
    // Déduplication: ignore le même code pendant 2s
    const now = Date.now();
    if (text === lastDecoded && now - lastDecodedAt < 2000) return;
    setLastDecoded(text);
    setLastDecodedAt(now);

    setCode(text);
    toast.success('QR détecté');

    if (autoValidate) {
      await doValidate(text);
    }
  };

  const doValidate = async (value: string) => {
    setLoading(true);
    setStatus('idle');
    setMessage('');
    try {
      const res = await validateReservation(value.trim(), activity);
      if (res.ok) {
        setStatus('success');
        setMessage('Validation enregistrée');
        toast.success('Validation réussie ✅');
        // feedback haptique
        if ('vibrate' in navigator) navigator.vibrate?.(80);
        // garder le code visible quelques instants puis effacer
        setTimeout(() => setCode(''), 300);
        // Option: arrêter scan après succès (décommente si souhaité)
        // stopScan();
      } else {
        setStatus('error');
        setMessage(res.reason);
        toast.error(res.reason ?? 'Billet invalide');
        if ('vibrate' in navigator) navigator.vibrate?.([20, 60, 20]);
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMessage('Erreur réseau, réessayez.');
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    await doValidate(code);
  };

  const pasteFromClipboard = async () => {
    try {
      const txt = await navigator.clipboard.readText();
      if (txt) setCode(txt.trim());
      else toast('Presse-papiers vide');
    } catch {
      toast.error("Impossible d'accéder au presse-papiers");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <QrCode className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {/* Sélecteur caméra (desktop / devices multiples) */}
        {!isMobileDevice && devices.length > 1 && (
          <div className="flex items-center gap-2">
            <select
              className="text-sm border rounded-md px-2 py-1"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Caméra ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (scanning) { stopScan(); setTimeout(() => startWebcamScan(), 50); }
              }}
              title="Basculer sur cet appareil"
              className="p-2 rounded-md border hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {help && <p className="text-sm text-gray-600 mb-4 leading-relaxed">{help}</p>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro / QR (opaque)
          </label>

          <div className="flex gap-2">
            <input
              autoFocus
              inputMode="search"
              placeholder={isMobileDevice ? 'Saisissez le code…' : 'Saisissez le code ou scannez…'}
              className="flex-1 px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              type="button"
              onClick={pasteFromClipboard}
              className="px-3 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              title="Coller depuis le presse-papiers"
            >
              <ClipboardPaste className="h-5 w-5" />
            </button>
          </div>

          {/* Options de scan */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {isMobileDevice ? (
              <>
                <button
                  type="button"
                  onClick={handleMobileCapture}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  Prendre une photo du QR
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
                <button
                  type="button"
                  onClick={startWebcamScan}
                  disabled={scanning}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  {scanning ? 'Caméra active' : 'Activer la webcam'}
                </button>

                <button
                  type="button"
                  onClick={stopScan}
                  disabled={!scanning}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-800 rounded-md font-medium transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                  Arrêter la caméra
                </button>
              </>
            )}
          </div>

          {/* Aperçu webcam + torche */}
          {scanning && (
            <div className="mt-4 bg-black rounded-xl overflow-hidden relative">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                autoPlay
                muted
                playsInline
              />
              {/* Overlay UX: viseur */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>

              {/* Actions overlay */}
              <div className="absolute bottom-2 right-2 flex gap-2">
                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`px-3 py-2 rounded-md text-white ${torchOn ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                    title="Torche"
                  >
                    <Flashlight className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-md text-base font-medium transition-colors"
        >
          {loading ? 'Validation…' : 'Valider le billet'}
        </button>
      </form>

      {status !== 'idle' && (
        <div
          className={`mt-4 p-3 rounded-md ${
            status === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div
            className={`flex items-center gap-2 ${
              status === 'success' ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {status === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{message}</span>
          </div>
        </div>
      )}

      {/* Tips */}
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
                <strong>Mobile :</strong> Prenez une photo nette du QR (bonne lumière) ou scannez avec une appli native et collez le code.
              </>
            ) : (
              <>
                <strong>Ordinateur :</strong> Activez la webcam et centrez le QR dans le viseur. Utilisez la torche si disponible.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
