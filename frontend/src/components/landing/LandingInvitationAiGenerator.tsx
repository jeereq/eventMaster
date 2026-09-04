'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Coins,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  getAiSimulationAllowance,
  syncDeviceAiTokensWithBackend,
  type AiAllowance,
} from '@/lib/aiTokens';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import {
  composeTemplateWithAiPublic,
  saveAiTemplateDraft,
  type TemplateAiComposeContent,
} from '@/lib/templateAiCompose';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export default function LandingInvitationAiGenerator({
  className,
  id = 'generateur-ia',
}: {
  className?: string;
  id?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TemplateAiComposeContent | null>(null);
  const [allowance, setAllowance] = useState<AiAllowance>(() => getAiSimulationAllowance());
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  useEffect(() => {
    void syncDeviceAiTokensWithBackend(api).then(setAllowance).catch(() => {
      setAllowance(getAiSimulationAllowance());
    });
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    const images = list.filter((f) => f.type.startsWith('image/')).slice(0, 4);
    if (!images.length) {
      setError('Sélectionnez des images (JPEG, PNG, WebP).');
      return;
    }
    previews.forEach((url) => URL.revokeObjectURL(url));
    const merged = [...files, ...images].slice(0, 4);
    setFiles(merged);
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleGenerate = async () => {
    if (busy) return;
    if (files.length < 1) {
      setError('Ajoutez au moins une image de référence.');
      return;
    }
    if (prompt.trim().length < 8) {
      setError('Décrivez le style souhaité (quelques mots minimum).');
      return;
    }
    if (!allowance.canSimulate) {
      setTokenModalOpen(true);
      return;
    }

    setError('');
    setBusy(true);
    setResult(null);
    setStage('Analyse des images et création…');
    try {
      const data = await composeTemplateWithAiPublic({
        prompt: prompt.trim(),
        files,
      });
      setResult(data.content);
      setAllowance(getAiSimulationAllowance());
      saveAiTemplateDraft(data.content, prompt.trim());
      setStage(null);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 402) {
        setTokenModalOpen(true);
        setError(e.message || 'Plus de jetons IA. Rechargez pour continuer.');
      } else {
        setError(e?.message || 'Impossible de générer le modèle.');
      }
      setStage(null);
    } finally {
      setBusy(false);
    }
  };

  const continueToStudio = () => {
    if (result) saveAiTemplateDraft(result, prompt.trim());
    if (user) {
      router.push('/dashboard/templates?aiDraft=1');
      return;
    }
    router.push(
      `/register?kind=ORGANIZER&intent=personal&action=template&next=${encodeURIComponent('/dashboard/templates?aiDraft=1')}`,
    );
  };

  const bgUrl =
    result?.global && typeof result.global.bgImageUrl === 'string'
      ? result.global.bgImageUrl
      : '';

  return (
    <section
      id={id}
      className={cn(
        'rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface to-surface p-5 sm:p-7 space-y-5 scroll-mt-20',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5" />
            Générateur IA
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            Créez votre modèle d’invitation avec l’IA
          </h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Déposez 1 à 4 images, décrivez le style : le brief guide la génération. Les visages déjà
            présents sont conservés ; aucun visage n’est inventé. 1 jeton IA.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted shrink-0 px-2.5 py-1.5 rounded-full bg-surface border border-border">
          <Coins className="w-3.5 h-3.5 text-primary" />
          {allowance.totalRemaining} jeton{allowance.totalRemaining === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />
          <button
            type="button"
            disabled={busy || files.length >= 4}
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-primary/30 rounded-2xl hover:border-primary hover:bg-primary/5 text-primary font-bold text-xs transition disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Ajouter des images (1–4)
          </button>
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeFile(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                    aria-label="Retirer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Brief style</span>
            <textarea
              rows={4}
              value={prompt}
              disabled={busy}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex. Mariage élégant, tons ivoire et or, floraux discrets, typographie script…"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y min-h-[5rem]"
            />
          </label>
          {error ? (
            <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}
          {stage ? (
            <p className="text-xs font-bold text-primary inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {stage}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={busy || !files.length || prompt.trim().length < 8}
              leftIcon={busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            >
              {busy ? 'Génération…' : 'Générer mon modèle'}
            </Button>
            {!allowance.canSimulate ? (
              <Button type="button" variant="secondary" onClick={() => setTokenModalOpen(true)}>
                Acheter des jetons
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-muted/40 min-h-[220px] flex flex-col overflow-hidden">
          {result ? (
            <>
              <div className="relative flex-1 min-h-[180px] bg-surface-muted">
                {bgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bgUrl} alt="Fond généré" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted p-4 text-center">
                    Structure prête — fond couleur appliqué
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                  <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Aperçu généré — éditable dans le studio
                  </p>
                </div>
              </div>
              <div className="p-3 border-t border-border flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={continueToStudio} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  {user ? 'Ouvrir dans le studio' : 'Continuer (créer un compte)'}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setResult(null)}>
                  Nouvelle génération
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Wand2 className="w-8 h-8 text-primary/40" />
              <p className="text-xs text-muted leading-relaxed max-w-xs">
                L’aperçu du fond et de la structure apparaîtra ici après génération.
              </p>
              <Link href="/#simulateur-ia" className="text-[11px] font-semibold text-primary hover:underline">
                Ou lancer une simulation budget →
              </Link>
            </div>
          )}
        </div>
      </div>

      <AiTokenPurchaseModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        onSuccess={() => setAllowance(getAiSimulationAllowance())}
      />
    </section>
  );
}
