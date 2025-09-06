import { useRef, useState, useEffect, useMemo, type FormEvent } from 'react';
import { QrCode, Camera, XCircle, Flashlight, RefreshCw, CheckCircle } from 'lucide-react';
import { BrowserMultiFormatReader, Result } from '@zxing/browser';
import { NotFoundException, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { toast } from 'react-hot-toast';
import { validateReservation, type ValidationActivity } from '../../lib/validation';

/**
 * Composant focalisé sur le FIX « impossible d'accéder à la caméra » + bonnes pratiques :
 *  - Handshake permission iOS (getUserMedia simple -> enumerateDevices -> deviceId)
 *  - decodeFromConstraints avec deviceId exact (mobile & desktop)
 *  - Hints ZXing (QR only + TRY_HARDER)
 *  - Verrou/consensus/cooldown pour éviter le spam
 *  - Diagnostics d'erreurs getUserMedia détaillés (toasts utiles)
 *  - Pas d'option « photo en secours » ici (tu peux la réactiver si besoin)
 */

const DECODE_COOLDOWN_MS = 1500; // ignore les lectures durant cette fenêtre
const CONSENSUS_HITS = 2;        // exiger 2 lectures identiques d’affilée

const isMobile = () =>
  typeof window !== 'undefined' &&
  (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);

function explainGetUserMediaError(err: any): string {
  const name = (err?.name || '').toString();
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return "Permission caméra refusée. Autorisez l’accès dans le navigateur (réglages du site).";
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return "Aucune caméra détectée sur l’appareil.";
    case 'NotReadableError':
    case 'TrackStartError':
      return "La caméra est occupée par une autre application (ou en erreur). Fermez les autres apps/onglets et réessayez.";
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return "La caméra ne supporte pas ces contraintes (ex. caméra arrière). On va réessayer automatiquement avec des contraintes plus souples.";
    case 'SecurityError':
      return "Contexte non sécurisé. Le site doit être en HTTPS ou l’iframe doit autoriser la caméra.";
    case 'TypeError':
      return "Paramètres getUserMedia invalides.";
    default:
      return err?.message || 'Accès caméra impossible.';
  }
}

interface Props {
  activity: ValidationActivity;
  title: string;
  help?: string;
  autoValidate?: boolean;
}

export default function ReservationValidationForm({
  activity,
  title,
  help,
  autoValidate = true,
}: Props) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // multi‑cam (desktop)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();

  // camera/reader refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentTrackRef = useRef<MediaStreamTrack | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  // verrous lecture
  const validatingRef = useRef(false);
  const cooldownRef = useRef<number | null>(null);
  const consensusTextRef = useRef('');
  const consensusHitsRef = useRef(0);

  // torch
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => setIsMobileDevice(isMobile()), []);

  useEffect(() => {
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Précharge la liste des caméras (desktop) — sur iOS, labels vides tant que pas de permission
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    (async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices(list.filter((d) => d.kind === 'videoinput'));
      } catch {}
    })();
  }, []);

  // ZXing avec hints
  const reader = useMemo(() => {
    if (!readerRef.current) {
      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      readerRef.current = new BrowserMultiFormatReader(hints, 300);
    }
    return readerRef.current;
  }, []);

  const stopScan = () => {
    try { reader?.reset(); } catch {}
    const video = videoRef.current;
    if (video) {
      const stream = video.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    currentTrackRef.current = null;
    setTorchSupported(false);
    setTorchOn(false);
    setScanning(false);
  };

  const applyTorch = async (track: MediaStreamTrack, on: boolean) => {
    const caps = (track.getCapabilities?.() ?? {}) as any;
    if (caps.torch) {
      await track.applyConstraints?.({ advanced: [{ torch: on }] } as any);
      setTorchSupported(true);
      setTorchOn(on);
    } else {
      setTorchSupported(false);
    }
  };

  /**
   * iOS/Safari: pour obtenir les labels et l’ID de la back‑camera, il faut d’abord
   * accorder la permission une fois. On ouvre un flux temporaire puis on le ferme.
   */
  const requestPermissionAndPickDevice = async (): Promise<string | undefined> => {
    let tmp: MediaStream | null = null;
    try {
      tmp = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter((d) => d.kind === 'videoinput');
      const back = cams.find((d) => /back|rear|environment|arrière/i.test(d.label));
      return (back ?? cams[0])?.deviceId;
    } finally {
      tmp?.getTracks().forEach((t) => t.stop());
    }
  };

  // Remplace entièrement ta fonction actuelle
  const startLiveScan = async () => {
  if (scanning) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    toast.error("Caméra non supportée par ce navigateur.");
    return;
  }
  if (!window.isSecureContext) {
    toast.error("HTTPS requis pour accéder à la caméra.");
    return;
  }

  try {
    setStatus('idle');
    setMessage('');

    // 🔧 Fallbacks successifs pour éviter TypeError (params invalides)
    const tries: MediaStreamConstraints[] = [];
    if (selectedDeviceId && selectedDeviceId.trim() !== '') {
      tries.push({ audio: false, video: { deviceId: { exact: selectedDeviceId } as any } });
    }
    // back cam stricte puis souple
    tries.push({ audio: false, video: { facingMode: { exact: 'environment' } as any } });
    tries.push({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    // front en dernier recours puis générique
    tries.push({ audio: false, video: { facingMode: 'user' as any } });
    tries.push({ audio: false, video: true });

    const onResult = (res?: Result, err?: unknown) => {
      if (err && !(err instanceof NotFoundException)) console.error('Decode error', err);
      if (!res) return;

      if (validatingRef.current) return;
      if (cooldownRef.current && Date.now() < cooldownRef.current) return;

      const text = res.getText().trim();
      if (text === consensusTextRef.current) consensusHitsRef.current += 1;
      else { consensusTextRef.current = text; consensusHitsRef.current = 1; }
      if (consensusHitsRef.current < CONSENSUS_HITS) return;

      validatingRef.current = true;
      consensusHitsRef.current = 0;
      handleDecoded(text).finally(() => {
        cooldownRef.current = Date.now() + DECODE_COOLDOWN_MS;
        validatingRef.current = false;
      });
    };

    let started = false;
    let lastErr: any = null;
    for (const c of tries) {
      try {
        await reader.decodeFromConstraints(c, videoRef.current!, onResult);
        started = true;
        break;
      } catch (e) {
        lastErr = e;
        try { reader.reset(); } catch {}
      }
    }
    if (!started) throw lastErr ?? new Error('Aucune contrainte valide pour la caméra');

    setScanning(true);

    // iOS : inline playback obligatoire
    const v = videoRef.current!;
    v.setAttribute('playsinline', 'true');
    v.setAttribute('muted', 'true');
    try { await v.play(); } catch {}

    // Torch si dispo
    const stream = v.srcObject as MediaStream;
    const track = stream?.getVideoTracks?.()[0];
    if (track) {
      currentTrackRef.current = track;
      try { await applyTorch(track, false); } catch { setTorchSupported(false); }
    }

    toast.success('Scanner prêt. Cadrez le QR.');
  } catch (err) {
    console.error('Erreur caméra:', err);
    const msg = explainGetUserMediaError(err);
    toast.error(msg);
  }
};


  const toggleTorch = async () => {
    const track = currentTrackRef.current; if (!track) return;
    try { await applyTorch(track, !torchOn); } catch { toast.error("La torche n'est pas supportée par cet appareil."); }
  };

  const handleDecoded = async (text: string) => {
    setCode(text);
    if (autoValidate) await doValidate(text);
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
        if ('vibrate' in navigator) navigator.vibrate?.(60);
        setTimeout(() => setCode(''), 250);
      } else {
        setStatus('error');
        setMessage(res.reason ?? 'Billet invalide');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMessage('Erreur réseau, réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    await doValidate(code);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <QrCode className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
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
              onClick={() => { if (scanning) { stopScan(); setTimeout(() => startLiveScan(), 50); } }}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Numéro / QR (opaque)</label>
          <input
            inputMode="search"
            placeholder={isMobileDevice ? 'Saisissez le code…' : 'Saisissez le code ou scannez…'}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={startLiveScan}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
            >
              <Camera className="h-5 w-5" />
              {scanning ? 'Caméra active' : 'Activer le scanner'}
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
          </div>

          {scanning && (
            <div className="mt-4 bg-black rounded-xl overflow-hidden relative">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                autoPlay
                muted
                playsInline
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
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
        <div className={`mt-4 p-3 rounded-md ${status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className={`flex items-center gap-2 ${status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {status === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <XCircle className="h-5 w-5 flex-shrink-0" />}
            <span className="text-sm font-medium">{message}</span>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p><strong>Astuce :</strong> sur iOS/Safari, l’ouverture de la caméra exige un tap. Si l’accès échoue, vérifie : HTTPS, permission Caméra autorisée pour le site, aucune autre app n’utilise la caméra, et évite les navigateurs intégrés (Facebook/Instagram).</p>
      </div>
    </div>
  );
}
