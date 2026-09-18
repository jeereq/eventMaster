'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { uploadImageFile, uploadDataUrlImage, isCloudinaryUrl } from '@/lib/cloudinaryUpload';
import { extractPaletteFromSource, type TemplatePalette } from '@/lib/imagePalette';
import { applyPaletteToElements, invitationColorThemes, ORG_BRAND_THEME_ID, buildOrgBrandInvitationTheme } from '@/lib/templateColorThemes';
import { FONT_THEMES, applyFontThemeToElements, getFontTheme } from '@/lib/templateFontThemes';
import { TEMPLATE_IMAGE_STYLES, templateImageStyleClass, templateImageStyleExtra, type TemplateImageStyleId } from '@/lib/templateImageStyle';
import { editorialLayoutById, fillEditorialTokens, type EditorialLayoutId } from '@/lib/invitationEditorialLayouts';
import { buildMockupTemplate, applyMockupToEditor, applyMockupTextMode, buildTextElementsFromOcrLines, type MockupImportTextMode } from '@/lib/templateMockupImport';
import { extractTextFromImageSource, mergeOcrIntoMockupElements } from '@/lib/templateOcrImport';
import { composeTemplateWithAi, applyAiComposeToEditor, loadAiTemplateDraft, clearAiTemplateDraft, downloadAiGeneratedImage, COUPLE_FACE_SWAP_DEFAULT_PROMPT, type AiSpeedMode } from '@/lib/templateAiCompose';
import { isStudioJobAccepted, onStudioJob } from '@/lib/studioJobs';
import { useStudioJobs, useStudioLoaderOverlay } from '@/context/StudioJobsContext';
import AiComposeFullscreenLoader from '@/components/AiComposeFullscreenLoader';
import {
 fetchAiTemplateComposeHistoryStudio,
 type AiTemplateComposeHistoryItem,
 extractItemVariants,
} from '@/lib/aiTemplateComposeHistory';
import AiTemplateComposeHistoryList from '@/components/AiTemplateComposeHistoryList';
import { StudioAiTabs, StudioHowTo, type StudioAiTabId } from '@/components/StudioAiTabs';
import {
 persistInvitationArtStyle,
 readStoredInvitationArtStyle,
 DEFAULT_INVITATION_ART_STYLE,
 type InvitationArtStyleId,
} from '@/config/invitationArtStyles';
import {
 persistInvitationContextSource,
 readStoredInvitationContextSource,
 type InvitationContextSource,
} from '@/lib/invitationContextSource';
import {
 getAiSimulationAllowance,
 createEmptyAiAllowance,
 syncDeviceAiTokensWithBackend,
 canAffordAiAction,
 aiTokenBalanceLabel,
 AI_INVITATION_COMPOSE_TOKEN_COST,
 resolveInvitationComposeTokenCostClient,
 type AiAllowance,
} from '@/lib/aiTokens';
import AiTokenPurchaseModal from '@/components/AiTokenPurchaseModal';
import { 
 Mail, PlusCircle, Trash2, Edit3, ArrowLeft, Save, 
 Sparkles, CheckCircle2, AlertCircle, Type, Image, 
 Columns, Eye, CheckSquare, Loader2, XCircle,
 Spline, Triangle, Trash, Layout, Palette, Square,
 ArrowUp, ArrowDown, Crop, Copy, Upload, Globe, Wand2, Coins,
 Undo2, Redo2, History, Download, Tag, SlidersHorizontal, LayoutTemplate,
 Calendar, MapPin, User, Users, PenTool, MessageSquare, Layers, Move, Crown, ArrowRight, Check, Clock,
} from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { StudioMobileDock } from '@/components/StudioMobileDock';
import { PageHeader, Alert, Button, Input, SkeletonTemplatesView, ViewModeToggle, useViewMode, Breadcrumbs, Pagination, usePaginateItems, usePageSize, Modal } from '@/components/ui';
import InvitationDuplicateModal, { type InvitationDuplicateValues } from '@/components/InvitationDuplicateModal';
import InvitationStructuredBriefFields from '@/components/InvitationStructuredBriefFields';
import InvitationCardInfoFields from '@/components/InvitationCardInfoFields';
import { emptyInvitationStructuredBrief, type InvitationStructuredBrief } from '@/config/invitationStructuredBrief';
import InvitationModelPhotoPicker from '@/components/InvitationModelPhotoPicker';
import {
  invitationModelPhotoFromContent,
  invitationModelPhotosFromItems,
  type InvitationModelPhoto,
} from '@/lib/invitationModelPhoto';
import {
 applyInvitationIdentityToContent,
 hasInvitationIdentity,
 identityFromTemplateContent,
 invitationIdentityForCard,
 resolveInvitationIdentity,
} from '@/lib/invitationIdentity';
import { cn } from '@/lib/cn';
import PlanLimitCallout from '@/components/PlanLimitCallout';
import RsvpFieldTypeEditor from '@/components/RsvpFieldTypeEditor';
import { getFeatureLockMessage, getQuotaActionMessage } from '@/lib/planAccess';
import TemplateCardGrid from '@/components/templates/TemplateCardGrid';
import TemplatePreviewModal from '@/components/templates/TemplatePreviewModal';
import {
 type RsvpField,
 type CanvasSizePreset,
 CANVAS_SIZE_PRESETS,
 createDefaultReportingRsvpFields,
 ensureReportingRsvpFields,
 ensureMandatoryRsvpFields,
 ensureMandatoryRsvpFieldsOnElements,
 validateRsvpFieldsForReporting,
 getStudioPreviewStyle,
} from '@/lib/rsvpFormFields';
import {
 INVITATION_GOOGLE_FONTS_HREF,
 INVITATION_GOOGLE_FONTS_ID,
 useHeadStylesheet,
} from '@/lib/headStylesheet';
import { playAiGenerationCompleteSound, unlockAudioNotifications } from '@/lib/audioNotifications';

const EditorialLayoutPicker = dynamic(() => import('@/components/EditorialLayoutPicker'), { ssr: false });
const PromptModelSelector = dynamic(() => import('@/components/PromptModelSelector'), { ssr: false });
const InvitationContextSourcePicker = dynamic(() => import('@/components/InvitationContextSourcePicker'), { ssr: false });
const InvitationArtStylePicker = dynamic(() => import('@/components/InvitationArtStylePicker'), { ssr: false });

interface TemplateItem {
 id: string;
 name: string;
 content: any;
 createdAt: string;
 tenantId?: string | null;
 showOnLanding?: boolean;
 aiTokenCost?: number;
 isGlobal?: boolean;
 isOwned?: boolean;
 canEdit?: boolean;
 canDelete?: boolean;
 canDuplicate?: boolean;
 tenant?: {
 name: string;
 } | null;
}

interface CanvasElement {
 id: string;
 type: 'text' | 'image' | 'button' | 'rsvp-block' | 'curve' | 'triangle' | 'divider';
 text: string; // Used for text content, button text, image placeholder, shape labels
 color: string; // Main color (text color, button bg, shape fill, stroke color)
 fontSize: string; // Font size (for text/button) or stroke width/size for shapes
 align: 'left' | 'center' | 'right';
 
 // Advanced properties
 imageUrl?: string;
 imageWidth?: string;
 imageHeight?: string;
 imageObjectFit?: 'cover' | 'contain' | 'fill' | 'none';
 
 // Shape properties
 strokeWidth?: string;
 shapeSize?: string;
 
 // Customizabla réponse à l’invitation fields
 rsvpFields?: RsvpField[];
 /** inline = dans l’invitation ; outside = panneau sous la zone de design */
 rsvpPlacement?: 'inline' | 'outside';

 // New properties for high-end styling
 width?: 'full' | 'half' | 'third';
 fontFamily?: string;
 letterSpacing?: string;
 bold?: boolean;
 italic?: boolean;
 dividerStyle?: 'solid' | 'dashed' | 'ornament-flower' | 'ornament-diamond' | 'ornament-star' | 'ornament-leaves' | 'ornament-lace';
 curveStyle?: 'wave' | 'arc' | 'flourish-1' | 'flourish-2' | 'spiral' | 'infinity';
 imageStyle?: TemplateImageStyleId;
 buttonStyle?: 'filled' | 'outline' | 'pill' | 'gold-glow' | 'double-border' | 'minimalist';
 buttonLink?: string;
 /** Disposition : flux (défaut) ou libre (x/y %) */
 positionMode?: 'flow' | 'absolute';
 xPct?: number;
 yPct?: number;
 wPct?: number;
 zIndex?: number;
}

const darkenColor = (hex: string, percent = 30) => {
 if (!hex || !hex.startsWith('#')) return hex || '#000000';
 let r = parseInt(hex.slice(1, 3), 16);
 let g = parseInt(hex.slice(3, 5), 16);
 let b = parseInt(hex.slice(5, 7), 16);
 r = Math.max(0, Math.floor(r * (1 - percent / 100)));
 g = Math.max(0, Math.floor(g * (1 - percent / 100)));
 b = Math.max(0, Math.floor(b * (1 - percent / 100)));
 return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const lightenColor = (hex: string, percent = 30) => {
 if (!hex || !hex.startsWith('#')) return hex || '#ffffff';
 let r = parseInt(hex.slice(1, 3), 16);
 let g = parseInt(hex.slice(3, 5), 16);
 let b = parseInt(hex.slice(5, 7), 16);
 r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
 g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
 b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
 return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

function getElementFieldInfo(el: Record<string, unknown>, index: number): {
 label: string;
 iconType: 'user' | 'calendar' | 'map' | 'message' | 'rsvp' | 'type';
 placeholder: string;
} {
 const type = typeof el.type === 'string' ? el.type : 'text';
 const text = typeof el.text === 'string' ? el.text : '';
 const lower = text.toLowerCase();

 if (type === 'rsvp-block') {
 return { label: 'Bouton de confirmation de présence', iconType: 'rsvp', placeholder: 'Ex: Confirmer votre présence' };
 }

 const hasDateWords = /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre|202[0-9]|\b\d{1,2}h\d{0,2}\b)/i.test(text);
 if (hasDateWords) {
 return { label: 'Date & Heure', iconType: 'calendar', placeholder: 'Ex: Samedi 24 Octobre 2026 à 16h00' };
 }

 const hasPlaceWords = /(h[oô]tel|salle|palais|centre|parc|espace|avenue|boulevard|rue|kinshasa|lubumbashi|goma|gombe|limete|ngaliema)/i.test(lower);
 if (hasPlaceWords) {
 return { label: 'Lieu de réception', iconType: 'map', placeholder: 'Ex: Grand Hôtel de Kinshasa, Salle Virunga' };
 }

 const hasCoupleSymbol = /(&|et|\+|avec)/i.test(text) && text.length < 60;
 if (hasCoupleSymbol || (index <= 1 && text.split(/\s+/).length >= 2 && text.length < 45 && !hasDateWords)) {
 return { label: 'Noms sur l’invitation (Mariés / Hôtes)', iconType: 'user', placeholder: 'Ex: Sarah & Jonathan' };
 }

 if (index === 0 && text.length < 35) {
 return { label: 'En-tête / Titre d’invitation', iconType: 'type', placeholder: 'Ex: Invitation au Mariage' };
 }

 if (text.length > 30) {
 return { label: 'Message / Annonce', iconType: 'message', placeholder: 'Ex: Ont la joie de vous convier à la célébration…' };
 }

 return { label: `Texte personnalisé (${index + 1})`, iconType: 'type', placeholder: 'Texte sur la carte' };
}

export default function TemplatesPage() {
 const { user, planFeatures, planQuota, tenant, access } = useAuth();
 const { trackJob } = useStudioJobs();
 const { runningJob: invitationStudioJob, isHidden: invitationLoaderHidden, hideOverlay: hideInvitationLoader, showOverlay: showInvitationLoader } = useStudioLoaderOverlay('invitation');
 const { site } = usePlatformSite();
 const isInviteBlocked = site?.studioVisibility?.invite === false;
 const router = useRouter();
 /** admin = ouvert depuis la console Super Admin (?tab=templates) ; studio = concepteur organisation */
 type StudioOrigin = 'admin' | 'studio';
 const ADMIN_TEMPLATES_HREF = '/dashboard?tab=templates';
 const [studioOrigin, setStudioOrigin] = useState<StudioOrigin>('studio');
 const isPlatformTemplateAdmin = Boolean(
  user && (user.role === 'SUPER_ADMIN' || (user.role === 'COMMERCIAL' && user.commercialPermissions?.canManageTemplates))
 );
 const isSuperAdmin = isPlatformTemplateAdmin;
 const fromAdminConsole = studioOrigin === 'admin' && isPlatformTemplateAdmin;
 const isOwnerOrManager = Boolean(
  access?.isOwner ||
  access?.level === 'manager' ||
  user?.orgRole === 'MANAGER' ||
  isPlatformTemplateAdmin,
 );
 const canUseCustomTemplates = isPlatformTemplateAdmin || planFeatures?.customTemplates === true;
 const canUseMockupImport = true;
 const canUseMockupOcr = isPlatformTemplateAdmin || planFeatures?.mockupOcr === true;
 const templatesAtLimit =
  !isPlatformTemplateAdmin &&
 Boolean(
 planQuota &&
 planQuota.limits.maxTemplates < 9999 &&
 planQuota.usage.templates >= planQuota.limits.maxTemplates,
 );
 const templatesQuotaMsg = templatesAtLimit
 ? `Quota modèles atteint (${planQuota!.usage.templates}/${planQuota!.limits.maxTemplates}). Passez à un forfait supérieur pour enregistrer de nouveaux modèles.`
 : null;
 const {
 mode: templatesViewMode,
 setViewMode: setTemplatesViewMode,
 columns: templatesColumns,
 setGridColumns: setTemplatesColumns,
 } = useViewMode('em-view-templates', 'grid', 3);
 const [catalogPage, setCatalogPage] = useState(1);
 const [ownTemplatesPage, setOwnTemplatesPage] = useState(1);
 const [templatesPageSize, setTemplatesPageSize] = usePageSize('templates', 9);
 const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
 const [saveUpgradeModalOpen, setSaveUpgradeModalOpen] = useState(false);
 const [templates, setTemplates] = useState<TemplateItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [editorOpen, setEditorOpen] = useState(false);
 useHeadStylesheet(INVITATION_GOOGLE_FONTS_HREF, INVITATION_GOOGLE_FONTS_ID, editorOpen);
 const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
 const [templateName, setTemplateName] = useState('');
 const [invitationHonorees, setInvitationHonorees] = useState('');
 const [invitationDate, setInvitationDate] = useState('');
 const [duplicateTarget, setDuplicateTarget] = useState<TemplateItem | null>(null);
 const [duplicating, setDuplicating] = useState(false);
 const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
 const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

 // Historique des actions du Studio (Undo / Redo / Journal)
 interface StudioActionHistoryEntry {
 id: string;
 label: string;
 time: string;
 elements: CanvasElement[];
 }
 const [studioHistory, setStudioHistory] = useState<StudioActionHistoryEntry[]>([]);
 const [studioHistoryIndex, setStudioHistoryIndex] = useState<number>(-1);
 const [studioHistoryModalOpen, setStudioHistoryModalOpen] = useState(false);

 const recordStudioAction = (label: string, newElements: CanvasElement[]) => {
 const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
 const entry: StudioActionHistoryEntry = {
 id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
 label,
 time,
 elements: JSON.parse(JSON.stringify(newElements)),
 };
 setStudioHistory((prev) => {
 const next = [...prev.slice(0, studioHistoryIndex + 1), entry].slice(-30);
 setStudioHistoryIndex(next.length - 1);
 return next;
 });
 };

 const handleStudioUndo = () => {
 if (studioHistoryIndex > 0) {
 const target = studioHistory[studioHistoryIndex - 1];
 setStudioHistoryIndex((i) => i - 1);
 setCanvasElements(JSON.parse(JSON.stringify(target.elements)));
 }
 };

 const handleStudioRedo = () => {
 if (studioHistoryIndex < studioHistory.length - 1) {
 const target = studioHistory[studioHistoryIndex + 1];
 setStudioHistoryIndex((i) => i + 1);
 setCanvasElements(JSON.parse(JSON.stringify(target.elements)));
 }
 };

 // Super Admin specific states
 const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
 const [selectedTenantId, setSelectedTenantId] = useState<string>('');
 
 // Global template properties
 const [bgType, setBgType] = useState<'color' | 'image' | 'pattern'>('pattern');
 const [bgColor, setBgColor] = useState('#faf8f5');
 const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgPattern, setBgPattern] = useState<
    | 'none'
    | 'paper'
    | 'watercolor'
    | 'boho'
    | 'linen'
    | 'marble'
    | 'gold-dust'
    | 'parchment'
    | 'velvet'
    | 'vellum'
    | 'art-deco-geom'
    | 'kuba-weave'
    | 'deckled-cotton'
    | 'celestial'
  >('paper');
  const [frameType, setFrameType] = useState<
    | 'none'
    | 'arch'
    | 'double-border'
    | 'gold-border'
    | 'floral-wreath'
    | 'floral-arch'
    | 'boho-dried'
    | 'gold-leaves-circle'
    | 'minimal-leaves'
    | 'art-deco'
    | 'deckled'
    | 'embossed-arch'
    | 'passport-vip'
    | 'frosted-glass'
  >('double-border');
 const [fontTheme, setFontTheme] = useState('classic');
 const [floralColor, setFloralColor] = useState('#b91c1c');
 const [floralType, setFloralType] = useState<'roses' | 'cherry-blossom' | 'gold-leaves' | 'sunflowers' | 'eucalyptus'>('roses');
 const [floralDensity, setFloralDensity] = useState<number>(40);

 // Landing page metadata (modèles globaux super admin)
 const [landingCategory, setLandingCategory] = useState<'private' | 'corporate' | 'casual'>('private');
 const [landingDescription, setLandingDescription] = useState('');
 const [showOnLanding, setShowOnLanding] = useState(false);
 const [aiTokenCost, setAiTokenCost] = useState(AI_INVITATION_COMPOSE_TOKEN_COST);
 const [canvasSizePreset, setCanvasSizePreset] = useState<CanvasSizePreset>('standard');
 const [canvasWidth, setCanvasWidth] = useState(CANVAS_SIZE_PRESETS.standard.width);
 const [canvasHeight, setCanvasHeight] = useState(CANVAS_SIZE_PRESETS.standard.height);

 // Property editing states for selected element
 const [elText, setElText] = useState('');
 const [elColor, setElColor] = useState('#1e293b');
 const [elFontSize, setElFontSize] = useState('16px');
 const [elAlign, setElAlign] = useState<'left' | 'center' | 'right'>('center');
 const [elImageUrl, setElImageUrl] = useState('');
 const [elImageWidth, setElImageWidth] = useState('100%');
 const [elImageHeight, setElImageHeight] = useState('200px');
 const [elImageObjectFit, setElImageObjectFit] = useState<'cover' | 'contain' | 'fill' | 'none'>('cover');
 const [elStrokeWidth, setElStrokeWidth] = useState('3px');
 const [elShapeSize, setElShapeSize] = useState('60px');
 const [elRsvpFields, setElRsvpFields] = useState<RsvpField[]>([]);
 const [elRsvpPlacement, setElRsvpPlacement] = useState<'inline' | 'outside'>('inline');
 const [elWidth, setElWidth] = useState<'full' | 'half' | 'third'>('full');
 const [elFontFamily, setElFontFamily] = useState('Cormorant Garamond');
 const [elLetterSpacing, setElLetterSpacing] = useState('normal');
 const [elBold, setElBold] = useState(false);
 const [elItalic, setElItalic] = useState(false);
 const [elDividerStyle, setElDividerStyle] = useState<'solid' | 'dashed' | 'ornament-flower' | 'ornament-diamond' | 'ornament-star' | 'ornament-leaves' | 'ornament-lace'>('ornament-flower');
 const [elCurveStyle, setElCurveStyle] = useState<'wave' | 'arc' | 'flourish-1' | 'flourish-2' | 'spiral' | 'infinity'>('wave');
 const [elImageStyle, setElImageStyle] = useState<TemplateImageStyleId>('rounded');
 const [elButtonStyle, setElButtonStyle] = useState<'filled' | 'outline' | 'pill' | 'gold-glow' | 'double-border' | 'minimalist'>('filled');
 const [elButtonLink, setElButtonLink] = useState('');

 // Error/Success state
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [saving, setSaving] = useState(false);

 // Cropper States
 const [cropperOpen, setCropperOpen] = useState(false);
 const [cropImageSrc, setCropImageSrc] = useState('');
 const [cropZoom, setCropZoom] = useState(1);
 const [cropPanX, setCropPanX] = useState(0);
 const [cropPanY, setCropPanY] = useState(0);
 const [cropAspectRatio, setCropAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '2:3' | 'free'>('1:1');
 const [cropImageNaturalWidth, setCropImageNaturalWidth] = useState(0);
 const [cropImageNaturalHeight, setCropImageNaturalHeight] = useState(0);
 const [isDraggingCrop, setIsDraggingCrop] = useState(false);
 const [dragStartCrop, setDragStartCrop] = useState({ x: 0, y: 0 });
 const [imageUploading, setImageUploading] = useState(false);
 const [mockupImporting, setMockupImporting] = useState(false);
 const [importedPalette, setImportedPalette] = useState<TemplatePalette | null>(null);
 const [colorThemeId, setColorThemeId] = useState(ORG_BRAND_THEME_ID);
 const [layoutMode, setLayoutMode] = useState<'flow' | 'free'>('flow');
 const [editorialLayoutId, setEditorialLayoutId] = useState<EditorialLayoutId | null>(null);
 const [showGuestPreview, setShowGuestPreview] = useState(false);
 const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
 const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
 const [freeDragId, setFreeDragId] = useState<string | null>(null);
 const freeCanvasRef = useRef<HTMLDivElement>(null);
 const [importedWithOcr, setImportedWithOcr] = useState(false);
 const [generatedByAi, setGeneratedByAi] = useState(false);
 const [quickTextModalOpen, setQuickTextModalOpen] = useState(false);
 const [ocrProgress, setOcrProgress] = useState<number | null>(null);
 const [mockupImportModalOpen, setMockupImportModalOpen] = useState(false);
 const [pendingMockupFile, setPendingMockupFile] = useState<File | null>(null);
 const [pendingMockupOpenEditor, setPendingMockupOpenEditor] = useState(true);
 const [mockupImportMode, setMockupImportMode] = useState<MockupImportTextMode>('placeholders');
 const mockupInputRef = useRef<HTMLInputElement>(null);
 const mockupEditorInputRef = useRef<HTMLInputElement>(null);
 const aiComposeInputRef = useRef<HTMLInputElement>(null);
 const aiComposeIncomingInputRef = useRef<HTMLInputElement>(null);
 const [aiComposeModalOpen, setAiComposeModalOpen] = useState(false);
 const [aiComposePrompt, setAiComposePrompt] = useState('');
 const [aiComposeStructured, setAiComposeStructured] = useState<InvitationStructuredBrief>(() => emptyInvitationStructuredBrief());
 const [aiComposeModelPhoto, setAiComposeModelPhoto] = useState<InvitationModelPhoto | null>(null);
 const [aiComposeFiles, setAiComposeFiles] = useState<File[]>([]);
 const [aiComposeFileRoles, setAiComposeFileRoles] = useState<Array<'groom' | 'bride' | 'auto'>>([]);
 const [aiComposePreviewUrls, setAiComposePreviewUrls] = useState<string[]>([]);
  const [aiComposeIsAlteration, setAiComposeIsAlteration] = useState(false);
  const [aiComposeCoupleFaceSwap, setAiComposeCoupleFaceSwap] = useState(false);
  const [aiComposeIncomingFile, setAiComposeIncomingFile] = useState<File | null>(null);
  const [aiComposeIncomingPreview, setAiComposeIncomingPreview] = useState('');
  const [aiComposeTitle, setAiComposeTitle] = useState('');
  const [aiComposeHonorees, setAiComposeHonorees] = useState('');
  const [aiComposeDate, setAiComposeDate] = useState('');
  const [aiComposeDetailsSection, setAiComposeDetailsSection] = useState<'texts' | 'style'>('texts');
  const pendingCoupleIdentityRef = useRef<{ title?: string; honorees?: string; date?: string } | null>(null);
  const [aiComposeBusy, setAiComposeBusy] = useState(false);
  const showInvitationStudioLoader = !invitationLoaderHidden && (aiComposeBusy || Boolean(invitationStudioJob));
 const [aiComposeStage, setAiComposeStage] = useState<string | null>(null);
 const [aiComposeEmbedText, setAiComposeEmbedText] = useState(false);
 const [aiComposeVariantsCount, setAiComposeVariantsCount] = useState<1 | 2>(1);
 const [aiComposeSpeedMode, setAiComposeSpeedMode] = useState<AiSpeedMode>('quality');
 const [aiVariants, setAiVariants] = useState<string[]>([]);
 const [aiSafetyFallbackNotice, setAiSafetyFallbackNotice] = useState(false);
 const [aiComposeArtStyle, setAiComposeArtStyle] = useState<InvitationArtStyleId>(DEFAULT_INVITATION_ART_STYLE);
 const [aiComposeContextSource, setAiComposeContextSource] = useState<InvitationContextSource>('none');
 const [aiComposeDragging, setAiComposeDragging] = useState(false);
 const [aiImageDownloading, setAiImageDownloading] = useState(false);
 const [aiComposeHistory, setAiComposeHistory] = useState<AiTemplateComposeHistoryItem[]>([]);
 const [aiComposeHistoryId, setAiComposeHistoryId] = useState<string | null>(null);
 const studioQueryAppliedRef = useRef(false);
 const [aiComposeStudioTab, setAiComposeStudioTab] = useState<StudioAiTabId>('create');
 const [aiComposeAdvancedOpen, setAiComposeAdvancedOpen] = useState(false);
 const [aiTokenModalOpen, setAiTokenModalOpen] = useState(false);
 const [aiAllowance, setAiAllowance] = useState<AiAllowance>(() => createEmptyAiAllowance());
 const [studioRail, setStudioRail] = useState<'content' | 'style'>('content');
 const [mobilePane, setMobilePane] = useState<'canvas' | 'tools' | 'inspect'>('canvas');
 const [studioGuideDismissed, setStudioGuideDismissed] = useState(false);
 const [showAllThemes, setShowAllThemes] = useState(false);
 const [showDecorTools, setShowDecorTools] = useState(false);
 const [propsAdvanced, setPropsAdvanced] = useState(false);
 const [styleAdvancedOpen, setStyleAdvancedOpen] = useState(false);

 const loadTemplates = async () => {
 try {
 const data = await api.get('/templates');
 setTemplates(data);
 } catch (err: any) {
 setError(err.message || 'Erreur lors du chargement des modèles');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 try {
 const raw = localStorage.getItem('em-getting-started');
 const flow = raw ? JSON.parse(raw) : {};
 if (!flow.templateDone) {
 localStorage.setItem('em-getting-started', JSON.stringify({ ...flow, templateDone: true }));
 }
 } catch {
 /* ignore */
 }
 }, []);

 useEffect(() => {
 setAiComposeArtStyle(readStoredInvitationArtStyle());
 setAiAllowance(getAiSimulationAllowance());
 }, []);

 useEffect(() => {
 setAiComposeArtStyle(readStoredInvitationArtStyle());
 setAiAllowance(getAiSimulationAllowance());
 }, []);

 useEffect(() => {
 const stored = readStoredInvitationContextSource();
 if (stored === 'org' && !(user && tenant?.id) && !isSuperAdmin) {
 setAiComposeContextSource('none');
 return;
 }
 setAiComposeContextSource(stored);
 }, [user, tenant?.id]);

 const loadTenants = async () => {
 if (isSuperAdmin) {
 try {
 const data = await api.get('/admin/tenants?limit=100&sort=name');
 const rows = Array.isArray(data?.items) ? data.items : [];
 setTenants(rows.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
 } catch (err) {
 console.error('Erreur lors du chargement des organisations:', err);
 }
 }
 };

 useEffect(() => {
 if (user) {
 loadTemplates();
 loadTenants();
 }
 }, [user]);

 const closeEditor = (opts?: { keepSuccess?: boolean }) => {
 setExitConfirmOpen(false);
 setEditorOpen(false);
 setDraftSavedAt(null);
 if (!opts?.keepSuccess) {
 /* leave success banner for studio list if any */
 }
 if (studioOrigin === 'admin' && isSuperAdmin) {
 router.push(ADMIN_TEMPLATES_HREF);
 }
 };

 useEffect(() => {
 if (selectedTenantId) {
 setShowOnLanding(false);
 }
 }, [selectedTenantId]);

 useEffect(() => {
 if (typeof window !== 'undefined' && templates.length > 0) {
 const params = new URLSearchParams(window.location.search);
 const editId = params.get('edit');
 if (editId) {
 const t = templates.find(temp => temp.id === editId);
 if (t) {
 const fromAdmin = params.get('from') === 'admin';
 handleEditTemplateClick(t, fromAdmin ? 'admin' : 'studio');
 window.history.replaceState({}, document.title, window.location.pathname);
 }
 }
 }
 }, [templates]);

 const handleCreateTemplateClick = (origin: StudioOrigin = 'studio') => {
 setError('');
 setSuccess('');
 setStudioOrigin(origin);
 setEditingTemplateId(null);
 setTemplateName('Nouvelle invitation');
 setInvitationHonorees('');
 setInvitationDate('');
 setSelectedTenantId('');
 const orgTheme = buildOrgBrandInvitationTheme(tenant?.branding);
 setImportedPalette(orgTheme.palette);
 setImportedWithOcr(false);
 setGeneratedByAi(false);
 setColorThemeId(ORG_BRAND_THEME_ID);
 const initialElements: CanvasElement[] = applyPaletteToElements([
 { id: '1', type: 'text', text: 'CÉLÉBRATION UNIQUE', color: orgTheme.palette.accent, fontSize: '12px', align: 'center', width: 'full', fontFamily: 'Montserrat', letterSpacing: '0.2em', bold: true },
 { id: '2', type: 'text', text: '{{title}}', color: orgTheme.palette.primary, fontSize: '32px', align: 'center', width: 'full', fontFamily: 'Great Vibes' },
 { id: '3', type: 'divider', text: '', color: orgTheme.palette.accent, fontSize: '14px', align: 'center', width: 'full', dividerStyle: 'ornament-flower' },
 { id: '4', type: 'text', text: 'Rejoignez-nous pour célébrer le {{date}}.', color: orgTheme.palette.secondary, fontSize: '16px', align: 'center', width: 'full', fontFamily: 'Cormorant Garamond', italic: true },
 { id: '5', type: 'text', text: 'JOUR', color: orgTheme.palette.primary, fontSize: '12px', align: 'center', width: 'third', fontFamily: 'Montserrat', letterSpacing: '0.1em', bold: true },
 { id: '6', type: 'text', text: '{{date}}', color: orgTheme.palette.accent, fontSize: '16px', align: 'center', width: 'third', fontFamily: 'Cormorant Garamond', bold: true },
 { id: '7', type: 'text', text: 'HEURE', color: orgTheme.palette.primary, fontSize: '12px', align: 'center', width: 'third', fontFamily: 'Montserrat', letterSpacing: '0.1em', bold: true },
 { id: '8', type: 'divider', text: '', color: orgTheme.palette.secondary, fontSize: '12px', align: 'center', width: 'full', dividerStyle: 'solid' },
 { 
 id: '9', 
 type: 'rsvp-block', 
 text: 'Confirmer votre présence', 
 color: orgTheme.palette.accent, 
 fontSize: '16px', 
 align: 'center',
 width: 'full',
 rsvpFields: createDefaultReportingRsvpFields(),
 rsvpPlacement: 'outside',
 },
 ], orgTheme.palette) as CanvasElement[];
 setCanvasElements(initialElements);
 setStudioHistory([{
 id: 'init',
 label: 'Nouveau modèle créé',
 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 elements: JSON.parse(JSON.stringify(initialElements)),
 }]);
 setStudioHistoryIndex(0);
 
 // Set global styles for paper texture and double border
 setBgType('pattern');
 setBgColor(orgTheme.palette.background);
 setBgImageUrl('');
 setBgPattern('paper');
 setFrameType('double-border');
 setFontTheme('classic');
 setLayoutMode('flow');
 setFloralColor(orgTheme.palette.accent);
 setFloralType('roses');
 setFloralDensity(40);
 setLandingCategory('private');
 setLandingDescription('');
 setShowOnLanding(false);
 setAiTokenCost(AI_INVITATION_COMPOSE_TOKEN_COST);
 setCanvasSizePreset('standard');
 setCanvasWidth(CANVAS_SIZE_PRESETS.standard.width);
 setCanvasHeight(CANVAS_SIZE_PRESETS.standard.height);
 
 setSelectedElementId(null);
 setStudioGuideDismissed(false);
 setEditorOpen(true);
 };

 const handleEditTemplateClick = (t: TemplateItem, origin: StudioOrigin = 'studio') => {
 setError('');
 setSuccess('');
 setStudioOrigin(origin);
 setEditingTemplateId(t.id);
 setTemplateName(t.name);
 const identity = identityFromTemplateContent(t.content);
 setInvitationHonorees(identity.honorees || '');
 setInvitationDate(identity.date || '');
 const loadedElements = ensureMandatoryRsvpFieldsOnElements((t.content?.elements || []) as CanvasElement[]);
 setCanvasElements(loadedElements);
 setStudioHistory([{
 id: 'init',
 label: `Modèle chargé : ${t.name}`,
 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 elements: JSON.parse(JSON.stringify(loadedElements)),
 }]);
 setStudioHistoryIndex(0);
 setSelectedTenantId(t.tenantId || '');
 
 // Load global styles
 const global = t.content?.global || {};
 setBgType(global.bgType || 'pattern');
 setBgColor(global.bgColor || '#faf8f5');
 setBgImageUrl(global.bgImageUrl || '');
 setBgPattern(global.bgPattern || 'paper');
 setFrameType(global.frameType || 'double-border');
 setFontTheme(global.fontTheme || 'classic');
 setFloralColor(global.floralColor || '#b91c1c');
 setFloralType(global.floralType || 'roses');
 setFloralDensity(global.floralDensity !== undefined ? global.floralDensity : 40);
 setImportedPalette(global.palette || null);
 setColorThemeId(typeof global.colorThemeId === 'string' ? global.colorThemeId : '');
 setLayoutMode(global.layoutMode === 'free' ? 'free' : 'flow');
 setImportedWithOcr(Boolean(global.importedWithOcr));
 setGeneratedByAi(Boolean(global.generatedByAi));
 setLandingCategory(global.landingCategory || 'private');
 setLandingDescription(global.landingDescription || '');
 setShowOnLanding(Boolean(t.showOnLanding));
 setAiTokenCost(
   typeof t.aiTokenCost === 'number' && Number.isFinite(t.aiTokenCost)
     ? Math.min(50, Math.max(1, Math.round(t.aiTokenCost)))
     : AI_INVITATION_COMPOSE_TOKEN_COST,
 );
 setCanvasSizePreset(global.canvasSizePreset || 'standard');
 const dims = global.canvasSizePreset && global.canvasSizePreset !== 'custom'
 ? CANVAS_SIZE_PRESETS[global.canvasSizePreset as Exclude<CanvasSizePreset, 'custom'>]
 : null;
 setCanvasWidth(global.canvasWidth || dims?.width || CANVAS_SIZE_PRESETS.standard.width);
 setCanvasHeight(global.canvasHeight || dims?.height || CANVAS_SIZE_PRESETS.standard.height);
 
 setSelectedElementId(null);
 setStudioGuideDismissed(true);
 setEditorOpen(true);
 };

 useEffect(() => {
 if (typeof window === 'undefined') return;
 const params = new URLSearchParams(window.location.search);
 if (params.get('new') !== '1') return;
 const fromAdmin = params.get('from') === 'admin';
 handleCreateTemplateClick(fromAdmin ? 'admin' : 'studio');
 window.history.replaceState({}, document.title, window.location.pathname);
 // eslint-disable-next-line react-hooks/exhaustive-deps -- ouverture unique via ?new=1
 }, []);

 useEffect(() => {
 if (typeof window === 'undefined') return;
 const params = new URLSearchParams(window.location.search);
 if (params.get('aiDraft') !== '1') return;
 const draft = loadAiTemplateDraft();
 if (!draft?.content) {
 window.history.replaceState({}, document.title, window.location.pathname);
 return;
 }
 handleCreateTemplateClick('studio');
 applyAiComposeToEditor(draft.content, {
 setCanvasElements,
 setBgType,
 setBgColor,
 setBgImageUrl,
 setBgPattern,
 setFrameType,
 setFontTheme,
 setFloralColor,
 setFloralType,
 setFloralDensity,
 setImportedPalette,
 setColorThemeId,
 setLayoutMode,
 setCanvasSizePreset,
 setCanvasWidth,
 setCanvasHeight,
 setSelectedElementId,
 });
 setGeneratedByAi(true);
 setImportedWithOcr(false);
 const importedIdentity = identityFromTemplateContent(draft.content);
 setTemplateName(importedIdentity.title || 'Invitation IA');
 setInvitationHonorees(importedIdentity.honorees || '');
 setInvitationDate(importedIdentity.date || '');
 if (hasInvitationIdentity(importedIdentity)) {
   const applied = applyInvitationIdentityToContent(draft.content, invitationIdentityForCard(importedIdentity));
   if (Array.isArray(applied.elements)) {
     setCanvasElements(applied.elements as CanvasElement[]);
   }
 }
 setSuccess('Modèle IA importé depuis la page Modèles. Ajustez puis enregistrez.');
 clearAiTemplateDraft();
 window.history.replaceState({}, document.title, window.location.pathname);
 // eslint-disable-next-line react-hooks/exhaustive-deps -- import unique via ?aiDraft=1
 }, []);

 useEffect(() => {
   if (studioQueryAppliedRef.current || loading || !templates.length) return;
   if (typeof window === 'undefined') return;
   const params = new URLSearchParams(window.location.search);
   if (params.get('studio') !== '1') return;
   const templateId = params.get('templateId');
   if (!templateId) return;
   const match = templates.find((item) => item.id === templateId);
   if (!match) return;
   studioQueryAppliedRef.current = true;
   handleEditTemplateClick(match);
   const title = params.get('title')?.trim();
   const date = params.get('date')?.trim();
   const honorees = params.get('honorees')?.trim();
   if (title) setTemplateName(title);
   if (date) setInvitationDate(date);
   if (honorees) setInvitationHonorees(honorees);
   window.history.replaceState({}, document.title, window.location.pathname);
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [loading, templates]);

 const handleAddElement = (type: 'text' | 'image' | 'button' | 'rsvp-block' | 'curve' | 'triangle' | 'divider') => {
 const themeFonts = getFontTheme(fontTheme);
 const freeDefaults =
 layoutMode === 'free'
 ? {
 positionMode: 'absolute' as const,
 xPct: 8,
 yPct: Math.min(80, 8 + canvasElements.length * 12),
 wPct: 84,
 zIndex: canvasElements.length + 1,
 }
 : { positionMode: 'flow' as const };
 const newElement: CanvasElement = {
 id: Date.now().toString(),
 type,
 text: type === 'text' ? 'Double-cliquez pour modifier ce texte' :
 type === 'button' ? 'Bouton Action' :
 type === 'image' ? 'Image d\'illustration' :
 type === 'curve' ? 'Ligne courbe décorative' :
 type === 'triangle' ? 'Triangle décoratif' : 
 type === 'divider' ? '' : 'Confirmer ma présence',
 color: type === 'button' ? (importedPalette?.accent || '#059669') : 
 type === 'curve' || type === 'triangle' || type === 'divider' ? (importedPalette?.accent || '#c5a059') : (importedPalette?.primary || '#1e293b'),
 fontSize: type === 'text' ? '16px' : 
 type === 'curve' ? '3px' : '15px',
 align: 'center',
 width: 'full',
 fontFamily: type === 'text' || type === 'button' ? themeFonts.bodyFont : undefined,
 letterSpacing: 'normal',
 bold: false,
 italic: false,
 imageUrl: type === 'image' ? '' : undefined,
 imageWidth: type === 'image' ? '100%' : undefined,
 imageHeight: type === 'image' ? '200px' : undefined,
 imageObjectFit: type === 'image' ? 'cover' : undefined,
 strokeWidth: type === 'curve' ? '3px' : undefined,
 shapeSize: type === 'triangle' ? '60px' : undefined,
 dividerStyle: type === 'divider' ? 'ornament-flower' : undefined,
 curveStyle: type === 'curve' ? 'wave' : undefined,
 imageStyle: type === 'image' ? 'rounded' : undefined,
 buttonStyle: type === 'button' ? 'filled' : undefined,
 buttonLink: type === 'button' ? '' : undefined,
 rsvpFields: type === 'rsvp-block' ? createDefaultReportingRsvpFields() : undefined,
 rsvpPlacement: type === 'rsvp-block' ? 'inline' as const : undefined,
 ...freeDefaults,
 };
 const nextElements = [...canvasElements, newElement];
 setCanvasElements(nextElements);
 recordStudioAction(`Ajout élément (${type})`, nextElements);
 setSelectedElementId(newElement.id);
 
 // Set local states
 setElText(newElement.text);
 setElColor(newElement.color);
 setElFontSize(newElement.fontSize);
 setElAlign(newElement.align);
 setElWidth('full');
 setElFontFamily(newElement.fontFamily || 'Cormorant Garamond');
 setElLetterSpacing('normal');
 setElBold(false);
 setElItalic(false);
 setElImageUrl('');
 setElImageWidth('100%');
 setElImageHeight('200px');
 setElImageObjectFit('cover');
 setElStrokeWidth('3px');
 setElShapeSize('60px');
 setElDividerStyle('ornament-flower');
 setElCurveStyle('wave');
 setElImageStyle('rounded');
 setElButtonStyle('filled');
 setElButtonLink('');
 setElRsvpFields(newElement.rsvpFields || []);
 setElRsvpPlacement(newElement.rsvpPlacement || 'inline');
 setMobilePane('inspect');
 };

 const handleElementSelect = (id: string) => {
 setSelectedElementId(id);
 setStudioRail('content');
 setPropsAdvanced(false);
 setMobilePane('inspect');
 const el = canvasElements.find(e => e.id === id);
 if (el) {
 setElText(el.text);
 setElColor(el.color);
 setElFontSize(el.fontSize);
 setElAlign(el.align);
 setElWidth(el.width || 'full');
 setElFontFamily(el.fontFamily || 'Cormorant Garamond');
 setElLetterSpacing(el.letterSpacing || 'normal');
 setElBold(el.bold || false);
 setElItalic(el.italic || false);
 setElImageUrl(el.imageUrl || '');
 setElImageWidth(el.imageWidth || '100%');
 setElImageHeight(el.imageHeight || '200px');
 setElImageObjectFit(el.imageObjectFit || 'cover');
 setElStrokeWidth(el.strokeWidth || '3px');
 setElShapeSize(el.shapeSize || '60px');
 setElDividerStyle(el.dividerStyle || 'ornament-flower');
 setElCurveStyle(el.curveStyle || 'wave');
 setElImageStyle(el.imageStyle || 'rounded');
 setElButtonStyle(el.buttonStyle || 'filled');
 setElButtonLink(el.buttonLink || '');
 setElRsvpFields(ensureMandatoryRsvpFields(el.rsvpFields || []));
 setElRsvpPlacement(el.rsvpPlacement || 'inline');
 }
 };

 const handlePropertyChange = (field: keyof CanvasElement, value: any) => {
 if (!selectedElementId) return;
 
 if (field === 'text') setElText(value);
 if (field === 'color') setElColor(value);
 if (field === 'fontSize') setElFontSize(value);
 if (field === 'align') setElAlign(value as any);
 if (field === 'width') setElWidth(value);
 if (field === 'fontFamily') setElFontFamily(value);
 if (field === 'letterSpacing') setElLetterSpacing(value);
 if (field === 'bold') setElBold(value);
 if (field === 'italic') setElItalic(value);
 if (field === 'imageUrl') setElImageUrl(value);
 if (field === 'imageWidth') setElImageWidth(value);
 if (field === 'imageHeight') setElImageHeight(value);
 if (field === 'imageObjectFit') setElImageObjectFit(value);
 if (field === 'strokeWidth') setElStrokeWidth(value);
 if (field === 'shapeSize') setElShapeSize(value);
 if (field === 'dividerStyle') setElDividerStyle(value);
 if (field === 'curveStyle') setElCurveStyle(value);
 if (field === 'imageStyle') setElImageStyle(value as TemplateImageStyleId);
 if (field === 'buttonStyle') setElButtonStyle(value);
 if (field === 'buttonLink') setElButtonLink(value);
 if (field === 'rsvpFields') setElRsvpFields(value);
 if (field === 'rsvpPlacement') setElRsvpPlacement(value);

 setCanvasElements(canvasElements.map(el => {
 if (el.id === selectedElementId) {
 return { ...el, [field]: value };
 }
 return el;
 }));
 };

 // Move element up in the list
 const handleMoveElementUp = (index: number, e: React.MouseEvent) => {
 e.stopPropagation();
 if (index === 0) return; // Already at the top
 
 const updatedElements = [...canvasElements];
 const temp = updatedElements[index];
 updatedElements[index] = updatedElements[index - 1];
 updatedElements[index - 1] = temp;
 
 setCanvasElements(updatedElements);
 recordStudioAction('Déplacement vers le haut', updatedElements);
 };

 // Move element down in the list
 const handleMoveElementDown = (index: number, e: React.MouseEvent) => {
 e.stopPropagation();
 if (index === canvasElements.length - 1) return; // Already at the bottom
 
 const updatedElements = [...canvasElements];
 const temp = updatedElements[index];
 updatedElements[index] = updatedElements[index + 1];
 updatedElements[index + 1] = temp;
 
 setCanvasElements(updatedElements);
 recordStudioAction('Déplacement vers le bas', updatedElements);
 };

 const uploadToCloudinary = async (source: File | string): Promise<string> => {
 if (typeof source === 'string' && (isCloudinaryUrl(source) || source.startsWith('http'))) {
 return source;
 }
 setImageUploading(true);
 try {
 if (source instanceof File) {
 const result = await uploadImageFile(source);
 return result.url;
 }
 if (source.startsWith('data:image/')) {
 const result = await uploadDataUrlImage(source);
 return result.url;
 }
 throw new Error('Format d\'image non supporté.');
 } finally {
 setImageUploading(false);
 }
 };

 const handleMockupImport = async (
 file: File,
 openEditor = true,
 textMode: MockupImportTextMode = 'placeholders',
 ) => {
 setError('');
 if (!canUseMockupImport) return;
 setMockupImporting(true);
 setOcrProgress(null);
 const useOcr = textMode === 'ocr';
 try {
 const palette = await extractPaletteFromSource(file);
 const uploaded = await uploadImageFile(file);
 let mockup = buildMockupTemplate(uploaded.url, palette);

 if (useOcr) {
 if (!canUseMockupOcr) {
 setError(getFeatureLockMessage('mockupOcr', tenant?.plan) + ' Passez à Business Premium 2 ou plus pour détecter le texte automatiquement.');
 return;
 }
 setOcrProgress(0);
 const ocr = await extractTextFromImageSource(file, (p) => setOcrProgress(Math.round(p * 100)));
 if (ocr.lines.length > 0) {
 mockup = {
 ...mockup,
 elements: mergeOcrIntoMockupElements(mockup.elements, ocr.lines) as typeof mockup.elements,
 };
 } else {
 mockup = applyMockupTextMode(mockup, 'placeholders');
 }
 setOcrProgress(null);
 } else {
 mockup = applyMockupTextMode(mockup, textMode);
 }

 applyMockupToEditor(mockup, {
 setTemplateName,
 setCanvasElements: (elements) => setCanvasElements(elements),
 setBgType,
 setBgColor,
 setBgImageUrl,
 setBgPattern: (v) => setBgPattern(v),
 setFrameType: (v) => setFrameType(v),
 setFontTheme,
 setFloralColor,
 setFloralType: (v) => setFloralType(v),
 setFloralDensity,
 setSelectedElementId,
 });
 setImportedPalette(palette);
 setImportedWithOcr(useOcr);
 setGeneratedByAi(false);
 setColorThemeId('');
 setEditingTemplateId(null);
 if (openEditor) setEditorOpen(true);
 setSuccess(
 useOcr
 ? 'Maquette importée — texte de l\'image détecté et appliqué aux emplacements.'
 : textMode === 'image-only'
 ? 'Maquette importée — fond image et palette uniquement. Ajoutez vos éléments.'
 : textMode === 'structure-only'
 ? 'Maquette importée — structure sans blocs texte (Réponse à l’invitation, boutons…).'
 : 'Maquette importée — emplacements texte génériques ajoutés.',
 );
 } catch (err: any) {
 setError(err.message || 'Impossible d\'importer la maquette.');
 } finally {
 setMockupImporting(false);
 setOcrProgress(null);
 }
 };

 const handleMockupFileChange = async (e: React.ChangeEvent<HTMLInputElement>, openEditor = true) => {
 const file = e.target.files?.[0];
 e.target.value = '';
 if (!file) return;
 if (!canUseMockupImport) return;
 if (!file.type.startsWith('image/')) {
 setError('Veuillez sélectionner une image (JPEG, PNG, WebP).');
 return;
 }
 setPendingMockupFile(file);
 setPendingMockupOpenEditor(openEditor);
 setMockupImportMode('placeholders');
 setMockupImportModalOpen(true);
 };

 const handleConfirmMockupImport = async () => {
 if (!pendingMockupFile) return;
 setMockupImportModalOpen(false);
 const file = pendingMockupFile;
 const openEditor = pendingMockupOpenEditor;
 const mode = mockupImportMode;
 setPendingMockupFile(null);
 await handleMockupImport(file, openEditor, mode);
 };

 const renderMockupImportModal = () => {
 if (!mockupImportModalOpen || !pendingMockupFile) return null;

 const modes: Array<{
 id: MockupImportTextMode;
 title: string;
 description: string;
 disabled?: boolean;
 badge?: string;
 }> = [
 {
 id: 'image-only',
 title: 'Fond image uniquement',
 description: 'Importe la palette et l\'image de fond, sans aucun élément par-dessus.',
 },
 {
 id: 'placeholders',
 title: 'Avec emplacements texte',
 description: 'Ajoute des blocs texte génériques (titre, date, lieu…) à personnaliser.',
 },
 {
 id: 'structure-only',
 title: 'Sans blocs texte',
 description: 'Conserve réponse à l’invitation, boutons et séparateurs, mais supprime tous les blocs texte.',
 },
 {
 id: 'ocr',
 title: 'Reconnaître le texte de l\'image',
 description: 'Lit le texte visible sur l\'image et remplit les emplacements du modèle.',
 disabled: !canUseMockupOcr,
 badge: canUseMockupOcr ? 'Premium 2+' : 'Premium 2 requis',
 },
 ];

 return (
 <Modal
   open
   size="lg"
   title="Comment importer cette image ?"
   description={`Fichier : ${pendingMockupFile.name}`}
   onClose={() => {
     setMockupImportModalOpen(false);
     setPendingMockupFile(null);
   }}
   footer={
     <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
       <Button
         type="button"
         variant="secondary"
         onClick={() => {
           setMockupImportModalOpen(false);
           setPendingMockupFile(null);
         }}
       >
         Annuler
       </Button>
       <Button
         type="button"
         disabled={mockupImportMode === 'ocr' && !canUseMockupOcr}
         onClick={handleConfirmMockupImport}
       >
         Importer l&apos;image
       </Button>
     </div>
   }
 >
 <div className="space-y-3">
 {modes.map((mode) => (
 <label
 key={mode.id}
 className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
 mockupImportMode === mode.id
 ? 'border-primary bg-primary/10'
 : 'border-border hover:border-border hover:bg-surface-muted'
 } ${mode.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
 >
 <input
 type="radio"
 name="mockup-import-mode"
 value={mode.id}
 checked={mockupImportMode === mode.id}
 disabled={mode.disabled}
 onChange={() => setMockupImportMode(mode.id)}
 className="mt-1 text-primary focus:ring-primary"
 />
 <span className="min-w-0">
 <span className="flex items-center gap-2 flex-wrap">
 <span className="text-sm font-bold text-foreground">{mode.title}</span>
 {mode.badge && (
 <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-muted text-muted">
 {mode.badge}
 </span>
 )}
 </span>
 <span className="block text-xs text-muted mt-1 leading-relaxed">{mode.description}</span>
 </span>
 </label>
 ))}
 </div>
 </Modal>
 );
 };

  const resetAiComposeModal = () => {
    aiComposePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    if (aiComposeIncomingPreview) URL.revokeObjectURL(aiComposeIncomingPreview);
    setAiComposeFiles([]);
    setAiComposeFileRoles([]);
    setAiComposePreviewUrls([]);
    setAiComposePrompt('');
    setAiComposeStructured(emptyInvitationStructuredBrief());
    setAiComposeModelPhoto(null);
    setAiComposeStage(null);
    setAiComposeBusy(false);
    setAiComposeIsAlteration(false);
    setAiComposeCoupleFaceSwap(false);
    setAiComposeIncomingFile(null);
    setAiComposeIncomingPreview('');
    setAiComposeTitle('');
    setAiComposeHonorees('');
    setAiComposeDate('');
    setAiComposeHistoryId(null);
    setAiComposeStudioTab('create');
  };

  const openAiComposeModal = async (
    presetPrompt?: string,
    options?: { isAlteration?: boolean; coupleFaceSwap?: boolean; modelPhoto?: InvitationModelPhoto | null },
  ) => {
    if (isInviteBlocked) {
      setError("Le studio d'invitations IA est une fonctionnalité à venir et n'est pas disponible actuellement.");
      return;
    }
    setError('');
    const coupleFaceSwap = Boolean(options?.coupleFaceSwap);
    const isAlteration = Boolean(
      coupleFaceSwap ||
      options?.isAlteration ||
      presetPrompt?.toLowerCase().includes('retouche') ||
      presetPrompt?.toLowerCase().includes('altér'),
    );
    setAiComposeCoupleFaceSwap(coupleFaceSwap);
    setAiComposeIsAlteration(isAlteration || Boolean(options?.modelPhoto));
    if (options?.modelPhoto) {
      setAiComposeModelPhoto(options.modelPhoto);
    }
    if (presetPrompt) {
      setAiComposePrompt(presetPrompt);
    } else if (coupleFaceSwap) {
      setAiComposePrompt(COUPLE_FACE_SWAP_DEFAULT_PROMPT);
    }
    setAiComposeTitle(
      templateName.trim() && !/^Nouveau Modèle|^Nouvelle invitation|^Invitation IA$/i.test(templateName)
        ? templateName
        : '',
    );
    setAiComposeHonorees(invitationHonorees === 'Hassan & Ayesha' ? '' : invitationHonorees);
    setAiComposeDate(invitationDate === '2026-06-15' ? '' : invitationDate);
    setAiComposeModalOpen(true);
    void fetchAiTemplateComposeHistoryStudio().then(setAiComposeHistory);
    try {
      const next = await syncDeviceAiTokensWithBackend(api);
      setAiAllowance(next);
    } catch {
      setAiAllowance(getAiSimulationAllowance());
    }
  };

 const applyAiComposeHistoryItem = (
   item: AiTemplateComposeHistoryItem,
   preferredVariantUrl?: string,
 ) => {
   if (aiComposeBusy) return;

   const variants = extractItemVariants(item);
   const chosenBg =
     preferredVariantUrl || (item.content?.global as Record<string, unknown> | undefined)?.bgImageUrl as string || variants[0] || '';

   const contentToApply = {
     ...item.content,
     global: {
       ...(item.content?.global || {}),
       variants,
       aiVariants: variants,
       bgImageUrl: chosenBg,
       bgType: chosenBg ? 'image' : ((item.content?.global as Record<string, unknown> | undefined)?.bgType as string) || 'color',
     },
   };

   applyAiComposeToEditor(
     contentToApply,
     {
       setCanvasElements,
       setBgType,
       setBgColor,
       setBgImageUrl,
       setBgPattern,
       setFrameType,
       setFontTheme,
       setFloralColor,
       setFloralType,
       setFloralDensity,
       setImportedPalette,
       setColorThemeId,
       setLayoutMode,
       setCanvasSizePreset,
       setCanvasWidth,
       setCanvasHeight,
       setSelectedElementId,
       setAiVariants,
       setAiSafetyFallback: setAiSafetyFallbackNotice,
     },
     { preferredVariantUrl: chosenBg },
   );

   setGeneratedByAi(true);
   setImportedWithOcr(false);
   setAiComposeHistoryId(item.id);
   if (item.prompt) setAiComposePrompt(item.prompt);
   setAiComposeModalOpen(false);
   resetAiComposeModal();
   const propMsg = preferredVariantUrl && variants.length > 1
     ? ` (Proposition ${variants.indexOf(preferredVariantUrl) === 1 ? 'B' : 'A'})`
     : '';
   setSuccess(`Génération précédente rouverte dans l’éditeur${propMsg}.`);
 };

 /** Depuis la liste : ouvre le studio puis l’assistant IA. */
 const startAiComposeFromList = async () => {
 setError('');
 if (!editorOpen) {
 handleCreateTemplateClick('studio');
 }
 await openAiComposeModal();
 };

 const startAiComposeFromModel = async (item: { id: string; name: string; content?: unknown }) => {
   const photo = invitationModelPhotoFromContent(item.id, item.name, item.content);
   if (!photo) {
     setError('Ce modèle n’a pas encore de photo de carte à envoyer au studio.');
     return;
   }
   setError('');
   if (!editorOpen) {
     handleCreateTemplateClick('studio');
   }
   await openAiComposeModal(`Reprendre le style de « ${photo.name} », or, ivoire et composition fidèle.`, {
     isAlteration: true,
     modelPhoto: photo,
   });
 };

 const handleStudioStructuredChange = (next: InvitationStructuredBrief) => {
   setAiComposeStructured(next);
   if (next.title !== undefined) setAiComposeTitle(next.title);
   if (next.honorees !== undefined) setAiComposeHonorees(next.honorees);
   if (next.date !== undefined) setAiComposeDate(next.date);
 };

 const addAiComposeFiles = (list: File[]) => {
 if (!list.length) return;
 const maxPhotos = aiComposeCoupleFaceSwap ? 2 : 4;
 const images = list.filter((f) => f.type.startsWith('image/')).slice(0, maxPhotos);
 if (!images.length) {
 setError('Sélectionnez des images (JPEG, PNG, WebP).');
 return;
 }
 aiComposePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
 const merged = [...aiComposeFiles, ...images].slice(0, maxPhotos);
 setAiComposeFiles(merged);
 setAiComposeFileRoles((prev) => {
   const next = [...prev];
   while (next.length < merged.length) {
     const idx = next.length;
     next.push(idx === 0 ? 'groom' : idx === 1 ? 'bride' : 'auto');
   }
   return next.slice(0, merged.length);
 });
 setAiComposePreviewUrls(merged.map((f) => URL.createObjectURL(f)));
 };

 const setAiComposeIncomingFromFile = (file: File | null) => {
 if (aiComposeIncomingPreview) URL.revokeObjectURL(aiComposeIncomingPreview);
 if (!file || !file.type.startsWith('image/')) {
 setAiComposeIncomingFile(null);
 setAiComposeIncomingPreview('');
 return;
 }
 setAiComposeIncomingFile(file);
 setAiComposeIncomingPreview(URL.createObjectURL(file));
 setAiComposeModelPhoto(null);
 };

 const handleAiComposeFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
 const list = Array.from(e.target.files || []);
 e.target.value = '';
 addAiComposeFiles(list);
 };

 const insertAiComposeVariable = (tag: string) => {
 setAiComposePrompt((prev) => (prev ? `${prev.trim()} ${tag}` : tag));
 };

 const removeAiComposeFile = (index: number) => {
 setAiComposeFiles((prev) => prev.filter((_, i) => i !== index));
 setAiComposeFileRoles((prev) => prev.filter((_, i) => i !== index));
 setAiComposePreviewUrls((prev) => {
 URL.revokeObjectURL(prev[index]);
 return prev.filter((_, i) => i !== index);
 });
 };

 const commitIdentityToEditor = (raw: { title?: string; honorees?: string; date?: string }) => {
   const identity = invitationIdentityForCard(raw);
   if (!hasInvitationIdentity(raw)) return;
   if (identity.title) setTemplateName(identity.title);
   setInvitationHonorees(String(raw.honorees || '').trim());
   setInvitationDate(String(raw.date || '').trim());
   setCanvasElements((prev) => {
     const applied = applyInvitationIdentityToContent({ elements: prev, global: {} }, identity);
     return Array.isArray(applied.elements) ? applied.elements as CanvasElement[] : prev;
   });
 };

 const handleAiComposeGenerate = async () => {
 if (aiComposeBusy) return;
 const currentCanvasBg =
   bgImageUrl && /^https?:\/\//i.test(bgImageUrl.trim()) ? bgImageUrl.trim() : '';
 const cardIdentity = {
   title: aiComposeTitle,
   honorees: aiComposeHonorees,
   date: aiComposeDate,
   description: aiComposeStructured.description,
 };
 const hasTexts = hasInvitationIdentity(cardIdentity);

 if (aiComposeCoupleFaceSwap) {
   if (aiComposeFiles.length < 1) {
     setError('Ajoutez au moins une photo du couple.');
     return;
   }
   if (!aiComposeIncomingFile && !currentCanvasBg && !aiComposeModelPhoto) {
     setError('Ajoutez l’image d’invitation dont les visages doivent être remplacés.');
     return;
   }
 } else if (!hasTexts && aiComposePrompt.trim().length < 8) {
   setError('Décrivez la fête en quelques mots (au moins 8 caractères), ou renseignez les informations de la carte.');
   return;
 }
 if (!canAffordAiAction(aiAllowance, resolveInvitationComposeTokenCostClient(aiComposeModelPhoto))) {
 setError(
 `La génération d’invitation consomme ${resolveInvitationComposeTokenCostClient(aiComposeModelPhoto)} jetons. Solde actuel : ${aiAllowance.totalRemaining}.`,
 );
 setAiTokenModalOpen(true);
 return;
 }

 setError('');
 unlockAudioNotifications();
 showInvitationLoader();
 setAiComposeBusy(true);
 setAiComposeStage(aiComposeFiles.length ? 'Envoi des images…' : 'Lecture du brief…');
 try {
 const uploadedUrls: string[] = [];
 for (let i = 0; i < aiComposeFiles.length; i += 1) {
 setAiComposeStage(`Upload image ${i + 1}/${aiComposeFiles.length}…`);
 const uploaded = await uploadImageFile(aiComposeFiles[i]);
 uploadedUrls.push(uploaded.url);
 }
 setAiComposeStage(
 aiComposeFiles.length
 ? 'Analyse des visages et du brief…'
 : aiComposeEmbedText
 ? 'Composition de la carte et de la typographie…'
 : 'Composition de la carte à partir du brief…',
 );
    const isAlteration =
      aiComposeCoupleFaceSwap ||
      aiComposeIsAlteration ||
      /retouch|ajust|refin|altér|réajust|modifier/i.test(aiComposePrompt);

    const currentBgUrl =
      bgImageUrl && /^https?:\/\//i.test(bgImageUrl.trim()) ? bgImageUrl.trim() : undefined;
    const modelUrl = aiComposeModelPhoto?.imageUrl;
    let incomingUrl = currentBgUrl || modelUrl;
    if (aiComposeCoupleFaceSwap && aiComposeIncomingFile) {
      setAiComposeStage('Upload de l’image d’invitation…');
      incomingUrl = (await uploadImageFile(aiComposeIncomingFile)).url;
    } else if (aiComposeCoupleFaceSwap && modelUrl) {
      incomingUrl = modelUrl;
    }

    const existingTextSummaries = canvasElements
      .filter((el) => typeof el.text === 'string' && el.text.trim().length > 0)
      .map((el) => `${el.type}: "${String(el.text).trim()}"`)
      .join(', ');

    let promptToSend = aiComposePrompt.trim();
    if (!promptToSend || promptToSend === COUPLE_FACE_SWAP_DEFAULT_PROMPT) {
      if (aiComposeCoupleFaceSwap && hasTexts) {
        const textParts = [
          cardIdentity.honorees ? `mariés/célébrés : ${cardIdentity.honorees}` : '',
          cardIdentity.date ? `date : ${cardIdentity.date}` : '',
          cardIdentity.title ? `titre : ${cardIdentity.title}` : '',
          cardIdentity.description ? `lieu : ${cardIdentity.description}` : '',
        ].filter(Boolean).join(', ');
        promptToSend = `Remplacer les visages du couple (respecter les genres : marié sur costume, mariée sur robe) et modifier les textes (${textParts}). Conserver la disposition, le style et les ornements.`;
      } else if (aiComposeCoupleFaceSwap) {
        promptToSend = COUPLE_FACE_SWAP_DEFAULT_PROMPT;
      } else if (isAlteration && hasTexts) {
        const textParts = [
          cardIdentity.honorees ? `mariés/célébrés : ${cardIdentity.honorees}` : '',
          cardIdentity.date ? `date : ${cardIdentity.date}` : '',
          cardIdentity.title ? `titre : ${cardIdentity.title}` : '',
          cardIdentity.description ? `lieu : ${cardIdentity.description}` : '',
        ].filter(Boolean).join(', ');
        promptToSend = `Modifier le modèle en appliquant les nouveaux textes (${textParts}). Conserver le style graphique et les ornements.`;
      }
    } else if (!aiComposeCoupleFaceSwap && isAlteration && existingTextSummaries) {
      promptToSend = [
        `Consigne de retouche ciblée : ${aiComposePrompt.trim()}`,
        `Éléments clés actuels du carton à préserver impérativement : ${existingTextSummaries}`,
        `Directive : Conserver la disposition, les textes existants et le style général du carton, en appliquant avec précision la retouche demandée.`,
      ].join('. ');
    }

    let genderDirective: string | undefined;
    if (aiComposeCoupleFaceSwap && aiComposeFileRoles.length >= 2) {
      const parts: string[] = [];
      aiComposeFileRoles.forEach((role, idx) => {
        const imgRef = `Image ${idx + 2}`;
        if (role === 'groom') {
          parts.push(`${imgRef} is the GROOM/MAN (must replace male body/suit).`);
        } else if (role === 'bride') {
          parts.push(`${imgRef} is the BRIDE/WOMAN (must replace female body/gown).`);
        }
      });
      if (parts.length > 0) {
        genderDirective = `EXPLICIT COUPLE ROLES: ${parts.join(' ')} STRICT ZERO GENDER INVERSION.`;
      }
    }

    const composeImageUrls = modelUrl && !aiComposeCoupleFaceSwap && !uploadedUrls.includes(modelUrl)
      ? [modelUrl, ...uploadedUrls]
      : uploadedUrls;
    const resultPromise = composeTemplateWithAi({
      prompt: promptToSend,
      imageUrls: composeImageUrls,
      baseImageUrl: aiComposeCoupleFaceSwap
        ? incomingUrl
        : modelUrl || (isAlteration ? currentBgUrl : undefined),
      existingElements: isAlteration ? canvasElements : undefined,
      isAlteration,
      generateBackground: true,
      embedText: aiComposeEmbedText,
      contextSource: aiComposeContextSource,
      artStyle: aiComposeArtStyle,
      variantsCount: aiComposeVariantsCount,
      speedMode: aiComposeSpeedMode,
      coupleFaceSwap: aiComposeCoupleFaceSwap,
      genderMappingDirective: genderDirective,
      structuredBrief: aiComposeStructured,
      sourceTemplateId: aiComposeModelPhoto?.id,
    });
    // Affiche l’étape « création d’image » pendant l’appel API (analyse + génération côté serveur)
    const stageTimer = window.setTimeout(() => {
      setAiComposeStage('Création de la nouvelle image…');
    }, 2500);
    let result;
    try {
      result = await resultPromise;
    } finally {
      window.clearTimeout(stageTimer);
    }
    if (hasTexts) {
      pendingCoupleIdentityRef.current = cardIdentity;
    }
    if (isStudioJobAccepted(result)) {
      trackJob(result.jobId, 'invitation', promptToSend);
      setAiComposeModalOpen(false);
      resetAiComposeModal();
      setSuccess('Génération lancée en arrière-plan. Vous pouvez quitter cette page, la carte arrivera toute seule.');
      return;
    }
    setAiComposeStage('Application du modèle…');
    const isTextChangeRequested =
      hasTexts || /texte|nom|prénom|date|lieu|heure|écrit|adresse|titre|rsvp/i.test(aiComposePrompt);
    const preserveElements =
      isAlteration && !isTextChangeRequested && canvasElements.length > 0 && !aiComposeEmbedText;

    const contentToApply = hasTexts
      ? applyInvitationIdentityToContent(result.content, invitationIdentityForCard(cardIdentity))
      : result.content;

    applyAiComposeToEditor(
      contentToApply,
      {
        setCanvasElements,
        setBgType,
        setBgColor,
        setBgImageUrl,
        setBgPattern,
        setFrameType,
        setFontTheme,
        setFloralColor,
        setFloralType,
        setFloralDensity,
        setImportedPalette,
        setColorThemeId,
        setLayoutMode,
        setCanvasSizePreset,
        setCanvasWidth,
        setCanvasHeight,
        setSelectedElementId,
        setAiVariants,
        setAiSafetyFallback: setAiSafetyFallbackNotice,
      },
      {
        preserveElements,
      },
    );
    setGeneratedByAi(true);
    setImportedWithOcr(false);
    if (result.stage?.variants && result.stage.variants.length > 0) {
      setAiVariants(result.stage.variants);
    }
    if (result.stage?.safetyFallbackTriggered !== undefined) {
      setAiSafetyFallbackNotice(Boolean(result.stage.safetyFallbackTriggered));
    }
    if (result.allowance) {
      setAiAllowance(getAiSimulationAllowance());
    }
    setAiComposeHistoryId(typeof result.historyId === 'string' ? result.historyId : null);
    void fetchAiTemplateComposeHistoryStudio().then(setAiComposeHistory);
    if (hasInvitationIdentity({ title: aiComposeTitle, honorees: aiComposeHonorees, date: aiComposeDate })) {
      commitIdentityToEditor({
        title: aiComposeTitle,
        honorees: aiComposeHonorees,
        date: aiComposeDate,
      });
      pendingCoupleIdentityRef.current = null;
    }
    setAiComposeModalOpen(false);
    resetAiComposeModal();
    playAiGenerationCompleteSound();
    setSuccess(
      aiComposeCoupleFaceSwap
        ? 'Visages du couple appliqués sur l’image. Pose, décor et mise en page ont été conservés.'
        : isAlteration
        ? 'Retouche appliquée avec succès ! Les éléments du carton et textes existants ont été conservés.'
        : result.stage?.backgroundReady
        ? result.stage?.imageMode === 'edit'
          ? 'Nouvelle image créée à partir de vos références + brief. Structure éditable appliquée.'
          : 'Nouvelle image générée selon l’analyse et votre brief. Structure éditable appliquée.'
        : 'Structure générée — la création d’image n’a pas abouti. Réessayez ou ajustez le brief.',
    );
 } catch (err: any) {
 if (err?.status === 402) {
 setAiTokenModalOpen(true);
 setError(err.message || 'Plus de jetons IA. Rechargez pour continuer.');
 } else {
 setError(err?.message || 'Impossible de générer le modèle avec l’IA.');
 }
 } finally {
 setAiComposeBusy(false);
 setAiComposeStage(null);
 }
 };

 const renderAiComposeModal = () => {
 if (!aiComposeModalOpen) return null;
 const hasIncomingCard = Boolean(
   aiComposeIncomingFile ||
   aiComposeModelPhoto ||
   (bgImageUrl && /^https?:\/\//i.test(bgImageUrl)),
 );
 const composeTokenCost = resolveInvitationComposeTokenCostClient(aiComposeModelPhoto);
 const aiComposeCardIdentity = {
   title: aiComposeTitle,
   honorees: aiComposeHonorees,
   date: aiComposeDate,
   description: aiComposeStructured.description,
 };
 const aiComposeHasTexts = hasInvitationIdentity(aiComposeCardIdentity);

 const composeBlockedReason = aiComposeCoupleFaceSwap
   ? (aiComposeFiles.length < 1
     ? 'Ajoutez au moins une photo du couple.'
     : !hasIncomingCard
       ? 'Ajoutez la carte dont les visages doivent être remplacés.'
       : null)
   : aiComposeIsAlteration && !hasIncomingCard
     ? 'Choisissez un modèle ou une photo de carte à modifier.'
   : (!aiComposeHasTexts && aiComposePrompt.trim().length < 8 ? 'Décrivez la fête en quelques mots ou renseignez les informations de la carte.' : null);
 if (typeof document === 'undefined') return null;
 return createPortal(
 <div
   className="fixed inset-0 z-[11040] flex items-end sm:items-center justify-center bg-foreground/40 p-0 sm:p-4 lg:p-6"
   onClick={() => {
     if (aiComposeBusy) return;
     setAiComposeModalOpen(false);
     resetAiComposeModal();
   }}
 >
 <div
 id="ai-compose-dialog"
 role="dialog"
 aria-modal="true"
 aria-labelledby="ai-compose-title"
 tabIndex={-1}
 onClick={(event) => event.stopPropagation()}
 className="flex w-full max-w-[100vw] sm:max-w-[min(98vw,92rem)] h-[96dvh] sm:h-[min(94dvh,62rem)] flex-col bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden outline-none"
 >
 <div className="shrink-0 px-5 sm:px-8 lg:px-10 pt-5 sm:pt-7 pb-4 border-b border-border-subtle flex items-start justify-between gap-3">
 <div className="min-w-0">
            <h2 id="ai-compose-title" className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
              {aiComposeCoupleFaceSwap ? <Users className="w-6 h-6 text-primary" aria-hidden /> : <Wand2 className="w-6 h-6 text-primary" aria-hidden />}
              {aiComposeCoupleFaceSwap ? 'Visages du couple' : aiComposeIsAlteration ? 'Modifier un modèle' : 'Fond pur + variables'}
            </h2>
            <p className="text-sm sm:text-base text-muted mt-1.5 leading-relaxed max-w-4xl">
              {aiComposeCoupleFaceSwap
                ? `Posez la carte, puis les photos du couple. Les visages changent ; le décor reste. ${composeTokenCost} jetons.`
                : aiComposeIsAlteration
                ? `Partez d’un modèle et remplacez les textes ou les visages. ${composeTokenCost} jetons.`
                : `Fond généré, textes dynamiques posés ensuite. ${composeTokenCost} jetons.`}
            </p>
 </div>
 <button
 type="button"
 disabled={aiComposeBusy}
 onClick={() => {
 setAiComposeModalOpen(false);
 resetAiComposeModal();
 }}
 className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] text-muted hover:bg-surface-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 aria-label="Fermer"
 >
 <XCircle className="w-5 h-5" aria-hidden />
 </button>
 </div>

 <div className="shrink-0 px-5 sm:px-8 lg:px-10 pt-4 space-y-3">
 <div className="flex items-center justify-between gap-2 text-xs">
 <span className="inline-flex items-center gap-1.5 font-bold text-muted">
 <Coins className="w-3.5 h-3.5" />
 {aiAllowance.unlimited ? 'Jetons illimités' : `${aiTokenBalanceLabel(aiAllowance)} jeton${aiAllowance.totalRemaining === 1 ? '' : 's'} restant${aiAllowance.totalRemaining === 1 ? '' : 's'}`}
 </span>
 {!canAffordAiAction(aiAllowance, composeTokenCost) && (
 <button
 type="button"
 onClick={() => setAiTokenModalOpen(true)}
 className="min-h-11 px-2 text-primary font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
 >
 <span className="sm:hidden">Recharger</span>
 <span className="hidden sm:inline">Recharger ({composeTokenCost} jetons / invitation)</span>
 </button>
 )}
 </div>
 <StudioAiTabs
 idPrefix="ai-compose"
 value={aiComposeStudioTab}
 onChange={setAiComposeStudioTab}
 historyCount={aiComposeHistory.length}
 disabled={aiComposeBusy}
 />
 </div>

 <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8 lg:px-10 py-6">
 {aiComposeStudioTab === 'create' ? (
 <>
 <StudioHowTo
   steps={
     aiComposeCoupleFaceSwap
       ? ['Ajoutez la carte à modifier', 'Ajoutez 1 ou 2 photos du couple', 'Générez']
       : aiComposeIsAlteration
         ? ['Choisissez un modèle', 'Indiquez les textes à remplacer', 'Générez']
         : ['Choisissez Fond pur', 'Renseignez les infos de la carte', 'Générez']
   }
 />
 <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10 xl:gap-12 lg:items-start space-y-6 lg:space-y-0">
 <div className="space-y-6">
 <div>
 <p className="text-sm font-semibold text-foreground mb-2">1. Que voulez-vous faire ?</p>
 <div
   role="radiogroup"
   aria-label="Mode de l’assistant"
   className="grid grid-cols-2 gap-3"
 >
   {([
     { id: 'create', label: 'Fond pur + variables', hint: 'Carte neuve, textes dynamiques' },
     { id: 'modify', label: 'Modifier un modèle', hint: 'Textes / visages sur une base' },
   ] as const).map((mode) => {
     const active =
       mode.id === 'modify'
         ? aiComposeIsAlteration || aiComposeCoupleFaceSwap
         : !aiComposeIsAlteration && !aiComposeCoupleFaceSwap;
     return (
       <button
         key={mode.id}
         type="button"
         role="radio"
         aria-checked={active}
         disabled={aiComposeBusy}
         onClick={() => {
           if (mode.id === 'modify') {
             setAiComposeIsAlteration(true);
             if (aiComposePrompt.trim() === COUPLE_FACE_SWAP_DEFAULT_PROMPT && !aiComposeCoupleFaceSwap) {
               setAiComposePrompt('');
             }
           } else {
             setAiComposeCoupleFaceSwap(false);
             setAiComposeIsAlteration(false);
             setAiComposeModelPhoto(null);
             if (aiComposePrompt.trim() === COUPLE_FACE_SWAP_DEFAULT_PROMPT) {
               setAiComposePrompt('');
             }
           }
         }}
         className={`min-h-14 px-3 py-3 rounded-[var(--radius-button)] border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
           active
             ? 'border-primary bg-primary/10 shadow-xs'
             : 'border-border bg-surface hover:border-primary/40'
         }`}
       >
         <span className="block text-sm font-bold text-foreground">{mode.label}</span>
         <span className="block text-xs text-muted mt-0.5">{mode.hint}</span>
       </button>
     );
   })}
 </div>
 {(aiComposeIsAlteration || aiComposeCoupleFaceSwap) ? (
   <label className="mt-3 flex min-h-11 items-center gap-2.5 rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2.5 cursor-pointer">
     <input
       type="checkbox"
       checked={aiComposeCoupleFaceSwap}
       disabled={aiComposeBusy}
       onChange={(e) => {
         const on = e.target.checked;
         setAiComposeCoupleFaceSwap(on);
         setAiComposeIsAlteration(true);
         if (on) {
           setAiComposeTitle(
             templateName.trim() && !/^Nouveau Modèle|^Nouvelle invitation|^Invitation IA$/i.test(templateName)
               ? templateName
               : '',
           );
           setAiComposeHonorees(invitationHonorees === 'Hassan & Ayesha' ? '' : invitationHonorees);
           setAiComposeDate(invitationDate === '2026-06-15' ? '' : invitationDate);
           if (aiComposePrompt.trim().length < 8) {
             setAiComposePrompt(COUPLE_FACE_SWAP_DEFAULT_PROMPT);
           }
           if (aiComposeFiles.length > 2) {
             aiComposePreviewUrls.slice(2).forEach((url) => URL.revokeObjectURL(url));
             setAiComposeFiles((prev) => prev.slice(0, 2));
             setAiComposePreviewUrls((prev) => prev.slice(0, 2));
           }
         } else if (aiComposePrompt.trim() === COUPLE_FACE_SWAP_DEFAULT_PROMPT) {
           setAiComposePrompt('');
         }
       }}
       className="rounded border-border text-primary focus:ring-primary"
     />
     <span className="min-w-0">
       <span className="block text-sm font-bold text-foreground">Remplacer les visages du couple</span>
       <span className="block text-xs text-muted">Sous-option : carte modèle + 1 ou 2 photos</span>
     </span>
   </label>
 ) : null}
 </div>

 {aiComposeCoupleFaceSwap ? (
 <div className="space-y-3">
   <p className="text-sm font-semibold text-foreground">2. Photos du couple</p>
   <div>
     <label htmlFor="ai-compose-incoming" className="text-sm font-semibold text-muted">Carte à modifier</label>
     <input
       id="ai-compose-incoming"
       ref={aiComposeIncomingInputRef}
       type="file"
       accept="image/jpeg,image/png,image/webp"
       className="sr-only"
       onChange={(e) => {
         const file = e.target.files?.[0] || null;
         e.target.value = '';
         setAiComposeIncomingFromFile(file);
       }}
     />
     <button
       type="button"
       disabled={aiComposeBusy}
       onClick={() => aiComposeIncomingInputRef.current?.click()}
       className="mt-1.5 min-h-28 w-full flex items-center gap-4 p-4 border-2 border-dashed rounded-[var(--radius-card)] text-left transition border-primary/30 hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
     >
       {(aiComposeIncomingPreview || aiComposeModelPhoto?.imageUrl || (bgImageUrl && /^https?:\/\//i.test(bgImageUrl))) ? (
         // eslint-disable-next-line @next/next/no-img-element
         <img
           src={aiComposeIncomingPreview || aiComposeModelPhoto?.imageUrl || bgImageUrl}
           alt="Invitation dont les visages seront remplacés"
           className="w-20 h-20 sm:w-24 sm:h-24 rounded-[var(--radius-button)] object-cover border border-border shrink-0"
         />
       ) : (
         <span className="w-20 h-20 sm:w-24 sm:h-24 rounded-[var(--radius-button)] bg-surface-muted border border-border flex items-center justify-center shrink-0">
           <Image className="w-5 h-5 text-primary" />
         </span>
       )}
       <span className="min-w-0">
         <span className="block text-xs font-bold text-foreground">
           {aiComposeIncomingFile
             ? aiComposeIncomingFile.name
             : aiComposeModelPhoto
               ? aiComposeModelPhoto.name
               : bgImageUrl
                 ? 'Carton actuel du studio'
                 : 'Choisir une invitation'}
         </span>
         <span className="block text-xs text-muted mt-0.5">
           Les visages de cette image seront remplacés. Pose et décor restent.
         </span>
       </span>
     </button>
     <div className="mt-3">
       <InvitationModelPhotoPicker
         id="ai-compose-model-incoming"
         selectedId={aiComposeModelPhoto?.id || null}
         models={studioModelPhotos}
         disabled={aiComposeBusy}
         onSelect={(photo) => {
           setAiComposeIncomingFromFile(null);
           setAiComposeModelPhoto(photo);
         }}
         onClear={() => setAiComposeModelPhoto(null)}
       />
     </div>
   </div>
   <div>
     <label htmlFor="ai-compose-couple-photos" className="text-sm font-semibold text-muted">Photos du couple (1 ou 2)</label>
     <input
       id="ai-compose-couple-photos"
       ref={aiComposeInputRef}
       type="file"
       accept="image/jpeg,image/png,image/webp"
       multiple
       className="sr-only"
       onChange={handleAiComposeFilesSelected}
     />
     <button
       type="button"
       disabled={aiComposeBusy}
       onDragOver={(e) => {
         e.preventDefault();
         setAiComposeDragging(true);
       }}
       onDragLeave={() => setAiComposeDragging(false)}
       onDrop={(e) => {
         e.preventDefault();
         setAiComposeDragging(false);
         const dropped = Array.from(e.dataTransfer.files || []);
         if (dropped.length) addAiComposeFiles(dropped);
       }}
       onClick={() => aiComposeInputRef.current?.click()}
       className={`mt-1.5 min-h-28 w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-[var(--radius-card)] text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
         aiComposeDragging
           ? 'border-primary bg-primary/15 text-primary'
           : 'border-primary/30 hover:border-primary hover:bg-primary/5 text-primary'
       }`}
     >
       <Users className="w-5 h-5" aria-hidden />
       {aiComposeFiles.length > 0
         ? `Ajouter une autre photo (${aiComposeFiles.length}/2)`
         : 'Elle / lui — photos nettes, visage visible'}
     </button>
     {aiComposePreviewUrls.length > 0 && (
       <div className="mt-2 flex flex-wrap gap-2.5">
         {aiComposePreviewUrls.map((url, i) => {
           const role = aiComposeFileRoles[i] || (i === 0 ? 'groom' : i === 1 ? 'bride' : 'auto');
           return (
             <div key={url} className="relative w-24 h-32 sm:w-28 sm:h-36 rounded-[var(--radius-button)] overflow-hidden border border-border flex flex-col bg-surface-muted">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={url} alt={i === 0 ? 'Premier visage du couple' : 'Second visage du couple'} className="w-full h-full object-cover" loading="lazy" />
               <button
                 type="button"
                 disabled={aiComposeBusy}
                 onClick={() => removeAiComposeFile(i)}
                 className="absolute top-1 right-1 inline-flex min-h-[36px] min-w-[36px] items-center justify-center bg-foreground/85 hover:bg-foreground text-background rounded-full transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs z-10"
                 aria-label={i === 0 ? 'Retirer le premier visage' : 'Retirer le second visage'}
               >
                 <XCircle className="w-4 h-4" aria-hidden />
               </button>
               <button
                 type="button"
                 disabled={aiComposeBusy}
                 aria-label={`Rôle pour la photo ${i + 1} : ${role === 'groom' ? 'Marié (costume)' : 'Mariée (robe)'}. Cliquez pour permuter.`}
                 onClick={(e) => {
                   e.stopPropagation();
                   setAiComposeFileRoles((prev) => {
                     const next = [...prev];
                     const current = next[i] || (i === 0 ? 'groom' : 'bride');
                     next[i] = current === 'groom' ? 'bride' : 'groom';
                     return next;
                   });
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
 <p className="text-sm font-semibold text-foreground">2. Photos (optionnel)</p>
 <InvitationModelPhotoPicker
   id="ai-compose-model-photos"
   selectedId={aiComposeModelPhoto?.id || null}
   models={studioModelPhotos}
   disabled={aiComposeBusy}
   onSelect={(photo) => {
     setAiComposeModelPhoto(photo);
     if (!aiComposeCoupleFaceSwap) setAiComposeIsAlteration(true);
   }}
   onClear={() => setAiComposeModelPhoto(null)}
 />
 <label htmlFor="ai-compose-optional-photos" className="text-sm font-semibold text-muted">Images de référence (1–4)</label>
 <input
 id="ai-compose-optional-photos"
 ref={aiComposeInputRef}
 type="file"
 accept="image/jpeg,image/png,image/webp"
 multiple
 className="sr-only"
 onChange={handleAiComposeFilesSelected}
 />
 <button
 type="button"
 disabled={aiComposeBusy}
 onDragOver={(e) => {
 e.preventDefault();
 setAiComposeDragging(true);
 }}
 onDragLeave={() => setAiComposeDragging(false)}
 onDrop={(e) => {
 e.preventDefault();
 setAiComposeDragging(false);
 const dropped = Array.from(e.dataTransfer.files || []);
 if (dropped.length) addAiComposeFiles(dropped);
 }}
 onClick={() => aiComposeInputRef.current?.click()}
 className={`mt-1.5 min-h-36 w-full flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-[var(--radius-card)] text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
 aiComposeDragging
 ? 'border-primary bg-primary/15 text-primary'
 : 'border-primary/30 hover:border-primary hover:bg-primary/5 text-primary'
 }`}
 >
 <Upload className="w-6 h-6" />
 {aiComposeFiles.length > 0 ? (
 <>
 <span className="sm:hidden">Ajouter ({aiComposeFiles.length}/4)</span>
 <span className="hidden sm:inline">{`Ajouter d'autres photos (${aiComposeFiles.length}/4)`}</span>
 </>
 ) : (
 <>
 <span className="sm:hidden">Ajouter des photos</span>
 <span className="hidden sm:inline">Glisser ou cliquer pour ajouter des photos (1–4)</span>
 </>
 )}
 </button>
 {aiComposePreviewUrls.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-2">
 {aiComposePreviewUrls.map((url, i) => (
 <div key={url} className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[var(--radius-button)] overflow-hidden border border-border">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={url} alt={`Référence ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
 <button
 type="button"
 disabled={aiComposeBusy}
 onClick={() => removeAiComposeFile(i)}
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
   {aiComposeCoupleFaceSwap ? '3. Écrits & Consignes' : '3. Écrits & Style de la fête'}
 </p>

 <div
   className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-lg border border-border mb-3"
   role="tablist"
   aria-label="Sections du studio d'invitation"
 >
   <button
     id="ai-compose-tab-texts"
     type="button"
     role="tab"
     aria-selected={aiComposeDetailsSection === 'texts'}
     aria-controls="ai-compose-panel-texts"
     tabIndex={aiComposeDetailsSection === 'texts' ? 0 : -1}
     onClick={() => setAiComposeDetailsSection('texts')}
     onKeyDown={(e) => {
       if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
         e.preventDefault();
         setAiComposeDetailsSection('style');
       }
     }}
     className={cn(
       'flex-1 min-h-[44px] px-3 py-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
       aiComposeDetailsSection === 'texts'
         ? 'bg-surface text-foreground shadow-xs border border-border/80'
         : 'text-muted hover:text-foreground',
     )}
   >
     <PenTool className="w-3.5 h-3.5" aria-hidden />
     <span>Écrits de la carte</span>
     {aiComposeHasTexts && (
       <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-label="Contient des textes saisis" />
     )}
   </button>
   <button
     id="ai-compose-tab-style"
     type="button"
     role="tab"
     aria-selected={aiComposeDetailsSection === 'style'}
     aria-controls="ai-compose-panel-style"
     tabIndex={aiComposeDetailsSection === 'style' ? 0 : -1}
     onClick={() => setAiComposeDetailsSection('style')}
     onKeyDown={(e) => {
       if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
         e.preventDefault();
         setAiComposeDetailsSection('texts');
       }
     }}
     className={cn(
       'flex-1 min-h-[44px] px-3 py-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
       aiComposeDetailsSection === 'style'
         ? 'bg-surface text-foreground shadow-xs border border-border/80'
         : 'text-muted hover:text-foreground',
     )}
   >
     <Sparkles className="w-3.5 h-3.5" aria-hidden />
     <span>Ambiance & Cérémonie</span>
   </button>
 </div>

 <div
   id="ai-compose-panel-texts"
   role="tabpanel"
   aria-labelledby="ai-compose-tab-texts"
   hidden={aiComposeDetailsSection !== 'texts'}
 >
   {aiComposeDetailsSection === 'texts' && (
     <InvitationCardInfoFields
       id="ai-compose-card-info"
       value={aiComposeStructured}
       onChange={handleStudioStructuredChange}
       showReplaceToggles={aiComposeIsAlteration || aiComposeCoupleFaceSwap}
       disabled={aiComposeBusy}
       compact
     />
   )}
 </div>

 <div
   id="ai-compose-panel-style"
   role="tabpanel"
   aria-labelledby="ai-compose-tab-style"
   hidden={aiComposeDetailsSection !== 'style'}
 >
   {aiComposeDetailsSection === 'style' && (
     <InvitationStructuredBriefFields
       id="ai-compose-structured"
       value={aiComposeStructured}
       onChange={handleStudioStructuredChange}
       disabled={aiComposeBusy}
       compact
     />
   )}
 </div>

 <div className="flex items-center justify-between mt-3">
 <label htmlFor="ai-compose-prompt" className="text-xs font-semibold text-muted">
   {aiComposeCoupleFaceSwap ? 'Consigne libre (optionnelle)' : 'Consigne libre ou retouche'}
 </label>
 <span className="hidden sm:inline text-xs text-muted tabular-nums">
 {aiComposePrompt.length} car.
 </span>
 </div>
 <textarea
 id="ai-compose-prompt"
 rows={3}
 value={aiComposePrompt}
 disabled={aiComposeBusy}
 onChange={(e) => setAiComposePrompt(e.target.value)}
 placeholder={aiComposeCoupleFaceSwap
   ? 'Optionnel : préciser qui est à gauche / à droite, ou garder une tenue…'
   : 'Ex. Copier fidèlement cette invitation en or et ivoire, ou décrire l’ambiance : mariage princier, éclairage naturel chaleureux…'}
 className="mt-1 w-full rounded-[var(--radius-card)] border border-border bg-surface-muted px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y min-h-[4.5rem]"
 />

 <p className="mt-2 text-xs text-muted">
 Besoin d’un exemple ? Ouvrez <button type="button" className="font-bold text-primary hover:underline" onClick={() => setAiComposeStudioTab('prompts')}>Exemples</button> — quatre mariages coutumiers prêts à lancer.
 </p>

 <button
   type="button"
   aria-expanded={aiComposeAdvancedOpen}
   disabled={aiComposeBusy}
   onClick={() => setAiComposeAdvancedOpen((open) => !open)}
   className="mt-4 min-h-11 w-full inline-flex items-center justify-between gap-2 px-3 rounded-[var(--radius-button)] border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 >
   <span>Options avancées</span>
   <span className="text-xs font-medium text-muted">{aiComposeAdvancedOpen ? 'Masquer' : 'Style, jetons, variations'}</span>
 </button>

 {aiComposeAdvancedOpen ? (
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
 disabled={aiComposeBusy}
 onClick={() => insertAiComposeVariable(v.tag)}
 className="min-h-11 px-3 rounded-md text-xs font-bold border border-border bg-surface hover:border-primary/40 hover:bg-primary/5 text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 title={`Insérer ${v.tag}`}
 >
 {v.label}
 </button>
 ))}
 </div>
 <InvitationArtStylePicker
 id="ai-compose-art-style"
 value={aiComposeArtStyle}
 onChange={(style) => {
 setAiComposeArtStyle(style);
 persistInvitationArtStyle(style);
 }}
 disabled={aiComposeBusy}
 />
 <InvitationContextSourcePicker
 id="ai-compose-context"
 value={aiComposeContextSource}
 onChange={(source) => {
 setAiComposeContextSource(source);
 persistInvitationContextSource(source);
 }}
 disabled={aiComposeBusy}
 canUseOrg={Boolean(tenant?.id) || isSuperAdmin}
 />

 <button
 type="button"
 role="switch"
 aria-checked={aiComposeEmbedText}
 disabled={aiComposeBusy}
 onClick={() => setAiComposeEmbedText((v) => !v)}
 className={`min-h-11 w-full flex items-start gap-3 rounded-[var(--radius-button)] border px-3 py-2.5 text-left transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
 aiComposeEmbedText
 ? 'border-primary/40 bg-primary/10'
 : 'border-border bg-surface hover:border-primary/30'
 }`}
 >
 <span
 className={`mt-0.5 w-9 h-5 rounded-full relative shrink-0 ${
 aiComposeEmbedText ? 'bg-primary' : 'bg-border'
 }`}
 aria-hidden
 >
 <span
 className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface shadow-xs transition-transform ${
 aiComposeEmbedText ? 'translate-x-4' : ''
 }`}
 />
 </span>
 <span className="min-w-0">
 <span className="block text-sm font-bold text-foreground">Écrire les noms sur l’image</span>
 <span className="block text-xs text-muted mt-0.5 leading-relaxed">
 Titre, date et lieu du brief sont dessinés sur la carte.
 </span>
 </span>
 </button>

 <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
   <div>
     <span className="block text-sm font-bold text-foreground">Vitesse</span>
     <span className="block text-xs text-muted">Rapide ou plus net</span>
   </div>
   <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
     <button
       type="button"
       disabled={aiComposeBusy}
       onClick={() => setAiComposeSpeedMode('fast')}
       className={`min-h-11 px-3 text-xs font-bold rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${aiComposeSpeedMode === 'fast' ? 'bg-primary-solid text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground'}`}
       title="Génération en 4 à 8 secondes"
     >
       Rapide
     </button>
     <button
       type="button"
       disabled={aiComposeBusy}
       onClick={() => setAiComposeSpeedMode('quality')}
       className={`min-h-11 px-3 text-xs font-bold rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${aiComposeSpeedMode === 'quality' ? 'bg-primary-solid text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground'}`}
       title="Image plus nette, un peu plus longue"
     >
       Plus nette
     </button>
   </div>
 </div>

 <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
   <div>
     <span className="block text-sm font-bold text-foreground">Comparer deux fonds</span>
     <span className="block text-xs text-muted">Fidèle au brief, ou fidèle + ample</span>
   </div>
   <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
     <button
       type="button"
       disabled={aiComposeBusy}
       onClick={() => setAiComposeVariantsCount(1)}
       className={`min-h-11 px-3 text-xs font-bold rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${aiComposeVariantsCount === 1 ? 'bg-primary-solid text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground'}`}
     >
       1 carte
     </button>
     <button
       type="button"
       disabled={aiComposeBusy}
       onClick={() => setAiComposeVariantsCount(2)}
       className={`min-h-11 px-3 text-xs font-bold rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${aiComposeVariantsCount === 2 ? 'bg-primary-solid text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground'}`}
     >
       2 cartes (fidèle + ample)
     </button>
   </div>
 </div>
 </div>
 ) : null}
 </div>
 </div>
 </div>

 {aiComposeStage && (
 <p className="text-xs font-bold text-primary flex items-center gap-2">
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 {aiComposeStage}
 </p>
 )}
 </>
 ) : null}

 {aiComposeStudioTab === 'history' ? (
 <AiTemplateComposeHistoryList
 items={aiComposeHistory}
 activeId={aiComposeHistoryId}
 onOpen={applyAiComposeHistoryItem}
 listClassName="max-h-[min(40rem,68vh)]"
 showEmpty
 emptyAction={(
 <button
 type="button"
 onClick={() => setAiComposeStudioTab('create')}
 className="min-h-11 px-3 text-xs font-semibold text-primary hover:underline"
 >
 Nouvelle création
 </button>
 )}
 />
 ) : null}

 {aiComposeStudioTab === 'prompts' ? (
 <PromptModelSelector
 onSelectPrompt={(selected) => {
 setAiComposePrompt(selected);
 setAiComposeStudioTab('create');
 }}
 selectedPrompt={aiComposePrompt}
 disabled={aiComposeBusy}
 layout="panel"
 defaultCategory="coutumier"
 />
 ) : null}
 </div>

 <div className="px-5 sm:px-8 lg:px-10 py-4 sm:py-5 border-t border-border-subtle flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-surface-muted/40">
 {composeBlockedReason && aiComposeStudioTab === 'create' ? (
   <p className="text-sm text-muted sm:max-w-sm" role="status">{composeBlockedReason}</p>
 ) : (
   <p className="text-sm text-muted hidden sm:block">La carte s’ouvre dans l’éditeur dès que la génération est prête.</p>
 )}
 <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
 <button
 type="button"
 disabled={aiComposeBusy}
 onClick={() => {
 setAiComposeModalOpen(false);
 resetAiComposeModal();
 }}
 className="min-h-12 px-5 py-3 text-sm font-bold text-muted hover:bg-surface-muted rounded-[var(--radius-button)] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 >
 Annuler
 </button>
 <button
 type="button"
 disabled={aiComposeBusy || Boolean(composeBlockedReason)}
 onClick={handleAiComposeGenerate}
 className="min-h-12 px-6 py-3 bg-primary-solid hover:bg-primary-solid-hover disabled:opacity-50 text-primary-foreground text-sm font-bold rounded-[var(--radius-button)] transition inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 >
            {aiComposeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {aiComposeBusy
              ? 'Génération…'
              : aiComposeCoupleFaceSwap
                ? (aiComposeHasTexts
                    ? `Modifier le modèle (visages & écrits · ${composeTokenCost} jetons)`
                    : `Remplacer les visages (${composeTokenCost} jetons)`)
                : aiComposeIsAlteration
                  ? (aiComposeHasTexts
                      ? `Modifier les écrits (${composeTokenCost} jetons)`
                      : `Modifier le modèle (${composeTokenCost} jetons)`)
                  : `Générer (${composeTokenCost} jetons)`}
 </button>
 </div>
 </div>
 </div>
 </div>
 ,
 document.body,
 );
 };

 // Handle image file upload → Cloudinary
 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 e.target.value = '';
 if (!file) return;
 try {
 const url = await uploadToCloudinary(file);
 handlePropertyChange('imageUrl', url);
 } catch (err: any) {
 setError(err.message || 'Échec de l\'upload image.');
 }
 };

 const [cropTarget, setCropTarget] = useState<'element' | 'background'>('element');

 const handleOpenCropper = (target: 'element' | 'background') => {
 const src = target === 'element' ? elImageUrl : bgImageUrl;
 if (!src) return;
 setCropTarget(target);
 setCropImageSrc(src);
 setCropZoom(1);
 setCropPanX(0);
 setCropPanY(0);
 setCropAspectRatio(target === 'background' ? '2:3' : '1:1');
 setCropperOpen(true);
 };

 const handleApplyCrop = () => {
 if (!cropImageSrc) return;

 const img = new window.Image();
 img.crossOrigin = 'anonymous';
 
 img.onload = async () => {
 try {
 const containerWidth = 400;
 const containerHeight = 300;
 const imageRatio = img.naturalWidth / img.naturalHeight;
 const containerRatio = containerWidth / containerHeight;
 
 let displayedWidth = 0;
 let displayedHeight = 0;
 
 if (imageRatio > containerRatio) {
 displayedWidth = containerWidth;
 displayedHeight = containerWidth / imageRatio;
 } else {
 displayedHeight = containerHeight;
 displayedWidth = containerHeight * imageRatio;
 }

 let cropWidth = 200;
 let cropHeight = 200;
 
 if (cropAspectRatio === '1:1') {
 cropWidth = 200;
 cropHeight = 200;
 } else if (cropAspectRatio === '16:9') {
 cropWidth = 280;
 cropHeight = 157.5;
 } else if (cropAspectRatio === '4:3') {
 cropWidth = 240;
 cropHeight = 180;
 } else if (cropAspectRatio === '2:3') {
 cropWidth = 160;
 cropHeight = 240;
 } else {
 cropWidth = 240;
 cropHeight = 180;
 }

 const scale = img.naturalWidth / displayedWidth;
 
 const imgLeft = (containerWidth - displayedWidth * cropZoom) / 2 + cropPanX;
 const imgTop = (containerHeight - displayedHeight * cropZoom) / 2 + cropPanY;
 
 const cropLeft = (containerWidth - cropWidth) / 2;
 const cropTop = (containerHeight - cropHeight) / 2;
 
 const relativeLeft = cropLeft - imgLeft;
 const relativeTop = cropTop - imgTop;
 
 const sourceX = (relativeLeft / cropZoom) * scale;
 const sourceY = (relativeTop / cropZoom) * scale;
 const sourceWidth = (cropWidth / cropZoom) * scale;
 const sourceHeight = (cropHeight / cropZoom) * scale;

 const canvas = document.createElement('canvas');
 canvas.width = sourceWidth;
 canvas.height = sourceHeight;
 const ctx = canvas.getContext('2d');
 
 if (ctx) {
 ctx.drawImage(
 img,
 sourceX,
 sourceY,
 sourceWidth,
 sourceHeight,
 0,
 0,
 sourceWidth,
 sourceHeight
 );
 
 const croppedBase64 = canvas.toDataURL('image/jpeg', 0.92);
 const cloudUrl = await uploadToCloudinary(croppedBase64);
 if (cropTarget === 'element') {
 handlePropertyChange('imageUrl', cloudUrl);
 } else {
 setBgImageUrl(cloudUrl);
 }
 setCropperOpen(false);
 }
 } catch (err: any) {
 console.error('Erreur lors du rognage de l\'image:', err);
 setError(err.message || 'Impossible de rogner l\'image. Veuillez réessayer.');
 }
 };

 img.onerror = (err) => {
 console.error('Erreur de chargement de l\'image pour le rognage:', err);
 setError('Impossible de charger l\'image pour le rognage.');
 };

 img.src = cropImageSrc;
 };

 // Drag handlers for the cropper
 const handleCropMouseDown = (e: React.MouseEvent) => {
 e.preventDefault();
 setIsDraggingCrop(true);
 setDragStartCrop({ x: e.clientX - cropPanX, y: e.clientY - cropPanY });
 };

 const handleCropMouseMove = (e: React.MouseEvent) => {
 if (!isDraggingCrop) return;
 setCropPanX(e.clientX - dragStartCrop.x);
 setCropPanY(e.clientY - dragStartCrop.y);
 };

 const handleCropMouseUp = () => {
 setIsDraggingCrop(false);
 };

 // Touch handlers for mobile devices
 const handleCropTouchStart = (e: React.TouchEvent) => {
 if (e.touches.length !== 1) return;
 setIsDraggingCrop(true);
 setDragStartCrop({ 
 x: e.touches[0].clientX - cropPanX, 
 y: e.touches[0].clientY - cropPanY 
 });
 };

 const handleCropTouchMove = (e: React.TouchEvent) => {
 if (!isDraggingCrop || e.touches.length !== 1) return;
 setCropPanX(e.touches[0].clientX - dragStartCrop.x);
 setCropPanY(e.touches[0].clientY - dragStartCrop.y);
 };

 // Global background image upload → Cloudinary
 const handleGlobalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 e.target.value = '';
 if (!file) return;
 try {
 const url = await uploadToCloudinary(file);
 setBgImageUrl(url);
 setBgType('image');
 } catch (err: any) {
 setError(err.message || 'Échec de l\'upload de l\'image de fond.');
 }
 };

 // Customizabla réponse à l’invitation fields management
 const handleEnsureReportingRsvpFields = () => {
 const updatedFields = ensureReportingRsvpFields(elRsvpFields);
 handlePropertyChange('rsvpFields', updatedFields);
 };

 const handleCanvasPresetChange = (preset: CanvasSizePreset) => {
 setCanvasSizePreset(preset);
 if (preset !== 'custom' && CANVAS_SIZE_PRESETS[preset]) {
 setCanvasWidth(CANVAS_SIZE_PRESETS[preset].width);
 setCanvasHeight(CANVAS_SIZE_PRESETS[preset].height);
 }
 };

 const handleDeleteElement = (id: string) => {
 const nextElements = canvasElements.filter(el => el.id !== id);
 setCanvasElements(nextElements);
 recordStudioAction('Suppression d\'élément', nextElements);
 if (selectedElementId === id) {
 setSelectedElementId(null);
 }
 };

 const applyPaletteSlot = (slot: keyof TemplatePalette) => {
 if (!importedPalette || slot === 'isDark') return;
 const color = importedPalette[slot];
 if (typeof color !== 'string') return;
 if (selectedElementId) {
 handlePropertyChange('color', color);
 if (slot === 'background') setBgColor(color);
 } else if (slot === 'background') {
 setBgColor(color);
 setBgType('color');
 } else {
 setElColor(color);
 }
 };

 const applyColorTheme = (themeId: string, recolorElements: boolean) => {
 const theme = invitationColorThemes(tenant?.branding).find((t) => t.id === themeId);
 if (!theme) return;
 setColorThemeId(theme.id);
 setImportedPalette(theme.palette);
 setBgColor(theme.palette.background);
 setBgType('color');
 if (recolorElements) {
 setCanvasElements((prev) => applyPaletteToElements(prev, theme.palette));
 }
 };

 const applyCurrentFontTheme = (applyToAll: boolean) => {
 if (applyToAll) {
 setCanvasElements((prev) => applyFontThemeToElements(prev, fontTheme));
 }
 };

 const convertToFreeLayout = () => {
 setCanvasElements((prev) =>
 prev.map((el, i) => ({
 ...el,
 positionMode: 'absolute' as const,
 xPct: el.xPct ?? 8,
 yPct: el.yPct ?? Math.min(85, 6 + i * 12),
 wPct: el.wPct ?? (el.width === 'half' ? 42 : el.width === 'third' ? 28 : 84),
 zIndex: el.zIndex ?? i + 1,
 })),
 );
 setLayoutMode('free');
 };

 const applyEditorialLayout = (id: EditorialLayoutId) => {
 const layout = editorialLayoutById(id);
 if (
   canvasElements.length > 0 &&
   !window.confirm(`Remplacer la carte actuelle par « ${layout.name} » ? Les textes et photos en place seront perdus.`)
 ) {
   return;
 }
 const stamp = Date.now();
 const resolvedIdentity = resolveInvitationIdentity({
 title: templateName,
 honorees: invitationHonorees,
 date: invitationDate,
 });
 const tokens = {
 title: resolvedIdentity.honorees || templateName,
 date: resolvedIdentity.date || undefined,
 location: undefined,
 };
 const next = layout.elements.map((el, index) => ({
 ...el,
 id: `${el.id}-${stamp}-${index}`,
 text: fillEditorialTokens(el.text, tokens),
 })) as CanvasElement[];
 setLayoutMode('free');
 setBgType(layout.bgType);
 setBgColor(layout.bgColor);
 setBgImageUrl(layout.bgImageUrl || '');
 setFrameType(layout.frameType as typeof frameType);
 setFontTheme(layout.fontTheme);
 setCanvasSizePreset(layout.canvasSizePreset);
 setCanvasWidth(layout.canvasWidth);
 setCanvasHeight(layout.canvasHeight);
 setSelectedElementId(null);
 setAiComposeArtStyle(layout.suggestedArtStyle);
 persistInvitationArtStyle(layout.suggestedArtStyle);
 setEditorialLayoutId(layout.id);
 recordStudioAction(`Mise en page ${layout.name}`, next);
 setCanvasElements(next);
 };

 const convertToFlowLayout = () => {
 setCanvasElements((prev) =>
 prev.map((el) => ({
 ...el,
 positionMode: 'flow' as const,
 })),
 );
 setLayoutMode('flow');
 };

 const handleFreePointerDown = (elId: string, e: React.PointerEvent) => {
 if (layoutMode !== 'free') return;
 e.stopPropagation();
 handleElementSelect(elId);
 setFreeDragId(elId);
 (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
 };

 const handleFreePointerMove = (e: React.PointerEvent) => {
 if (!freeDragId || !freeCanvasRef.current) return;
 const rect = freeCanvasRef.current.getBoundingClientRect();
 const rawX = ((e.clientX - rect.left) / rect.width) * 100;
 const rawY = ((e.clientY - rect.top) / rect.height) * 100;
 const snap = (v: number) => Math.round(v / 4) * 4;
 const xPct = Math.max(0, Math.min(92, snap(rawX)));
 const yPct = Math.max(0, Math.min(92, snap(rawY)));
 setCanvasElements((prev) =>
 prev.map((el) => (el.id === freeDragId ? { ...el, xPct, yPct, positionMode: 'absolute' } : el)),
 );
 };

 const handleFreePointerUp = () => setFreeDragId(null);

 const previewIdentity = resolveInvitationIdentity({
 title: templateName,
 honorees: invitationHonorees,
 date: invitationDate,
 });
 const substitutePreviewVars = (text: string) =>
 text
 .replace(/\{\{firstName\}\}/gi, 'Amina')
 .replace(/\{\{lastName\}\}/gi, 'Kabongo')
 .replace(/\{\{title\}\}/gi, previewIdentity.honorees || previewIdentity.title || 'Mariage Hassan & Ayesha')
 .replace(/\{\{eventTitle\}\}/gi, previewIdentity.title || templateName)
 .replace(/\{\{location\}\}/gi, 'Kinshasa')
 .replace(/\{\{date\}\}/gi, previewIdentity.date || '15 juin 2026');

 const draftKey = `em-template-draft-${editingTemplateId || 'new'}-${tenant?.id || 'global'}`;

 const requestCloseEditor = () => {
 if (draftSavedAt) {
 setExitConfirmOpen(true);
 return;
 }
 closeEditor();
 };

 const discardAndCloseEditor = () => {
 try {
 localStorage.removeItem(draftKey);
 } catch {
 /* ignore */
 }
 setDraftSavedAt(null);
 closeEditor();
 };

 const rsvpReportingIssues = useMemo(() => {
 const issues: string[] = [];
 for (const block of canvasElements) {
 if (block.type !== 'rsvp-block') continue;
 issues.push(...validateRsvpFieldsForReporting(block.rsvpFields || []));
 }
 return issues;
 }, [canvasElements]);

  useEffect(() => {
    if (!editorOpen || !draftSavedAt) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [editorOpen, draftSavedAt]);

  useEffect(() => {
    return onStudioJob((job) => {
      if (job.kind !== 'invitation' || job.status !== 'done') return;
      const content = job.result?.content;
      if (!content || typeof content !== 'object') return;
      applyAiComposeToEditor(
        content as Parameters<typeof applyAiComposeToEditor>[0],
        {
          setCanvasElements,
          setBgType,
          setBgColor,
          setBgImageUrl,
          setBgPattern,
          setFrameType,
          setFontTheme,
          setFloralColor,
          setFloralType,
          setFloralDensity,
          setImportedPalette,
          setColorThemeId,
          setLayoutMode,
          setCanvasSizePreset,
          setCanvasWidth,
          setCanvasHeight,
          setSelectedElementId,
          setAiVariants,
          setAiSafetyFallback: setAiSafetyFallbackNotice,
        },
        {},
      );
      setGeneratedByAi(true);
      setImportedWithOcr(false);
      if (pendingCoupleIdentityRef.current) {
        commitIdentityToEditor(pendingCoupleIdentityRef.current);
        pendingCoupleIdentityRef.current = null;
      }
      if (typeof job.historyId === 'string') setAiComposeHistoryId(job.historyId);
      void fetchAiTemplateComposeHistoryStudio().then(setAiComposeHistory);
      if (editorOpen) {
        setSuccess('Invitation générée en arrière-plan et appliquée à l’éditeur.');
      }
    });
  }, [editorOpen]);

  useEffect(() => {
    if (!editorOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (aiComposeModalOpen) {
          if (!aiComposeBusy) {
            setAiComposeModalOpen(false);
            resetAiComposeModal();
          }
        } else if (selectedElementId) {
          setSelectedElementId(null);
        } else if (studioHistoryModalOpen) {
          setStudioHistoryModalOpen(false);
        } else if (cropperOpen) {
          setCropperOpen(false);
        }
        return;
      }
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (!isInput && (e.metaKey || e.ctrlKey)) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleStudioRedo();
          } else {
            handleStudioUndo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleStudioRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorOpen, selectedElementId, studioHistoryModalOpen, cropperOpen, studioHistoryIndex, studioHistory, aiComposeModalOpen, aiComposeBusy]);

 useEffect(() => {
 if (!editorOpen) return;
 const timer = window.setTimeout(() => {
 try {
 const draft = {
 templateName,
 invitationHonorees,
 invitationDate,
 canvasElements,
 bgType,
 bgColor,
 bgImageUrl,
 bgPattern,
 frameType,
 fontTheme,
 layoutMode,
 importedPalette,
 canvasWidth,
 canvasHeight,
 canvasSizePreset,
 floralColor,
 floralType,
 floralDensity,
 };
 localStorage.setItem(draftKey, JSON.stringify(draft));
 setDraftSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
 } catch {
 /* ignore */
 }
 }, 800);
 return () => window.clearTimeout(timer);
 }, [
 editorOpen,
 draftKey,
 templateName,
 invitationHonorees,
 invitationDate,
 canvasElements,
 bgType,
 bgColor,
 bgImageUrl,
 bgPattern,
 frameType,
 fontTheme,
 layoutMode,
 importedPalette,
 canvasWidth,
 canvasHeight,
 canvasSizePreset,
 floralColor,
 floralType,
 floralDensity,
 ]);

 const handleSaveTemplate = async () => {
 setError('');
 setSuccess('');
 
 if (!templateName.trim()) {
 setError('Indiquez un nom pour le modèle avant d’enregistrer.');
 return;
 }

 const rsvpBlocks = canvasElements.filter((el) => el.type === 'rsvp-block');
 for (const block of rsvpBlocks) {
 const reportingIssues = validateRsvpFieldsForReporting(block.rsvpFields || []);
 if (reportingIssues.length > 0) {
 setSelectedElementId(block.id);
 setStudioRail('content');
 setPropsAdvanced(false);
 setError(
 `Formulaire de réponse à l’invitation incomplet : ${reportingIssues[0]} Ouvrez le bloc de réponse à droite pour corriger.`,
 );
 return;
 }
 }

 // Restrictions et avertissement approprié au moment de l'enregistrement
 const isBlockedByPlanOrQuota =
 !isSuperAdmin &&
 (!canUseCustomTemplates || (templatesAtLimit && !editingTemplateId));

 if (isBlockedByPlanOrQuota) {
 try {
 const draft = {
 savedAt: new Date().toISOString(),
 name: templateName,
 invitationHonorees,
 invitationDate,
 elements: canvasElements,
 bgType,
 bgColor,
 bgImageUrl,
 bgPattern,
 frameType,
 fontTheme,
 layoutMode,
 importedPalette,
 canvasWidth,
 canvasHeight,
 canvasSizePreset,
 floralColor,
 floralType,
 floralDensity,
 };
 localStorage.setItem(draftKey, JSON.stringify(draft));
 setDraftSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
 } catch {
 /* ignore */
 }
 setSaveUpgradeModalOpen(true);
 return;
 }

 setSaving(true);
 try {
 const isGlobalTemplate = isSuperAdmin && !selectedTenantId;
 const payload: Record<string, unknown> = {
 name: templateName,
 content: applyInvitationIdentityToContent({
 global: {
 bgType,
 bgColor,
 bgImageUrl,
 bgPattern,
 frameType,
 fontTheme,
 layoutMode,
 floralColor,
 floralType,
 floralDensity,
 canvasSizePreset,
 canvasWidth,
 canvasHeight,
 colorThemeId: colorThemeId || undefined,
 ...(isGlobalTemplate ? { landingCategory, landingDescription: landingDescription.trim() || undefined } : {}),
 ...(importedPalette ? { palette: importedPalette } : {}),
 ...(importedWithOcr ? { importedFromMockup: true, importedWithOcr } : {}),
 ...(generatedByAi ? { generatedByAi: true } : {}),
 },
 elements: ensureMandatoryRsvpFieldsOnElements(canvasElements),
 }, {
 title: templateName,
 honorees: invitationHonorees,
 date: invitationDate,
 }),
 targetTenantId: isSuperAdmin ? (selectedTenantId || null) : undefined,
 };
 if (isGlobalTemplate) {
 payload.showOnLanding = showOnLanding;
 payload.aiTokenCost = aiTokenCost;
 }

 if (editingTemplateId) {
 await api.put(`/templates/${editingTemplateId}`, payload);
 setSuccess('Invitation mise à jour.');
 } else {
 await api.post('/templates', payload);
 setSuccess('Invitation enregistrée.');
 }

 try {
 localStorage.removeItem(draftKey);
 } catch {
 /* ignore */
 }
 setDraftSavedAt(null);
 setExitConfirmOpen(false);
 if (studioOrigin === 'admin' && isSuperAdmin) {
 setEditorOpen(false);
 router.push(`${ADMIN_TEMPLATES_HREF}&saved=1`);
 } else {
 setEditorOpen(false);
 loadTemplates();
 }
 } catch (err: unknown) {
 const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du modèle.';
 setError(message);
 } finally {
 setSaving(false);
 }
 };

 const handleDeleteTemplate = async (id: string) => {
 if (!canUseCustomTemplates) return;
 if (!confirm('Supprimer ce modèle d\'invitation ?')) return;
 try {
 await api.delete(`/templates/${id}`);
 setTemplates(templates.filter(t => t.id !== id));
 setSuccess('Modèle supprimé.');
 } catch (err: any) {
 setError('Erreur lors de la suppression.');
 }
 };

 const handleDuplicateTemplate = (t: TemplateItem) => {
 if (templatesAtLimit && !isSuperAdmin) {
 setError(templatesQuotaMsg || 'Quota modèles atteint.');
 return;
 }
 setError('');
 setDuplicateTarget(t);
 };

 const confirmDuplicateTemplate = async (values: InvitationDuplicateValues) => {
 if (!duplicateTarget) return;
 try {
 setDuplicating(true);
 const response = await api.post(`/templates/${duplicateTarget.id}/duplicate`, {
 name: values.title,
 title: values.title,
 honorees: values.honorees,
 date: values.date,
 });
 setSuccess(response.message || `Invitation « ${values.title} » ajoutée à votre organisation.`);
 const created = response.template as TemplateItem | undefined;
 setDuplicateTarget(null);
 await loadTemplates();
 if (values.openEditor && created) {
 handleEditTemplateClick({
 ...created,
 content: created.content,
 name: created.name || values.title,
 }, 'studio');
 }
 } catch (err: any) {
 setError(err.message || 'Erreur lors de la duplication du modèle.');
 } finally {
 setDuplicating(false);
 }
 };

 const writeIdentityToCanvas = (next?: { title?: string; honorees?: string; date?: string }) => {
 setCanvasElements((prev) => {
 const applied = applyInvitationIdentityToContent(
 { elements: prev, global: {} },
 {
 title: next?.title ?? templateName,
 honorees: next?.honorees ?? invitationHonorees,
 date: next?.date ?? invitationDate,
 },
 );
 return Array.isArray(applied.elements) ? applied.elements as CanvasElement[] : prev;
 });
 };

 useEffect(() => {
   if (!editorOpen) return;
   const timer = window.setTimeout(() => {
     writeIdentityToCanvas();
   }, 400);
   return () => window.clearTimeout(timer);
   // Intentionnel : n’écrire que lorsque l’identité change, pas à chaque rendu du canevas.
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [editorOpen, templateName, invitationHonorees, invitationDate]);

 useEffect(() => {
   if (!editorOpen || !aiComposeModalOpen) return;
   const timer = window.setTimeout(() => {
     if (aiComposeTitle.trim()) setTemplateName(aiComposeTitle.trim());
     setInvitationHonorees(aiComposeHonorees);
     setInvitationDate(aiComposeDate);
     writeIdentityToCanvas({
       title: aiComposeTitle || templateName,
       honorees: aiComposeHonorees,
       date: aiComposeDate,
     });
   }, 280);
   return () => window.clearTimeout(timer);
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [editorOpen, aiComposeModalOpen, aiComposeTitle, aiComposeHonorees, aiComposeDate]);

 useEffect(() => {
   if (!aiComposeModalOpen || !aiComposeModelPhoto?.imageUrl) return;
   setBgType('image');
   setBgImageUrl(aiComposeModelPhoto.imageUrl);
 }, [aiComposeModalOpen, aiComposeModelPhoto?.imageUrl]);

 useEffect(() => {
   if (!aiComposeModalOpen) return;
   const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
   const previousOverflow = document.body.style.overflow;
   document.body.style.overflow = 'hidden';
   const focusable = (panel: HTMLElement) =>
     Array.from(
       panel.querySelectorAll<HTMLElement>(
         'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
       ),
     ).filter((el) => el.getClientRects().length > 0);
   const onKeyDown = (e: KeyboardEvent) => {
     const panel = document.getElementById('ai-compose-dialog');
     if (!panel) return;
     if (e.key === 'Escape') {
       e.preventDefault();
       e.stopPropagation();
       if (!aiComposeBusy) {
         setAiComposeModalOpen(false);
         resetAiComposeModal();
       }
       return;
     }
     if (e.key !== 'Tab') return;
     const nodes = focusable(panel);
     if (nodes.length === 0) {
       e.preventDefault();
       panel.focus();
       return;
     }
     const first = nodes[0];
     const last = nodes[nodes.length - 1];
     const active = document.activeElement;
     if (e.shiftKey && (!panel.contains(active) || active === first)) {
       e.preventDefault();
       last.focus();
     } else if (!e.shiftKey && (!panel.contains(active) || active === last)) {
       e.preventDefault();
       first.focus();
     }
   };
   window.addEventListener('keydown', onKeyDown, true);
   const focusTimer = window.setTimeout(() => {
     const panel = document.getElementById('ai-compose-dialog');
     const firstField = panel ? focusable(panel)[0] : null;
     (firstField || panel)?.focus();
   }, 0);
   return () => {
     window.clearTimeout(focusTimer);
     window.removeEventListener('keydown', onKeyDown, true);
     document.body.style.overflow = previousOverflow;
     previous?.focus?.();
   };
 }, [aiComposeModalOpen, aiComposeBusy]);

const catalogTemplates = templates.filter((t) => t.isGlobal ?? !t.tenantId);
const ownTemplates = templates.filter((t) => t.isOwned ?? Boolean(t.tenantId));
const studioModelPhotos = useMemo(
  () => invitationModelPhotosFromItems(templates),
  [templates],
);
 const canDuplicateAny = isSuperAdmin || catalogTemplates.length > 0 || canUseCustomTemplates;
 const listTemplates = isSuperAdmin ? templates : ownTemplates;
 const paginatedCatalog = usePaginateItems(catalogTemplates, catalogPage, templatesPageSize);
 const paginatedOwn = usePaginateItems(listTemplates, ownTemplatesPage, templatesPageSize);

 // Helper to get background style
 const getBackgroundStyle = (type: string, color: string, url: string, pattern: string) => {
 if (type === 'color') return { backgroundColor: color };
 if (type === 'image' && url) return { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
 if (type === 'pattern') {
 if (pattern === 'paper') {
 return {
 backgroundColor: color || '#faf8f5',
 backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0), radial-gradient(rgba(0,0,0,0.02) 1px, transparent 0)',
 backgroundSize: '8px 8px',
 backgroundPosition: '0 0, 4px 4px',
 };
 }
 if (pattern === 'watercolor') {
 return {
 background: `radial-gradient(circle at 10% 10%, rgba(243, 224, 217, 0.6) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(225, 212, 198, 0.6) 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${color || '#fdfbf7'} 0%, 100%)`,
 };
 }
 if (pattern === 'boho') {
 return { backgroundColor: color || '#faf6f0' };
 }
 if (pattern === 'linen') {
 return {
 backgroundColor: color || '#f4f1ea',
 backgroundImage: `
 linear-gradient(90deg, rgba(180,170,150,0.08) 1px, transparent 1px),
 linear-gradient(rgba(180,170,150,0.08) 1px, transparent 1px)
 `,
 backgroundSize: '4px 4px',
 };
 }
 if (pattern === 'marble') {
 return {
 backgroundColor: color || '#f5f5f5',
 backgroundImage: `
 radial-gradient(circle at 30% 20%, rgba(197,160,89,0.04) 0%, transparent 40%),
 radial-gradient(circle at 80% 70%, rgba(197,160,89,0.04) 0%, transparent 40%),
 linear-gradient(135deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.01) 10%, transparent 10%, transparent 50%, rgba(0,0,0,0.01) 50%, rgba(0,0,0,0.01) 60%, transparent 60%, transparent 100%)
 `,
 backgroundSize: '100% 100%, 100% 100%, 40px 40px',
 };
 }
 if (pattern === 'gold-dust') {
 return {
 backgroundColor: color || '#1e1b18',
 backgroundImage: `
 radial-gradient(circle at 20% 30%, rgba(197,160,89,0.2) 1px, transparent 1px),
 radial-gradient(circle at 75% 40%, rgba(197,160,89,0.2) 2px, transparent 2px),
 radial-gradient(circle at 50% 80%, rgba(197,160,89,0.15) 1.5px, transparent 1.5px),
 radial-gradient(circle at 10% 75%, rgba(197,160,89,0.12) 2.5px, transparent 2.5px),
 radial-gradient(circle at 90% 15%, rgba(197,160,89,0.2) 1px, transparent 1px)
 `,
 backgroundSize: '120px 120px, 150px 150px, 100px 100px, 180px 180px, 140px 140px',
 };
 }
 if (pattern === 'parchment') {
 return {
 background: `radial-gradient(circle, ${color || '#f1e6d2'} 0%, #e4d3b2 100%)`,
 boxShadow: 'inset 0 0 40px rgba(139,90,43,0.15)',
 };
 }
 if (pattern === 'velvet') {
 return {
 background: `radial-gradient(circle at 50% 30%, ${color || '#4a0e17'} 0%, #1a0307 100%)`,
 };
 }
 }
 return { backgroundColor: '#ffffff' };
 };

 const fontFamilies = [
 { id: 'Cormorant Garamond', label: 'Cormorant Garamond (Classique Serif)' },
 { id: 'Playfair Display', label: 'Playfair Display (Élégant Serif)' },
 { id: 'Great Vibes', label: 'Great Vibes (Cursive Calligraphie)' },
 { id: 'Alex Brush', label: 'Alex Brush (Signature Cursive)' },
 { id: 'Montserrat', label: 'Montserrat (Moderne Sans)' },
 { id: 'Cinzel', label: 'Cinzel (Impérial Romain)' },
 { id: 'Dancing Script', label: 'Dancing Script (Manuscrit)' },
 { id: 'Pinyon Script', label: 'Pinyon Script (Cursive de Luxe)' },
 { id: 'Monsieur La Doulaise', label: 'Monsieur La Doulaise (Calligraphie Royale)' },
 { id: 'Italiana', label: 'Italiana (Saphir Minimaliste)' },
 { id: 'Bodoni Moda', label: 'Bodoni Moda (Haute Couture Serif)' },
 { id: 'Allura', label: 'Allura (Romantique Cursive)' },
 { id: 'Parisienne', label: 'Parisienne (Classique Paris)' },
 { id: 'Prata', label: 'Prata (Serif Moderne)' },
 { id: 'Sacramento', label: 'Sacramento (Rétro Chic)' },
 { id: 'Marcellus', label: 'Marcellus (Sleek Romain)' },
 ];

 const letterSpacings = [
 { id: 'normal', label: 'Normal' },
 { id: '0.05em', label: 'Serré (0.05em)' },
 { id: '0.1em', label: 'Espacé (0.1em)' },
 { id: '0.15em', label: 'Très espacé (0.15em)' },
 { id: '0.2em', label: 'Luxury (0.2em)' },
 ];

 const renderQuickTextModal = () => {
 if (!quickTextModalOpen) return null;
 const textElements = canvasElements.filter((el) => ['text', 'button', 'rsvp-block'].includes(el.type));

 return (
 <Modal
 open={quickTextModalOpen}
 onClose={() => setQuickTextModalOpen(false)}
 title="Modifier les textes clés de l’invitation"
 description="Modifiez directement les noms, dates, lieux et textes. Vos modifications s'appliquent en direct sur la carte."
 size="lg"
 footer={
 <div className="flex justify-end w-full">
 <Button type="button" onClick={() => setQuickTextModalOpen(false)}>
 Terminer
 </Button>
 </div>
 }
 >
 <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
 {textElements.length === 0 ? (
 <p className="text-xs text-muted text-center py-6">Aucun texte sur cette carte.</p>
 ) : (
 textElements.map((el, idx) => {
 const fieldInfo = getElementFieldInfo(el as unknown as Record<string, unknown>, idx);
 const textValue = typeof el.text === 'string' ? el.text : '';

 return (
 <div key={el.id} className="p-3 rounded-xl border border-border bg-surface-muted/30 space-y-1.5">
 <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
 {fieldInfo.iconType === 'user' && <User className="w-3.5 h-3.5 text-primary shrink-0" />}
 {fieldInfo.iconType === 'calendar' && <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />}
 {fieldInfo.iconType === 'map' && <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />}
 {fieldInfo.iconType === 'rsvp' && <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />}
 {fieldInfo.iconType === 'message' && <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />}
 {fieldInfo.iconType === 'type' && <Type className="w-3.5 h-3.5 text-primary shrink-0" />}
 <span>{fieldInfo.label}</span>
 </label>
 {textValue.length > 50 ? (
 <textarea
 rows={2}
 value={textValue}
 onChange={(e) => {
 const updated = canvasElements.map((item) =>
 item.id === el.id ? { ...item, text: e.target.value } : item,
 );
 setCanvasElements(updated);
 }}
 placeholder={fieldInfo.placeholder}
 className="w-full text-xs rounded-lg border border-border bg-surface p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 resize-y"
 />
 ) : (
 <input
 type="text"
 value={textValue}
 onChange={(e) => {
 const updated = canvasElements.map((item) =>
 item.id === el.id ? { ...item, text: e.target.value } : item,
 );
 setCanvasElements(updated);
 }}
 placeholder={fieldInfo.placeholder}
 className="w-full text-xs rounded-lg border border-border bg-surface px-2.5 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
 />
 )}
 </div>
 );
 })
 )}
 </div>
 </Modal>
 );
 };


 if (loading) {
 return <SkeletonTemplatesView />;
 }

 if (editorOpen) {
 const editorTree = (
 <div className="fixed inset-0 z-[11020] bg-background overflow-y-auto overscroll-contain">
 {renderMockupImportModal()}
 {renderAiComposeModal()}
 {renderQuickTextModal()}
 <AiTokenPurchaseModal
 open={aiTokenModalOpen}
 onClose={() => setAiTokenModalOpen(false)}
 onSuccess={() => setAiAllowance(getAiSimulationAllowance())}
 />
 <AiComposeFullscreenLoader
 active={showInvitationStudioLoader}
 embedText={aiComposeEmbedText}
 hasReferences={aiComposeFiles.length > 0}
 title={
 aiComposePrompt.toLowerCase().includes('retouche') || aiComposePrompt.toLowerCase().includes('altér')
 ? 'Retouche de l’invitation IA…'
 : undefined
 }
 stageHint={aiComposeStage || (invitationStudioJob ? 'La génération continue même si vous quittez cet écran.' : null)}
 footnote={
 aiComposePrompt.toLowerCase().includes('retouche') || aiComposePrompt.toLowerCase().includes('altér')
 ? 'Conservation de la base avec ajustement précis par l’IA.'
 : undefined
 }
 onContinueInBackground={hideInvitationLoader}
 />
 <Modal
 open={exitConfirmOpen}
 onClose={() => setExitConfirmOpen(false)}
 title="Quitter sans enregistrer ?"
 description="Le modèle ne sera pas publié. Un brouillon reste disponible sur cet appareil."
 size="sm"
 footer={
 <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
 <Button type="button" variant="ghost" onClick={() => setExitConfirmOpen(false)}>
 Continuer l&apos;édition
 </Button>
 <Button type="button" variant="secondary" onClick={discardAndCloseEditor}>
 Quitter sans enregistrer
 </Button>
 <Button
 type="button"
 onClick={() => {
 setExitConfirmOpen(false);
 void handleSaveTemplate();
 }}
 disabled={saving}
 >
 {saving ? 'Enregistrement…' : 'Enregistrer et quitter'}
 </Button>
 </div>
 }
 >
 {draftSavedAt ? (
 <p className="text-sm text-muted leading-relaxed">
 Dernier brouillon local : {draftSavedAt}. Les invités ne verront les changements qu&apos;après enregistrement.
 </p>
 ) : null}
 </Modal>

 <Modal
 open={saveUpgradeModalOpen}
 onClose={() => setSaveUpgradeModalOpen(false)}
 size="md"
 title={
 <div className="flex items-center gap-2.5">
 <div className="p-2 rounded-xl bg-surface-muted text-amber-600 dark:text-amber-400 border border-border">
 <Crown className="w-5 h-5" aria-hidden />
 </div>
 <div>
 <span className="text-base font-semibold text-foreground block">
 Enregistrement de modèle d’invitation
 </span>
 <span className="text-xs text-muted block font-normal">
 Votre création est sauvegardée en brouillon local sur cet appareil
 </span>
 </div>
 </div>
 }
 >
 <div className="space-y-4 pt-1">
 <div className="p-4 rounded-xl bg-surface-muted/50 border border-border space-y-1.5">
 <p className="text-sm font-semibold text-foreground">
 Votre modèle « {templateName || 'Nouvelle invitation'} » est prêt !
 </p>
 <p className="text-xs text-muted leading-relaxed">
 {!canUseCustomTemplates
 ? "La création et l'enregistrement de faire-part personnalisés sont réservés aux offres professionnelles et supérieures. Votre modèle a bien été sauvegardé sur cet appareil pour que vous ne perdiez pas votre travail."
 : `Vous avez atteint la limite de ${planQuota?.limits.maxTemplates ?? 1} modèle(s) d'invitation de votre formule actuelle (${tenant?.plan || 'actuel'}). Pour enregistrer ce nouveau modèle sans supprimer les précédents, activez une formule supérieure.`}
 </p>
 </div>

 <div className="rounded-xl border border-border p-3.5 space-y-2 bg-surface text-xs">
 <p className="font-semibold text-foreground flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
 Avantages du forfait supérieur :
 </p>
 <ul className="space-y-1.5 text-muted pl-1">
 <li className="flex items-center gap-2">
 <Check className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
 <span>Enregistrement et utilisation illimitée de modèles sur-mesure</span>
 </li>
 <li className="flex items-center gap-2">
 <Check className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
 <span>Formulaires de réponse à l’invitation personnalisés et suivi des présences</span>
 </li>
 <li className="flex items-center gap-2">
 <Check className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
 <span>Génération d&apos;invitations avancées par Intelligence Artificielle</span>
 </li>
 </ul>
 </div>

 <div className="flex flex-col gap-2.5 pt-2">
 <Link
   href="/dashboard/events"
   className="flex-1 inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-semibold rounded-xl text-xs transition"
 >
   Continuer vers un événement
 </Link>
 <p className="text-xs text-muted text-center">Depuis l’événement, vous pourrez l’envoyer sur WhatsApp.</p>
 <div className="flex flex-col sm:flex-row gap-2.5">
 <button 
 type="button"
 onClick={() => {
 window.open('/dashboard/billing', '_blank');
 }}
 className="flex-1 inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 border border-border bg-surface hover:bg-surface-muted text-foreground font-semibold rounded-xl text-xs transition cursor-pointer"
 >
 <Sparkles className="w-4 h-4" aria-hidden />
 <span>Voir les formules</span>
 </button>
 <button
 type="button"
 onClick={() => setSaveUpgradeModalOpen(false)}
 className="inline-flex min-h-11 items-center justify-center px-4 py-2.5 border border-border bg-surface hover:bg-surface-muted text-foreground font-semibold rounded-xl text-xs transition cursor-pointer"
 >
 Continuer à peaufiner
 </button>
 </div>
 </div>
 </div>
 </Modal>

 <Modal
 open={studioHistoryModalOpen}
 onClose={() => setStudioHistoryModalOpen(false)}
 title="Historique d'actions du Studio"
 description="Restaurez une étape précédente de votre modèle d'invitation."
 size="md"
 footer={
 <div className="flex justify-end w-full">
 <Button type="button" variant="secondary" onClick={() => setStudioHistoryModalOpen(false)}>
 Fermer
 </Button>
 </div>
 }
 >
 <div className="space-y-2 max-h-80 overflow-y-auto overscroll-contain pr-1">
 {studioHistory.length === 0 ? (
 <p className="text-xs text-muted text-center py-6">Aucune action enregistrée pour le moment.</p>
 ) : (
 studioHistory.map((entry, idx) => {
 const isCurrent = idx === studioHistoryIndex;
 return (
 <div
 key={entry.id}
 className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
 isCurrent
 ? 'border-primary bg-primary/10 text-foreground font-bold shadow-2xs'
 : 'border-border bg-surface text-muted hover:border-primary/40'
 }`}
 >
 <div className="flex items-center gap-2 min-w-0">
 <span className={`w-2 h-2 rounded-full shrink-0 ${isCurrent ? 'bg-primary' : 'bg-muted/50'}`} />
 <span className="truncate">{entry.label}</span>
 <span className="text-xs text-muted font-mono">{entry.time}</span>
 </div>
 {isCurrent ? (
 <span className="text-xs font-bold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/20">
 Actuel
 </span>
 ) : (
 <button
 type="button"
 onClick={() => {
 setStudioHistoryIndex(idx);
 setCanvasElements(JSON.parse(JSON.stringify(entry.elements)));
 setStudioHistoryModalOpen(false);
 }}
 className="text-primary hover:underline font-semibold text-xs px-2 py-1 rounded hover:bg-primary/10 transition cursor-pointer"
 >
 Rétablir
 </button>
 )}
 </div>
 );
 })
 )}
 </div>
 </Modal>
 <div className="flex flex-col gap-4 min-h-full px-3 sm:px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:px-6 lg:pt-4">
        {(!canUseCustomTemplates || templatesAtLimit) && !isSuperAdmin && (
          <div className="bg-surface border border-border rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-foreground shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden />
              <span className="leading-tight text-muted">
                <strong className="font-semibold text-foreground">Mode Découverte & Conception :</strong> Vous pouvez concevoir, tester et prévisualiser votre modèle librement. L&apos;enregistrement sur votre compte requiert un forfait supérieur.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSaveUpgradeModalOpen(true)}
              className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-foreground bg-surface-muted hover:bg-surface border border-border transition shrink-0 cursor-pointer self-start sm:self-auto touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span>Voir les formules</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
        )}
 {/* Editor Header — identity left, primary actions right, admin meta secondary */}
 <header className="shrink-0 space-y-3 border-b border-border pb-4">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => requestCloseEditor()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center hover:bg-surface-muted rounded-[var(--radius-button)] transition text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 title={fromAdminConsole ? 'Retour au catalogue Super Admin' : 'Retour à mes modèles'}
                aria-label={fromAdminConsole ? 'Retour au catalogue Super Admin' : 'Retour à mes modèles'}
 >
 <ArrowLeft className="w-5 h-5" />
 </button>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex-1 max-w-md group">
 <input 
 type="text" 
 value={templateName}
 onChange={(e) => setTemplateName(e.target.value)}
                      maxLength={120}
                      className="w-full min-w-0 text-lg sm:text-xl font-semibold text-foreground bg-transparent border-b border-border/40 hover:border-border focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary pr-6 py-0.5 transition"
 placeholder="Titre de l’invitation"
                      aria-label="Titre de l’invitation"
                    />
                    <Edit3 className="w-3.5 h-3.5 text-muted/40 group-hover:text-muted pointer-events-none absolute right-1 top-2 transition-colors" />
                  </div>
                  {draftSavedAt && (
                    <span
                      className="shrink-0 text-xs font-bold uppercase tracking-wider text-festive-accent bg-festive-accent/10 border border-festive-accent/20 px-2 py-0.5 rounded-md whitespace-nowrap"
                      title="Modifications locales non encore enregistrées"
                    >
                      Brouillon
                    </span>
                  )}
                </div>
                {templateName.length >= 100 && (
                  <p className="text-xs text-muted mt-0.5">{templateName.length}/120 caractères</p>
                )}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl">
                  <Input
                    label="Cérémonie, couple ou personne"
                    value={invitationHonorees}
                    onChange={(e) => setInvitationHonorees(e.target.value)}
                    placeholder="ex. Amina & Jean-Marc"
                    leftIcon={<Users className="h-4 w-4" aria-hidden />}
                    hint="Nom affiché en grand sur le carton."
                  />
                  <Input
                    label="Date de la cérémonie"
                    type="date"
                    value={invitationDate}
                    onChange={(e) => setInvitationDate(e.target.value)}
                    leftIcon={<Calendar className="h-4 w-4" aria-hidden />}
                    hint="S’écrit tout de suite sur le carton."
                  />
                </div>
                <div className="mt-1 flex items-center gap-2">
 {fromAdminConsole ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
 <Globe className="w-3 h-3" />
                      Catalogue Super Admin
 </span>
 ) : (
                    <span className="text-xs text-muted font-semibold">
                      {isSuperAdmin ? 'Modèle plateforme' : 'Atelier d’invitation'}
                    </span>
 )}
 {fromAdminConsole && (
                    <span className="text-xs text-muted hidden sm:inline">
                      · L’enregistrement synchronise le catalogue public
                    </span>
 )}
 </div>
 </div>
 </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
              {rsvpReportingIssues.length > 0 ? (
                <p
                  role="status"
                  className="w-full sm:w-auto text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 max-w-xs sm:text-right"
                  title={rsvpReportingIssues[0]}
                >
                  Formulaire de réponse à l’invitation à finaliser
                </p>
              ) : canvasElements.some((el) => el.type === 'rsvp-block') ? (
                <p
                  role="status"
                  className="w-full sm:w-auto text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5 sm:text-right"
                >
                  Formulaire de réponse à l’invitation prêt ✓
                </p>
              ) : null}
 <div className="flex items-center gap-1 border border-border rounded-xl p-1 bg-surface shadow-2xs">
 <button
 type="button"
 onClick={handleStudioUndo}
 disabled={studioHistoryIndex <= 0}
 className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition disabled:opacity-30 cursor-pointer"
 title="Annuler (Ctrl+Z)"
 aria-label="Annuler la dernière action"
 >
 <Undo2 className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={handleStudioRedo}
 disabled={studioHistoryIndex >= studioHistory.length - 1}
 className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition disabled:opacity-30 cursor-pointer"
 title="Rétablir (Ctrl+Y)"
 aria-label="Rétablir la dernière action"
 >
 <Redo2 className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={() => setStudioHistoryModalOpen(true)}
 className="inline-flex min-h-11 items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition cursor-pointer"
 title="Historique d'actions"
 aria-label="Ouvrir l'historique d'actions"
 >
 <History className="w-3.5 h-3.5 text-primary" />
 <span className="hidden md:inline">Historique</span>
 {studioHistory.length > 0 && (
 <span className="text-xs font-mono px-1 rounded bg-surface-muted text-foreground">
 {studioHistoryIndex + 1}/{studioHistory.length}
 </span>
 )}
 </button>
 </div>
 {bgImageUrl ? (
 <button
 type="button"
 disabled={aiImageDownloading}
 onClick={async () => {
 if (!bgImageUrl || aiImageDownloading) return;
 setAiImageDownloading(true);
 try {
 await downloadAiGeneratedImage(bgImageUrl);
 } finally {
 setAiImageDownloading(false);
 }
 }}
 className="inline-flex min-h-11 items-center justify-center gap-2 px-3.5 py-2.5 border border-border font-bold rounded-[var(--radius-button)] text-sm text-muted hover:border-primary hover:text-primary transition disabled:opacity-60"
 title="Télécharger l’image générée"
 >
 {aiImageDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
 <span className="hidden sm:inline">Télécharger</span>
 </button>
 ) : null}
 <button
 type="button"
 onClick={() => setShowGuestPreview((v) => !v)}
 aria-pressed={showGuestPreview}
 className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 border font-bold rounded-[var(--radius-button)] text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
 showGuestPreview
 ? 'border-primary bg-primary/10 text-primary'
 : 'border-border text-muted hover:border-primary hover:text-primary'
 }`}
 >
 <Eye className="w-4 h-4" />
 <span className="hidden sm:inline">Voir comme un invité</span>
 <span className="sm:hidden">Aperçu</span>
 </button>
 <button 
 type="button"
 onClick={handleSaveTemplate}
 disabled={saving}
 title={rsvpReportingIssues.length > 0 ? rsvpReportingIssues[0] : undefined}
 className="inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-bold rounded-[var(--radius-button)] text-sm transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
 >
 {saving ? (
 <>
 <Loader2 className="w-4.5 h-4.5 animate-spin" />
 Enregistrement…
 </>
 ) : (
 <>
 <Save className="w-4.5 h-4.5" />
 Enregistrer
 </>
 )}
 </button>
 </div>
 </div>
 {isSuperAdmin && (
 <div className="flex flex-wrap items-center gap-2 pl-14">
 <label className="text-xs font-bold text-muted uppercase tracking-wider" htmlFor="template-scope">
 Visible pour
 </label>
 <select
 id="template-scope"
 value={selectedTenantId}
 onChange={(e) => setSelectedTenantId(e.target.value)}
 className="text-xs font-bold text-foreground bg-surface-muted border border-border rounded-lg px-2 py-1.5 min-h-[44px] focus:outline-none focus:border-primary"
 title="Global = catalogue EventMaster. Privé = une organisation uniquement."
 >
 <option value="">Toutes les organisations (catalogue)</option>
 {tenants.map((t) => (
 <option key={t.id} value={t.id}>
 Organisation · {t.name}
 </option>
 ))}
 </select>
 {!selectedTenantId && (
 <>
 <label className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-primary cursor-pointer px-2 rounded-lg hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/40">
 <input
 type="checkbox"
 checked={showOnLanding}
 onChange={(e) => setShowOnLanding(e.target.checked)}
 className="rounded text-primary focus:ring-primary"
 />
 Afficher sur la page d&apos;accueil
 </label>
 <label htmlFor="template-ai-token-cost" className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-muted px-2">
 <span>Jetons IA</span>
 <input
 id="template-ai-token-cost"
 type="number"
 min={1}
 max={50}
 value={aiTokenCost}
 aria-label="Coût en jetons IA pour utiliser ce modèle comme base"
 onChange={(e) => {
   const next = Math.round(Number(e.target.value));
   setAiTokenCost(Number.isFinite(next) ? Math.min(50, Math.max(1, next)) : AI_INVITATION_COMPOSE_TOKEN_COST);
 }}
 className="w-16 rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
 title="Coût en jetons pour utiliser ce modèle comme base IA"
 />
 </label>
 </>
 )}
 </div>
 )}
 </header>

 {!studioGuideDismissed && (
          <div className="px-4 py-3 rounded-[var(--radius-card)] bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3" role="note">
            <p className="text-sm text-foreground leading-relaxed">
              <span className="font-semibold">Pour composer :</span>{' '}
              renseignez le titre, les hôtes et la date, puis créez avec l’IA ou ajoutez des textes. Enregistrez quand la carte est prête.
            </p>
            <button
              type="button"
              onClick={() => setStudioGuideDismissed(true)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center px-3 rounded-[var(--radius-button)] border border-border bg-surface-muted text-xs font-semibold text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Compris
            </button>
          </div>
        )}
 {draftSavedAt && (
          <div className="px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs flex items-center justify-between gap-3 shadow-2xs" role="status">
            <span className="flex items-center gap-2 text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden />
              <span>Brouillon local à {draftSavedAt} — pas encore enregistré</span>
            </span>
 <button
 type="button"
              className="text-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md px-1 font-medium transition-colors"
 onClick={() => {
 try {
 localStorage.removeItem(draftKey);
 setDraftSavedAt(null);
 } catch {
 /* ignore */
 }
 }}
 >
              Effacer le brouillon
 </button>
 </div>
 )}

 {error && (
 <div
 role="alert"
 aria-live="assertive"
 className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex flex-wrap items-center gap-3 text-sm"
 >
 <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
 <span className="flex-1 min-w-0 break-words">{error}</span>
 <button
 type="button"
 onClick={() => setError('')}
 className="text-xs font-bold text-rose-700 hover:underline shrink-0"
 >
 Fermer
 </button>
 </div>
 )}

 {/* Editor Workspace — canvas leads; denser sticky rails support */}
 <div className="grid grid-cols-1 lg:grid-cols-[minmax(13rem,15rem)_minmax(0,1fr)_minmax(14rem,16rem)] gap-4 lg:gap-5 items-start max-lg:flex-1 max-lg:min-h-0 max-lg:overflow-y-auto">
 {/* Left Toolbox — Contenu | Style */}
 <aside className={cn(
  'order-2 lg:order-1 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto overscroll-contain bg-surface border border-border rounded-[var(--radius-card)] p-4 space-y-4',
  mobilePane === 'tools' ? 'max-lg:block' : 'max-lg:hidden',
 )}>
 <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-muted border border-border" role="tablist" aria-label="Outils du studio">
 <button
 type="button"
 role="tab"
 aria-selected={studioRail === 'content'}
 onClick={() => setStudioRail('content')}
 className={`min-h-11 py-2 rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
 studioRail === 'content'
 ? 'bg-surface text-foreground shadow-sm'
 : 'text-muted hover:text-foreground'
 }`}
 >
 Ajouter
 </button>
 <button
 type="button"
 role="tab"
 aria-selected={studioRail === 'style'}
 onClick={() => {
 setStudioRail('style');
 setSelectedElementId(null);
 }}
 className={`min-h-11 py-2 rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
 studioRail === 'style'
 ? 'bg-surface text-foreground shadow-sm'
 : 'text-muted hover:text-foreground'
 }`}
 >
 Apparence
 </button>
 </div>

 {studioRail === 'content' ? (
 <>
        {canUseCustomTemplates && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground flex items-center justify-center shrink-0">
                <Wand2 className="w-4 h-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-foreground">
                  Créer le carton
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-0.5">
                  Décrivez la fête, ou partez d’un modèle pour remplacer textes et visages. Coût selon le modèle (dès {AI_INVITATION_COMPOSE_TOKEN_COST} jetons).
                </p>
              </div>
            </div>

            {isInviteBlocked ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center space-y-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  Fonctionnalité à venir
                </span>
                <p className="text-[11px] text-muted leading-tight">
                  L&apos;assistant IA est temporairement désactivé par l&apos;administration.
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={mockupImporting || imageUploading || aiComposeBusy}
                  onClick={() => openAiComposeModal()}
                  className="w-full min-h-11 flex items-center justify-center gap-2 p-2.5 rounded-[var(--radius-button)] bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-bold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
                >
                  {aiComposeBusy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Wand2 className="w-4 h-4" aria-hidden />}
                  {aiComposeBusy ? 'Création en cours…' : 'Décrire et créer'}
                </button>

                {canvasElements.length > 0 && (
                  <button
                    type="button"
                    disabled={aiComposeBusy}
                    onClick={() =>
                      openAiComposeModal(
                        'Conserver la base du carton actuel. Retouche demandée : ',
                        { isAlteration: true },
                      )
                    }
                    className="w-full min-h-11 flex items-center justify-center gap-1.5 p-2 rounded-[var(--radius-button)] border border-border bg-surface hover:bg-surface-muted text-foreground font-bold text-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden />
                    Retoucher cette carte
                  </button>
                )}
                <button
                  type="button"
                  disabled={aiComposeBusy}
                  onClick={() => openAiComposeModal(undefined, { coupleFaceSwap: true })}
                  className="w-full min-h-11 flex items-center justify-center gap-1.5 p-2 rounded-[var(--radius-button)] border border-border bg-surface hover:bg-surface-muted text-foreground font-bold text-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Users className="w-3.5 h-3.5" aria-hidden />
                  Mettre les visages du couple
                </button>
              </>
            )}

            {canvasElements.some((el) => ['text', 'button', 'rsvp-block'].includes(el.type)) && (
              <button
                type="button"
                onClick={() => setQuickTextModalOpen(true)}
                className="w-full min-h-11 flex items-center justify-center gap-1.5 p-2 rounded-[var(--radius-button)] border border-border bg-surface hover:bg-surface-muted text-foreground font-bold text-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary" aria-hidden />
                Changer les noms et la date
              </button>
            )}
          </div>
        )}

 {canUseMockupImport && (
 <div className="space-y-2">
 <h3 className="text-xs font-bold text-muted flex items-center gap-1.5">
 <Upload className="w-3.5 h-3.5" aria-hidden />
 Partir d’une maquette
 </h3>
 <p className="text-xs text-muted leading-relaxed">
 Importez une photo de faire-part pour reprendre ses couleurs
 {canUseMockupOcr ? ', et le texte s’il est lisible.' : '.'}
 </p>
 {ocrProgress !== null && (
 <p className="text-xs text-primary font-bold">Détection du texte… {ocrProgress}%</p>
 )}
 <input
 ref={mockupEditorInputRef}
 type="file"
 accept="image/jpeg,image/png,image/webp"
 className="hidden"
 onChange={(e) => handleMockupFileChange(e, false)}
 />
 <button
 type="button"
 disabled={mockupImporting || imageUploading || aiComposeBusy}
 onClick={() => mockupEditorInputRef.current?.click()}
 className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-border rounded-2xl hover:border-primary/40 hover:bg-surface-muted text-foreground font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 >
 {mockupImporting ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Upload className="w-4 h-4" />
 )}
 {mockupImporting ? 'Analyse en cours…' : 'Choisir une image'}
 </button>
 </div>
 )}

 {importedPalette && (
 <div className="space-y-2 pb-4 border-b border-border-subtle">
 <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Couleurs de la maquette</h3>
 <div className="flex flex-wrap gap-1.5">
 {(['primary', 'secondary', 'accent', 'background'] as const).map((key) => {
 const labels = {
 primary: 'Principal',
 secondary: 'Secondaire',
 accent: 'Accent',
 background: 'Fond',
 } as const;
 return (
 <button
 key={key}
 type="button"
 onClick={() => applyPaletteSlot(key)}
 className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:opacity-80 transition"
 title={`Appliquer ${labels[key]} (${importedPalette[key]})`}
 >
 <span
 className="w-5 h-5 rounded-md border border-border shadow-sm"
 style={{ backgroundColor: importedPalette[key] }}
 />
 {labels[key]}
 </button>
 );
 })}
 </div>
 <div className="flex flex-wrap gap-x-3 gap-y-1">
 <button
 type="button"
 onClick={() => {
 if (!importedPalette) return;
 setCanvasElements((prev) =>
 prev.map((el) => {
 if (el.type !== 'text') return el;
 const size = parseInt(String(el.fontSize || '16'), 10);
 if (size >= 24) return { ...el, color: importedPalette.accent };
 return el;
 }),
 );
 }}
 className="text-xs font-bold text-primary hover:underline"
 >
 Appliquer l&apos;accent aux titres
 </button>
 <button
 type="button"
 onClick={() => {
 if (!importedPalette) return;
 setBgColor(importedPalette.background);
 setBgType('color');
 }}
 className="text-xs font-bold text-primary hover:underline"
 >
 Appliquer le fond à la carte
 </button>
 </div>
 </div>
 )}

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted">Placement sur la carte</h3>
 <div className="grid grid-cols-1 gap-1.5">
 <button
 type="button"
 onClick={() => convertToFlowLayout()}
              title="Les éléments se placent les uns sous les autres"
              aria-pressed={layoutMode === 'flow'}
              className={`min-h-11 py-2 px-2.5 rounded-[var(--radius-button)] text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
 layoutMode === 'flow'
                  ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                  : 'border-border text-muted hover:bg-surface-muted hover:text-foreground'
 }`}
 >
              <Layers className="w-3.5 h-3.5" />
              <span>L’un sous l’autre</span>
 </button>
 <button
 type="button"
 onClick={() => (layoutMode === 'free' ? setLayoutMode('free') : convertToFreeLayout())}
              title="Glissez-déposez librement sur la carte"
              aria-pressed={layoutMode === 'free'}
              className={`min-h-11 py-2 px-2.5 rounded-[var(--radius-button)] text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
 layoutMode === 'free'
                  ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                  : 'border-border text-muted hover:bg-surface-muted hover:text-foreground'
 }`}
 >
              <Move className="w-3.5 h-3.5" />
              <span>Glisser où je veux</span>
 </button>
 </div>
 </div>

        <EditorialLayoutPicker onSelect={applyEditorialLayout} selectedId={editorialLayoutId} />

        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-muted">Ajouter sur la carte</h3>
          <div className="grid grid-cols-2 gap-2">
 <button 
              type="button"
 onClick={() => handleAddElement('text')}
              className="min-h-11 flex items-center gap-2.5 p-2.5 border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-xs transition text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
 >
              <span className="p-1.5 rounded-lg bg-surface-muted text-muted group-hover:bg-primary/10 group-hover:text-primary transition shrink-0">
                <Type className="w-4 h-4" />
              </span>
 <span>Texte</span>
 </button>
 <button 
              type="button"
 onClick={() => handleAddElement('button')}
              className="min-h-11 flex items-center gap-2.5 p-2.5 border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-xs transition text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
 >
              <span className="p-1.5 rounded-lg bg-surface-muted text-muted group-hover:bg-primary/10 group-hover:text-primary transition shrink-0">
                <Columns className="w-4 h-4" />
              </span>
 <span>Bouton</span>
 </button>
 <button 
              type="button"
 onClick={() => handleAddElement('image')}
              className="min-h-11 flex items-center gap-2.5 p-2.5 border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-xs transition text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
 >
              <span className="p-1.5 rounded-lg bg-surface-muted text-muted group-hover:bg-primary/10 group-hover:text-primary transition shrink-0">
                <Image className="w-4 h-4" />
              </span>
 <span>Image</span>
 </button>
 <button 
              type="button"
 onClick={() => handleAddElement('divider')}
              className="min-h-11 flex items-center gap-2.5 p-2.5 border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-xs transition text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
 >
              <span className="p-1.5 rounded-lg bg-surface-muted text-muted group-hover:bg-primary/10 group-hover:text-primary transition shrink-0">
                <Palette className="w-4 h-4" />
              </span>
 <span>Séparateur</span>
 </button>
 <button 
              type="button"
              onClick={() => handleAddElement('rsvp-block')}
              className="flex items-center gap-2.5 p-2.5 border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-xs transition text-left group col-span-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
            >
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary transition shrink-0">
                <CheckSquare className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <span className="block font-bold">Formulaire de réponse à l’invitation</span>
                <span className="block text-[11px] text-muted font-normal">Validation de présence avec repas & accompagnants</span>
              </div>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowDecorTools((v) => !v)}
            className="w-full text-xs font-bold text-muted hover:text-primary py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg border border-dashed border-border/80 hover:border-primary/40 cursor-pointer"
          >
            {showDecorTools ? 'Masquer les formes décoratives' : '+ Ajouter une courbe ou un triangle'}
          </button>
          {showDecorTools && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
 onClick={() => handleAddElement('curve')}
                className="flex items-center gap-2 p-2.5 border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-xs transition text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
 >
                <span className="p-1.5 rounded-lg bg-surface-muted text-muted group-hover:bg-primary/10 group-hover:text-primary transition shrink-0">
                  <Spline className="w-4 h-4" />
                </span>
 <span>Courbe</span>
 </button>
 <button 
                type="button"
 onClick={() => handleAddElement('triangle')}
                className="flex items-center gap-2 p-2.5 border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary font-semibold text-xs transition text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
 >
                <span className="p-1.5 rounded-lg bg-surface-muted text-muted group-hover:bg-primary/10 group-hover:text-primary transition shrink-0">
                  <Triangle className="w-4 h-4" />
                </span>
 <span>Triangle</span>
 </button>
            </div>
          )}
 </div>

 <button
 type="button"
 onClick={() => {
 const themeFonts = getFontTheme(fontTheme);
 const palette = importedPalette || invitationColorThemes(tenant?.branding)[0].palette;
 const baseId = Date.now();
 const presets: CanvasElement[] = [
 {
 id: `${baseId}-t`,
 type: 'text',
 text: '{{title}}',
 color: palette.primary,
 fontSize: '28px',
 align: 'center',
 width: 'full',
 fontFamily: themeFonts.titleFont,
 bold: true,
 ...(layoutMode === 'free'
 ? { positionMode: 'absolute' as const, xPct: 8, yPct: 12, wPct: 84, zIndex: 1 }
 : { positionMode: 'flow' as const }),
 },
 {
 id: `${baseId}-d`,
 type: 'text',
 text: '{{date}} · {{location}}',
 color: palette.secondary,
 fontSize: '14px',
 align: 'center',
 width: 'full',
 fontFamily: themeFonts.bodyFont,
 ...(layoutMode === 'free'
 ? { positionMode: 'absolute' as const, xPct: 8, yPct: 28, wPct: 84, zIndex: 2 }
 : { positionMode: 'flow' as const }),
 },
 {
 id: `${baseId}-b`,
 type: 'button',
 text: 'Confirmer ma présence',
 color: palette.accent,
 fontSize: '15px',
 align: 'center',
 width: 'full',
 fontFamily: themeFonts.accentFont,
 buttonStyle: 'filled',
 buttonLink: '#rsvp-section',
 ...(layoutMode === 'free'
 ? { positionMode: 'absolute' as const, xPct: 20, yPct: 70, wPct: 60, zIndex: 3 }
 : { positionMode: 'flow' as const }),
 },
 ];
 setCanvasElements((prev) => [...prev, ...presets]);
 }}
 className="w-full flex items-center justify-center gap-2 p-2.5 border border-dashed border-primary/30 rounded-xl hover:bg-primary/5 text-primary font-bold text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 >
 <Sparkles className="w-4 h-4" />
 Preset titre · date · bouton
 </button>
 </>
 ) : (
 <>
 <div className="space-y-3">
 <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Thèmes de couleurs</h3>
 <div className="grid grid-cols-2 gap-2">
 {(showAllThemes
 ? invitationColorThemes(tenant?.branding)
 : invitationColorThemes(tenant?.branding).filter((theme) => theme.id !== 'cyber-neon').slice(0, 4)
 ).map((theme) => (
 <button 
 key={theme.id}
 type="button"
 onClick={() => applyColorTheme(theme.id, true)}
 className={`text-left p-2 rounded-xl border transition ${
 colorThemeId === theme.id
 ? 'border-primary bg-primary/5'
 : 'border-border hover:border-primary hover:bg-primary/5'
 }`}
 title={theme.description}
 >
 <div className="flex gap-0.5 mb-1.5">
 {(['primary', 'secondary', 'accent', 'background'] as const).map((k) => (
 <span
 key={k}
 className="w-3.5 h-3.5 rounded-sm border border-border/80"
 style={{ backgroundColor: theme.palette[k] }}
 />
 ))}
 </div>
 <span className="text-xs font-bold text-foreground block leading-tight">{theme.name}</span>
 </button>
 ))}
 </div>
 {invitationColorThemes(tenant?.branding).length > 4 && (
 <button
 type="button"
 onClick={() => setShowAllThemes((v) => !v)}
 className="w-full min-h-11 text-xs font-bold text-primary hover:underline"
 >
 {showAllThemes ? 'Moins de thèmes' : 'Autres ambiances (soirée, néon)'}
 </button>
 )}
 </div>

 <div className="space-y-2">
 <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Typographie</h3>
 <select
 value={fontTheme}
 onChange={(e) => setFontTheme(e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
 >
 {FONT_THEMES.map((t) => (
 <option key={t.id} value={t.id}>{t.name}</option>
 ))}
 </select>
 <button
 type="button"
 onClick={() => applyCurrentFontTheme(true)}
 className="w-full text-xs font-bold text-primary hover:bg-primary/5 py-1.5 rounded-lg transition"
 >
 Appliquer aux textes de la carte
 </button>
 </div>

 <p className="text-xs text-muted leading-relaxed rounded-xl bg-surface-muted border border-border px-3 py-2">
 Fond, format et cadre : ouvrez l’onglet Apparence.
 </p>
 </>
 )}
 </aside>

 {/* Center Canvas Preview */}
      <div className={cn(
        'order-1 lg:order-2 min-w-0 space-y-3',
        mobilePane === 'canvas' ? 'max-lg:block' : 'max-lg:hidden',
      )}>
        {/* HUD status bar above canvas */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-surface border border-border/80 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-muted text-foreground text-xs font-semibold tabular-nums">
              <Layout className="w-3.5 h-3.5 text-primary" />
              <span>{canvasWidth} × {canvasHeight} px</span>
              <span className="text-muted font-normal hidden sm:inline">
                ({canvasSizePreset !== 'custom' ? (CANVAS_SIZE_PRESETS[canvasSizePreset as Exclude<CanvasSizePreset, 'custom'>]?.label.split(' (')[0] || canvasSizePreset) : 'Personnalisé'})
 </span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary">
              {layoutMode === 'free' ? 'Glisser où je veux' : 'L’un sous l’autre'}
            </span>
 </div>
 
          <div className="flex items-center gap-1.5 ml-auto">
            {selectedElementId ? (
              <button
                type="button"
                onClick={() => setSelectedElementId(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition cursor-pointer"
                title="Désélectionner l'élément actuel (Échap)"
              >
                <span>Désélectionner</span>
                <kbd className="hidden sm:inline px-1 py-0.5 text-[10px] font-mono rounded bg-surface border border-border/80 text-foreground">Échap</kbd>
              </button>
            ) : (
              <span className="text-xs text-muted hidden sm:inline">Cliquez un texte pour le modifier</span>
            )}
            <button
              type="button"
              onClick={() => setShowGuestPreview((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                showGuestPreview
                  ? 'border-primary/40 bg-primary/10 text-primary shadow-2xs'
                  : 'border-border text-muted hover:text-foreground hover:bg-surface-muted'
              }`}
              title="Aperçu des balises de personnalisation {{firstName}}, etc."
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voir comme un invité</span>
              <span className="sm:hidden">Invité</span>
            </button>
          </div>
        </div>

        <p className="lg:hidden text-center text-xs text-muted">
          Touchez un texte pour le régler. Ajouter et styles sont dans le dock en bas.
        </p>

        <div className="w-full rounded-3xl bg-surface-muted/30 dark:bg-black/20 border border-border/60 p-4 sm:p-8 min-h-[560px] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="flex flex-col items-center w-full gap-4">
 {/* Main Canvas Card */}
 <div 
 style={{
 ...getBackgroundStyle(bgType, bgColor, bgImageUrl, bgPattern),
 ...getStudioPreviewStyle({ canvasSizePreset, canvasWidth, canvasHeight }),
 }}
 className={`border border-border p-3 sm:p-8 shadow-md relative overflow-hidden transition-all duration-300 ${
 frameType === 'arch' ? 'rounded-t-[240px] border border-amber-200/60' : 'rounded-3xl'
 }`}
 >
 {/* Double Border Frame */}
 {frameType === 'double-border' && (
 <>
 <div className="absolute inset-3 border border-amber-500/20 rounded-2xl pointer-events-none" />
 <div className="absolute inset-4 border border-amber-500/10 rounded-2xl pointer-events-none" />
 </>
 )}

 {/* Gold Border Frame */}
 {frameType === 'gold-border' && (
 <div className="absolute inset-3 border border-amber-500/30 rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(197,160,89,0.05)]" />
 )}

 {/* Floral Wreath Frame */}
 {frameType === 'floral-wreath' && (
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
 <svg className="w-80 h-80 text-amber-600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
 <circle cx="50" cy="50" r="35" strokeDasharray="2 2" />
 {[...Array(16)].map((_, i) => {
 const angle = (i * 22.5 * Math.PI) / 180;
 const x = 50 + 35 * Math.cos(angle);
 const y = 50 + 35 * Math.sin(angle);
 return (
 <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 22.5 + 90})`}>
 <path d="M0,0 C-3,-6 0,-10 3,-6 C6,-3 3,0 0,0" fill="currentColor" fillOpacity="0.3" />
 <path d="M0,0 C3,-6 0,-10 -3,-6 C-6,-3 -3,0 0,0" fill="currentColor" fillOpacity="0.3" />
 </g>
 );
 })}
 </svg>
 </div>
 )}

 {/* Floral Arch Frame */}
 {frameType === 'floral-arch' && (
 <div className="absolute inset-0 pointer-events-none z-0">
 <svg className="w-full h-full" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
 <defs>
 <radialGradient id={`floral-arch-grad-${floralColor.replace('#', '')}`} cx="50%" cy="50%" r="50%">
 <stop offset="0%" stopColor={lightenColor(floralColor, 40)} />
 <stop offset="60%" stopColor={floralColor} />
 <stop offset="100%" stopColor={darkenColor(floralColor, 40)} />
 </radialGradient>
 </defs>

 {/* Main Arch branches */}
 <path 
 d="M15,500 Q15,80 200,30 T385,500" 
 stroke={floralType === 'gold-leaves' ? '#d4af37' : '#3f492a'} 
 strokeWidth="3" 
 fill="none" 
 opacity="0.4"
 />
 <path 
 d="M30,500 Q30,100 200,50 T370,500" 
 stroke={floralType === 'gold-leaves' ? '#b59410' : '#2d361e'} 
 strokeWidth="2" 
 fill="none" 
 opacity="0.3"
 />

 {/* Generate dense flowers and leaves along the arch */}
 {[...Array(floralDensity)].map((_, i) => {
 const t = i / (floralDensity - 1);
 // Parabolic arch formula:
 // x goes from 15 to 385
 const x = 15 + t * 370;
 // y is a parabola: high in the middle (y=30), low at the ends (y=480)
 const y = 30 + 4 * (480 - 30) * Math.pow(t - 0.5, 2);

 // Deterministic pseudo-random offsets for organic look
 const seed1 = Math.sin(i * 123.45);
 const seed2 = Math.cos(i * 678.90);
 const offsetX = seed1 * 15;
 const offsetY = seed2 * 15;
 const scale = 0.7 + Math.abs(seed1) * 0.6; // Scale between 0.7 and 1.3
 const rotation = seed2 * 180; // Random rotation

 const px = x + offsetX;
 const py = y + offsetY;

 // Skip some flowers near the bottom to make it cascade naturally (thinner at the bottom)
 const isNearBottom = t < 0.1 || t > 0.9;
 const skipFlower = isNearBottom && (i % 3 === 0);

 return (
 <g key={i} transform={`translate(${px}, ${py}) scale(${scale}) rotate(${rotation})`}>
 {/* Leaves (always render leaves behind flowers) */}
 {floralType !== 'gold-leaves' && (
 <>
 {/* Leaf 1 */}
 <path 
 d="M0,0 C-10,-15 -25,-10 -20,5 C-15,10 -5,5 0,0" 
 fill={floralType === 'eucalyptus' ? '#7d8c5c' : '#4d7c0f'} 
 opacity="0.85" 
 />
 {/* Leaf 2 */}
 <path 
 d="M0,0 C10,-15 25,-10 20,5 C15,10 5,5 0,0" 
 fill={floralType === 'eucalyptus' ? '#92a173' : '#3f6212'} 
 opacity="0.85" 
 />
 </>
 )}

 {/* Specific Flower Types */}
 {!skipFlower && (
 <>
 {floralType === 'roses' && (
 <>
 {/* Red Rose Petals */}
 <circle cx="0" cy="0" r="10" fill={`url(#floral-arch-grad-${floralColor.replace('#', '')})`} />
 <path d="M-6,-4 C-10,-10 -2,-12 -4,-6" fill={darkenColor(floralColor, 15)} opacity="0.9" />
 <path d="M6,-4 C10,-10 2,-12 4,-6" fill={darkenColor(floralColor, 15)} opacity="0.9" />
 <path d="M-6,4 C-10,10 -2,12 -4,6" fill={darkenColor(floralColor, 10)} opacity="0.9" />
 <path d="M6,4 C10,10 2,12 4,6" fill={darkenColor(floralColor, 10)} opacity="0.9" />
 {/* Rose Center */}
 <circle cx="0" cy="0" r="4" fill={darkenColor(floralColor, 30)} />
 <circle cx="0" cy="0" r="2" fill="#fef08a" opacity="0.8" />
 </>
 )}

 {floralType === 'cherry-blossom' && (
 <>
 {/* 5 Blossoms petals */}
 {[...Array(5)].map((_, j) => {
 const angle = (j * 72 * Math.PI) / 180;
 const rx = 8 * Math.cos(angle);
 const ry = 8 * Math.sin(angle);
 return (
 <path 
 key={j}
 d={`M0,0 C${rx * 1.5},${ry * 0.5} ${rx * 1.5},${ry * 1.5} 0,0`} 
 fill={floralColor} 
 stroke={darkenColor(floralColor, 20)}
 strokeWidth="0.5"
 />
 );
 })}
 <circle cx="0" cy="0" r="3" fill="#fef08a" />
 <circle cx="0" cy="0" r="1" fill="#ca8a04" />
 </>
 )}

 {floralType === 'gold-leaves' && (
 <>
 {/* Gold Leaf 1 */}
 <path 
 d="M0,0 C-8,-12 -18,-8 -15,4 C-12,8 -4,4 0,0" 
 fill={floralColor} 
 stroke={darkenColor(floralColor, 20)}
 strokeWidth="0.5"
 />
 {/* Gold Leaf 2 */}
 <path 
 d="M0,0 C8,-12 18,-8 15,4 C12,8 4,4 0,0" 
 fill={lightenColor(floralColor, 20)} 
 stroke={darkenColor(floralColor, 10)}
 strokeWidth="0.5"
 />
 {/* Gold Berries */}
 <circle cx="-2" cy="-6" r="2" fill="#ffffff" stroke={floralColor} strokeWidth="0.5" />
 <circle cx="2" cy="-6" r="1.5" fill="#fef3c7" stroke={floralColor} strokeWidth="0.5" />
 </>
 )}

 {floralType === 'sunflowers' && (
 <>
 {/* Sunflower Petals */}
 {[...Array(12)].map((_, j) => {
 const rot = j * 30;
 return (
 <ellipse 
 key={j}
 cx="0"
 cy="-8"
 rx="3"
 ry="7"
 fill={floralColor}
 transform={`rotate(${rot})`}
 />
 );
 })}
 {/* Center seed head */}
 <circle cx="0" cy="0" r="5" fill="#451a03" />
 <circle cx="0" cy="0" r="4" fill="#1c1917" stroke="#78350f" strokeWidth="0.5" />
 </>
 )}

 {floralType === 'eucalyptus' && (
 <>
 {/* Eucalyptus round leaves */}
 <circle cx="-5" cy="-5" r="8" fill={floralColor} opacity="0.9" />
 <circle cx="5" cy="5" r="7" fill={lightenColor(floralColor, 15)} opacity="0.9" />
 <circle cx="-2" cy="6" r="6" fill={darkenColor(floralColor, 15)} opacity="0.8" />
 {/* White berries */}
 <circle cx="4" cy="-4" r="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
 <circle cx="7" cy="-2" r="1.5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
 </>
 )}
 </>
 )}
 </g>
 );
 })}
 </svg>
 </div>
 )}

 {/* Boho Dried Frame */}
 {frameType === 'boho-dried' && (
 <>
 <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-25 text-amber-800">
 <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
 <path d="M0,0 C20,10 40,30 50,50 C40,45 25,35 0,30 Z" />
 <path d="M0,0 C10,20 30,40 50,50 C45,40 35,25 30,0 Z" />
 <path d="M0,0 C15,15 35,35 50,50 Z" stroke="currentColor" strokeWidth="1" />
 </svg>
 </div>
 <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none opacity-25 text-amber-800 transform rotate-180">
 <svg className="w-full h-full" viewBox="0 0 100 100" fill="currentColor">
 <path d="M0,0 C20,10 40,30 50,50 C40,45 25,35 0,30 Z" />
 <path d="M0,0 C10,20 30,40 50,50 C45,40 35,25 30,0 Z" />
 <path d="M0,0 C15,15 35,35 50,50 Z" stroke="currentColor" strokeWidth="1" />
 </svg>
 </div>
 </>
 )}

 {/* Gold Leaves Circle Frame */}
 {frameType === 'gold-leaves-circle' && (
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
 <svg className="w-80 h-80 text-amber-500" viewBox="0 0 100 100" fill="none">
 <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="0.5" />
 {[...Array(20)].map((_, i) => {
 const angle = (i * 18 * Math.PI) / 180;
 const x = 50 + 38 * Math.cos(angle);
 const y = 50 + 38 * Math.sin(angle);
 return (
 <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 18 + 45})`}>
 <path d="M0,0 C2,-5 6,-7 8,-2 C6,3 2,3 0,0" fill="currentColor" fillOpacity="0.6" />
 <circle cx="-2" cy="-2" r="1" fill="#fef3c7" stroke="currentColor" strokeWidth="0.1" />
 </g>
 );
 })}
 </svg>
 </div>
 )}

 {/* Minimal Leaves Frame */}
 {frameType === 'minimal-leaves' && (
 <>
 <div className="absolute top-4 right-4 w-24 h-24 pointer-events-none opacity-30 text-emerald-800">
 <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
 <path d="M10,90 Q50,50 90,10" />
 <path d="M50,50 Q60,30 75,25 Q65,45 50,50" fill="currentColor" fillOpacity="0.2" />
 <path d="M30,70 Q40,50 55,45 Q45,65 30,70" fill="currentColor" fillOpacity="0.2" />
 <path d="M70,30 Q80,10 95,5 Q85,25 70,30" fill="currentColor" fillOpacity="0.2" />
 </svg>
 </div>
 <div className="absolute bottom-4 left-4 w-24 h-24 pointer-events-none opacity-30 text-emerald-800 transform rotate-180">
 <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
 <path d="M10,90 Q50,50 90,10" />
 <path d="M50,50 Q60,30 75,25 Q65,45 50,50" fill="currentColor" fillOpacity="0.2" />
 <path d="M30,70 Q40,50 55,45 Q45,65 30,70" fill="currentColor" fillOpacity="0.2" />
 <path d="M70,30 Q80,10 95,5 Q85,25 70,30" fill="currentColor" fillOpacity="0.2" />
 </svg>
 </div>
 </>
 )}

                {/* Art Déco Gatsby Frame */}
                {frameType === 'art-deco' && (
                  <div className="absolute inset-0 pointer-events-none z-0">
                    <svg className="w-full h-full text-amber-500" viewBox="0 0 400 600" fill="none" preserveAspectRatio="none">
                      <path d="M20,50 L20,20 L50,20 M350,20 L380,20 L380,50 M380,550 L380,580 L350,580 M50,580 L20,580 L20,550" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />
                      <rect x="26" y="26" width="348" height="548" stroke="currentColor" strokeWidth="0.8" strokeDasharray="6 3" opacity="0.4" />
                      <rect x="32" y="32" width="336" height="536" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
                      <g transform="translate(200, 32)">
                        <path d="M-30,0 L0,-16 L30,0 L0,16 Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" />
                        <line x1="-80" y1="0" x2="-35" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                        <line x1="35" y1="0" x2="80" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                        <circle cx="0" cy="0" r="3" fill="currentColor" />
                      </g>
                      <g transform="translate(200, 568)">
                        <path d="M-30,0 L0,-16 L30,0 L0,16 Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" />
                        <line x1="-80" y1="0" x2="-35" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                        <line x1="35" y1="0" x2="80" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                        <circle cx="0" cy="0" r="3" fill="currentColor" />
                      </g>
                      <path d="M20,20 L45,45 M380,20 L355,45 M20,580 L45,555 M380,580 L355,555" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                    </svg>
                  </div>
                )}

                {/* Deckled Edge Frame (Papier artisanal à bords frangés) */}
                {frameType === 'deckled' && (
                  <div className="absolute inset-2 border-2 border-dashed border-amber-600/35 rounded-2xl pointer-events-none shadow-[inset_0_0_24px_rgba(197,160,89,0.12)]">
                    <div className="absolute inset-1.5 border border-amber-500/25 rounded-xl" />
                  </div>
                )}

                {/* Embossed Arch Frame (Gaufrage à sec architectural) */}
                {frameType === 'embossed-arch' && (
                  <div className="absolute inset-3 rounded-t-[min(200px,36vw)] rounded-b-2xl pointer-events-none border border-black/5 dark:border-white/10 shadow-[inset_0_2px_5px_rgba(255,255,255,0.7),inset_0_-2px_5px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]">
                    <div className="absolute inset-2 rounded-t-[min(190px,34vw)] rounded-b-xl border border-black/5 dark:border-white/5 opacity-60" />
                  </div>
                )}

                {/* Passport VIP Frame */}
                {frameType === 'passport-vip' && (
                  <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute inset-3 border-2 border-amber-500/40 rounded-xl" />
                    <div className="absolute inset-4 border border-amber-500/25 rounded-lg border-dashed" />
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 text-amber-500/70 text-[9px] font-black uppercase tracking-[0.25em] whitespace-nowrap">
                      <span>★</span>
                      <span>PASS OFFICIEL VIP</span>
                      <span>★</span>
                    </div>
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 text-amber-500/50 text-[8px] font-mono tracking-widest whitespace-nowrap">
                      <span>№ 2026-VIP-OFFICIAL</span>
                    </div>
                  </div>
                )}

                {/* Frosted Glass Frame */}
                {frameType === 'frosted-glass' && (
                  <div className="absolute inset-2 rounded-2xl border border-white/60 dark:border-white/20 bg-white/20 dark:bg-white/5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] pointer-events-none" />
 )}

 {/* Boho Botanical Corners */}
 {bgPattern === 'boho' && (
 <>
 {/* Top-Left Branch */}
 <svg className="absolute top-2 left-2 w-20 h-24 text-amber-800/15 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M10,10 C30,15 60,35 70,70" />
 <path d="M25,14 C22,22 18,28 12,30 C18,26 24,22 28,15" fill="currentColor" fillOpacity="0.1" />
 <path d="M40,22 C38,32 32,40 24,44 C32,38 38,30 42,24" fill="currentColor" fillOpacity="0.1" />
 <path d="M55,35 C52,45 45,52 36,56 C45,50 52,42 56,36" fill="currentColor" fillOpacity="0.1" />
 <path d="M65,52 C62,62 55,68 46,72 C55,66 62,58 66,53" fill="currentColor" fillOpacity="0.1" />
 </svg>
 {/* Bottom-Right Branch */}
 <svg className="absolute bottom-2 right-2 w-20 h-24 text-amber-800/15 pointer-events-none transform rotate-180" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M10,10 C30,15 60,35 70,70" />
 <path d="M25,14 C22,22 18,28 12,30 C18,26 24,22 28,15" fill="currentColor" fillOpacity="0.1" />
 <path d="M40,22 C38,32 32,40 24,44 C32,38 38,30 42,24" fill="currentColor" fillOpacity="0.1" />
 <path d="M55,35 C52,45 45,52 36,56 C45,50 52,42 56,36" fill="currentColor" fillOpacity="0.1" />
 <path d="M65,52 C62,62 55,68 46,72 C55,66 62,58 66,53" fill="currentColor" fillOpacity="0.1" />
 </svg>
 </>
 )}

 {/* Elements Grid Container */}
 <div
 ref={freeCanvasRef}
 className={
 layoutMode === 'free'
 ? 'absolute inset-0 z-10 w-full h-full'
 : 'relative z-10 flex flex-wrap gap-y-4 -mx-2'
 }
 onPointerMove={handleFreePointerMove}
 onPointerUp={handleFreePointerUp}
 onPointerLeave={handleFreePointerUp}
 >
 {canvasElements.length === 0 ? (
            <div className="w-full text-center py-16 px-6 rounded-2xl border border-dashed border-border/80 bg-surface/50 backdrop-blur-xs flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1 text-center max-w-sm">
                <p className="text-sm font-bold text-foreground">La carte est vide</p>
                <p className="text-xs text-muted leading-relaxed">
                  Ajoutez un texte, ou créez avec l’IA depuis le panneau de gauche.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {canUseCustomTemplates && (
                  <button
                    type="button"
                    onClick={() => openAiComposeModal()}
                    className="inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)] bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" aria-hidden />
                    Créer avec l’IA
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAddElement('text')}
                  className="inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface hover:bg-surface-muted text-foreground text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" aria-hidden />
                  Ajouter un texte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const themeFonts = getFontTheme(fontTheme);
                    const palette = importedPalette || invitationColorThemes(tenant?.branding)[0].palette;
                    const baseId = Date.now();
                    const presets: CanvasElement[] = [
                      {
                        id: `${baseId}-t`,
                        type: 'text',
                        text: '{{title}}',
                        color: palette.primary,
                        fontSize: '28px',
                        align: 'center',
                        width: 'full',
                        fontFamily: themeFonts.titleFont,
                        bold: true,
                        ...(layoutMode === 'free'
                          ? { positionMode: 'absolute' as const, xPct: 8, yPct: 14, wPct: 84, zIndex: 1 }
                          : { positionMode: 'flow' as const }),
                      },
                      {
                        id: `${baseId}-d`,
                        type: 'text',
                        text: '{{date}} · {{location}}',
                        color: palette.secondary,
                        fontSize: '14px',
                        align: 'center',
                        width: 'full',
                        fontFamily: themeFonts.bodyFont,
                        ...(layoutMode === 'free'
                          ? { positionMode: 'absolute' as const, xPct: 8, yPct: 32, wPct: 84, zIndex: 2 }
                          : { positionMode: 'flow' as const }),
                      },
                      {
                        id: `${baseId}-b`,
                        type: 'button',
                        text: 'Confirmer ma présence',
                        color: palette.accent,
                        fontSize: '14px',
                        align: 'center',
                        width: 'full',
                        buttonStyle: 'filled',
                        buttonLink: '#rsvp-section',
                        ...(layoutMode === 'free'
                          ? { positionMode: 'absolute' as const, xPct: 20, yPct: 68, wPct: 60, zIndex: 3 }
                          : { positionMode: 'flow' as const }),
                      },
                    ];
                    setCanvasElements((prev) => [...prev, ...presets]);
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface hover:bg-surface-muted text-foreground text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
                  Modèle tout prêt
                </button>
              </div>
 </div>
 ) : (
 canvasElements
 .filter((el) => !(el.type === 'rsvp-block' && el.rsvpPlacement === 'outside'))
 .map((el, index) => {
 const isSelected = selectedElementId === el.id;
 const isFree = layoutMode === 'free' || el.positionMode === 'absolute';
 const widthClass = isFree
 ? ''
 : el.width === 'half'
 ? 'w-1/2 px-2'
 : el.width === 'third'
 ? 'w-1/3 px-2'
 : 'w-full px-2';
 
 return (
 <div 
 key={el.id}
 onClick={(e) => { e.stopPropagation(); handleElementSelect(el.id); }}
 onPointerDown={(e) => isFree && handleFreePointerDown(el.id, e)}
 className={`${widthClass} group transition cursor-pointer relative ${isFree ? 'touch-none' : ''}`}
 style={
 isFree
 ? {
 position: 'absolute',
 left: `${el.xPct ?? 8}%`,
 top: `${el.yPct ?? 8}%`,
 width: `${el.wPct ?? 84}%`,
 zIndex: el.zIndex ?? index + 1,
 }
 : undefined
 }
 >
                    <div className={`${el.type === 'image' && isFree && !isSelected ? 'p-0' : 'p-2.5'} rounded-xl border transition ${isSelected ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20' : 'border-dashed border-transparent hover:border-border/60'}`}>
 {/* Element Controls (Delete & Reorder) */}
                      <div className={`absolute -top-3.5 right-2 flex items-center gap-1 z-20 transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
 {/* Move Up */}
 {index > 0 && (
 <button 
                            type="button"
 onClick={(e) => handleMoveElementUp(index, e)}
                            className="bg-surface text-foreground hover:bg-primary hover:text-white dark:bg-surface-elevated border border-border shadow-xs p-1.5 rounded-lg transition cursor-pointer"
 title="Déplacer vers le haut"
 >
                            <ArrowUp className="w-3.5 h-3.5" />
 </button>
 )}
 {/* Move Down */}
 {index < canvasElements.length - 1 && (
 <button 
                            type="button"
 onClick={(e) => handleMoveElementDown(index, e)}
                            className="bg-surface text-foreground hover:bg-primary hover:text-white dark:bg-surface-elevated border border-border shadow-xs p-1.5 rounded-lg transition cursor-pointer"
 title="Déplacer vers le bas"
 >
                            <ArrowDown className="w-3.5 h-3.5" />
 </button>
 )}
 <button
                          type="button"
 onClick={(e) => {
 e.stopPropagation();
 const clone = { ...el, id: `${Date.now()}` };
 if (isFree) {
 clone.xPct = Math.min(88, (el.xPct ?? 8) + 4);
 clone.yPct = Math.min(88, (el.yPct ?? 8) + 4);
 }
 setCanvasElements((prev) => [...prev, clone]);
 setSelectedElementId(clone.id);
 }}
                          className="bg-surface text-foreground hover:bg-primary hover:text-white dark:bg-surface-elevated border border-border shadow-xs p-1.5 rounded-lg transition cursor-pointer"
 title="Dupliquer"
 >
                          <Copy className="w-3.5 h-3.5" />
 </button>
 {/* Delete */}
 <button 
                          type="button"
 onClick={(e) => {
 e.stopPropagation();
                            handleDeleteElement(el.id);
 }}
                          className="bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-lg shadow-xs transition cursor-pointer"
 title="Supprimer cet élément"
 >
                          <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 {isFree && isSelected && (
 <input
 type="range"
 min={20}
 max={100}
 value={el.wPct ?? 84}
 onClick={(e) => e.stopPropagation()}
 onChange={(e) => {
 const wPct = Number(e.target.value);
 setCanvasElements((prev) =>
 prev.map((item) => (item.id === el.id ? { ...item, wPct, positionMode: 'absolute' } : item)),
 );
 }}
 className="absolute -bottom-3 left-2 right-2 h-1 accent-[var(--primary)] cursor-ew-resize z-20"
 title="Largeur (%)"
 />
 )}

 {el.type === 'text' && (
 <div 
 style={{ 
 color: el.color, 
 fontSize: el.fontSize, 
 textAlign: el.align,
 fontFamily: el.fontFamily || 'Cormorant Garamond',
 letterSpacing: el.letterSpacing || 'normal',
 fontWeight: el.bold ? 'bold' : 'normal',
 fontStyle: el.italic ? 'italic' : 'normal'
 }}
 className="leading-relaxed break-words whitespace-pre-line"
 >
 {showGuestPreview ? substitutePreviewVars(el.text) : el.text}
 </div>
 )}

 {el.type === 'button' && (
 <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
 <button 
 style={{ 
 backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color, 
 color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color : '#ffffff',
 borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color : 'transparent',
 fontSize: el.fontSize,
 fontFamily: el.fontFamily || 'Cormorant Garamond',
 letterSpacing: el.letterSpacing || 'normal',
 fontWeight: el.bold ? 'bold' : 'normal',
 fontStyle: el.italic ? 'italic' : 'normal'
 }}
 className={`pointer-events-none transition-all flex items-center gap-1.5 ${
 el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2' :
 el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
 el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
 el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
 el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none' :
 'px-6 py-2.5 rounded-xl shadow-md'
 }`}
 >
 {showGuestPreview ? substitutePreviewVars(el.text) : el.text}
 {el.buttonLink && (
 <span className="text-xs opacity-80" title={`Lien : ${el.buttonLink}`}>🔗</span>
 )}
 </button>
 </div>
 )}

 {el.type === 'image' && (
 <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
 {el.imageUrl ? (
 <img 
 src={el.imageUrl} 
 alt="Invitation" 
 style={{ width: el.imageWidth || '100%', height: el.imageHeight || 'auto', objectFit: el.imageObjectFit || 'cover', ...templateImageStyleExtra(el.imageStyle) }}
 className={templateImageStyleClass(el.imageStyle)}
 />
 ) : (
 <label 
 style={{ width: el.imageWidth || '100%', height: el.imageHeight || '150px', ...templateImageStyleExtra(el.imageStyle) }}
 className={`bg-surface-muted flex flex-col items-center justify-center text-muted gap-2 p-4 cursor-pointer hover:bg-surface-muted/50 transition ${templateImageStyleClass(el.imageStyle)}`}
 >
 <input 
 type="file" 
 accept="image/*"
 disabled={imageUploading}
 onChange={async (e) => {
 e.stopPropagation();
 const file = e.target.files?.[0];
 e.target.value = '';
 if (!file) return;
 try {
 const url = await uploadToCloudinary(file);
 setCanvasElements(canvasElements.map(item => {
 if (item.id === el.id) {
 return { ...item, imageUrl: url };
 }
 return item;
 }));
 handleElementSelect(el.id);
 setElImageUrl(url);
 } catch (err: any) {
 setError(err.message || 'Échec upload image.');
 }
 }}
 className="hidden"
 />
 {imageUploading ? (
 <Loader2 className="w-8 h-8 text-primary animate-spin" />
 ) : (
 <Image className="w-8 h-8 text-muted" />
 )}
 <span className="text-xs font-semibold">{el.text}</span>
 <span className="text-xs text-primary font-bold">Cliquez pour importer</span>
 </label>
 )}
 </div>
 )}

 {el.type === 'divider' && (
 <div className={`flex items-center justify-center gap-3 py-2 text-${el.align}`}>
 {el.dividerStyle === 'solid' && (
 <div className="w-full border-t" style={{ borderColor: el.color }} />
 )}
 {el.dividerStyle === 'dashed' && (
 <div className="w-full border-t border-dashed" style={{ borderColor: el.color }} />
 )}
 {el.dividerStyle === 'ornament-flower' && (
 <>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 <span style={{ color: el.color }} className="text-sm select-none">❀</span>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 </>
 )}
 {el.dividerStyle === 'ornament-diamond' && (
 <>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 <span style={{ color: el.color }} className="text-xs tracking-widest select-none">✦ ❖ ✦</span>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 </>
 )}
 {el.dividerStyle === 'ornament-star' && (
 <>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 <span style={{ color: el.color }} className="text-sm select-none">✦</span>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 </>
 )}
 {el.dividerStyle === 'ornament-leaves' && (
 <>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 <span style={{ color: el.color }} className="text-sm select-none">🌿 ❀ 🌿</span>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 </>
 )}
 {el.dividerStyle === 'ornament-lace' && (
 <>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 <span style={{ color: el.color }} className="text-xs tracking-widest select-none">⚜ ⚜ ⚜</span>
 <div className="flex-1 border-t" style={{ borderColor: el.color }} />
 </>
 )}
 </div>
 )}

 {el.type === 'curve' && (
 <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-1`}>
 <svg className="w-full max-w-[300px]" height="30" viewBox="0 0 300 30" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path 
 d={
 el.curveStyle === 'arc' ? "M10,25 Q 150,2, 290,25" :
 el.curveStyle === 'flourish-1' ? "M30,15 C70,5 110,25 150,15 C190,5 230,25 270,15 M30,15 C20,15 15,10 20,5 C25,0 35,10 30,15 M270,15 C280,15 285,10 280,5 C275,0 265,10 270,15" :
 el.curveStyle === 'flourish-2' ? "M10,15 L110,15 C120,15 125,5 135,5 C145,5 145,25 150,25 C155,25 155,5 165,5 C175,5 180,15 190,15 L290,15" :
 el.curveStyle === 'spiral' ? "M150,15 C120,15 100,25 80,25 C60,25 50,15 60,10 C70,5 80,20 70,22 C65,23 60,15 65,13 M150,15 C180,15 200,25 220,25 C240,25 250,15 240,10 C230,5 220,20 230,22 C235,23 240,15 235,13" :
 el.curveStyle === 'infinity' ? "M110,15 C110,25 130,25 150,15 C170,5 190,5 190,15 C190,25 170,25 150,15 C130,5 110,5 110,15 Z" :
 "M0 15 Q 75 0, 150 15 T 300 15"
 } 
 stroke={el.color || '#cbd5e1'} 
 strokeWidth={el.strokeWidth || '3px'} 
 fill="none" 
 />
 </svg>
 </div>
 )}

 {el.type === 'triangle' && (
 <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-1`}>
 <svg 
 width={el.shapeSize || '60px'} 
 height={el.shapeSize || '60px'} 
 viewBox="0 0 100 100" 
 xmlns="http://www.w3.org/2000/svg"
 >
 <polygon points="50,15 90,85 10,85" fill={el.color || '#cbd5e1'} />
 </svg>
 </div>
 )}

 {el.type === 'rsvp-block' && (
              <div className="bg-surface/85 backdrop-blur-sm border border-border rounded-2xl p-5 space-y-4 pointer-events-none shadow-sm">
 <div className="font-bold text-foreground text-center text-sm">{el.text}</div>
 
 {/* Render customizable fields preview */}
 {el.rsvpFields && el.rsvpFields.length > 0 && (
 <div className="space-y-3 border-t border-b border-border/60 py-3 text-left">
 {el.rsvpFields.map((field) => (
 <div key={field.id} className="space-y-1">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">
 {field.label} {field.required && <span className="text-rose-500">*</span>}
 </label>
 {field.type === 'text' && (
                          <div className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-muted">
 Zone de texte
 </div>
 )}
 {field.type === 'select' && (
                          <div className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-muted flex justify-between items-center">
 <span>{field.options ? field.options.split(',')[0].trim() : 'Option 1'}</span>
                            <span className="text-xs text-muted">▼</span>
 </div>
 )}
 {field.type === 'checkbox' && (
 <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border border-border bg-surface rounded" />
 <span className="text-xs text-muted font-medium">{field.label}</span>
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 <div className="flex gap-2 justify-center">
                  <div className="px-4 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-muted">Je serai présent</div>
                  <div className="px-4 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-muted">Je serai absent</div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>

 {canvasElements.some((el) => el.type === 'rsvp-block' && el.rsvpPlacement === 'outside') && (
          <div className="w-full space-y-3" style={{ maxWidth: 'min(100%, 42rem)' }}>
            <p className="text-center text-xs font-bold uppercase tracking-wider text-primary">
              Formulaire de réponse à l’invitation sous la carte
 </p>
 {canvasElements
 .filter((el) => el.type === 'rsvp-block' && el.rsvpPlacement === 'outside')
 .map((el) => (
 <div
 key={el.id}
 onClick={(e) => { e.stopPropagation(); handleElementSelect(el.id); }}
 className={`rounded-2xl border-2 border-dashed p-5 cursor-pointer transition ${
 selectedElementId === el.id
 ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-primary/30 bg-surface hover:border-primary/50'
 }`}
                  style={{ width: '100%' }}
 >
 <div className="text-xs font-bold text-primary text-center mb-3">{el.text || 'Confirmer votre présence'}</div>
 <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-400 text-center">Oui</div>
                    <div className="py-2 rounded-xl border border-border bg-surface-muted text-xs font-bold text-muted text-center">Non</div>
 </div>
 {el.rsvpFields && el.rsvpFields.length > 0 && (
                    <p className="text-xs text-muted text-center">
 {el.rsvpFields.length} champ{el.rsvpFields.length > 1 ? 's' : ''} personnalisé{el.rsvpFields.length > 1 ? 's' : ''}
 </p>
 )}
 </div>
 ))}
 </div>
 )}
        </div>
        </div>
 </div>

 {/* Right Properties Panel */}
 <aside className={cn(
  'order-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto overscroll-contain bg-surface border border-border rounded-[var(--radius-card)] p-4 space-y-4',
  mobilePane === 'inspect' ? 'max-lg:block' : 'max-lg:hidden',
 )}>
 {selectedElementId ? (
 // Element Properties Panel
        <div className="space-y-4">
          {(() => {
            const activeEl = canvasElements.find((e) => e.id === selectedElementId);
            const typeLabel = 
              activeEl?.type === 'text' ? 'Texte' :
              activeEl?.type === 'button' ? 'Bouton' :
              activeEl?.type === 'image' ? 'Image' :
              activeEl?.type === 'divider' ? 'Séparateur' :
              activeEl?.type === 'rsvp-block' ? 'Formulaire de réponse à l’invitation' :
              activeEl?.type === 'curve' ? 'Courbe décorative' :
              activeEl?.type === 'triangle' ? 'Triangle' : 'Élément';
            
            return (
              <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    {activeEl?.type === 'text' && <Type className="w-4 h-4" />}
                    {activeEl?.type === 'button' && <Columns className="w-4 h-4" />}
                    {activeEl?.type === 'image' && <Image className="w-4 h-4" />}
                    {activeEl?.type === 'divider' && <Palette className="w-4 h-4" />}
                    {activeEl?.type === 'rsvp-block' && <CheckSquare className="w-4 h-4" />}
                    {activeEl?.type === 'curve' && <Spline className="w-4 h-4" />}
                    {activeEl?.type === 'triangle' && <Triangle className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-foreground truncate">{typeLabel}</span>
                    <span className="block text-xs text-muted">Réglages de cet élément</span>
                  </div>
                </div>
 <button 
                  type="button"
                  onClick={() => {
                    setSelectedElementId(null);
                    setStudioRail('style');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer shrink-0"
                  title="Revenir aux réglages de la carte"
                >
                  <span>Carte</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            );
          })()}

 <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-muted border border-border" role="tablist" aria-label="Profondeur des propriétés">
 <button
 type="button"
 role="tab"
 aria-selected={!propsAdvanced}
 onClick={() => setPropsAdvanced(false)}
 className={`py-1.5 rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
 !propsAdvanced ? 'bg-surface text-foreground shadow-sm' : 'text-muted'
 }`}
 >
 Essentiel
 </button>
 <button
 type="button"
 role="tab"
 aria-selected={propsAdvanced}
 onClick={() => setPropsAdvanced(true)}
 className={`py-1.5 rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
 propsAdvanced ? 'bg-surface text-foreground shadow-sm' : 'text-muted'
 }`}
 >
 Options avancées
 </button>
 </div>

 {/* Text input */}
 {['text', 'button', 'image', 'rsvp-block'].includes(canvasElements.find(e => e.id === selectedElementId)?.type || '') && (
 <div className="space-y-1.5">
 <div className="flex justify-between items-center">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">
 {canvasElements.find(e => e.id === selectedElementId)?.type === 'image' ? "Texte alternatif" :
 canvasElements.find(e => e.id === selectedElementId)?.type === 'rsvp-block' ? "Titre de réponse" :
 "Texte"}
 </label>
 {canvasElements.find(e => e.id === selectedElementId)?.type === 'text' && (
 <span className="text-xs text-primary font-bold uppercase tracking-wider">
 {'{{firstName}}'}
 </span>
 )}
 </div>
 <textarea 
 value={elText}
 onChange={(e) => handlePropertyChange('text', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition h-20 resize-none"
 placeholder={canvasElements.find(e => e.id === selectedElementId)?.type === 'text' ? "Ex: Vous êtes invité au {{title}}…" : ""}
 />
 </div>
 )}

 {/* Color + size + align — essential */}
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted uppercase tracking-wider block">
 {canvasElements.find(e => e.id === selectedElementId)?.type === 'button' ? "Couleur du bouton" :
 canvasElements.find(e => e.id === selectedElementId)?.type === 'curve' ? "Couleur du trait" :
 canvasElements.find(e => e.id === selectedElementId)?.type === 'triangle' ? "Couleur de remplissage" :
 "Couleur"}
 </label>
 <div className="flex gap-2">
 <input
 type="color"
 value={elColor.startsWith('#') ? elColor : '#059669'}
 onChange={(e) => handlePropertyChange('color', e.target.value)}
 className="w-8 h-8 rounded-lg border border-border cursor-pointer overflow-hidden p-0"
 />
 <input
 type="text"
 value={elColor}
 onChange={(e) => handlePropertyChange('color', e.target.value)}
 className="flex-1 px-3 py-1.5 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition font-mono"
 />
 </div>
 </div>

 {['text', 'button'].includes(canvasElements.find(e => e.id === selectedElementId)?.type || '') && (
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Taille</label>
 <select 
 value={elFontSize}
 onChange={(e) => handlePropertyChange('fontSize', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="12px">Petite (12px)</option>
 <option value="14px">Normale (14px)</option>
 <option value="16px">Moyenne (16px)</option>
 <option value="20px">Grande (20px)</option>
 <option value="24px">Titre 3 (24px)</option>
 <option value="28px">Titre 2 (28px)</option>
 <option value="32px">Titre 1 (32px)</option>
 <option value="36px">Titre XL (36px)</option>
 </select>
 </div>
 )}

 {['text', 'button'].includes(canvasElements.find(e => e.id === selectedElementId)?.type || '') && (
 <div className="flex gap-4">
 <label className="flex items-center gap-2 cursor-pointer text-xs text-muted font-semibold select-none">
 <input 
 type="checkbox" 
 checked={elBold}
 onChange={(e) => handlePropertyChange('bold', e.target.checked)}
 className="rounded text-primary focus:ring-primary"
 />
 Gras
 </label>
 <label className="flex items-center gap-2 cursor-pointer text-xs text-muted font-semibold select-none">
 <input 
 type="checkbox" 
 checked={elItalic}
 onChange={(e) => handlePropertyChange('italic', e.target.checked)}
 className="rounded text-primary focus:ring-primary"
 />
 Italique
 </label>
 </div>
 )}

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Alignement</label>
 <div className="grid grid-cols-3 gap-2">
 {['left', 'center', 'right'].map((align) => (
 <button
 key={align}
 type="button"
 onClick={() => handlePropertyChange('align', align)}
 className={`py-1.5 border rounded-lg text-xs font-bold capitalize transition ${elAlign === align ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:bg-surface-muted'}`}
 >
 {align === 'left' ? 'gauche' : align === 'right' ? 'droite' : 'centré'}
 </button>
 ))}
 </div>
 </div>

 {/* Button essentials */}
 {canvasElements.find(e => e.id === selectedElementId)?.type === 'button' && (
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Style de bouton</label>
 <select 
 value={elButtonStyle}
 onChange={(e) => handlePropertyChange('buttonStyle', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="filled">Plein</option>
 <option value="outline">Contour</option>
 <option value="pill">Pilule</option>
 <option value="gold-glow">Or lumineux</option>
 <option value="double-border">Double bordure</option>
 <option value="minimalist">Minimaliste</option>
 </select>
 </div>
 )}

 {canvasElements.find(e => e.id === selectedElementId)?.type === 'divider' && (
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Style du séparateur</label>
 <select
 value={elDividerStyle}
 onChange={(e) => handlePropertyChange('dividerStyle', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="solid">Ligne continue</option>
 <option value="dashed">Ligne pointillée</option>
 <option value="ornament-flower">Ornement Fleur</option>
 <option value="ornament-diamond">Ornement Losange</option>
 <option value="ornament-star">Ornement Étoile</option>
 <option value="ornament-leaves">Ornement Feuillage</option>
 <option value="ornament-lace">Ornement Dentelle</option>
 </select>
 </div>
 )}

 {canvasElements.find(e => e.id === selectedElementId)?.type === 'image' && (
 <div className="space-y-3">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Importer une image</label>
 <input
 type="file"
 accept="image/*"
 onChange={handleImageUpload}
 className="w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/15 cursor-pointer"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">URL</label>
 <input 
 type="text"
 value={elImageUrl}
 onChange={(e) => handlePropertyChange('imageUrl', e.target.value)}
 placeholder="https://…"
 className="w-full px-3 py-1.5 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 />
 </div>
 {elImageUrl && (
 <button
 type="button"
 onClick={() => handleOpenCropper('element')}
 className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-primary/10 hover:bg-primary/15 text-primary font-bold rounded-xl text-xs transition border border-primary/20"
 >
 <Crop className="w-3.5 h-3.5" />
 Recadrer
 </button>
 )}
 </div>
 )}

 {canvasElements.find(e => e.id === selectedElementId)?.type === 'rsvp-block' && (
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Emplacement</label>
 <div className="grid grid-cols-2 gap-2">
 {[
 { id: 'inline' as const, label: 'Dans la carte' },
 { id: 'outside' as const, label: 'Sous la carte' },
 ].map((opt) => (
 <button
 key={opt.id}
 type="button"
 onClick={() => handlePropertyChange('rsvpPlacement', opt.id)}
 className={`py-2 px-2 border rounded-xl text-[11px] font-bold transition ${
 elRsvpPlacement === opt.id
 ? 'border-primary bg-primary/10 text-primary'
 : 'border-border text-muted hover:bg-surface-muted'
 }`}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>
 )}

 {canvasElements.find(e => e.id === selectedElementId)?.type === 'rsvp-block' && (
 <div className="space-y-3 border-t border-border pt-3">
 <div className="flex items-center justify-between gap-2">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Formulaire</label>
 <button
 type="button"
 onClick={handleEnsureReportingRsvpFields}
 className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 title="Ajoute les champs menu, accompagnant et nombre de personnes s’ils manquent"
 >
 Compléter stats
 </button>
 </div>
 <div className="max-h-[28rem] overflow-y-auto overscroll-contain pr-1">
 <RsvpFieldTypeEditor
 fields={elRsvpFields}
 onChange={(next) => handlePropertyChange('rsvpFields', next)}
 />
 </div>
 </div>
 )}

 {canvasElements.find(e => e.id === selectedElementId)?.type === 'curve' && (
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Style de courbe</label>
 <select 
 value={elCurveStyle}
 onChange={(e) => handlePropertyChange('curveStyle', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="wave">Vague douce</option>
 <option value="arc">Arche fine</option>
 <option value="flourish-1">Volute florale</option>
 <option value="flourish-2">Ornement baroque</option>
 <option value="spiral">Spirale</option>
 <option value="infinity">Nœud infini</option>
 </select>
 </div>
 )}

 {/* Advanced element props */}
 {propsAdvanced && (
 <div className="space-y-4 border-t border-border-subtle pt-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Largeur</label>
 <select 
 value={elWidth}
 onChange={(e) => handlePropertyChange('width', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="full">Pleine (100%)</option>
 <option value="half">Demi (50%)</option>
 <option value="third">Tiers (33%)</option>
 </select>
 </div>

 {['text', 'button'].includes(canvasElements.find(e => e.id === selectedElementId)?.type || '') && (
 <>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Police</label>
 <select
 value={elFontFamily}
 onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 {fontFamilies.map(font => (
 <option key={font.id} value={font.id}>{font.label}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Espacement lettres</label>
 <select
 value={elLetterSpacing}
 onChange={(e) => handlePropertyChange('letterSpacing', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 {letterSpacings.map(spacing => (
 <option key={spacing.id} value={spacing.id}>{spacing.label}</option>
 ))}
 </select>
 </div>
 </>
 )}

 {canvasElements.find(e => e.id === selectedElementId)?.type === 'button' && (
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Lien (URL)</label>
 <input 
 type="text" 
 value={elButtonLink}
 onChange={(e) => handlePropertyChange('buttonLink', e.target.value)}
 placeholder="https://… ou {{rsvpLink}}"
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 />
 </div>
 )}

 {canvasElements.find(e => e.id === selectedElementId)?.type === 'image' && (
 <>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Style d'image</label>
 <select
 value={elImageStyle}
 onChange={(e) => handlePropertyChange('imageStyle', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 {TEMPLATE_IMAGE_STYLES.map((style) => (
 <option key={style.id} value={style.id}>{style.label}</option>
 ))}
 </select>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Largeur</label>
 <input 
 type="text" 
 value={elImageWidth}
 onChange={(e) => handlePropertyChange('imageWidth', e.target.value)}
 placeholder="100%"
 className="w-full px-3 py-1.5 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Hauteur</label>
 <input 
 type="text" 
 value={elImageHeight}
 onChange={(e) => handlePropertyChange('imageHeight', e.target.value)}
 placeholder="200px"
 className="w-full px-3 py-1.5 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 />
 </div>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Mode d'affichage</label>
 <select 
 value={elImageObjectFit}
 onChange={(e) => handlePropertyChange('imageObjectFit', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="cover">Cover</option>
 <option value="contain">Contain</option>
 <option value="fill">Fill</option>
 <option value="none">None</option>
 </select>
 </div>
 </>
 )}

 {canvasElements.find(e => e.id === selectedElementId)?.type === 'curve' && (
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Épaisseur</label>
 <select 
 value={elStrokeWidth}
 onChange={(e) => handlePropertyChange('strokeWidth', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="1px">Fin (1px)</option>
 <option value="2px">Normal (2px)</option>
 <option value="3px">Moyen (3px)</option>
 <option value="5px">Épais (5px)</option>
 <option value="8px">Très épais (8px)</option>
 </select>
 </div>
 )}

 {canvasElements.find(e => e.id === selectedElementId)?.type === 'triangle' && (
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Taille</label>
 <select 
 value={elShapeSize}
 onChange={(e) => handlePropertyChange('shapeSize', e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="30px">Petit</option>
 <option value="45px">Moyen</option>
 <option value="60px">Grand</option>
 <option value="80px">Très grand</option>
 <option value="120px">Géant</option>
 </select>
 </div>
 )}

 <div className="space-y-1">
 <span className="text-xs font-bold text-muted uppercase tracking-wider">Palette rapide</span>
 <div className="flex flex-wrap gap-1.5">
 {[
 { hex: '#c5a059', name: 'Or' },
 { hex: '#7d8c5c', name: 'Sauge' },
 { hex: '#6b1d2f', name: 'Bourgogne' },
 { hex: '#1d2d44', name: 'Nuit' },
 { hex: '#e8c5c8', name: 'Rose' },
 { hex: '#b05a47', name: 'Terracotta' },
 { hex: '#1e293b', name: 'Ardoise' },
 { hex: '#faf6f0', name: 'Ivoire' },
 ].map((c) => (
 <button
 key={c.hex}
 type="button"
 onClick={() => handlePropertyChange('color', c.hex)}
 className="w-6 h-6 rounded-full border border-border shadow-sm transition hover:scale-110"
 style={{ backgroundColor: c.hex }}
 title={c.name}
 />
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 ) : (
 // Global Style Panel
 <div className="space-y-5">
 <div className="border-b border-border-subtle pb-2">
 <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
 <Palette className="w-4 h-4 text-primary" /> Style de la carte
 </h3>
 <p className="text-xs text-muted mt-1">
 Les thèmes et la typographie se règlent dans l&apos;onglet Style à gauche.
 </p>
 </div>

 {isSuperAdmin && !selectedTenantId && (
 <div className="space-y-3 p-3 rounded-2xl border border-primary/20 bg-primary/5">
 <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
 <Globe className="w-3.5 h-3.5" />
 Page d&apos;accueil publique
 </h4>
 <label className="flex items-center justify-between gap-3 cursor-pointer">
 <span className="text-xs font-semibold text-foreground">Afficher ce modèle sur la page d&apos;accueil du site</span>
 <button
 type="button"
 role="switch"
 aria-checked={showOnLanding}
 aria-label="Afficher sur la page d'accueil du site"
 onClick={() => setShowOnLanding((v) => !v)}
 className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${showOnLanding ? 'bg-primary' : 'bg-surface-muted'}`}
 >
 <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${showOnLanding ? 'translate-x-5' : 'translate-x-0'}`} />
 </button>
 </label>
 <div className="space-y-1.5">
 <label htmlFor="template-ai-token-cost" className="text-xs font-bold text-muted uppercase tracking-wider">
 Coût IA (jetons)
 </label>
 <input
 id="template-ai-token-cost"
 type="number"
 min={1}
 max={50}
 value={aiTokenCost}
 onChange={(e) => {
   const next = Math.round(Number(e.target.value));
   setAiTokenCost(Number.isFinite(next) ? Math.min(50, Math.max(1, next)) : AI_INVITATION_COMPOSE_TOKEN_COST);
 }}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
 />
 <p className="text-xs text-muted">Prix facturé quand ce modèle sert de base dans le studio (défaut {AI_INVITATION_COMPOSE_TOKEN_COST}).</p>
 </div>
 <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">Catégorie sur la page d&apos;accueil</label>
 <select
 value={landingCategory}
 onChange={(e) => setLandingCategory(e.target.value as 'private' | 'corporate' | 'casual')}
                className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
 >
 <option value="private">Privé & Célébrations</option>
 <option value="corporate">Professionnel & Gala</option>
 <option value="casual">Moderne & Cocktail</option>
 </select>
 </div>
 <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">Accroche (visiteurs)</label>
 <textarea
 value={landingDescription}
 onChange={(e) => setLandingDescription(e.target.value)}
 rows={3}
 maxLength={220}
                placeholder="Ex. : Tons pastel et typographie élégante pour un mariage."
                className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
 />
              <p className="text-xs text-muted text-right">{landingDescription.length}/220</p>
 </div>
 </div>
 )}

 {/* Canvas dimensions */}
 <div className="space-y-3 p-3 rounded-2xl border border-primary/20 bg-primary/10">
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
 <Layout className="w-3.5 h-3.5" />
 Taille du modèle
 </h4>
 <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Format prédéfini</label>
 <select
 value={canvasSizePreset}
 onChange={(e) => handleCanvasPresetChange(e.target.value as CanvasSizePreset)}
              className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
 >
 {Object.entries(CANVAS_SIZE_PRESETS).map(([key, preset]) => (
 <option key={key} value={key}>{preset.label}</option>
 ))}
 <option value="custom">Personnalisé</option>
 </select>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
              <label className="text-xs font-bold text-muted uppercase">Largeur (px)</label>
 <input
 type="number"
 min={280}
 max={1200}
 value={canvasWidth}
 onChange={(e) => {
 setCanvasSizePreset('custom');
 setCanvasWidth(Number(e.target.value) || CANVAS_SIZE_PRESETS.standard.width);
 }}
                className="w-full px-2.5 py-1.5 bg-surface-muted border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
 />
 </div>
 <div className="space-y-1">
              <label className="text-xs font-bold text-muted uppercase">Hauteur min. (px)</label>
 <input
 type="number"
 min={400}
 max={1600}
 value={canvasHeight}
 onChange={(e) => {
 setCanvasSizePreset('custom');
 setCanvasHeight(Number(e.target.value) || CANVAS_SIZE_PRESETS.standard.height);
 }}
                className="w-full px-2.5 py-1.5 bg-surface-muted border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
 />
 </div>
 </div>
 <p className="text-xs text-muted leading-relaxed">
 Utilisée pour l&apos;aperçu, l&apos;invitation de réponse et les cartes du catalogue.
 </p>
 </div>

 {/* Background Type */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Type d'arrière-plan</label>
 <div className="grid grid-cols-3 gap-1.5">
 {[
 { id: 'color', label: 'Couleur' },
 { id: 'pattern', label: 'Texture' },
 { id: 'image', label: 'Image' }
 ].map((type) => (
 <button
 key={type.id}
 type="button"
 onClick={() => setBgType(type.id as any)}
 className={`py-1.5 border rounded-lg text-xs font-bold transition ${bgType === type.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:bg-surface-muted'}`}
 >
 {type.label}
 </button>
 ))}
 </div>
 </div>

 {/* Background Color Picker (For color and pattern types) */}
 {bgType !== 'image' && (
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted uppercase tracking-wider block">Couleur de fond</label>
 <div className="flex gap-2">
 <input 
 type="color" 
 value={bgColor.startsWith('#') ? bgColor : '#faf8f5'}
 onChange={(e) => setBgColor(e.target.value)}
 className="w-8 h-8 rounded-lg border border-border cursor-pointer overflow-hidden p-0"
 />
 <input 
 type="text" 
 value={bgColor}
 onChange={(e) => setBgColor(e.target.value)}
 className="flex-1 px-3 py-1.5 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition font-mono"
 />
 </div>

 {/* Luxury Predefined Background Palette */}
 <button
 type="button"
 onClick={() => setStyleAdvancedOpen((v) => !v)}
 className="text-xs font-bold text-primary hover:underline"
 >
 {styleAdvancedOpen ? 'Masquer les fonds recommandés' : 'Fonds recommandés'}
 </button>
 {styleAdvancedOpen && (
 <div className="flex flex-wrap gap-1.5 pt-1">
 {[
 { hex: '#faf8f5', name: 'Blanc Pur' },
 { hex: '#faf6f0', name: 'Ivoire Doux' },
 { hex: '#f4f1ea', name: 'Lin Naturel' },
 { hex: '#f3e0da', name: 'Rose Poudré' },
 { hex: '#e2e8f0', name: 'Gris Perle' },
 { hex: '#7d8c5c', name: 'Vert Sauge' },
 { hex: '#58111a', name: 'Bourgogne' },
 { hex: '#1d2d44', name: 'Bleu Nuit' },
 { hex: '#1e1b18', name: 'Noir Ébène' },
 ].map((c) => (
 <button
 key={c.hex}
 type="button"
 onClick={() => setBgColor(c.hex)}
 className="w-6 h-6 rounded-full border border-border shadow-sm transition hover:scale-110"
 style={{ backgroundColor: c.hex }}
 title={c.name}
 />
 ))}
 </div>
 )}
 </div>
 )}

 {/* Pattern Selector */}
 {bgType === 'pattern' && (
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Style de Texture</label>
 <select 
 value={bgPattern}
 onChange={(e) => setBgPattern(e.target.value as any)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="none">Aucune texture</option>
 <option value="paper">Papier grainé de luxe (Hassan Raza)</option>
 <option value="watercolor">Aquarelle artistique (Ananya & Rishabh)</option>
 <option value="boho">Boho Botanique (Feuillage Ornemental)</option>
 <option value="linen">Lin de luxe (Tissu texturé)</option>
 <option value="marble">Marbre blanc (Veines dorées)</option>
 <option value="gold-dust">Poussière d'or (Scintillant)</option>
 <option value="parchment">Parchemin ancien (Kraft)</option>
 <option value="velvet">Velours royal (Sombre)</option>
                    <option value="vellum">Vellum givré / Verre translucide (Tendance 2026)</option>
                    <option value="art-deco-geom">Art Déco Géométrique Doré (Gatsby)</option>
                    <option value="kuba-weave">Tissage Royal Kuba (Afro-Luxe)</option>
                    <option value="deckled-cotton">Papier Coton Artisanal Pressé (Letterpress)</option>
                    <option value="celestial">Nuit Céleste & Étoiles (Cosmique)</option>
 </select>
 </div>
 )}

 {/* Global Image Upload */}
 {bgType === 'image' && (
 <div className="space-y-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Image de fond</label>
 <input 
 type="file" 
 accept="image/*"
 onChange={handleGlobalImageUpload}
 className="w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/15 cursor-pointer"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Ou URL d'image de fond</label>
 <input 
 type="text" 
 value={bgImageUrl}
 onChange={(e) => setBgImageUrl(e.target.value)}
 placeholder="https://images.unsplash.com/..."
 className="w-full px-3 py-1.5 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 />
 </div>
 {bgImageUrl && (
 <div className="space-y-3">
            {aiSafetyFallbackNotice && (
              <div className="p-3 bg-surface border border-border rounded-xl flex items-start gap-2.5 shadow-2xs">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                <div className="text-xs text-muted">
                  <span className="font-semibold text-foreground block">Décor thématique sans visage appliqué</span>
                  Le filtre de sécurité du modèle d’image a préservé un arrière-plan décoratif de haute qualité. Vous pouvez insérer votre photo directement dans le cadre ou réajuster vos références.
                </div>
              </div>
            )}

 {aiVariants.length > 1 && (
   <div className="space-y-1.5 pt-1">
     <label className="text-xs font-bold text-muted uppercase tracking-wider flex items-center justify-between">
       <span>Fidèle ou ample ({aiVariants.length})</span>
       <span className="text-[10px] text-primary lowercase font-normal">cliquez pour basculer</span>
     </label>
     <div className="grid grid-cols-2 gap-2">
       {aiVariants.map((varUrl, idx) => {
         const isSelected = bgImageUrl === varUrl;
         return (
           <button
             key={varUrl}
             type="button"
             onClick={() => setBgImageUrl(varUrl)}
             className={`relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition group ${isSelected ? 'border-primary shadow-md ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}
           >
             <img src={varUrl} alt={idx === 0 ? 'Proposition fidèle' : 'Proposition ample'} className="w-full h-full object-cover" />
             <span className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${isSelected ? 'bg-primary-solid text-primary-foreground shadow-xs' : 'bg-foreground/70 text-background'}`}>
               {idx === 0 ? 'Fidèle' : 'Ample'} {isSelected && '✓'}
             </span>
           </button>
         );
       })}
     </div>
   </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => handleOpenCropper('background')}
 className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-primary/10 hover:bg-primary/15 text-primary font-bold rounded-xl text-xs transition border border-primary/20 shadow-sm"
 >
 <Crop className="w-3.5 h-3.5" />
 Rogner l'image de fond
 </button>
 <button
 type="button"
 disabled={aiImageDownloading}
 onClick={async () => {
 if (!bgImageUrl || aiImageDownloading) return;
 setAiImageDownloading(true);
 try {
 await downloadAiGeneratedImage(bgImageUrl);
 } finally {
 setAiImageDownloading(false);
 }
 }}
 className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-primary/10 hover:bg-primary/15 text-primary font-bold rounded-xl text-xs transition border border-primary/20 shadow-sm disabled:opacity-60"
 >
 {aiImageDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
 Télécharger l'image
 </button>
 </div>
 </div>
 )}
 </div>
 )}

 {/* Frame Type Selection */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Style d'Encadrement / Cadre</label>
 <select 
 value={frameType}
 onChange={(e) => setFrameType(e.target.value as any)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="none">Aucun cadre (Bords normaux)</option>
 <option value="arch">Arche Royale de Luxe (Ananya / Watercolor)</option>
 <option value="double-border">Double Bordure Fine (Hassan Raza / Boho)</option>
 <option value="gold-border">Bordure Or Lumineuse (Luxury Modern)</option>
                    <option value="art-deco">Art Déco Gatsby Doré (Symétrie & Chevrons)</option>
                    <option value="deckled">Papier Artisanal Bords Frangés (Deckled Edge)</option>
                    <option value="embossed-arch">Arche en Gaufrage à Sec (Quiet Luxury 2026)</option>
                    <option value="passport-vip">Passeport Diplomatique / Billet VIP</option>
                    <option value="frosted-glass">Verre Dépoli & Reflets Translucides</option>
 <option value="floral-wreath">Couronne Florale Dorée (Centre)</option>
 <option value="floral-arch">Arche de Roses Rouges (Haut)</option>
 <option value="boho-dried">Feuillage Séché Boho (Coins)</option>
 <option value="gold-leaves-circle">Cercle de Feuilles d'Or et Perles</option>
 <option value="minimal-leaves">Feuilles Minimalistes (Angles)</option>
 </select>
 </div>

 {/* Floral Customization Panel */}
 {frameType === 'floral-arch' && (
 <div className="space-y-4 border-t border-border-subtle pt-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Type de Fleurs</label>
 <select 
 value={floralType}
 onChange={(e) => setFloralType(e.target.value as any)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition"
 >
 <option value="roses">Roses de Luxe (Mariage Royal)</option>
 <option value="cherry-blossom">Fleurs de Cerisier (Romantique)</option>
 <option value="gold-leaves">Feuillage d'Or & Perles (Prestige)</option>
 <option value="sunflowers">Tournesols Lumineux (Chaleureux)</option>
 <option value="eucalyptus">Eucalyptus & Baies (Boho Chic)</option>
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider block">Couleur des Fleurs</label>
 <div className="flex gap-2">
 <input 
 type="color" 
 value={floralColor.startsWith('#') ? floralColor : '#b91c1c'}
 onChange={(e) => setFloralColor(e.target.value)}
 className="w-8 h-8 rounded-lg border border-border cursor-pointer overflow-hidden p-0"
 />
 <input 
 type="text" 
 value={floralColor}
 onChange={(e) => setFloralColor(e.target.value)}
 className="flex-1 px-3 py-1.5 bg-surface-muted border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition font-mono"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider flex justify-between">
 <span>Densité de l'Arche</span>
 <span className="text-primary font-extrabold">{floralDensity} fleurs</span>
 </label>
 <input 
 type="range" 
 min="15" 
 max="80" 
 value={floralDensity}
 onChange={(e) => setFloralDensity(parseInt(e.target.value))}
 className="w-full accent-[var(--primary)] cursor-pointer"
 />
 </div>
 </div>
 )}
 </div>
 )}
 </aside>
 </div>

 <StudioMobileDock
  className="lg:hidden -mx-3"
  value={mobilePane}
  onChange={setMobilePane}
  panes={[
    { id: 'canvas', label: 'Carte', icon: LayoutTemplate, hint: 'Voir la carte' },
    { id: 'tools', label: 'Ajouter', icon: PlusCircle, hint: 'Ajouter un élément ou un style' },
    { id: 'inspect', label: 'Régler', icon: SlidersHorizontal, hint: 'Régler l’élément ou la carte' },
  ]}
 />

 {/* Image Cropper Modal */}
 {cropperOpen && (
 <div className="fixed inset-0 bg-foreground/40 z-[11050] flex items-end sm:items-center justify-center p-0 sm:p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cropper-title"
        className="bg-surface rounded-t-2xl sm:rounded-[var(--radius-card)] border border-border max-w-lg w-full overflow-hidden flex flex-col"
      >
 {/* Modal Header */}
 <div className="p-5 sm:p-6 border-b border-border-subtle flex items-center justify-between gap-3">
 <div className="flex items-center gap-2 min-w-0">
 <div className="bg-primary/10 text-primary p-2 rounded-[var(--radius-button)]">
 <Crop className="w-5 h-5" />
 </div>
 <div className="min-w-0">
 <h3 id="cropper-title" className="text-base font-bold text-foreground">Recadrer l’image</h3>
 <p className="text-xs text-muted font-medium">Zoomez et déplacez pour cadrer</p>
 </div>
 </div>
 <button 
 type="button"
 onClick={() => setCropperOpen(false)}
 aria-label="Fermer le recadrage"
 className="inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-surface-muted rounded-[var(--radius-button)] transition text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
 >
 <XCircle className="w-5 h-5" />
 </button>
 </div>

 {/* Modal Body */}
 <div className="p-6 space-y-6 flex-1 flex flex-col items-center">
 {error && (
 <div className="w-full p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl flex items-center gap-2 text-xs">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span>{error}</span>
 </div>
 )}

 {/* Aspect Ratio Selector */}
 <div className="w-full space-y-2">
 <label className="text-xs font-bold text-muted uppercase tracking-wider block text-center">Format de recadrage</label>
 <div className="flex flex-wrap justify-center gap-2">
 {[
 { id: '1:1', label: '1:1 (Carré)' },
 { id: '16:9', label: '16:9 (Paysage)' },
 { id: '4:3', label: '4:3 (Standard)' },
 { id: '2:3', label: '2:3 (Portrait)' },
 { id: 'free', label: 'Libre' }
 ].map((ratio) => (
 <button
 key={ratio.id}
 type="button"
 onClick={() => {
 setCropAspectRatio(ratio.id as any);
 setCropPanX(0);
 setCropPanY(0);
 setCropZoom(1);
 }}
 className={`min-h-11 px-3 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${cropAspectRatio === ratio.id ? 'bg-primary-solid text-primary-foreground' : 'bg-surface-muted border border-border text-muted hover:bg-surface'}`}
 >
 {ratio.label}
 </button>
 ))}
 </div>
 </div>

 {/* Cropping Viewport Container */}
 <div 
 className="w-[400px] max-w-full h-[300px] mx-auto bg-background rounded-2xl relative overflow-hidden flex items-center justify-center select-none border border-border"
 onMouseDown={handleCropMouseDown}
 onMouseMove={handleCropMouseMove}
 onMouseUp={handleCropMouseUp}
 onMouseLeave={handleCropMouseUp}
 onTouchStart={handleCropTouchStart}
 onTouchMove={handleCropTouchMove}
 onTouchEnd={handleCropMouseUp}
 >
 {/* Image being cropped */}
 {cropImageSrc && (
 <img 
 src={cropImageSrc} 
 alt="To Crop" 
 onLoad={(e) => {
 setCropImageNaturalWidth(e.currentTarget.naturalWidth);
 setCropImageNaturalHeight(e.currentTarget.naturalHeight);
 }}
 style={{
 width: (cropImageNaturalWidth && cropImageNaturalHeight) ? (
 (cropImageNaturalWidth / cropImageNaturalHeight > 400 / 300) ? 400 : 300 * (cropImageNaturalWidth / cropImageNaturalHeight)
 ) : 'auto',
 height: (cropImageNaturalWidth && cropImageNaturalHeight) ? (
 (cropImageNaturalWidth / cropImageNaturalHeight > 400 / 300) ? 400 / (cropImageNaturalWidth / cropImageNaturalHeight) : 300
 ) : 'auto',
 transform: `translate(${cropPanX}px, ${cropPanY}px) scale(${cropZoom})`,
 transformOrigin: 'center',
 transition: isDraggingCrop ? 'none' : 'transform 0.1s ease-out',
 pointerEvents: 'none',
 maxWidth: 'none',
 maxHeight: 'none'
 }}
 className="absolute"
 />
 )}

 {/* Cropping Frame Overlay */}
 <div 
 style={{
 width: cropAspectRatio === '1:1' ? 200 :
 cropAspectRatio === '16:9' ? 280 :
 cropAspectRatio === '4:3' ? 240 :
 cropAspectRatio === '2:3' ? 160 : 240,
 height: cropAspectRatio === '1:1' ? 200 :
 cropAspectRatio === '16:9' ? 157.5 :
 cropAspectRatio === '4:3' ? 180 :
 cropAspectRatio === '2:3' ? 240 : 180,
 }}
 className="border-2 border-dashed border-amber-400 absolute pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] rounded-lg"
 >
 {/* Corner markers */}
 <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400" />
 <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400" />
 <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400" />
 <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400" />
 </div>
 </div>

 {/* Zoom Slider */}
 <div className="w-full space-y-2">
 <div className="flex justify-between text-xs font-bold text-muted uppercase tracking-wider">
 <span>Zoom</span>
 <span className="font-mono text-primary">{Math.round(cropZoom * 100)}%</span>
 </div>
 <input 
 type="range" 
 min="1" 
 max="4" 
 step="0.01"
 value={cropZoom}
 onChange={(e) => setCropZoom(parseFloat(e.target.value))}
 className="w-full accent-[var(--primary)] h-1.5 bg-surface-muted rounded-lg appearance-none cursor-pointer"
 />
 </div>

 {/* Reset button */}
 <button
 type="button"
 onClick={() => {
 setCropPanX(0);
 setCropPanY(0);
 setCropZoom(1);
 }}
 className="text-xs font-bold text-muted hover:text-primary transition"
 >
 Réinitialiser la position et le zoom
 </button>
 </div>

 {/* Modal Footer */}
 <div className="p-6 border-t border-border-subtle bg-surface-muted flex gap-3">
 <button 
 type="button"
 onClick={() => setCropperOpen(false)}
 className="flex-1 py-2.5 border border-border text-muted font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-surface-muted transition"
 >
 Annuler
 </button>
 <button 
 type="button"
 onClick={handleApplyCrop}
 className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-primary/10"
 >
 Valider le rognage
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
 return typeof document === 'undefined' ? editorTree : createPortal(editorTree, document.body);
 }

 return (
 <>
 {renderMockupImportModal()}
      {renderAiComposeModal()}
      <AiTokenPurchaseModal
        open={aiTokenModalOpen}
        onClose={() => setAiTokenModalOpen(false)}
        onSuccess={() => setAiAllowance(getAiSimulationAllowance())}
      />
      <AiComposeFullscreenLoader
        active={showInvitationStudioLoader}
        embedText={aiComposeEmbedText}
        hasReferences={aiComposeFiles.length > 0}
        title={
          aiComposePrompt.toLowerCase().includes('retouche') || aiComposePrompt.toLowerCase().includes('altér')
            ? 'Retouche de l’invitation IA…'
            : undefined
        }
        stageHint={aiComposeStage || (invitationStudioJob ? 'La génération continue même si vous quittez cet écran.' : null)}
        onContinueInBackground={hideInvitationLoader}
      />
 <div className="space-y-6">
 <PageHeader
 title={
 isSuperAdmin
 ? 'Concepteur de modèles'
 : 'Vos cartons d’invitation'
 }
 description={
 isSuperAdmin
 ? 'Atelier de création visuelle. Pour le catalogue plateforme, les filtres et la vitrine landing, utilisez la console Super Admin.'
 : 'Nommez la cérémonie, créez le carton, puis envoyez-le. La bibliothèque est là si vous préférez partir d’un modèle.'
 }
 breadcrumbs={
 <Breadcrumbs
 items={
 isSuperAdmin
 ? [
 { label: 'Console', href: '/dashboard?tab=templates' },
 { label: 'Concepteur' },
 ]
 : [
 { label: 'Accueil', href: '/dashboard' },
 { label: 'Modèles' },
 ]
 }
 />
 }
 action={
 <div className="flex flex-wrap gap-2">
 {isSuperAdmin && (
 <Link
 href={ADMIN_TEMPLATES_HREF}
 className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground font-semibold rounded-[var(--radius-button)] text-xs transition hover:bg-surface-muted"
 >
 <ArrowLeft className="w-4 h-4" />
 Catalogue Super Admin
 </Link>
 )}
 <Button
 onClick={startAiComposeFromList}
 disabled={aiComposeBusy}
 title={`Créer un carton à partir d’un brief (${AI_INVITATION_COMPOSE_TOKEN_COST} jetons IA)`}
 leftIcon={aiComposeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
 >
 Créer un carton
 </Button>
 <>
 <input
 ref={mockupInputRef}
 type="file"
 accept="image/jpeg,image/png,image/webp"
 className="hidden"
 onChange={(e) => handleMockupFileChange(e, true)}
 />
 <Button
 variant="secondary"
 onClick={() => mockupInputRef.current?.click()}
 disabled={mockupImporting}
 leftIcon={mockupImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
 >
 {mockupImporting ? (ocrProgress !== null ? `Texte ${ocrProgress}%` : 'Import…') : 'Importer'}
 </Button>
 </>
 <Button
 variant="ghost"
 onClick={() => handleCreateTemplateClick('studio')}
 leftIcon={<PlusCircle className="w-4 h-4" />}
 >
 Éditeur
 </Button>
 </div>
 }
 />

 {(!canUseCustomTemplates || templatesAtLimit) && user?.role === 'USER' && (
 <PlanLimitCallout kind="templates" planQuota={planQuota} planName={tenant?.plan} />
 )}
 {isSuperAdmin && (
 <div className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground space-y-1">
 <p className="font-semibold text-primary text-xs uppercase tracking-wider">Nuance des vues</p>
 <p className="text-xs text-muted leading-relaxed">
 <strong className="text-foreground">Catalogue Super Admin</strong> (`/dashboard?tab=templates`) : supervision globale,
 filtres Global / Organisation, activation « Vitrine landing ».
 {' '}
 <strong className="text-foreground">Ce concepteur</strong> : édition visuelle. Si vous ouvrez Créer / Modifier depuis le catalogue,
 vous y revenez automatiquement après enregistrement.
 </p>
 </div>
 )}

 {!canUseCustomTemplates && user?.role === 'USER' && (
 <PlanLimitCallout feature="customTemplates" planName={tenant?.plan} />
 )}
 {canUseCustomTemplates && !canUseMockupOcr && user?.role === 'USER' && (
 <PlanLimitCallout feature="mockupOcr" planName={tenant?.plan} />
 )}

 {error && <Alert variant="error">{error}</Alert>}

 {success && (
 <div className="p-4 bg-primary/10 border border-primary/20 text-foreground rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
 <div className="flex items-start gap-3 min-w-0">
 <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
 <span className="min-w-0 break-words">{success}</span>
 </div>
 <Link
   href="/dashboard/events"
   className="min-h-11 inline-flex items-center justify-center px-3 rounded-[var(--radius-button)] text-sm font-semibold text-primary hover:bg-primary/10 shrink-0"
 >
   Lier à un événement
 </Link>
 </div>
 )}

 <div className="flex justify-end">
 <ViewModeToggle
 storageKey="em-view-templates"
 value={templatesViewMode}
 onChange={setTemplatesViewMode}
 columns={templatesColumns}
 onColumnsChange={setTemplatesColumns}
 defaultMode="grid"
 />
 </div>

 {!isSuperAdmin && catalogTemplates.length > 0 && (
 <section className="space-y-4">
 <div>
 <h2 className="text-lg font-bold text-foreground dark:text-foreground">Bibliothèque EventMaster</h2>
 <p className="text-sm text-muted dark:text-muted">
 Modèles prêts à l&apos;emploi — dupliquez-en un pour votre organisation ({catalogTemplates.length}).
 </p>
 </div>
 <TemplateCardGrid
 templates={paginatedCatalog}
 isSuperAdmin={false}
 layout={templatesViewMode}
 columns={templatesColumns}
 onViewDetails={(t) => setPreviewTemplate(t as TemplateItem)}
 onUseInStudio={(t) => void startAiComposeFromModel(t)}
 onDuplicate={
 canDuplicateAny && !templatesAtLimit
 ? (t) => handleDuplicateTemplate(t as TemplateItem)
 : undefined
 }
 />
 <Pagination
 page={catalogPage}
 pageSize={templatesPageSize}
 total={catalogTemplates.length}
 onPageChange={setCatalogPage}
 onPageSizeChange={setTemplatesPageSize}
 itemLabel="modèles"
 />
 </section>
 )}

 <section className="space-y-4">
 {!isSuperAdmin && (
 <div>
 <h2 className="text-lg font-bold text-foreground dark:text-foreground">Mes modèles</h2>
 <p className="text-sm text-muted dark:text-muted">
 Modèles appartenant à votre organisation ({ownTemplates.length}).
 </p>
 </div>
 )}

 <TemplateCardGrid
 templates={paginatedOwn}
 isSuperAdmin={isSuperAdmin}
 layout={templatesViewMode}
 columns={templatesColumns}
 onViewDetails={(t) => setPreviewTemplate(t as TemplateItem)}
 onUseInStudio={(t) => void startAiComposeFromModel(t)}
 emptyMessage={
 isSuperAdmin
 ? "Aucun modèle. Créez un modèle global ou pour une organisation."
 : "Votre premier carton n’est pas encore là. En 2 minutes : décrivez la fête, voyez le faire-part, envoyez-le."
 }
 emptyAction={
 <div className="flex flex-col gap-3 items-center">
 <button
 type="button"
 onClick={startAiComposeFromList}
 disabled={aiComposeBusy}
 className="inline-flex min-h-11 items-center gap-2 px-5 py-2.5 bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-semibold rounded-[var(--radius-button)] text-sm transition cursor-pointer"
 >
 {aiComposeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
 Créer mon carton
 </button>
 <details className="text-center">
   <summary className="min-h-11 inline-flex items-center text-sm font-semibold text-muted cursor-pointer hover:text-foreground">
     Autre départ
   </summary>
   <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-center">
 {canUseMockupImport && (
 <button
 type="button"
 onClick={() => mockupInputRef.current?.click()}
 disabled={mockupImporting}
 className="inline-flex min-h-11 items-center gap-2 px-4 py-2 border border-border text-foreground font-semibold rounded-[var(--radius-button)] text-sm transition hover:bg-surface-muted disabled:opacity-50 cursor-pointer"
 >
 {mockupImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
 Importer une image
 </button>
 )}
 <button
 type="button"
 onClick={() => handleCreateTemplateClick('studio')}
 className="inline-flex min-h-11 items-center gap-2 px-4 py-2 border border-border text-foreground font-semibold rounded-[var(--radius-button)] text-sm transition hover:bg-surface-muted cursor-pointer"
 >
 <PlusCircle className="w-4 h-4" />
 Éditeur vide
 </button>
   </div>
 </details>
 </div>
 }
 onEdit={(t) => handleEditTemplateClick(t as TemplateItem)}
 onDuplicate={
 (canUseCustomTemplates || isSuperAdmin) && !templatesAtLimit
 ? (t) => handleDuplicateTemplate(t as TemplateItem)
 : undefined
 }
 onDelete={canUseCustomTemplates ? (id) => handleDeleteTemplate(id) : undefined}
 />
 <Pagination
 page={ownTemplatesPage}
 pageSize={templatesPageSize}
 total={listTemplates.length}
 onPageChange={setOwnTemplatesPage}
 onPageSizeChange={setTemplatesPageSize}
 itemLabel="modèles"
 />
 </section>
 </div>

 <InvitationDuplicateModal
 open={Boolean(duplicateTarget)}
 sourceName={duplicateTarget?.name || ''}
 loading={duplicating}
 onClose={() => {
 if (duplicating) return;
 setDuplicateTarget(null);
 }}
 onConfirm={confirmDuplicateTemplate}
 />

 <TemplatePreviewModal
 open={Boolean(previewTemplate)}
 onClose={() => setPreviewTemplate(null)}
 template={previewTemplate ? {
 id: previewTemplate.id,
 name: previewTemplate.name,
 content: previewTemplate.content,
 createdAt: previewTemplate.createdAt || '',
 tenantId: previewTemplate.tenantId,
 tenantName: previewTemplate.tenant?.name,
 tenant: previewTemplate.tenant,
 showOnLanding: previewTemplate.showOnLanding,
 isGlobal: previewTemplate.isGlobal,
 } : null}
 canEdit={true}
 canDuplicate={canDuplicateAny && !templatesAtLimit}
 onEdit={(t) => {
 setPreviewTemplate(null);
 handleEditTemplateClick(t as TemplateItem);
 }}
 onDuplicate={(t) => {
 setPreviewTemplate(null);
 handleDuplicateTemplate(t as TemplateItem);
 }}
 onUseInStudio={(t) => {
 setPreviewTemplate(null);
 void startAiComposeFromModel(t);
 }}
 isOwnerOrManager={isOwnerOrManager}
 />

 <Modal
 open={saveUpgradeModalOpen}
 onClose={() => setSaveUpgradeModalOpen(false)}
 size="md"
 title={
 <div className="flex items-center gap-2.5">
 <div className="p-2 rounded-xl bg-surface-muted text-amber-600 dark:text-amber-400 border border-border">
 <Crown className="w-5 h-5" aria-hidden />
 </div>
 <div>
 <span className="text-base font-semibold text-foreground block">
 Enregistrement de modèle d’invitation
 </span>
 <span className="text-xs text-muted block font-normal">
 Votre création est sauvegardée en brouillon local sur cet appareil
 </span>
 </div>
 </div>
 }
 >
 <div className="space-y-4 pt-1">
 <div className="p-4 rounded-xl bg-surface-muted/50 border border-border space-y-1.5">
 <p className="text-sm font-semibold text-foreground">
 Votre modèle « {templateName || 'Nouvelle invitation'} » est prêt !
 </p>
 <p className="text-xs text-muted leading-relaxed">
 {!canUseCustomTemplates
 ? "La création et l'enregistrement de faire-part personnalisés sont réservés aux offres professionnelles et supérieures. Votre modèle a bien été sauvegardé sur cet appareil pour que vous ne perdiez pas votre travail."
 : `Vous avez atteint la limite de ${planQuota?.limits.maxTemplates ?? 1} modèle(s) d'invitation de votre formule actuelle (${tenant?.plan || 'actuel'}). Pour enregistrer ce nouveau modèle sans supprimer les précédents, activez une formule supérieure.`}
 </p>
 </div>

 <div className="rounded-xl border border-border p-3.5 space-y-2 bg-surface text-xs">
 <p className="font-semibold text-foreground flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
 Avantages du forfait supérieur :
 </p>
 <ul className="space-y-1.5 text-muted pl-1">
 <li className="flex items-center gap-2">
 <Check className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
 <span>Enregistrement et utilisation illimitée de modèles sur-mesure</span>
 </li>
 <li className="flex items-center gap-2">
 <Check className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
 <span>Formulaires de réponse à l’invitation personnalisés et suivi des présences</span>
 </li>
 <li className="flex items-center gap-2">
 <Check className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
 <span>Génération d&apos;invitations avancées par Intelligence Artificielle</span>
 </li>
 </ul>
 </div>

 <div className="flex flex-col gap-2.5 pt-2">
 <Link
   href="/dashboard/events"
   className="flex-1 inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-semibold rounded-xl text-xs transition"
 >
   Continuer vers un événement
 </Link>
 <p className="text-xs text-muted text-center">Depuis l’événement, vous pourrez l’envoyer sur WhatsApp.</p>
 <div className="flex flex-col sm:flex-row gap-2.5">
 <button
 type="button"
 onClick={() => {
 window.open('/dashboard/billing', '_blank');
 }}
 className="flex-1 inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 border border-border bg-surface hover:bg-surface-muted text-foreground font-semibold rounded-xl text-xs transition cursor-pointer"
 >
 <Sparkles className="w-4 h-4" aria-hidden />
 <span>Voir les formules</span>
 </button>
 <button
 type="button"
 onClick={() => setSaveUpgradeModalOpen(false)}
 className="inline-flex min-h-11 items-center justify-center px-4 py-2.5 border border-border bg-surface hover:bg-surface-muted text-foreground font-semibold rounded-xl text-xs transition cursor-pointer"
 >
 Continuer à peaufiner
 </button>
 </div>
 </div>
 </div>
 </Modal>
 </>
 );
}
