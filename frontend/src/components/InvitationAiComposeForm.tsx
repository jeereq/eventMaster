'use client';

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertCircle,
  Edit3,
  ImageIcon,
  Loader2,
  PenTool,
  Sparkles,
  Tag,
  Upload,
  Users,
  Wand2,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import InvitationStructuredBriefFields from '@/components/InvitationStructuredBriefFields';
import InvitationCardInfoFields from '@/components/InvitationCardInfoFields';
import InvitationModelPhotoPicker from '@/components/InvitationModelPhotoPicker';
import type { InvitationStructuredBrief } from '@/config/invitationStructuredBrief';
import type { InvitationArtStyleId } from '@/config/invitationArtStyles';
import type { InvitationContextSource } from '@/lib/invitationContextSource';
import type { InvitationModelPhoto } from '@/lib/invitationModelPhoto';
import type { AiSpeedMode } from '@/lib/templateAiCompose';
import { cn } from '@/lib/cn';

const InvitationContextSourcePicker = dynamic(() => import('@/components/InvitationContextSourcePicker'), { ssr: false });
const InvitationArtStylePicker = dynamic(() => import('@/components/InvitationArtStylePicker'), { ssr: false });

/**
 * Formulaire « Créer avec l’IA » de l’éditeur d’invitations, partagé avec le simulateur
 * public et les studios du tableau de bord : même parcours, qu’on soit connecté ou non.
 * L’hôte garde l’appel IA, les jetons et l’affichage du résultat.
 */

export type InvitationComposeMode = 'create' | 'modify' | 'faces';
export type InvitationCoupleRole = 'groom' | 'bride' | 'auto';

export const INVITATION_COMPOSE_MODES: Array<{
  id: InvitationComposeMode;
  icon: LucideIcon;
  label: string;
  hint: string;
}> = [
  {
    id: 'create',
    icon: Wand2,
    label: 'Nouvelle carte',
    hint: 'L’IA peint un fond neuf, vos textes restent modifiables.',
  },
  {
    id: 'modify',
    icon: Edit3,
    label: 'Transformer une carte',
    hint: 'Partir d’un modèle ou d’une photo, changer textes ou style.',
  },
  {
    id: 'faces',
    icon: Users,
    label: 'Visages du couple',
    hint: 'Mettre vos photos à la place des visages d’une carte.',
  },
];

/** Raison pour laquelle la création ne peut pas encore partir (null = prêt). */
export function invitationComposeBlockedReason({
  mode,
  hasIncomingCard,
  filesCount,
  hasTexts,
  prompt,
}: {
  mode: InvitationComposeMode;
  hasIncomingCard: boolean;
  filesCount: number;
  hasTexts: boolean;
  prompt: string;
}): string | null {
  if (mode === 'faces') {
    if (filesCount < 1) return 'Ajoutez au moins une photo du couple.';
    if (!hasIncomingCard) return 'Ajoutez la carte dont les visages doivent être remplacés.';
    return null;
  }
  if (mode === 'modify' && !hasIncomingCard && filesCount === 0) {
    return 'Choisissez un modèle ou importez la photo de la carte à transformer.';
  }
  if (!hasTexts && prompt.trim().length < 8) {
    return mode === 'modify'
      ? 'Indiquez ce qui doit changer, ou les nouveaux textes de la carte.'
      : 'Décrivez la fête en quelques mots, ou renseignez les textes de la carte.';
  }
  return null;
}

export function invitationComposeActionLabel(mode: InvitationComposeMode, tokenCost: number): string {
  if (mode === 'faces') return `Remplacer les visages (${tokenCost} jetons)`;
  if (mode === 'modify') return `Transformer la carte (${tokenCost} jetons)`;
  return `Créer la carte (${tokenCost} jetons)`;
}

export function invitationComposeIntro(mode: InvitationComposeMode): string {
  if (mode === 'faces') {
    return 'Posez la carte, puis les photos du couple. Les visages changent ; décor, pose et expressions restent.';
  }
  if (mode === 'modify') {
    return 'Partez d’un modèle ou d’une photo de carte, puis changez les textes ou l’ambiance.';
  }
  return 'Décrivez la fête : l’IA crée le fond, vos textes restent modifiables dans l’éditeur.';
}

export default function InvitationAiComposeForm({
  idPrefix,
  columns = 2,
  mode,
  onModeChange,
  busy,
  stage,
  busyHint = 'L’intelligence artificielle traite la composition. Vous pouvez patienter ici ou fermer la fenêtre : le travail continuera en tâche de fond et s’ouvrira dans l’éditeur dès qu’il sera prêt.',
  error,
  onDismissError,
  onRetry,
  onRecharge,
  currentCardUrl,
  incomingFile,
  incomingPreview,
  onIncomingFile,
  modelPhoto,
  models,
  onModelPhotoChange,
  files,
  previewUrls,
  fileRoles,
  onAddFiles,
  onRemoveFile,
  onToggleFileRole,
  structured,
  onStructuredChange,
  hasTexts,
  prompt,
  onPromptChange,
  promptTools,
  styleIntro,
  embedText,
  onEmbedTextChange,
  onShowExamples,
  artStyle,
  onArtStyleChange,
  contextSource,
  onContextSourceChange,
  canUseOrg,
  speedMode,
  onSpeedModeChange,
}: {
  idPrefix: string;
  /** 2 = deux colonnes sur grand écran (fenêtre de l’éditeur) ; 1 = colonne étroite (studios publics). */
  columns?: 1 | 2;
  mode: InvitationComposeMode;
  onModeChange: (mode: InvitationComposeMode) => void;
  busy: boolean;
  stage?: string | null;
  busyHint?: string;
  error?: string;
  onDismissError: () => void;
  onRetry: () => void;
  onRecharge: () => void;
  /** Carte déjà ouverte dans l’éditeur, proposée comme carte de départ. */
  currentCardUrl?: string;
  incomingFile: File | null;
  incomingPreview: string;
  onIncomingFile: (file: File | null) => void;
  modelPhoto: InvitationModelPhoto | null;
  models?: InvitationModelPhoto[];
  onModelPhotoChange: (photo: InvitationModelPhoto | null) => void;
  files: File[];
  previewUrls: string[];
  fileRoles: InvitationCoupleRole[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onToggleFileRole: (index: number) => void;
  structured: InvitationStructuredBrief;
  onStructuredChange: (next: InvitationStructuredBrief) => void;
  hasTexts: boolean;
  prompt: string;
  onPromptChange: (next: string) => void;
  /** Actions posées à côté du compteur de la description (ex. annuler / rétablir). */
  promptTools?: React.ReactNode;
  /** Contenu ajouté en tête de l’onglet « Ambiance et cérémonie ». */
  styleIntro?: React.ReactNode;
  embedText: boolean;
  onEmbedTextChange: (next: boolean) => void;
  onShowExamples: () => void;
  artStyle: InvitationArtStyleId;
  onArtStyleChange: (style: InvitationArtStyleId) => void;
  contextSource: InvitationContextSource;
  onContextSourceChange: (source: InvitationContextSource) => void;
  canUseOrg: boolean;
  speedMode: AiSpeedMode;
  onSpeedModeChange: (mode: AiSpeedMode) => void;
}) {
  const filesInputRef = useRef<HTMLInputElement>(null);
  const incomingInputRef = useRef<HTMLInputElement>(null);
  const [detailsSection, setDetailsSection] = useState<'texts' | 'style'>('texts');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const isFaces = mode === 'faces';
  const sectionTitles =
    mode === 'faces'
      ? ['Type de création', 'Carte et photos du couple', 'Textes et consignes']
      : mode === 'modify'
        ? ['Type de création', 'Carte de départ', 'Textes et ambiance']
        : ['Type de création', 'Inspiration (optionnel)', 'Textes et ambiance'];

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    onAddFiles(list);
  };

  const insertVariable = (tag: string) => {
    onPromptChange(prompt ? `${prompt.trim()} ${tag}` : tag);
  };

  return (
    <>
 {error ? (
   <div
     role="alert"
     aria-live="assertive"
     className="mb-5 p-4 rounded-2xl border border-rose-500/50 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ring-1 ring-rose-500/20 animate-in fade-in"
   >
     <div className="flex items-start gap-3 min-w-0">
       <div className="p-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
         <AlertCircle className="w-5 h-5" />
       </div>
       <div className="min-w-0">
         <p className="text-sm font-bold text-foreground">Impossible de composer l’invitation</p>
         <p className="text-xs text-rose-800 dark:text-rose-200 mt-0.5 leading-relaxed break-words">{error}</p>
       </div>
     </div>
     <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
       {error.toLowerCase().includes('jeton') ? (
         <button
           type="button"
           onClick={() => onRecharge()}
           className="min-h-9 px-3.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
         >
           Recharger des jetons
         </button>
       ) : (
         <button
           type="button"
           disabled={busy}
           onClick={onRetry}
           className="min-h-9 px-3.5 text-xs font-bold rounded-lg bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground shadow-xs transition inline-flex items-center gap-1.5"
         >
           <Wand2 className="w-3.5 h-3.5" />
           Réessayer
         </button>
       )}
       <button
         type="button"
         onClick={onDismissError}
         className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition"
         aria-label="Fermer le message d’erreur"
       >
         <X className="w-4 h-4" />
       </button>
     </div>
   </div>
 ) : null}
 <div className={columns === 2 ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10 xl:gap-12 lg:items-start space-y-6 lg:space-y-0' : 'space-y-6'}>
 <div className="space-y-6">
 <div>
 <p className="text-sm font-semibold text-foreground mb-2">1. {sectionTitles[0]}</p>
 <div
   role="radiogroup"
   aria-label="Type de création"
   className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
 >
   {INVITATION_COMPOSE_MODES.map((option) => {
     const active = mode === option.id;
     const ModeIcon = option.icon;
     return (
       <button
         key={option.id}
         type="button"
         role="radio"
         aria-checked={active}
         disabled={busy}
         onClick={() => { if (option.id !== mode) onModeChange(option.id); }}
         className={cn(
           'min-h-14 px-3 py-3 rounded-[var(--radius-button)] border text-left transition flex sm:flex-col items-start gap-2.5 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60',
           active
             ? 'border-primary bg-primary/10 shadow-xs'
             : 'border-border bg-surface hover:border-primary/40',
         )}
       >
         <span className={cn(
           'w-8 h-8 shrink-0 rounded-lg flex items-center justify-center',
           active ? 'bg-primary-solid text-primary-foreground' : 'bg-surface-muted text-muted',
         )}>
           <ModeIcon className="w-4 h-4" aria-hidden />
         </span>
         <span className="min-w-0">
           <span className="block text-sm font-bold text-foreground">{option.label}</span>
           <span className="block text-xs text-muted mt-0.5 leading-snug">{option.hint}</span>
         </span>
       </button>
     );
   })}
 </div>
 </div>

 {isFaces ? (
 <div className="space-y-3">
   <p className="text-sm font-semibold text-foreground">2. {sectionTitles[1]}</p>
   <div>
     <label htmlFor={`${idPrefix}-incoming`} className="text-sm font-semibold text-muted">Carte à modifier</label>
     <input
       id={`${idPrefix}-incoming`}
       ref={incomingInputRef}
       type="file"
       accept="image/jpeg,image/png,image/webp"
       className="sr-only"
       onChange={(e) => {
         const file = e.target.files?.[0] || null;
         e.target.value = '';
         onIncomingFile(file);
       }}
     />
     <button
       type="button"
       disabled={busy}
       onClick={() => incomingInputRef.current?.click()}
       className="mt-1.5 min-h-28 w-full flex items-center gap-4 p-4 border-2 border-dashed rounded-[var(--radius-card)] text-left transition border-primary/30 hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
     >
       {(incomingPreview || modelPhoto?.imageUrl || currentCardUrl) ? (
         // eslint-disable-next-line @next/next/no-img-element
         <img
           src={incomingPreview || modelPhoto?.imageUrl || currentCardUrl}
           alt="Invitation dont les visages seront remplacés"
           className="w-20 h-20 sm:w-24 sm:h-24 rounded-[var(--radius-button)] object-cover border border-border shrink-0"
         />
       ) : (
         <span className="w-20 h-20 sm:w-24 sm:h-24 rounded-[var(--radius-button)] bg-surface-muted border border-border flex items-center justify-center shrink-0">
           <ImageIcon className="w-5 h-5 text-primary" aria-hidden />
         </span>
       )}
       <span className="min-w-0">
         <span className="block text-xs font-bold text-foreground">
           {incomingFile
             ? incomingFile.name
             : modelPhoto
               ? modelPhoto.name
               : currentCardUrl
                 ? 'Carton actuel du studio'
                 : 'Choisir une invitation'}
         </span>
         <span className="block text-xs text-muted mt-0.5">
           Les visages de cette image seront remplacés. Pose du corps, décor et expressions du carton restent ; vos photos fournissent seulement l’identité.
         </span>
       </span>
     </button>
     <div className="mt-3">
       <InvitationModelPhotoPicker
         id={`${idPrefix}-model-incoming`}
         selectedId={modelPhoto?.id || null}
         models={models}
         disabled={busy}
         onSelect={(photo) => {
           onIncomingFile(null);
           onModelPhotoChange(photo);
         }}
         onClear={() => onModelPhotoChange(null)}
       />
     </div>
   </div>
   <div>
     <label htmlFor={`${idPrefix}-couple-photos`} className="text-sm font-semibold text-muted">Photos du couple (1 ou 2)</label>
     <input
       id={`${idPrefix}-couple-photos`}
       ref={filesInputRef}
       type="file"
       accept="image/jpeg,image/png,image/webp"
       multiple
       className="sr-only"
       onChange={handleFilesSelected}
     />
     <button
       type="button"
       disabled={busy}
       onDragOver={(e) => {
         e.preventDefault();
         setDragging(true);
       }}
       onDragLeave={() => setDragging(false)}
       onDrop={(e) => {
         e.preventDefault();
         setDragging(false);
         const dropped = Array.from(e.dataTransfer.files || []);
         if (dropped.length) onAddFiles(dropped);
       }}
       onClick={() => filesInputRef.current?.click()}
       className={`mt-1.5 min-h-28 w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-[var(--radius-card)] text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
         dragging
           ? 'border-primary bg-primary/15 text-primary'
           : 'border-primary/30 hover:border-primary hover:bg-primary/5 text-primary'
       }`}
     >
       <Users className="w-5 h-5" aria-hidden />
       {files.length > 0
         ? `Ajouter une autre photo (${files.length}/2)`
         : 'Elle / lui — photos nettes, visage visible'}
     </button>
     {previewUrls.length > 0 && (
       <div className="mt-2 flex flex-wrap gap-2.5">
         {previewUrls.map((url, i) => {
           const role = fileRoles[i] || (i === 0 ? 'groom' : i === 1 ? 'bride' : 'auto');
           return (
             <div key={url} className="relative w-24 h-32 sm:w-28 sm:h-36 rounded-[var(--radius-button)] overflow-hidden border border-border flex flex-col bg-surface-muted">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={url} alt={i === 0 ? 'Premier visage du couple' : 'Second visage du couple'} className="w-full h-full object-cover" loading="lazy" />
               <button
                 type="button"
                 disabled={busy}
                 onClick={() => onRemoveFile(i)}
                 className="absolute top-1 right-1 inline-flex min-h-[36px] min-w-[36px] items-center justify-center bg-foreground/85 hover:bg-foreground text-background rounded-full transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs z-10"
                 aria-label={i === 0 ? 'Retirer le premier visage' : 'Retirer le second visage'}
               >
                 <XCircle className="w-4 h-4" aria-hidden />
               </button>
               <button
                 type="button"
                 disabled={busy}
                 aria-label={`Rôle pour la photo ${i + 1} : ${role === 'groom' ? 'Marié (costume)' : 'Mariée (robe)'}. Cliquez pour permuter.`}
                 onClick={(e) => {
                   e.stopPropagation();
                   onToggleFileRole(i);
                 }}
                 className={cn(
                   'absolute bottom-0 inset-x-0 min-h-[32px] py-1 text-xs font-bold text-center tracking-tight transition z-10 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                   role === 'groom'
                     ? 'bg-stage/95 hover:bg-stage text-stage-foreground border-t border-white/10'
                     : 'bg-festive-accent/95 hover:bg-festive-accent text-white border-t border-white/10',
                 )}
                 title="Cliquez pour changer le rôle (Marié ou Mariée)"
               >
                 {role === 'groom' ? '🤵 Marié' : '👰 Mariée'}
               </button>
             </div>
           );
         })}
       </div>
     )}
     <div className="mt-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 flex items-center gap-2 text-xs text-primary font-medium">
       <Sparkles className="w-3.5 h-3.5 shrink-0 text-primary" />
       <span>Harmonisation réaliste active : carnation, lumière et contours du cou fondus au décor.</span>
     </div>
   </div>
 </div>
 ) : (
 <div className="space-y-3">
 <p className="text-sm font-semibold text-foreground">2. {sectionTitles[1]}</p>
 {mode === 'modify' ? (
   <>
     {currentCardUrl && !modelPhoto && files.length === 0 ? (
       <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-3">
         {/* eslint-disable-next-line @next/next/no-img-element */}
         <img src={currentCardUrl} alt="Carte actuelle" className="w-14 h-20 rounded-lg object-cover border border-border shrink-0" />
         <p className="text-xs text-muted leading-relaxed">
           <span className="block text-sm font-bold text-foreground">La carte ouverte dans l’éditeur</span>
           Elle sert de base. Choisissez un modèle ou importez une photo pour partir d’une autre carte.
         </p>
       </div>
     ) : null}
     <InvitationModelPhotoPicker
       id={`${idPrefix}-model-photos`}
       selectedId={modelPhoto?.id || null}
       models={models}
       disabled={busy}
       onSelect={(photo) => onModelPhotoChange(photo)}
       onClear={() => onModelPhotoChange(null)}
     />
   </>
 ) : (
   <p className="text-xs text-muted leading-relaxed">
     Ajoutez des photos qui inspirent l’ambiance (lieu, tenue, couleurs). Elles guident l’IA sans être copiées.
   </p>
 )}
 <label htmlFor={`${idPrefix}-optional-photos`} className="text-sm font-semibold text-muted">
   {mode === 'modify' ? 'Ou la photo de la carte à transformer' : 'Photos d’inspiration (1 à 4)'}
 </label>
 <input
 id={`${idPrefix}-optional-photos`}
 ref={filesInputRef}
 type="file"
 accept="image/jpeg,image/png,image/webp"
 multiple
 className="sr-only"
 onChange={handleFilesSelected}
 />
 <button
 type="button"
 disabled={busy}
 onDragOver={(e) => {
 e.preventDefault();
 setDragging(true);
 }}
 onDragLeave={() => setDragging(false)}
 onDrop={(e) => {
 e.preventDefault();
 setDragging(false);
 const dropped = Array.from(e.dataTransfer.files || []);
 if (dropped.length) onAddFiles(dropped);
 }}
 onClick={() => filesInputRef.current?.click()}
 className={`mt-1.5 min-h-36 w-full flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-[var(--radius-card)] text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
 dragging
 ? 'border-primary bg-primary/15 text-primary'
 : 'border-primary/30 hover:border-primary hover:bg-primary/5 text-primary'
 }`}
 >
 <Upload className="w-6 h-6" />
 {files.length > 0 ? (
 <>
 <span className="sm:hidden">Ajouter ({files.length}/4)</span>
 <span className="hidden sm:inline">{`Ajouter d'autres photos (${files.length}/4)`}</span>
 </>
 ) : (
 <>
 <span className="sm:hidden">{mode === 'modify' ? 'Ajouter la photo' : 'Ajouter des photos'}</span>
 <span className="hidden sm:inline">
   {mode === 'modify' ? 'Glisser ou cliquer pour ajouter la photo de la carte' : 'Glisser ou cliquer pour ajouter des photos (1 à 4)'}
 </span>
 </>
 )}
 </button>
 {previewUrls.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-2">
 {previewUrls.map((url, i) => (
 <div key={url} className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[var(--radius-button)] overflow-hidden border border-border">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={url} alt={`Référence ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
 <button
 type="button"
 disabled={busy}
 onClick={() => onRemoveFile(i)}
 className="absolute top-0.5 right-0.5 inline-flex min-h-11 min-w-11 items-center justify-center bg-foreground/80 text-background rounded-full"
 aria-label={`Retirer l’image ${i + 1}`}
 >
 <XCircle className="w-3.5 h-3.5" aria-hidden />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>

 <div className="space-y-4">
 <div>
 <p className="text-sm font-semibold text-foreground mb-2">
   3. {sectionTitles[2]}
 </p>

 <div
   className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-lg border border-border mb-3"
   role="tablist"
   aria-label="Sections du studio d'invitation"
 >
   <button
     id={`${idPrefix}-tab-texts`}
     type="button"
     role="tab"
     aria-selected={detailsSection === 'texts'}
     aria-controls={`${idPrefix}-panel-texts`}
     tabIndex={detailsSection === 'texts' ? 0 : -1}
     onClick={() => setDetailsSection('texts')}
     onKeyDown={(e) => {
       if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
         e.preventDefault();
         setDetailsSection('style');
       }
     }}
     className={cn(
       'flex-1 min-h-[44px] px-3 py-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
       detailsSection === 'texts'
         ? 'bg-surface text-foreground shadow-xs border border-border/80'
         : 'text-muted hover:text-foreground',
     )}
   >
     <PenTool className="w-3.5 h-3.5" aria-hidden />
     <span>Textes de la carte</span>
     {hasTexts && (
       <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-label="Contient des textes saisis" />
     )}
   </button>
   <button
     id={`${idPrefix}-tab-style`}
     type="button"
     role="tab"
     aria-selected={detailsSection === 'style'}
     aria-controls={`${idPrefix}-panel-style`}
     tabIndex={detailsSection === 'style' ? 0 : -1}
     onClick={() => setDetailsSection('style')}
     onKeyDown={(e) => {
       if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
         e.preventDefault();
         setDetailsSection('texts');
       }
     }}
     className={cn(
       'flex-1 min-h-[44px] px-3 py-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
       detailsSection === 'style'
         ? 'bg-surface text-foreground shadow-xs border border-border/80'
         : 'text-muted hover:text-foreground',
     )}
   >
     <Sparkles className="w-3.5 h-3.5" aria-hidden />
     <span>Ambiance et cérémonie</span>
   </button>
 </div>

 <div
   id={`${idPrefix}-panel-texts`}
   role="tabpanel"
   aria-labelledby={`${idPrefix}-tab-texts`}
   hidden={detailsSection !== 'texts'}
 >
   {detailsSection === 'texts' && (
     <InvitationCardInfoFields
       id={`${idPrefix}-card-info`}
       value={structured}
       onChange={onStructuredChange}
       showReplaceToggles={mode !== 'create'}
       disabled={busy}
       compact
     />
   )}
 </div>

 <div
   id={`${idPrefix}-panel-style`}
   role="tabpanel"
   aria-labelledby={`${idPrefix}-tab-style`}
   hidden={detailsSection !== 'style'}
 >
   {detailsSection === 'style' && styleIntro ? <div className="mb-3">{styleIntro}</div> : null}
   {detailsSection === 'style' && (
     <InvitationStructuredBriefFields
       id={`${idPrefix}-structured`}
       value={structured}
       onChange={onStructuredChange}
       disabled={busy}
       compact
     />
   )}
 </div>

 <div className="flex items-center justify-between mt-3">
 <label htmlFor={`${idPrefix}-prompt`} className="text-xs font-semibold text-muted">
   {mode === 'create' ? 'Décrivez la fête en une phrase' : 'Ce qui doit changer (optionnel)'}
 </label>
 <span className="flex items-center gap-1">
   {promptTools}
   <span className="hidden sm:inline text-xs text-muted tabular-nums">
     {prompt.length} car.
   </span>
 </span>
 </div>
 <textarea
 id={`${idPrefix}-prompt`}
 rows={3}
 value={prompt}
 disabled={busy}
 onChange={(e) => onPromptChange(e.target.value)}
 placeholder={isFaces
   ? 'Optionnel : préciser qui est à gauche / à droite, ou garder une tenue…'
   : mode === 'modify'
     ? 'Ex. Passer en or et ivoire, remplacer les fleurs par du wax, garder la mise en page…'
     : 'Ex. Mariage coutumier chic à Kinshasa, tons or et ivoire, fleurs blanches, lumière chaude…'}
 className="mt-1 w-full rounded-[var(--radius-card)] border border-border bg-surface-muted px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y min-h-[4.5rem]"
 />

 <div className="mt-3 flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface">
   <div>
     <span className="block text-xs font-bold text-foreground">Textes modifiables après la création</span>
     <span className="block text-xs text-muted">
       {embedText
         ? 'Non : l’IA dessine les textes dans l’image, ils ne se modifient plus.'
         : 'Oui : l’image reste sans texte, noms et date restent modifiables dans l’éditeur.'}
     </span>
   </div>
   <button
     type="button"
     role="switch"
     aria-checked={!embedText}
     disabled={busy}
     onClick={() => onEmbedTextChange(!embedText)}
     className={`min-h-9 px-3 rounded-lg text-xs font-bold transition border ${
       !embedText
         ? 'bg-primary-solid text-primary-foreground border-primary shadow-xs'
         : 'bg-surface-muted text-muted hover:text-foreground border-border'
     }`}
   >
     {!embedText ? 'Oui (conseillé)' : 'Non'}
   </button>
 </div>

 <p className="mt-2 text-xs text-muted">
 Besoin d’une idée ? Ouvrez <button type="button" className="font-bold text-primary hover:underline" onClick={() => onShowExamples}>Exemples</button> : des descriptions prêtes à lancer.
 </p>

 <button
   type="button"
   aria-expanded={advancedOpen}
   disabled={busy}
   onClick={() => setAdvancedOpen((open) => !open)}
   className="mt-4 min-h-11 w-full inline-flex items-center justify-between gap-2 px-3 rounded-[var(--radius-button)] border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 >
   <span>Options avancées</span>
   <span className="text-xs font-medium text-muted">{advancedOpen ? 'Masquer' : 'Style, jetons, variations'}</span>
 </button>

 {advancedOpen ? (
 <div className="mt-3 space-y-3 rounded-[var(--radius-card)] border border-border bg-surface-muted/40 p-4">
 <div className="flex items-center gap-1.5 flex-wrap">
 <span className="text-xs font-semibold text-muted flex items-center gap-1">
 <Tag className="w-3 h-3 text-primary" />
 Insérer dans le brief
 </span>
 {[
 { tag: '{{firstName}}', label: 'Prénom' },
 { tag: '{{lastName}}', label: 'Nom' },
 { tag: '{{date}}', label: 'Date' },
 { tag: '{{location}}', label: 'Lieu' },
 { tag: '{{title}}', label: 'Événement' },
 ].map((v) => (
 <button
 key={v.tag}
 type="button"
 disabled={busy}
 onClick={() => insertVariable(v.tag)}
 className="min-h-11 px-3 rounded-md text-xs font-bold border border-border bg-surface hover:border-primary/40 hover:bg-primary/5 text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 title={`Insérer ${v.tag}`}
 >
 {v.label}
 </button>
 ))}
 </div>
 <InvitationArtStylePicker
 id={`${idPrefix}-art-style`}
 value={artStyle}
 onChange={onArtStyleChange}
 disabled={busy}
 />
 <InvitationContextSourcePicker
 id={`${idPrefix}-context`}
 value={contextSource}
 onChange={onContextSourceChange}
 disabled={busy}
 canUseOrg={canUseOrg}
 />

 <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
   <div>
     <span className="block text-sm font-bold text-foreground">Vitesse</span>
     <span className="block text-xs text-muted">Rapide ou plus net</span>
   </div>
   <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
     <button
       type="button"
       disabled={busy}
       onClick={() => onSpeedModeChange('fast')}
       className={`min-h-11 px-3 text-xs font-bold rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${speedMode === 'fast' ? 'bg-primary-solid text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground'}`}
       title="Génération en 4 à 8 secondes"
     >
       Rapide
     </button>
     <button
       type="button"
       disabled={busy}
       onClick={() => onSpeedModeChange('quality')}
       className={`min-h-11 px-3 text-xs font-bold rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${speedMode === 'quality' ? 'bg-primary-solid text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground'}`}
       title="Image plus nette, un peu plus longue"
     >
       Plus nette
     </button>
   </div>
 </div>

 </div>
 ) : null}
 </div>
 </div>
 </div>

 {busy ? (
   <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3.5 shadow-sm">
     <div className="relative shrink-0">
       <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
       <Loader2 className="w-5 h-5 animate-spin text-primary relative" />
     </div>
     <div className="min-w-0 flex-1">
       <p className="text-xs font-extrabold text-foreground tracking-wide uppercase flex items-center gap-1.5">
         <Sparkles className="w-3.5 h-3.5 text-primary" />
         {stage || 'Génération de l’invitation IA…'}
       </p>
       <p className="text-xs text-muted mt-0.5 leading-snug">
         {busyHint}
       </p>
     </div>
   </div>
 ) : stage ? (
 <p className="text-xs font-bold text-primary flex items-center gap-2">
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 {stage}
 </p>
 ) : null}
    </>
  );
}
