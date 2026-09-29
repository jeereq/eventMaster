'use client';

/**
 * Création d’un élément de salle à partir d’une image ou d’une vidéo :
 * 1. source (photo, PNG détouré, ou image extraite d’une vidéo) ;
 * 2. détourage automatique du fond et contour de la silhouette ;
 * 3. rendu 3D (découpe, panneau, bloc, volume rond, écran vidéo) et taille réelle ;
 * 4. aperçu 3D à l’échelle d’une personne, puis ajout au plan (et à « Mes éléments »).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Film, ImagePlus, Scissors } from 'lucide-react';
import { Alert, Button, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import { CustomElementMesh } from '@/components/room/CustomElementMesh';
import {
  CUSTOM_ELEMENT_MODES,
  CUSTOM_ELEMENT_MODE_META,
  averageOpaqueColor,
  customElementFootprintM,
  hasTransparency,
  opaqueBounds,
  removeBackground,
  traceOutline,
  type CustomElementDefinition,
  type CustomElementMode,
  type RgbaImage,
} from '@/lib/roomCustomElements';

const MAX_SIDE = 1024;

type Source =
  | { kind: 'image'; file: File; url: string }
  | { kind: 'video'; file: File; url: string };

type Processed = {
  /** PNG détouré et recadré (aperçu local). */
  previewUrl: string;
  blob: Blob;
  aspect: number;
  outline: number[] | null;
  edgeColor: string;
};

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('export'))), 'image/png');
  });
}

/** Dessine une image ou l’image courante d’une vidéo dans un canvas limité à MAX_SIDE. */
function drawToCanvas(el: HTMLImageElement | HTMLVideoElement): HTMLCanvasElement {
  const srcW = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
  const srcH = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
  const k = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(srcW * k));
  canvas.height = Math.max(1, Math.round(srcH * k));
  canvas.getContext('2d')!.drawImage(el, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function processFrame(frame: HTMLCanvasElement, cutBackground: boolean, tolerance: number): Promise<Processed> {
  const ctx = frame.getContext('2d', { willReadFrequently: true })!;
  const raw = ctx.getImageData(0, 0, frame.width, frame.height);
  const work = new ImageData(new Uint8ClampedArray(raw.data), raw.width, raw.height);
  const img: RgbaImage = { width: work.width, height: work.height, data: work.data };
  const alreadyCut = hasTransparency(img);
  if (cutBackground && !alreadyCut) removeBackground(img, tolerance);
  const transparent = alreadyCut || cutBackground;
  const bounds = transparent ? opaqueBounds(img) : null;
  const pad = bounds ? Math.round(Math.max(bounds.w, bounds.h) * 0.01) : 0;
  const crop = bounds
    ? {
        x: Math.max(0, bounds.x - pad),
        y: Math.max(0, bounds.y - pad),
        w: Math.min(img.width - Math.max(0, bounds.x - pad), bounds.w + pad * 2),
        h: Math.min(img.height - Math.max(0, bounds.y - pad), bounds.h + pad * 2),
      }
    : { x: 0, y: 0, w: img.width, h: img.height };
  const out = document.createElement('canvas');
  out.width = crop.w;
  out.height = crop.h;
  const octx = out.getContext('2d')!;
  octx.putImageData(work, -crop.x, -crop.y);
  const cropped = octx.getImageData(0, 0, crop.w, crop.h);
  const croppedImg: RgbaImage = { width: crop.w, height: crop.h, data: cropped.data };
  const outline = transparent ? traceOutline(croppedImg) : null;
  const blob = await canvasToBlob(out);
  return {
    previewUrl: URL.createObjectURL(blob),
    blob,
    aspect: crop.w / crop.h,
    outline,
    edgeColor: averageOpaqueColor(croppedImg),
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Envoie l’image détourée (PNG) et renvoie son URL publique. */
  uploadImage: (file: File) => Promise<string>;
  /** Envoie la vidéo et renvoie son URL publique. */
  uploadVideo: (file: File) => Promise<string>;
  onCreate: (def: CustomElementDefinition, opts: { saveToLibrary: boolean }) => void;
};

function PreviewScene({ def }: { def: CustomElementDefinition }) {
  const fp = customElementFootprintM(def);
  const span = Math.max(def.widthM, def.heightM + (def.elevationM ?? 0), 1.8);
  return (
    <Canvas shadows camera={{ position: [span * 0.9, span * 0.75, span * 1.5], fov: 40 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#eef2f7']} />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 0.9]} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[span * 2, 48]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
      </mesh>
      <gridHelper args={[span * 4, Math.round(span * 4), '#94a3b8', '#cbd5e1']} position={[0, 0.002, 0]} />
      <CustomElementMesh def={def} w={fp.w} d={fp.d} />
      {/* Silhouette de 1,75 m pour juger de l’échelle. */}
      <group position={[-(fp.w / 2 + 0.6), 0, -0.3]}>
        <mesh position={[0, 0.8, 0]} castShadow>
          <capsuleGeometry args={[0.17, 1.05, 4, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.62, 0]} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
      </group>
      <OrbitControls target={[0, Math.min(1.2, (def.heightM + (def.elevationM ?? 0)) / 2), 0]} enablePan={false} makeDefault />
    </Canvas>
  );
}

export default function CustomElementCreator({ open, onClose, uploadImage, uploadVideo, onCreate }: Props) {
  const [source, setSource] = useState<Source | null>(null);
  const [frameCanvas, setFrameCanvas] = useState<HTMLCanvasElement | null>(null);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [cutBackground, setCutBackground] = useState(true);
  const [tolerance, setTolerance] = useState(30);
  const [processed, setProcessed] = useState<Processed | null>(null);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<CustomElementMode>('cutout');
  const [name, setName] = useState('');
  const [heightM, setHeightM] = useState(1.2);
  const [manualWidthM, setManualWidthM] = useState(1);
  const [lockRatio, setLockRatio] = useState(true);
  const [depthM, setDepthM] = useState(CUSTOM_ELEMENT_MODE_META.cutout.defaultDepthM);
  const [elevationM, setElevationM] = useState(0);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /** Adresses locales (blob:) créées pendant la session, libérées à la fermeture. */
  const objectUrlsRef = useRef<string[]>([]);
  const trackUrl = (url: string) => {
    objectUrlsRef.current.push(url);
    return url;
  };
  useEffect(() => () => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  }, []);

  const reset = useCallback(() => {
    setSource(null);
    setProcessed(null);
    setFrameCanvas(null);
    setError(null);
    setName('');
    setMode('cutout');
    setElevationM(0);
  }, []);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    reset();
    const url = trackUrl(URL.createObjectURL(file));
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    setName(baseName ? baseName.charAt(0).toUpperCase() + baseName.slice(1) : '');
    if (file.type.startsWith('video/')) {
      // Une vidéo a rarement un fond uni : on garde l’image entière par défaut.
      setCutBackground(false);
      setSource({ kind: 'video', file, url });
      setMode('video');
      setDepthM(CUSTOM_ELEMENT_MODE_META.video.defaultDepthM);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Choisissez une image (JPG, PNG, WebP) ou une vidéo (MP4, WebM, MOV).');
      return;
    }
    setCutBackground(true);
    setSource({ kind: 'image', file, url });
    const img = new Image();
    img.onload = () => setFrameCanvas(drawToCanvas(img));
    img.onerror = () => setError('Image illisible.');
    img.src = url;
  };

  const captureVideoFrame = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setFrameCanvas(drawToCanvas(v));
  };

  // Détourage relancé à chaque changement de source ou de réglage.
  useEffect(() => {
    if (!frameCanvas) return;
    let alive = true;
    const t = setTimeout(() => {
      setProcessing(true);
      processFrame(frameCanvas, cutBackground, tolerance)
        .then((p) => {
          trackUrl(p.previewUrl);
          if (alive) setProcessed(p);
        })
        .catch(() => alive && setError('Le traitement de l’image a échoué.'))
        .finally(() => alive && setProcessing(false));
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [frameCanvas, cutBackground, tolerance]);

  // Largeur liée à la hauteur par le rapport de l’image, tant qu’on ne la saisit pas à la main.
  const widthM = lockRatio && processed ? Math.round(heightM * processed.aspect * 100) / 100 : manualWidthM;

  const setModeWithDefaults = (m: CustomElementMode) => {
    setMode(m);
    setDepthM(m === 'cylinder' ? widthM : CUSTOM_ELEMENT_MODE_META[m].defaultDepthM);
  };

  const previewDef = useMemo<CustomElementDefinition | null>(() => {
    if (!processed) return null;
    return {
      name: name || 'Élément',
      mode,
      imageUrl: processed.previewUrl,
      ...(mode === 'video' && source?.kind === 'video' ? { videoUrl: source.url } : {}),
      ...(mode === 'cutout' && processed.outline ? { outline: processed.outline } : {}),
      aspect: processed.aspect,
      widthM,
      heightM,
      depthM: mode === 'cylinder' ? widthM : depthM,
      ...(elevationM > 0 ? { elevationM } : {}),
      edgeColor: processed.edgeColor,
    };
  }, [processed, name, mode, source, widthM, heightM, depthM, elevationM]);

  const modes = CUSTOM_ELEMENT_MODES.filter((m) => m !== 'video' || source?.kind === 'video');

  const handleCreate = async () => {
    if (!previewDef || !processed) return;
    setSaving(true);
    setError(null);
    try {
      const imageUrl = await uploadImage(new File([processed.blob], `${(name || 'element').slice(0, 40)}.png`, { type: 'image/png' }));
      const videoUrl = mode === 'video' && source?.kind === 'video' ? await uploadVideo(source.file) : undefined;
      onCreate({ ...previewDef, name: name.trim() || 'Élément importé', imageUrl, ...(videoUrl ? { videoUrl } : {}) }, { saveToLibrary });
      onClose();
    } catch {
      setError('L’envoi a échoué. Vérifiez votre connexion et la taille du fichier (image 10 Mo, vidéo 80 Mo).');
    } finally {
      setSaving(false);
    }
  };

  const numberField = (label: string, value: number, onChange: (v: number) => void, min: number, max: number, step = 0.01, disabled = false) => (
    <label className="block text-xs font-semibold text-foreground">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="mt-1 w-full min-h-10 px-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm disabled:opacity-50"
      />
    </label>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Créer un élément à partir d’une image ou d’une vidéo"
      description="Photo d’un objet, PNG détouré ou vidéo : l’élément est découpé, mis à l’échelle réelle et ajouté au plan."
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)} />
            Enregistrer dans « Mes éléments »
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!previewDef || processing} loading={saving}>
              Ajouter au plan
            </Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {!source ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className="w-full rounded-[var(--radius-card)] border-2 border-dashed border-border bg-surface-muted/60 hover:border-primary/50 p-8 flex flex-col items-center gap-2 text-center"
          >
            <span className="flex gap-3 text-primary">
              <ImagePlus className="w-7 h-7" aria-hidden />
              <Film className="w-7 h-7" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-foreground">Déposez une image ou une vidéo, ou cliquez pour choisir</span>
            <span className="text-xs text-muted">
              Astuce : photographiez l’objet sur un fond uni (mur, drap) pour un détourage net. Un PNG déjà détouré est utilisé tel quel.
            </span>
          </button>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {source.kind === 'video' ? (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    src={source.url}
                    muted
                    playsInline
                    className="w-full max-h-56 rounded-[var(--radius-card)] bg-black object-contain"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      setVideoDuration(v.duration || 0);
                      v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
                    }}
                    onSeeked={() => {
                      if (!frameCanvas) captureVideoFrame();
                    }}
                  />
                  <label className="block text-xs font-semibold text-foreground">
                    Image de la vidéo ({videoTime.toFixed(1)} s)
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0.1, videoDuration)}
                      step={0.05}
                      value={videoTime}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        setVideoTime(t);
                        if (videoRef.current) videoRef.current.currentTime = t;
                      }}
                      className="w-full"
                    />
                  </label>
                  <Button size="sm" variant="secondary" onClick={captureVideoFrame} leftIcon={<Scissors className="w-3.5 h-3.5" />}>
                    Utiliser cette image
                  </Button>
                </div>
              ) : null}
              <div
                className="relative rounded-[var(--radius-card)] border border-border h-56 flex items-center justify-center overflow-hidden"
                style={{
                  backgroundImage: 'linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                }}
              >
                {processed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={processed.previewUrl} alt="Élément détouré" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-muted">{processing ? 'Détourage…' : 'Choisissez une image de la vidéo'}</span>
                )}
                {processed?.outline && mode === 'cutout' ? (
                  <span className="absolute top-2 left-2 text-[11px] font-semibold bg-white/90 text-emerald-800 px-2 py-0.5 rounded-full">
                    Silhouette détectée
                  </span>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={cutBackground} onChange={(e) => setCutBackground(e.target.checked)} />
                Retirer le fond automatiquement
              </label>
              {cutBackground ? (
                <label className="block text-xs font-semibold text-foreground">
                  Tolérance du détourage ({tolerance})
                  <input type="range" min={0} max={100} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="w-full" />
                  <span className="block text-[11px] font-normal text-muted">Augmentez si des restes de fond subsistent, baissez si l’objet est rogné.</span>
                </label>
              ) : null}
              <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => fileRef.current?.click()}>
                Changer de fichier
              </button>
            </div>

            <div className="space-y-3">
              <div className="h-60 rounded-[var(--radius-card)] border border-border overflow-hidden bg-surface-muted">
                {previewDef ? <PreviewScene def={previewDef} /> : null}
              </div>
              <label className="block text-xs font-semibold text-foreground">
                Nom
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder="Ex. Photocall floral, Sculpture, Totem"
                  className="mt-1 w-full min-h-10 px-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
                />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModeWithDefaults(m)}
                    aria-pressed={mode === m}
                    title={CUSTOM_ELEMENT_MODE_META[m].hint}
                    className={cn(
                      'min-h-11 px-2 py-1.5 rounded-[var(--radius-button)] border text-xs font-semibold text-left',
                      mode === m ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-surface text-foreground hover:bg-surface-muted',
                    )}
                  >
                    {CUSTOM_ELEMENT_MODE_META[m].label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">{CUSTOM_ELEMENT_MODE_META[mode].hint}</p>
              <div className="grid grid-cols-2 gap-2">
                {numberField('Hauteur (m)', heightM, setHeightM, 0.05, 20)}
                {numberField('Largeur (m)', widthM, (v) => { setLockRatio(false); setManualWidthM(v); }, 0.05, 40)}
                {mode !== 'cylinder'
                  ? numberField(mode === 'box' ? 'Profondeur (m)' : 'Épaisseur (m)', depthM, setDepthM, 0.005, 20)
                  : null}
                {numberField('Hauteur de pose (m)', elevationM, setElevationM, 0, 15)}
              </div>
              {!lockRatio ? (
                <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setLockRatio(true)}>
                  Revenir aux proportions de l’image
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
