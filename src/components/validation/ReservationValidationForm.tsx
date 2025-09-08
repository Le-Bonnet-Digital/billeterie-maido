/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
import {
  useRef,
  useState,
  useEffect,
  useMemo,
  type FormEvent,
  useCallback,
} from 'react';
import {
  QrCode,
  Camera,
  XCircle,
  Flashlight,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  NotFoundException,
  BarcodeFormat,
  DecodeHintType,
} from '@zxing/library';
import { toast } from 'react-hot-toast';

import { validateReservation } from '../../lib/validation';

// ---------- helpers caméra ----------
type MaybeStoppable = Partial<{ stopDecoding: () => void; reset: () => void }>;

function stopReader(reader: unknown, video: HTMLVideoElement | null) {
  const stream = (video?.srcObject as MediaStream | null) ?? null;
  stream?.getTracks().forEach((t) => t.stop());
  if (video) {
    video.srcObject = null;
    video.pause();
  }
  const r = reader as MaybeStoppable;
  r.stopDecoding?.();
  r.reset?.();
}

const DECODE_COOLDOWN_MS = 1500;

// ---------- props ----------
type Props = {
  title?: string;
  help?: string;
  /** slug d’activité choisi par le menu parent (ex: "luge_d_ete", "tir_a_l_arc", "poney") */
  activitySlug: string;
};

export default function ReservationValidationForm({
  title = 'Validation de réservation',
  help = 'Scannez le QR code du billet ou saisissez manuellement le numéro de réservation pour valider l’accès.',
  activitySlug,
}: Props) {
  // UI
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  // activité courante (pilotée par le parent)
  const [lastActivity, setLastActivity] = useState<string>(activitySlug);
  useEffect(() => setLastActivity(activitySlug), [activitySlug]);

  // caméra
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(''); // ✅ toujours string
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const cooldownRef = useRef<number>(0);
  const validatingRef = useRef<boolean>(false);

  const isMobileDevice =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ZXing reader
  const reader = useMemo(() => {
    if (!readerRef.current) {
      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      readerRef.current = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 300,
      });
    }
    return readerRef.current;
  }, []);

  // Cleanup caméra au démontage
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      try {
        stopReader(reader, v);
      } catch {}
    };
  }, [reader]);

  // Demande permission + choisit une caméra (retourne TOUJOURS une string)
  const requestPermissionAndPickDevice = async (): Promise<string> => {
    let tmp: MediaStream | null = null;
    try {
      tmp = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter((d) => d.kind === 'videoinput');
      setDevices(cams);
      if (cams.length === 0) return ''; // <= string vide

      const back =
        cams.find((d) => /back|arrière|rear/i.test(d.label)) ?? cams[0];
      setSelectedDeviceId(back.deviceId);
      return back.deviceId; // <= string
    } catch {
      return ''; // <= string vide
    } finally {
      try {
        tmp?.getTracks().forEach((t) => t.stop());
      } catch {}
    }
  };

  const toggleTorch = async () => {
    const v = videoRef.current;
    const stream = (v?.srcObject as MediaStream | null) ?? null;
    const track = stream?.getVideoTracks?.()[0];
    if (!track) {
      setTorchSupported(false);
      return;
    }
    const caps = (track.getCapabilities?.() ?? {}) as any;
    if (!caps.torch) {
      setTorchSupported(false);
      return;
    }
    const next = !torchOn;
    await track.applyConstraints?.({ advanced: [{ torch: next }] } as any);
    setTorchSupported(true);
    setTorchOn(next);
  };

  const stopScan = useCallback(() => {
    try {
      stopReader(reader, videoRef.current);
    } catch {}
    const v = videoRef.current;
    if (v) {
      const stream = v.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
    setScanning(false);
  }, [reader]);

  const handleDecoded = useCallback(
    async (text: string) => {
      const now = Date.now();
      if (now < cooldownRef.current) return;
      if (validatingRef.current) return;
      validatingRef.current = true;

      try {
        const res = await validateReservation(text, lastActivity);

        if (res.ok && res.status.validated) {
          setStatus('success');
          setMessage('Réservation validée ✅');
          toast.success('Réservation validée ✅');
        } else if (res.status.alreadyValidated) {
          setStatus('success');
          setMessage('Réservation déjà validée');
          toast('Déjà validée', { icon: 'ℹ️' });
        } else {
          const reason =
            res.reason ??
            (res.status.unpaid
              ? 'Non payée'
              : res.status.wrongActivity
                ? 'Mauvaise activité'
                : res.status.notFound
                  ? 'Introuvable'
                  : 'Invalide');
          setStatus('error');
          setMessage(`Refusée: ${reason}`);
          toast.error(`Refusée: ${reason}`);
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Erreur lors de la validation';
        setStatus('error');
        setMessage(msg);
        toast.error(msg);
      } finally {
        validatingRef.current = false;
        cooldownRef.current = Date.now() + DECODE_COOLDOWN_MS;
      }
    },
    [lastActivity],
  );

  const startLiveScan = useCallback(async () => {
    if (scanning) return;

    const v = videoRef.current;
    if (!v) {
      toast.error('Vidéo non prête');
      return;
    }

    // Garantir une string
    let id: string = selectedDeviceId;
    if (!id) {
      id = await requestPermissionAndPickDevice();
    }
    if (!id) {
      toast.error('Aucune caméra disponible');
      return;
    }
    const deviceId: string = id; // ✅ string garanti
    setSelectedDeviceId(deviceId);

    setScanning(true);
    cooldownRef.current = 0;

    try {
      const onResult: Parameters<
        BrowserMultiFormatReader['decodeFromConstraints']
      >[2] = (res, err) => {
        if (res) {
          const text = res.getText();
          if (Date.now() < cooldownRef.current) return;
          void handleDecoded(text);
        } else if (err && !(err instanceof NotFoundException)) {
          console.warn(err);
        }
      };

      const constraintsList: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: 'environment' }, deviceId } },
        { video: { deviceId } },
      ];

      let started = false;
      let lastErr: unknown = null;
      for (const constraints of constraintsList) {
        try {
          await reader.decodeFromConstraints(constraints, v, onResult);
          started = true;
          break;
        } catch (e) {
          lastErr = e;
          try {
            stopReader(reader, v);
          } catch {}
        }
      }
      if (!started)
        throw lastErr ?? new Error('Aucune contrainte valide pour la caméra');

      v.setAttribute('playsinline', 'true');
      v.setAttribute('muted', 'true');
      try {
        await v.play();
      } catch {}

      // Init torche
      const stream = (v.srcObject as MediaStream | null) ?? null;
      const track = stream?.getVideoTracks?.()[0];
      const caps = (track?.getCapabilities?.() ?? {}) as any;
      setTorchSupported(Boolean(caps.torch));
      setTorchOn(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Impossible de démarrer le scan',
      );
      setScanning(false);
    }
  }, [handleDecoded, reader, scanning, selectedDeviceId]);

  // Soumission manuelle
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setLoading(true);
    setStatus('idle');
    setMessage('');
    try {
      await handleDecoded(value);
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI Tailwind (sans pills) ----------
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <QrCode className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>

        {/* Sélecteur caméra (desktop + si >1 devices) */}
        {!isMobileDevice && devices.length > 1 && (
          <div className="flex items-center gap-2">
            <select
              className="text-sm border rounded-md px-2 py-1"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value || '')}
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
                stopScan();
                setTimeout(() => startLiveScan(), 50);
              }}
              title="Basculer sur cet appareil"
              className="p-2 rounded-md border hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {help && (
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{help}</p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro / QR (opaque)
          </label>
          <input
            inputMode="search"
            placeholder={
              isMobileDevice
                ? 'Saisissez le code…'
                : 'Saisissez le code ou scannez…'
            }
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <div
            className={`mt-3 grid gap-2 ${
              scanning ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {!scanning ? (
              <button
                type="button"
                onClick={startLiveScan}
                disabled={scanning}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
              >
                <Camera className="h-5 w-5" />
                {scanning ? 'Caméra active' : 'Activer le scanner'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={stopScan}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md font-medium transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                  Arrêter la caméra
                </button>
                {/* Torch (si supportée) */}
                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
                      torchOn
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                    title="Torche"
                  >
                    <Flashlight className="h-5 w-5" />
                    {torchOn ? 'Éteindre la torche' : 'Allumer la torche'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* <video> TOUJOURS monté pour garantir videoRef.current */}
          <div
            className={`mt-4 bg-black rounded-xl overflow-hidden relative ${
              scanning ? '' : 'h-0 opacity-0 pointer-events-none'
            }`}
          >
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              autoPlay
              muted
              playsInline
            />
            {scanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            )}
          </div>
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

      <div className="mt-4 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p>
          <strong>Astuce :</strong> si le site est affiché dans une{' '}
          <em>iframe</em>, ajoutez{' '}
          <code>allow="camera; microphone; fullscreen"</code>. Sur iOS/Safari,
          un tap est requis pour démarrer la caméra.
        </p>
      </div>
    </div>
  );
}
