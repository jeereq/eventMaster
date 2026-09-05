'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { enabledMarketplaceCities } from '@/lib/platformCities';
import {
  Building2, Plus, Trash2, Users, UserPlus, Check, CheckCircle2,
  ChevronLeft, ChevronRight, LayoutGrid, Theater, Tent, Presentation, Edit3, Sparkles, Ruler,
  Globe, GlobeLock, Lock, Eye,
} from 'lucide-react';
import {
  ProjectCard, ListRowAction, StatusPill, ViewModeToggle, useViewMode, listStackClass, SkeletonRoomsView,
  Button, Modal, EmptyState, Alert, Input, Pagination, paginateItems, usePageSize,
} from '@/components/ui';
import CatalogueFilterBar, { CatalogueChoicePills, CatalogueFilterField, type CatalogueFilterChip } from '@/components/CatalogueFilterBar';
import { ROOM_TYPE_FILTER_OPTIONS } from '@/lib/catalogueEntityFilters';
import { cn } from '@/lib/cn';
import {
  ChairType,
  LayoutParams,
  RoomLayoutBlueprint,
  RoomType,
  applyRoomAmbiencePreset,
  captureRoomAmbienceFromBlueprint,
  chairTypeLabels,
  generateRoomBlueprint,
  refreshBlueprintMetadata,
  roomTypeDescriptions,
  roomTypeLabels,
} from '@/lib/roomLayoutUtils';
import {
  applyRoomTheme,
  groupThemesByCategory,
  listAvailableThemes,
  roomThemeCategoryLabels,
  type RoomThemeId,
} from '@/lib/roomThemeUtils';
import {
  applyBuildingStoryPreset,
  BUILDING_STORY_PRESETS,
  resolveBuildingPresetId,
} from '@/lib/roomBuildingUtils';
import { PRICE_UNIT_OPTIONS, bookingDateKeys, missingPublishLocation, parseBlockedDates, type VenuePriceUnit } from '@/lib/marketplace';
import { EMPTY_LISTING_DETAILS, parseListingDetails, type ListingDetails } from '@/lib/listingDetails';
import ListingDetailsFields from '@/components/ListingDetailsFields';
import { formatFc } from '@/config/landingPricing';
import BlockedDatesField from '@/components/BlockedDatesField';
import MarketplaceMediaField from '@/components/MarketplaceMediaField';
import MarketplaceFormTabs, { type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import LocationPickerMap from '@/components/LocationPickerMap';
import CityLocationFields from '@/components/CityLocationFields';
import { getQuotaLockMessage, getQuotaActionMessage, getRoomTypeLockMessage, ROOM_TYPE_MIN_LEVEL, canPublishVenueCatalog } from '@/lib/planAccess';
import PlanLimitCallout from '@/components/PlanLimitCallout';

const RoomLayoutPreview = dynamic(() => import('@/components/RoomLayoutPreview'), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-24 w-full bg-surface-muted" role="status" aria-label="Chargement du plan" />
  ),
});

const RoomLayoutEditor = dynamic(() => import('@/components/RoomLayoutEditor'), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-[var(--radius-card)] border border-border bg-surface-muted/50 px-4 py-10 text-center text-sm text-muted"
      role="status"
    >
      Chargement de l’éditeur 3D…
    </div>
  ),
});

const iconActionClass =
  'inline-flex items-center justify-center min-h-11 min-w-11 p-2 text-muted hover:text-foreground hover:bg-surface-muted rounded-[var(--radius-button)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

interface RoomStaffItem {
  id: string;
  staffRole: 'MANAGER' | 'PROTOCOL';
  user: { id: string; name: string | null; email: string; orgRole: string | null };
}

interface RoomItem {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  floor: string | null;
  location: string | null;
  roomType: RoomType;
  layoutBlueprint: RoomLayoutBlueprint | null;
  staff: RoomStaffItem[];
  venueListing?: {
    id: string;
    slug: string;
    isPublic: boolean;
    headline: string | null;
    city: string | null;
    commune?: string | null;
    neighborhood?: string | null;
    address: string | null;
    priceFromFc: number | null;
    priceUnit: VenuePriceUnit;
    quotaMin?: number | null;
    quotaMax?: number | null;
    photos: string[] | null;
    blockedDates?: unknown;
    bookings?: Array<{ eventDate: string; eventEndDate?: string | null }>;
    latitude: number | null;
    longitude: number | null;
    details?: unknown;
  } | null;
  _count?: { events: number };
}

interface TeamMemberOption {
  id: string;
  name: string | null;
  email: string;
  isOwner?: boolean;
}

const roleLabels: Record<string, string> = {
  MANAGER: 'Manager de salle',
  PROTOCOL: 'Protocole de salle',
};

const roomTypeIcons: Record<RoomType, React.ReactNode> = {
  SIMPLE: <Building2 className="w-5 h-5" />,
  BANQUET: <LayoutGrid className="w-5 h-5" />,
  CONFERENCE: <Presentation className="w-5 h-5" />,
  AMPHITHEATER: <Theater className="w-5 h-5" />,
  TENT: <Tent className="w-5 h-5" />,
  CUSTOM: <Sparkles className="w-5 h-5" />,
};

const selectableRoomTypes: RoomType[] = ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];

/** Groupes ergonomiques pour le choix du type (création). */
const ROOM_TYPE_THEME_GROUPS: Array<{
  id: string;
  label: string;
  hint: string;
  types: RoomType[];
}> = [
  {
    id: 'reception',
    label: 'Réception & cérémonie',
    hint: 'Mariages, galas, dîners assis',
    types: ['BANQUET', 'SIMPLE'],
  },
  {
    id: 'pro',
    label: 'Conférence & spectacle',
    hint: 'Séminaires, amphithéâtre, plateaux',
    types: ['CONFERENCE', 'AMPHITHEATER'],
  },
  {
    id: 'outdoor',
    label: 'Extérieur',
    hint: 'Tentes et espaces ouverts',
    types: ['TENT'],
  },
  {
    id: 'custom',
    label: 'Sur mesure',
    hint: 'Plan libre ou importé',
    types: ['CUSTOM'],
  },
];

const defaultParams: Record<RoomType, LayoutParams> = {
  SIMPLE: {},
  BANQUET: { tableCount: 8, tableShape: 'round', seatsPerTable: 8, chairType: 'BANQUET', totalSeats: 64 },
  CONFERENCE: { rowCount: 6, seatsPerRow: 10, chairType: 'THEATER' },
  AMPHITHEATER: { tierCount: 3, rowsPerTier: 2, seatsPerRow: 12, chairType: 'THEATER' },
  TENT: { tentWidthM: 15, tentLengthM: 20, tableCount: 6, seatsPerTable: 8, chairType: 'BANQUET' },
  CUSTOM: {},
};

const WIZARD_STEPS = [
  { id: 1, label: 'Identité', shortLabel: 'Identité' },
  { id: 2, label: 'Type', shortLabel: 'Type' },
  { id: 3, label: 'Structure', shortLabel: 'Structure' },
] as const;

type WizardPlanTab = 'structure' | 'capacite' | 'ambiance' | 'editeur';

const CANVAS_PARAM_KEYS = new Set<keyof LayoutParams>([
  'canvasWidthM',
  'canvasHeightM',
  'tentWidthM',
  'tentLengthM',
]);

function buildWizardBlueprint(
  type: RoomType,
  params: LayoutParams,
  prev: RoomLayoutBlueprint | null,
  fallbackPreset: string | null = 'duplex',
): RoomLayoutBlueprint {
  let next = refreshBlueprintMetadata(generateRoomBlueprint(type, params));
  const presetId = resolveBuildingPresetId(prev) ?? fallbackPreset;
  if (presetId) {
    next = applyBuildingStoryPreset(next, presetId);
  }
  if (prev?.metadata.roomThemeId) {
    next = applyRoomTheme(next, prev.metadata.roomThemeId as RoomThemeId, { keepFloor: false });
  }
  return next;
}

const fieldClass =
  'w-full min-h-11 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary';

const labelClass = 'block text-xs font-semibold text-foreground mb-1.5';

function ParamSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {children}
      </select>
    </label>
  );
}

function ParamNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      label={label}
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="text-base sm:text-sm min-h-11"
    />
  );
}

export default function RoomsManagement() {
  const { planFeatures, planQuota, tenant, refreshProfile, refreshPlanFeatures } = useAuth();
  const { site } = usePlatformSite();
  const marketplaceCities = enabledMarketplaceCities(site);
  const canCatalogPublish = canPublishVenueCatalog(planFeatures, planQuota, tenant?.plan);
  const { mode: roomsViewMode, setViewMode: setRoomsViewMode, columns: roomsColumns, setGridColumns: setRoomsColumns, gridClassName: roomsGridClass } = useViewMode('em-view-rooms', 'grid', 3);
  const [roomsPage, setRoomsPage] = useState(1);
  const [roomsPageSize, setRoomsPageSize] = usePageSize('org-rooms', 9);
  const [roomQuery, setRoomQuery] = useState('');
  const [filterRoomType, setFilterRoomType] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'hidden'>('all');
  const [filterCity, setFilterCity] = useState('');
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [floor, setFloor] = useState('');
  const [location, setLocation] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('BANQUET');
  const [layoutParams, setLayoutParams] = useState<LayoutParams>(defaultParams.BANQUET);
  const [blueprintDraft, setBlueprintDraft] = useState<RoomLayoutBlueprint | null>(null);
  const [wizardPlanTab, setWizardPlanTab] = useState<WizardPlanTab>('structure');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [farthestStep, setFarthestStep] = useState(1);
  const [nameAttempted, setNameAttempted] = useState(false);
  const [editNameAttempted, setEditNameAttempted] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<RoomItem | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const notesFieldId = useId();
  const editNotesFieldId = useId();
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [viewingRoom, setViewingRoom] = useState<RoomItem | null>(null);
  const [editBlueprint, setEditBlueprint] = useState<RoomLayoutBlueprint | null>(null);
  const [editMeta, setEditMeta] = useState({ name: '', floor: '', location: '', description: '' });
  const [editPane, setEditPane] = useState<'identite' | 'elements'>('identite');
  const [editElementsReady, setEditElementsReady] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);

  const [assignRoomId, setAssignRoomId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<'MANAGER' | 'PROTOCOL'>('PROTOCOL');
  const [listingRoom, setListingRoom] = useState<RoomItem | null>(null);
  const [listingDraft, setListingDraft] = useState({
    isPublic: false,
    headline: '',
    city: '',
    commune: '',
    neighborhood: '',
    address: '',
    priceFromFc: '',
    priceUnit: 'EVENT' as VenuePriceUnit,
    quotaMin: '',
    quotaMax: '',
    photos: [] as string[],
    blockedDates: [] as string[],
    bookedDates: [] as string[],
    latitude: '',
    longitude: '',
    details: EMPTY_LISTING_DETAILS,
  });
  const [savingListing, setSavingListing] = useState(false);
  const [listingTab, setListingTab] = useState<MarketplaceFormTab>('details');

  const allowedRoomTypes = useMemo(() => {
    if (!planFeatures) return selectableRoomTypes;
    const allowed = planFeatures.allowedRoomTypes?.length
      ? planFeatures.allowedRoomTypes
      : ['SIMPLE'];
    return selectableRoomTypes.filter((t) => allowed.includes(t));
  }, [planFeatures]);

  const roomsQuotaMsg = getQuotaLockMessage('rooms', planQuota);

  const roomsAtLimit = Boolean(
    planQuota &&
    planQuota.limits.maxRooms < 9999 &&
    planQuota.usage.rooms >= planQuota.limits.maxRooms,
  );

  const filteredRooms = useMemo(() => {
    const q = roomQuery.trim().toLowerCase();
    return rooms.filter((room) => {
      const listing = room.venueListing;
      const hay = [
        room.name,
        room.description,
        room.floor,
        room.location,
        listing?.headline,
        listing?.city,
        listing?.commune,
        listing?.neighborhood,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      const matchesType = !filterRoomType || room.roomType === filterRoomType;
      const isPublic = Boolean(listing?.isPublic);
      const matchesVisibility = filterVisibility === 'all'
        || (filterVisibility === 'public' && isPublic)
        || (filterVisibility === 'hidden' && !isPublic);
      const matchesCity = !filterCity || (listing?.city || '').toLowerCase() === filterCity.toLowerCase();
      return matchesSearch && matchesType && matchesVisibility && matchesCity;
    });
  }, [rooms, roomQuery, filterRoomType, filterVisibility, filterCity]);

  useEffect(() => {
    setRoomsPage(1);
  }, [roomQuery, filterRoomType, filterVisibility, filterCity, roomsPageSize]);

  const regenerateBlueprint = () => {
    setBlueprintDraft((prev) => buildWizardBlueprint(roomType, layoutParams, prev));
  };

  const resetWizard = () => {
    setWizardStep(1);
    setName('');
    setDescription('');
    setFloor('');
    setLocation('');
    const initialType = allowedRoomTypes.includes('BANQUET') ? 'BANQUET' : allowedRoomTypes[0] || 'SIMPLE';
    setRoomType(initialType);
    setLayoutParams(defaultParams[initialType]);
    setBlueprintDraft(null);
    setWizardPlanTab('structure');
    setConfirmDiscard(false);
    setFarthestStep(1);
    setNameAttempted(false);
  };

  const closeWizard = () => {
    setShowWizard(false);
    resetWizard();
  };

  const wizardIsDirty = Boolean(
    name.trim() || description.trim() || floor.trim() || location.trim() || farthestStep > 1,
  );

  const requestCloseWizard = () => {
    if (saving) return;
    if (wizardIsDirty) {
      setConfirmDiscard(true);
      return;
    }
    closeWizard();
  };

  const openWizard = () => {
    if (roomsAtLimit) {
      setError(getQuotaActionMessage('rooms', planQuota, tenant?.plan));
      return;
    }
    resetWizard();
    const initialType = allowedRoomTypes.includes('BANQUET') ? 'BANQUET' : allowedRoomTypes[0] || 'SIMPLE';
    setBlueprintDraft(buildWizardBlueprint(initialType, defaultParams[initialType], null));
    setError('');
    setShowWizard(true);
  };

  const goToStep = (step: number) => {
    if (step > 1 && !name.trim()) {
      setNameAttempted(true);
      setWizardStep(1);
      return;
    }
    if (step === 3 && (wizardStep < 3 || wizardPlanTab === 'editeur')) {
      setWizardPlanTab('structure');
    }
    setWizardStep(step);
    setFarthestStep((current) => Math.max(current, step));
  };

  const nameError = nameAttempted && !name.trim()
    ? 'Indiquez le nom de la salle pour continuer.'
    : undefined;

  const load = async () => {
    setLoading(true);
    try {
      const [roomsData, teamData] = await Promise.all([
        api.get('/rooms'),
        api.get('/team'),
      ]);
      setRooms(roomsData.rooms || []);
      setCanManage(Boolean(roomsData.canManage));
      setTeamMembers((teamData.members || []).filter((m: TeamMemberOption) => !m.isOwner));
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les salles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateParam = <K extends keyof LayoutParams>(key: K, value: LayoutParams[K]) => {
    setLayoutParams((prev) => ({ ...prev, [key]: value }));
    if (CANVAS_PARAM_KEYS.has(key) && typeof value === 'number' && Number.isFinite(value) && value > 0) {
      setBlueprintDraft((draft) => {
        if (!draft) return draft;
        const widthM = key === 'canvasWidthM' || key === 'tentWidthM' ? value : draft.canvas.widthM;
        const heightM = key === 'canvasHeightM' || key === 'tentLengthM' ? value : draft.canvas.heightM;
        return { ...draft, canvas: { widthM, heightM } };
      });
    }
  };

  const handleCreate = async () => {
    setError('');
    if (roomsAtLimit) {
      setError(roomsQuotaMsg || 'Quota de salles atteint.');
      return;
    }
    if (!allowedRoomTypes.includes(roomType)) {
      setError(getRoomTypeLockMessage(roomType, tenant?.plan));
      return;
    }
    setSaving(true);
    try {
      await api.post('/rooms', {
        name,
        description: description || undefined,
        floor: floor || undefined,
        location: location || undefined,
        roomType,
        layoutBlueprint: blueprintDraft ?? undefined,
      });
      setSuccess('Salle créée avec son plan.');
      closeWizard();
      await load();
      await refreshPlanFeatures();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room: RoomItem) => {
    setDeletingRoom(true);
    setError('');
    try {
      await api.delete(`/rooms/${room.id}`);
      setSuccess(`« ${room.name} » a été supprimée.`);
      setRoomToDelete(null);
      await load();
      await refreshPlanFeatures();
    } catch (err: any) {
      setError(err.message || 'Impossible de supprimer la salle. Réessayez.');
    } finally {
      setDeletingRoom(false);
    }
  };

  const handleSaveRoomLayout = async () => {
    if (!editingRoom || !editBlueprint) return;
    if (!editMeta.name.trim()) {
      setEditNameAttempted(true);
      setEditPane('identite');
      return;
    }
    setSavingLayout(true);
    setError('');
    try {
      await api.put(`/rooms/${editingRoom.id}`, {
        name: editMeta.name.trim() || editingRoom.name,
        description: editMeta.description.trim() || undefined,
        floor: editMeta.floor.trim() || undefined,
        location: editMeta.location.trim() || undefined,
        layoutBlueprint: editBlueprint,
        roomType: editBlueprint.roomType,
      });
      setSuccess('Plan de salle enregistré.');
      setEditingRoom(null);
      setEditBlueprint(null);
      setEditPane('identite');
      setEditElementsReady(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du plan.');
    } finally {
      setSavingLayout(false);
    }
  };

  const openListing = (room: RoomItem) => {
    const listing = room.venueListing;
    const photos = Array.isArray(listing?.photos) ? listing.photos.filter(Boolean) : [];
    setListingRoom(room);
    setListingDraft({
      isPublic: Boolean(listing?.isPublic),
      headline: listing?.headline || room.name,
      city: listing?.city || '',
      commune: listing?.commune || '',
      neighborhood: listing?.neighborhood || '',
      address: listing?.address || room.location || '',
      priceFromFc: listing?.priceFromFc != null ? String(listing.priceFromFc) : '',
      priceUnit: listing?.priceUnit || 'EVENT',
      quotaMin: listing?.quotaMin != null ? String(listing.quotaMin) : '',
      quotaMax: listing?.quotaMax != null ? String(listing.quotaMax) : '',
      photos,
      blockedDates: parseBlockedDates(listing?.blockedDates),
      bookedDates: parseBlockedDates((listing?.bookings || []).flatMap((b) => bookingDateKeys(b))),
      latitude: listing?.latitude != null ? String(listing.latitude) : '',
      longitude: listing?.longitude != null ? String(listing.longitude) : '',
      details: parseListingDetails(listing?.details),
    });
    setListingTab('details');
    setError('');
  };

  const handleSaveListing = async (publish: boolean) => {
    if (!listingRoom) return;
    if (publish) {
      const missing = missingPublishLocation(listingDraft);
      if (missing === 'city') {
        setListingTab('details');
        setError('Choisissez une ville active, puis la commune et le quartier.');
        return;
      }
      if (missing === 'map') {
        setListingTab('map');
        setError('Ville, commune, quartier et position GPS sont obligatoires pour publier.');
        return;
      }
      if (missing) {
        setListingTab('details');
        setError('Ville, commune et quartier sont obligatoires pour publier.');
        return;
      }
    }
    setSavingListing(true);
    setError('');
    try {
      await api.put(`/rooms/${listingRoom.id}/listing`, {
        isPublic: publish,
        headline: listingDraft.headline,
        city: listingDraft.city,
        commune: listingDraft.commune,
        neighborhood: listingDraft.neighborhood,
        address: listingDraft.address,
        priceFromFc: listingDraft.priceFromFc ? Number(listingDraft.priceFromFc) : null,
        priceUnit: listingDraft.priceUnit,
        quotaMin: listingDraft.quotaMin ? Number(listingDraft.quotaMin) : null,
        quotaMax: listingDraft.quotaMax ? Number(listingDraft.quotaMax) : null,
        photos: listingDraft.photos,
        blockedDates: listingDraft.blockedDates,
        latitude: listingDraft.latitude || null,
        longitude: listingDraft.longitude || null,
        details: listingDraft.details,
      });
      setSuccess(publish ? 'Salle publiée sur le marketplace.' : 'Publication enregistrée (non visible).');
      setListingRoom(null);
      await load();
      await refreshProfile?.();
    } catch (err: any) {
      setError(err.message || 'Impossible d’enregistrer la fiche.');
    } finally {
      setSavingListing(false);
    }
  };

  const openEditLayout = (room: RoomItem) => {
    const bp = room.layoutBlueprint as RoomLayoutBlueprint | null;
    setEditNameAttempted(false);
    setEditPane('identite');
    setEditElementsReady(false);
    setEditingRoom(room);
    setEditMeta({
      name: room.name,
      floor: room.floor || '',
      location: room.location || '',
      description: room.description || '',
    });
    setEditBlueprint(
      bp
        ? refreshBlueprintMetadata({ ...bp })
        : refreshBlueprintMetadata(generateRoomBlueprint(room.roomType || 'SIMPLE')),
    );
  };

  const handleAssignStaff = async (roomId: string) => {
    if (!assignUserId) return;
    try {
      await api.post(`/rooms/${roomId}/staff`, {
        userId: assignUserId,
        staffRole: assignRole,
      });
      setSuccess('Staff assigné à la salle.');
      setAssignRoomId(null);
      setAssignUserId('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'assignation.');
    }
  };

  const handleRemoveStaff = async (roomId: string, userId: string) => {
    try {
      await api.delete(`/rooms/${roomId}/staff/${userId}`);
      setSuccess('Staff retiré.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Erreur.');
    }
  };

  const renderCanvasDims = (widthKey: 'canvasWidthM' | 'tentWidthM' = 'canvasWidthM', heightKey: 'canvasHeightM' | 'tentLengthM' = 'canvasHeightM') => (
    <div className="grid grid-cols-2 gap-3">
      <Input
        type="number"
        inputMode="numeric"
        label="Largeur (m)"
        min={5}
        max={80}
        value={layoutParams[widthKey] ?? (widthKey === 'tentWidthM' ? 15 : 20)}
        onChange={(e) => updateParam(widthKey, parseInt(e.target.value, 10))}
        className="text-base sm:text-sm min-h-11"
      />
      <Input
        type="number"
        inputMode="numeric"
        label="Longueur (m)"
        min={5}
        max={80}
        value={layoutParams[heightKey] ?? (heightKey === 'tentLengthM' ? 20 : 15)}
        onChange={(e) => updateParam(heightKey, parseInt(e.target.value, 10))}
        className="text-base sm:text-sm min-h-11"
      />
    </div>
  );

  const renderChairAndShape = (chairDefault: ChairType, withShape = true) => (
    <>
      {withShape && (
        <ParamSelect
          label="Forme des tables"
          value={layoutParams.tableShape ?? 'round'}
          onChange={(v) => updateParam('tableShape', v as LayoutParams['tableShape'])}
        >
          <option value="round">Ronde</option>
          <option value="rectangular">Rectangulaire</option>
          <option value="square">Carrée</option>
          <option value="oval">Ovale</option>
        </ParamSelect>
      )}
      <ParamSelect
        label="Type de chaise"
        value={layoutParams.chairType ?? chairDefault}
        onChange={(v) => updateParam('chairType', v as ChairType)}
      >
        {Object.entries(chairTypeLabels).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </ParamSelect>
    </>
  );

  const renderTypeParams = () => {
    switch (roomType) {
      case 'BANQUET':
        return (
          <div className="space-y-4">
            {renderCanvasDims()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ParamNumber
                label="Places au total"
                min={2}
                max={400}
                value={layoutParams.totalSeats ?? (layoutParams.tableCount ?? 8) * (layoutParams.seatsPerTable ?? 8)}
                onChange={(totalSeats) => {
                  const seats = Number.isFinite(totalSeats) ? totalSeats : 8;
                  const per = layoutParams.seatsPerTable ?? 8;
                  setLayoutParams((prev) => ({
                    ...prev,
                    totalSeats: seats,
                    tableCount: Math.max(1, Math.ceil(seats / per)),
                  }));
                }}
              />
              <ParamNumber
                label="Nombre de tables"
                min={1}
                max={80}
                value={layoutParams.tableCount ?? 8}
                onChange={(n) => updateParam('tableCount', n)}
              />
              <ParamNumber
                label="Places / table"
                min={2}
                max={24}
                value={layoutParams.seatsPerTable ?? 8}
                onChange={(n) => updateParam('seatsPerTable', n)}
              />
              {renderChairAndShape('BANQUET')}
            </div>
          </div>
        );
      case 'CONFERENCE':
        return (
          <div className="space-y-4">
            {renderCanvasDims()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ParamNumber
                label="Places au total"
                min={2}
                max={400}
                value={layoutParams.totalSeats ?? (layoutParams.rowCount ?? 6) * (layoutParams.seatsPerRow ?? 10)}
                onChange={(totalSeats) => {
                  const seats = Number.isFinite(totalSeats) ? totalSeats : 10;
                  const per = layoutParams.seatsPerRow ?? 10;
                  setLayoutParams((prev) => ({
                    ...prev,
                    totalSeats: seats,
                    rowCount: Math.max(1, Math.ceil(seats / per)),
                  }));
                }}
              />
              <ParamNumber
                label="Nombre de rangées"
                min={1}
                max={30}
                value={layoutParams.rowCount ?? 6}
                onChange={(n) => updateParam('rowCount', n)}
              />
              <ParamNumber
                label="Places / rangée"
                min={2}
                max={40}
                value={layoutParams.seatsPerRow ?? 10}
                onChange={(n) => updateParam('seatsPerRow', n)}
              />
              {renderChairAndShape('THEATER', false)}
            </div>
          </div>
        );
      case 'AMPHITHEATER':
        return (
          <div className="space-y-4">
            {renderCanvasDims()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ParamNumber
                label="Places au total"
                min={2}
                max={400}
                value={layoutParams.totalSeats ?? (layoutParams.tierCount ?? 3) * (layoutParams.rowsPerTier ?? 2) * (layoutParams.seatsPerRow ?? 12)}
                onChange={(totalSeats) => {
                  const seats = Number.isFinite(totalSeats) ? totalSeats : 12;
                  const seatsPerRow = layoutParams.seatsPerRow ?? 12;
                  const rows = Math.max(1, Math.ceil(seats / seatsPerRow));
                  const tierCount = Math.min(6, Math.max(2, Math.ceil(Math.sqrt(rows))));
                  setLayoutParams((prev) => ({
                    ...prev,
                    totalSeats: seats,
                    tierCount,
                    rowsPerTier: Math.max(1, Math.ceil(rows / tierCount)),
                  }));
                }}
              />
              <ParamNumber
                label="Gradins"
                min={1}
                max={10}
                value={layoutParams.tierCount ?? 3}
                onChange={(n) => updateParam('tierCount', n)}
              />
              <ParamNumber
                label="Rangées / gradin"
                min={1}
                max={10}
                value={layoutParams.rowsPerTier ?? 2}
                onChange={(n) => updateParam('rowsPerTier', n)}
              />
              <ParamNumber
                label="Places / rangée"
                min={2}
                max={40}
                value={layoutParams.seatsPerRow ?? 12}
                onChange={(n) => updateParam('seatsPerRow', n)}
              />
              {renderChairAndShape('THEATER', false)}
            </div>
          </div>
        );
      case 'TENT':
        return (
          <div className="space-y-4">
            {renderCanvasDims('tentWidthM', 'tentLengthM')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ParamNumber
                label="Places au total"
                min={0}
                max={400}
                value={layoutParams.totalSeats ?? (layoutParams.tableCount ?? 0) * (layoutParams.seatsPerTable ?? 8)}
                onChange={(totalSeats) => {
                  const seats = Number.isFinite(totalSeats) ? totalSeats : 0;
                  const per = layoutParams.seatsPerTable ?? 8;
                  setLayoutParams((prev) => ({
                    ...prev,
                    totalSeats: seats || undefined,
                    tableCount: seats > 0 ? Math.max(1, Math.ceil(seats / per)) : 0,
                  }));
                }}
              />
              <ParamNumber
                label="Tables intérieures"
                min={0}
                max={40}
                value={layoutParams.tableCount ?? 0}
                onChange={(n) => updateParam('tableCount', n)}
              />
              <ParamNumber
                label="Places / table"
                min={2}
                max={24}
                value={layoutParams.seatsPerTable ?? 8}
                onChange={(n) => updateParam('seatsPerTable', n)}
              />
              {renderChairAndShape('BANQUET')}
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-3">
            {renderCanvasDims()}
            <p className="text-sm text-muted">
              Canvas vide : ajoutez tables, rangées, scène et décorations directement sur le plan.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Salles de l&apos;organisation
          </h2>
          <p className="text-xs text-muted mt-1">
            Créez une salle en 3 étapes : identité, type, puis structure.
            {canCatalogPublish
              ? ' Vous pouvez ensuite la publier pour la location.'
              : ' Ces salles servent au plan de table — elles ne sont pas publiées sur le marketplace.'}
            {planQuota && (
              <span className="block mt-1 font-medium text-primary">
                Salles : {planQuota.usage.rooms} / {planQuota.limits.maxRooms >= 9999 ? '∞' : planQuota.limits.maxRooms}
                {planFeatures?.roomEditorLevel && (
                  <> · Éditeur {planFeatures.roomEditorLevel}</>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rooms.length > 0 && (
            <ViewModeToggle
              storageKey="em-view-rooms"
              value={roomsViewMode}
              onChange={setRoomsViewMode}
              columns={roomsColumns}
              onColumnsChange={setRoomsColumns}
            />
          )}
          {canManage && (
            <Button
              type="button"
              size="sm"
              onClick={openWizard}
              disabled={roomsAtLimit}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nouvelle salle
            </Button>
          )}
        </div>
      </div>

      {error && !showWizard && !viewingRoom && !editingRoom && !listingRoom && !roomToDelete && (
        <Alert variant="error">{error}</Alert>
      )}
      {success && !showWizard && !viewingRoom && !editingRoom && !listingRoom && !roomToDelete && (
        <Alert variant="success">{success}</Alert>
      )}

      {roomsAtLimit && (
        <PlanLimitCallout kind="rooms" planQuota={planQuota} planName={tenant?.plan} />
      )}

      {rooms.length > 0 && (() => {
        const chips: CatalogueFilterChip[] = [
          ...(filterRoomType ? [{ id: 'roomType', label: 'Type', value: roomTypeLabels[filterRoomType as RoomType] || filterRoomType }] : []),
          ...(filterVisibility !== 'all' ? [{ id: 'visibility', label: 'Visibilité', value: filterVisibility === 'public' ? 'Publiées' : 'Non publiées' }] : []),
          ...(filterCity ? [{ id: 'city', label: 'Ville', value: filterCity }] : []),
        ];
        return (
          <CatalogueFilterBar
            search={roomQuery}
            onSearchChange={setRoomQuery}
            searchPlaceholder="Nom, emplacement, commune…"
            view={roomsViewMode}
            onViewChange={(mode) => {
              if (mode === 'grid' || mode === 'list') setRoomsViewMode(mode);
            }}
            hideViewToggle
            chips={chips}
            onRemoveChip={(id) => {
              if (id === 'roomType') setFilterRoomType('');
              if (id === 'visibility') setFilterVisibility('all');
              if (id === 'city') setFilterCity('');
            }}
            onClearChips={() => {
              setRoomQuery('');
              setFilterRoomType('');
              setFilterVisibility('all');
              setFilterCity('');
            }}
            resultLabel={`${filteredRooms.length} salle${filteredRooms.length > 1 ? 's' : ''}`}
            modalTitle="Filtrer les salles"
            filters={
              <>
                <CatalogueFilterField label="Type de salle">
                  <CatalogueChoicePills
                    options={ROOM_TYPE_FILTER_OPTIONS}
                    value={filterRoomType}
                    onChange={setFilterRoomType}
                  />
                </CatalogueFilterField>
                {canCatalogPublish ? (
                  <CatalogueFilterField label="Publication marketplace">
                    <CatalogueChoicePills
                      options={[
                        { id: 'all', label: 'Toutes' },
                        { id: 'public', label: 'Publiées' },
                        { id: 'hidden', label: 'Non publiées' },
                      ]}
                      value={filterVisibility}
                      onChange={(id) => setFilterVisibility((id as 'all' | 'public' | 'hidden') || 'all')}
                    />
                  </CatalogueFilterField>
                ) : null}
                <CatalogueFilterField label="Ville de la fiche">
                  <CatalogueChoicePills
                    options={marketplaceCities.map((name) => ({ id: name, label: name }))}
                    value={filterCity}
                    onChange={setFilterCity}
                  />
                </CatalogueFilterField>
              </>
            }
          />
        );
      })()}

      <Modal
        open={showWizard && canManage}
        onClose={requestCloseWizard}
        title="Nouvelle salle"
        description={
          wizardStep === 3
            ? wizardPlanTab === 'editeur'
              ? 'Ajustez le plan si besoin, puis créez la salle.'
              : 'Étages et capacité suffisent. Le plan est optionnel.'
            : 'Nommez la salle, choisissez le type, puis la structure — le plan reste modifiable.'
        }
        size={wizardStep === 3 && wizardPlanTab === 'editeur' ? 'full' : wizardStep === 3 ? 'lg' : 'lg'}
        className={wizardStep === 3 && wizardPlanTab === 'editeur' ? 'h-[100dvh] sm:h-auto sm:max-h-[96vh] rounded-none sm:rounded-2xl' : undefined}
        footer={
          <div className="flex w-full justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={wizardStep === 1 && wizardPlanTab !== 'editeur'}
              onClick={() => {
                if (wizardStep === 3 && wizardPlanTab === 'editeur') {
                  setWizardPlanTab('capacite');
                  return;
                }
                goToStep(wizardStep - 1);
              }}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Précédent
            </Button>
            {wizardStep < 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => goToStep(wizardStep + 1)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Suivant
              </Button>
            ) : (
              <Button
                type="button"
                variant="success"
                size="sm"
                loading={saving}
                onClick={() => {
                  if (!name.trim()) {
                    setNameAttempted(true);
                    setWizardStep(1);
                    return;
                  }
                  void handleCreate();
                }}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Créer la salle
              </Button>
            )}
          </div>
        }
      >
        {error && showWizard && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        {confirmDiscard && (
          <Alert variant="warning" title="Fermer sans créer ?" className="mb-4">
            <p>Le nom, le type et le plan de cette salle ne seront pas enregistrés.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmDiscard(false)}>
                Continuer l’édition
              </Button>
              <Button type="button" size="sm" variant="danger" onClick={closeWizard}>
                Fermer sans créer
              </Button>
            </div>
          </Alert>
        )}

        <nav aria-label="Étapes de création" className="mb-5 overflow-x-auto">
          <ol className="flex items-center gap-1 sm:gap-2 m-0 p-0 list-none">
            {WIZARD_STEPS.map((step, idx) => {
              const active = wizardStep === step.id;
              const done = wizardStep > step.id;
              const canReach = step.id <= Math.max(wizardStep, farthestStep) || step.id === wizardStep + 1;
              return (
                <li key={step.id} className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 last:flex-none">
                  {idx > 0 && (
                    <div className={cn('h-px flex-1 min-w-2', done ? 'bg-primary' : 'bg-border')} aria-hidden />
                  )}
                  <button
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    aria-disabled={!canReach}
                    disabled={!canReach}
                    onClick={() => goToStep(step.id)}
                    className={cn(
                      'inline-flex items-center gap-2 min-h-11 px-2.5 sm:px-3 rounded-[var(--radius-button)] text-sm font-medium transition-colors shrink-0',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      active && 'bg-primary/10 text-primary',
                      done && !active && 'text-primary',
                      !active && !done && 'text-muted',
                      !canReach && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border',
                        active && 'bg-primary text-primary-foreground border-primary',
                        done && !active && 'bg-primary/15 text-primary border-primary/30',
                        !active && !done && 'border-border bg-surface',
                      )}
                      aria-hidden
                    >
                      {done && !active ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </span>
                    <span className="sm:hidden">{step.shortLabel}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {wizardStep === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Identité</h3>
              <p className="text-xs text-muted mt-1 mb-3">Nom et emplacement visibles pour l’équipe et le catalogue.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nom de la salle"
                  required
                  value={name}
                  error={nameError}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setNameAttempted(false);
                  }}
                  placeholder="Ex. Grand salon"
                  className="text-base sm:text-sm min-h-11"
                  data-modal-initial-focus
                />
                <Input
                  label="Étage / Aile"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="Ex. RDC, 1er étage"
                  className="text-base sm:text-sm min-h-11"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Emplacement"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex. Bâtiment A, jardin"
                    className="text-base sm:text-sm min-h-11"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor={notesFieldId} className="block text-sm font-semibold text-foreground">
                Description
              </label>
              <textarea
                id={notesFieldId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ambiance, contraintes, notes protocole…"
                className={fieldClass}
                aria-describedby={`${notesFieldId}-hint`}
              />
              <p id={`${notesFieldId}-hint`} className="text-xs text-muted">
                À l’étape Structure : étages, capacité, éventuellement le plan.
              </p>
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-5">
            <p className="text-sm text-muted">
              Choisissez le type selon l’usage. Disponibles selon votre forfait
              {planFeatures?.roomEditorLevel ? ` (éditeur ${planFeatures.roomEditorLevel})` : ''}.
            </p>
            <div role="radiogroup" aria-label="Type de salle" className="space-y-5">
            {ROOM_TYPE_THEME_GROUPS.map((group) => (
              <section key={group.id} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2 px-0.5">
                  <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                  <span className="text-xs text-muted">{group.hint}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {group.types.map((type) => {
                    const locked = Boolean(planFeatures) && !allowedRoomTypes.includes(type);
                    const minLevel = ROOM_TYPE_MIN_LEVEL[type];
                    const selected = !locked && roomType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-disabled={locked || undefined}
                        disabled={locked}
                        onClick={() => {
                          if (locked) return;
                          setRoomType(type);
                          setLayoutParams(defaultParams[type]);
                          setBlueprintDraft(buildWizardBlueprint(type, defaultParams[type], null));
                        }}
                        className={cn(
                          'text-left p-3.5 min-h-11 rounded-[var(--radius-card)] border transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                          locked && 'opacity-55 cursor-not-allowed bg-surface-muted',
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : !locked
                              ? 'border-border bg-surface hover:bg-surface-muted'
                              : 'border-border',
                        )}
                      >
                        <div className={cn('mb-2 flex items-center justify-between', selected ? 'text-primary' : 'text-muted')}>
                          <span aria-hidden>{roomTypeIcons[type]}</span>
                          {locked ? <Lock className="w-3.5 h-3.5" aria-hidden /> : selected ? (
                            <span className="text-xs font-bold text-primary">Sélectionné</span>
                          ) : null}
                        </div>
                        <p className="font-semibold text-sm text-foreground">{roomTypeLabels[type]}</p>
                        <p className="text-xs text-muted mt-1 leading-relaxed">{roomTypeDescriptions[type]}</p>
                        {locked && (
                          <p className="text-xs font-semibold text-foreground mt-2">
                            {minLevel === 'standard' ? 'Business+' : minLevel === 'advanced' ? 'Premium+' : 'Enterprise 1+'}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            </div>
            {planFeatures && allowedRoomTypes.length < selectableRoomTypes.length && (
              <p className="text-sm text-muted">
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center min-h-11 font-semibold text-primary underline-offset-2 hover:underline rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Changer de forfait
                </Link>
                {' '}pour débloquer d’autres types de salle.
              </p>
            )}
          </div>
        )}

        {wizardStep === 3 && blueprintDraft && (() => {
          const wizardPlanTabs: Array<{ id: WizardPlanTab; label: string }> = [
            { id: 'structure', label: 'Structure' },
            { id: 'capacite', label: 'Capacité' },
            ...(planFeatures?.roomThemesFixtures === true
              ? [{ id: 'ambiance' as const, label: 'Ambiance' }]
              : []),
          ];
          const openOptionalPlan = () => setWizardPlanTab('editeur');
          const movePlanTab = (dir: 1 | -1) => {
            const i = wizardPlanTabs.findIndex((tab) => tab.id === wizardPlanTab);
            const next = wizardPlanTabs[(i + dir + wizardPlanTabs.length) % wizardPlanTabs.length];
            if (!next) return;
            setWizardPlanTab(next.id);
            window.requestAnimationFrame(() => {
              document.getElementById(`wizard-tab-${next.id}`)?.focus();
            });
          };
          return (
            <div className="space-y-4">
              {wizardPlanTab === 'editeur' ? (
                <button
                  type="button"
                  onClick={() => setWizardPlanTab('capacite')}
                  className="inline-flex items-center gap-1.5 min-h-11 text-sm font-medium text-primary underline-offset-2 hover:underline rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden />
                  Retour à la capacité
                </button>
              ) : (
              <div
                role="tablist"
                aria-label="Structure et capacité"
                className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    movePlanTab(1);
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    movePlanTab(-1);
                  }
                }}
              >
                {wizardPlanTabs.map((tab) => {
                  const selected = wizardPlanTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      id={`wizard-tab-${tab.id}`}
                      aria-selected={selected}
                      aria-controls={`wizard-panel-${tab.id}`}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setWizardPlanTab(tab.id)}
                      className={cn(
                        'shrink-0 min-h-11 px-4 rounded-full text-sm font-medium border transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface border-border text-muted hover:bg-surface-muted',
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              )}

              <div
                role="tabpanel"
                id="wizard-panel-structure"
                aria-labelledby="wizard-tab-structure"
                hidden={wizardPlanTab !== 'structure'}
              >
                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" aria-hidden />
                      Modèle d’étages
                    </h3>
                    <p className="text-xs text-muted mt-1">
                      Un clic crée les niveaux, l’escalier et éventuellement les balcons.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {BUILDING_STORY_PRESETS.map((preset) => {
                      const active = resolveBuildingPresetId(blueprintDraft) === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setBlueprintDraft(applyBuildingStoryPreset(blueprintDraft, preset.id));
                          }}
                          className={cn(
                            'text-left p-3 rounded-[var(--radius-card)] border transition min-h-11',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                            active
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                              : 'border-border bg-surface-muted/40 hover:bg-surface-muted',
                          )}
                        >
                          <p className={cn('text-sm font-bold', active ? 'text-primary' : 'text-foreground')}>
                            {preset.label}
                          </p>
                          <p className="text-xs text-muted mt-1 leading-snug">{preset.hint}</p>
                          {active ? (
                            <span className="inline-block mt-2 text-xs font-bold text-primary">
                              Sélectionné
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setWizardPlanTab('capacite')}
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      Suivant : capacité
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={openOptionalPlan}>
                      Ajuster le plan (optionnel)
                    </Button>
                  </div>
                </section>
              </div>

              <div
                role="tabpanel"
                id="wizard-panel-capacite"
                aria-labelledby="wizard-tab-capacite"
                hidden={wizardPlanTab !== 'capacite'}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-primary" aria-hidden />
                      Capacité — {roomTypeLabels[roomType]}
                    </h3>
                    <p className="text-sm font-medium text-foreground tabular-nums">
                      {blueprintDraft.metadata.totalSeats} places · {blueprintDraft.canvas.widthM}×{blueprintDraft.canvas.heightM} m
                    </p>
                  </div>
                  <div>{renderTypeParams()}</div>
                  {roomType !== 'SIMPLE' && roomType !== 'CUSTOM' && (
                    <div className="pt-1 space-y-2">
                      <Button type="button" size="sm" variant="secondary" onClick={regenerateBlueprint}>
                        Recalculer les tables et rangées
                      </Button>
                      <p className="text-xs text-muted">
                        Remplace le mobilier. Les dimensions s’appliquent tout de suite ; les étages sont conservés.
                      </p>
                    </div>
                  )}
                  <Button type="button" size="sm" variant="secondary" onClick={openOptionalPlan}>
                    Ajuster le plan (optionnel)
                  </Button>
                </div>
              </div>

              {planFeatures?.roomThemesFixtures === true ? (
                <div
                  role="tabpanel"
                  id="wizard-panel-ambiance"
                  aria-labelledby="wizard-tab-ambiance"
                  hidden={wizardPlanTab !== 'ambiance'}
                >
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" aria-hidden />
                        Ambiance visuelle
                      </h3>
                      <p className="text-xs text-muted mt-1">
                        Thèmes groupés — sol, couleurs, atmosphère.
                      </p>
                    </div>
                    <div className="space-y-3 max-h-[min(52vh,28rem)] overflow-y-auto pr-1">
                      {groupThemesByCategory(listAvailableThemes(blueprintDraft)).map(({ category, label, themes }) => (
                        <div key={category} className="space-y-2">
                          <p className="text-xs font-semibold text-muted">
                            {label || roomThemeCategoryLabels[category]}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {themes.map((theme) => {
                              const active =
                                blueprintDraft.metadata.roomThemeId === theme.id
                                || (!blueprintDraft.metadata.roomThemeId && theme.id === 'classic');
                              return (
                                <button
                                  key={theme.id}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => {
                                    setBlueprintDraft(applyRoomTheme(blueprintDraft, theme.id as RoomThemeId, { keepFloor: false }));
                                  }}
                                  className={cn(
                                    'text-left min-h-11 py-2.5 px-2.5 rounded-[var(--radius-button)] border text-sm font-medium transition-colors overflow-hidden',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                                    active
                                      ? 'bg-primary/10 border-primary/50 text-primary ring-1 ring-primary/20'
                                      : 'border-border text-muted hover:bg-surface-muted',
                                  )}
                                >
                                  <span
                                    className="block h-9 rounded-[var(--radius-button)] mb-1.5 border border-border"
                                    aria-hidden
                                    style={{
                                      background: `${theme.canvasPattern ? `${theme.canvasPattern}, ` : ''}${theme.canvasBackground}`,
                                    }}
                                  />
                                  {theme.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button type="button" size="sm" variant="secondary" onClick={openOptionalPlan}>
                      Ajuster le plan (optionnel)
                    </Button>
                  </section>
                </div>
              ) : null}

              <div
                role="tabpanel"
                id="wizard-panel-editeur"
                aria-label="Plan"
                hidden={wizardPlanTab !== 'editeur'}
              >
                {wizardPlanTab === 'editeur' ? (
                  <RoomLayoutEditor
                    blueprint={blueprintDraft}
                    onChange={setBlueprintDraft}
                    onRegenerate={regenerateBlueprint}
                    allowThemesFixtures={planFeatures?.roomThemesFixtures === true}
                    editorLevel={planFeatures?.roomEditorLevel}
                  />
                ) : null}
              </div>
            </div>
          );
        })()}
        {wizardStep === 3 && !blueprintDraft && (
          <p role="status" className="text-sm text-muted">Préparation du plan…</p>
        )}
      </Modal>

      <Modal
        open={Boolean(roomToDelete)}
        onClose={() => {
          if (deletingRoom) return;
          setRoomToDelete(null);
        }}
        title={roomToDelete ? `Supprimer « ${roomToDelete.name} » ?` : 'Supprimer la salle'}
        description="La salle sera retirée de l’organisation. Cette action ne peut pas être annulée."
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={deletingRoom}
              onClick={() => setRoomToDelete(null)}
            >
              Garder la salle
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={deletingRoom}
              disabled={!roomToDelete}
              onClick={() => {
                if (roomToDelete) void handleDelete(roomToDelete);
              }}
            >
              Supprimer la salle
            </Button>
          </div>
        }
      >
        {error && roomToDelete ? <Alert variant="error">{error}</Alert> : (
          <p className="text-sm text-muted">
            Confirmez seulement si vous n’avez plus besoin de cette salle.
          </p>
        )}
      </Modal>

      {loading ? (
        <SkeletonRoomsView mode={roomsViewMode} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Aucune salle configurée"
          description="Créez votre première salle pour le plan de table et le staff."
          action={
            canManage && !roomsAtLimit ? (
              <Button type="button" size="sm" onClick={openWizard} leftIcon={<Plus className="w-4 h-4" />}>
                Créer une salle
              </Button>
            ) : undefined
          }
        />
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Aucune salle pour ces filtres"
          description="Élargissez le type, la ville ou la visibilité, ou créez une nouvelle salle."
        />
      ) : (
        <div
          className={
            roomsViewMode === 'grid'
              ? roomsGridClass
              : listStackClass
          }
        >
          {paginateItems(filteredRooms, roomsPage, roomsPageSize).map((room) => {
            const metaLine = [room.floor, room.location, room.capacity ? `${room.capacity} places` : null]
              .filter(Boolean)
              .join(' · ') || 'Sans détails';
            const actions = (
              <>
                <button
                  type="button"
                  onClick={() => setViewingRoom(room)}
                  className={roomsViewMode === 'list' ? 'inline-flex items-center min-h-11' : iconActionClass}
                  aria-label={`Voir les détails de ${room.name}`}
                  title="Voir les détails"
                >
                  {roomsViewMode === 'list' ? <ListRowAction>Détails</ListRowAction> : <Eye className="w-4 h-4" aria-hidden />}
                </button>
                {canManage ? (
              <>
                {canCatalogPublish && (
                <button
                  type="button"
                  onClick={() => openListing(room)}
                  className={iconActionClass}
                  aria-label={room.venueListing?.isPublic ? `Fiche marketplace de ${room.name}` : `Publier ${room.name}`}
                  title={room.venueListing?.isPublic ? 'Fiche marketplace' : 'Publier cette salle'}
                >
                  {room.venueListing?.isPublic ? <Globe className="w-4 h-4" aria-hidden /> : <GlobeLock className="w-4 h-4" aria-hidden />}
                </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditLayout(room)}
                  className={roomsViewMode === 'list' ? 'inline-flex items-center min-h-11' : iconActionClass}
                  aria-label={`Modifier le plan de ${room.name}`}
                  title="Modifier le plan"
                >
                  {roomsViewMode === 'list' ? <ListRowAction>Plan</ListRowAction> : <Edit3 className="w-4 h-4" aria-hidden />}
                </button>
                <button
                  type="button"
                  onClick={() => setRoomToDelete(room)}
                  className={iconActionClass}
                  aria-label={`Supprimer ${room.name}`}
                  title="Supprimer la salle"
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                </button>
              </>
                ) : null}
              </>
            );

            return (
              <div key={room.id} className="space-y-2">
                <ProjectCard
                  id={room.id}
                  title={room.name}
                  layout={roomsViewMode}
                  icon={<Building2 className="w-4 h-4" />}
                  overlayMeta={roomTypeLabels[room.roomType || 'SIMPLE']}
                  ctaLabel="Ouvrir la salle"
                  onClick={() => setViewingRoom(room)}
                  cover={
                    room.layoutBlueprint ? (
                      <RoomLayoutPreview
                        blueprint={room.layoutBlueprint as RoomLayoutBlueprint}
                        quality="thumb"
                        showMeta={false}
                        className="!space-y-0 h-full w-full [&_.em-floor-canvas]:rounded-none [&_.em-floor-canvas]:border-0 [&_.em-floor-canvas]:h-full"
                      />
                    ) : undefined
                  }
                  meta={
                    roomsViewMode === 'list' ? (
                      <span>{metaLine}</span>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="inline-flex text-xs font-semibold uppercase tracking-wide text-primary">
                          {roomTypeLabels[room.roomType || 'SIMPLE']}
                        </span>
                        <p>{metaLine}</p>
                      </div>
                    )
                  }
                  value={
                    roomsViewMode === 'list'
                      ? `${room.staff.length} staff`
                      : undefined
                  }
                  status={
                    roomsViewMode === 'list' ? (
                      canCatalogPublish && room.venueListing?.isPublic ? (
                        <StatusPill tone="emerald">Publiée</StatusPill>
                      ) : (
                      <StatusPill tone="primary">
                        {roomTypeLabels[room.roomType || 'SIMPLE']}
                      </StatusPill>
                      )
                    ) : canCatalogPublish && room.venueListing?.isPublic ? (
                      <StatusPill tone="emerald">Publiée</StatusPill>
                    ) : undefined
                  }
                  description={roomsViewMode === 'grid' ? room.description : undefined}
                  actions={actions}
                >
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Staff ({room.staff.length})
                    </p>
                    {room.staff.length === 0 ? (
                      <p className="text-xs text-muted italic">Aucun staff assigné.</p>
                    ) : (
                      room.staff.slice(0, roomsViewMode === 'grid' ? 2 : 4).map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between text-xs bg-surface-muted rounded-[var(--radius-button)] px-2.5 py-1.5"
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-medium text-foreground">
                              {s.user.name || s.user.email}
                            </span>
                            <span className="ml-1.5 text-xs font-semibold uppercase text-primary">
                              {roleLabels[s.staffRole]}
                            </span>
                          </div>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStaff(room.id, s.user.id)}
                              className={cn(iconActionClass, 'shrink-0')}
                              aria-label={`Retirer ${s.user.name || s.user.email} de ${room.name}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ProjectCard>

                {canManage && (
                  assignRoomId === room.id ? (
                    <div className="flex flex-wrap gap-2 items-end p-3 border border-border rounded-[var(--radius-card)] bg-surface-muted">
                      <label className="flex-1 min-w-[140px]">
                        <span className="sr-only">Membre à assigner</span>
                        <select
                          value={assignUserId}
                          onChange={(e) => setAssignUserId(e.target.value)}
                          className={fieldClass}
                          aria-label="Membre à assigner"
                        >
                        <option value="">Choisir un utilisateur</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name || m.email}</option>
                        ))}
                        </select>
                      </label>
                      <label>
                        <span className="sr-only">Rôle dans la salle</span>
                        <select
                          value={assignRole}
                          onChange={(e) => setAssignRole(e.target.value as 'MANAGER' | 'PROTOCOL')}
                          className={fieldClass}
                          aria-label="Rôle dans la salle"
                        >
                        <option value="MANAGER">Manager</option>
                        <option value="PROTOCOL">Protocole</option>
                        </select>
                      </label>
                      <Button type="button" size="sm" onClick={() => handleAssignStaff(room.id)}>
                        Assigner
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setAssignRoomId(null)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAssignRoomId(room.id)}
                      className="inline-flex items-center gap-1.5 min-h-11 text-sm font-medium text-primary underline-offset-2 hover:underline px-1 rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Assigner un staff
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
      {filteredRooms.length > 0 && (
        <Pagination
          page={roomsPage}
          pageSize={roomsPageSize}
          total={filteredRooms.length}
          onPageChange={setRoomsPage}
          onPageSizeChange={setRoomsPageSize}
          itemLabel="salles"
        />
      )}

      <Modal
        open={Boolean(viewingRoom)}
        onClose={() => setViewingRoom(null)}
        title={viewingRoom ? viewingRoom.name : 'Détails de la salle'}
        description={viewingRoom ? [roomTypeLabels[viewingRoom.roomType || 'SIMPLE'], viewingRoom.floor, viewingRoom.location].filter(Boolean).join(' · ') : undefined}
        size="xl"
        footer={
          <div className="flex w-full justify-between gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setViewingRoom(null)}>
              Fermer
            </Button>
            {canManage && viewingRoom && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const room = viewingRoom;
                  setViewingRoom(null);
                  openEditLayout(room);
                }}
                leftIcon={<Edit3 className="w-4 h-4" />}
              >
                Modifier le plan
              </Button>
            )}
          </div>
        }
      >
        {viewingRoom && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-[var(--radius-button)] border border-border bg-surface-muted px-3 py-2">
                <p className="text-xs font-bold uppercase text-muted">Type</p>
                <p className="font-semibold text-foreground">{roomTypeLabels[viewingRoom.roomType || 'SIMPLE']}</p>
              </div>
              <div className="rounded-[var(--radius-button)] border border-border bg-surface-muted px-3 py-2">
                <p className="text-xs font-bold uppercase text-muted">Capacité</p>
                <p className="font-semibold text-foreground">
                  {viewingRoom.layoutBlueprint?.metadata?.totalSeats || viewingRoom.capacity || '—'} places
                </p>
              </div>
              <div className="rounded-[var(--radius-button)] border border-border bg-surface-muted px-3 py-2">
                <p className="text-xs font-bold uppercase text-muted">Dimensions</p>
                <p className="font-semibold text-foreground">
                  {viewingRoom.layoutBlueprint
                    ? `${viewingRoom.layoutBlueprint.canvas.widthM}×${viewingRoom.layoutBlueprint.canvas.heightM} m`
                    : '—'}
                </p>
              </div>
              <div className="rounded-[var(--radius-button)] border border-border bg-surface-muted px-3 py-2">
                <p className="text-xs font-bold uppercase text-muted">Staff</p>
                <p className="font-semibold text-foreground">{viewingRoom.staff.length}</p>
              </div>
            </div>
            {viewingRoom.description && (
              <p className="text-sm text-muted leading-relaxed">{viewingRoom.description}</p>
            )}
            <div className="border border-border rounded-[var(--radius-card)] p-3 sm:p-4 bg-surface">
              <h3 className="text-sm font-semibold mb-2">Rendu de la salle</h3>
              <RoomLayoutPreview
                blueprint={viewingRoom.layoutBlueprint}
                quality="showcase"
                showDepthControls
              />
            </div>
            {viewingRoom.staff.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Staff
                </p>
                {viewingRoom.staff.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs bg-surface-muted rounded-[var(--radius-button)] px-2.5 py-1.5">
                    <span className="font-medium text-foreground">{s.user.name || s.user.email}</span>
                    <span className="text-xs font-semibold uppercase text-primary">{roleLabels[s.staffRole]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(editingRoom && editBlueprint)}
        onClose={() => { setEditingRoom(null); setEditBlueprint(null); setEditNameAttempted(false); setEditPane('identite'); setEditElementsReady(false); }}
        title={editingRoom ? `Salle — ${editingRoom.name}` : 'Plan'}
        description="Identité d’abord, puis les éléments de la salle."
        size={editPane === 'elements' ? 'full' : 'lg'}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingRoom(null); setEditBlueprint(null); setEditNameAttempted(false); setEditPane('identite'); setEditElementsReady(false); }}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="success"
              size="sm"
              loading={savingLayout}
              onClick={handleSaveRoomLayout}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Enregistrer la salle
            </Button>
          </div>
        }
      >
        {editBlueprint && (
          <div className="space-y-4">
            {error && editingRoom && (
              <Alert variant="error">{error}</Alert>
            )}
            <div
              role="tablist"
              aria-label="Édition de la salle"
              className="flex gap-1.5 overflow-x-auto pb-1"
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const tabs = ['identite', 'elements'] as const;
                const i = tabs.indexOf(editPane);
                const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
                setEditPane(next);
                if (next === 'elements') setEditElementsReady(true);
                window.requestAnimationFrame(() => {
                  document.getElementById(`edit-tab-${next}`)?.focus();
                });
              }}
            >
              {([
                { id: 'identite' as const, label: 'Identité' },
                { id: 'elements' as const, label: 'Éléments de la salle' },
              ]).map((tab) => {
                const selected = editPane === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`edit-tab-${tab.id}`}
                    aria-selected={selected}
                    aria-controls={`edit-panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => {
                      setEditPane(tab.id);
                      if (tab.id === 'elements') setEditElementsReady(true);
                    }}
                    className={cn(
                      'shrink-0 min-h-11 px-4 rounded-full text-sm font-medium border transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-surface border-border text-muted hover:bg-surface-muted',
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div
              role="tabpanel"
              id="edit-panel-identite"
              aria-labelledby="edit-tab-identite"
              hidden={editPane !== 'identite'}
              className="space-y-3"
            >
            <p className="text-sm text-muted">Nom et emplacement visibles pour l’équipe et le catalogue.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nom de la salle"
                required
                value={editMeta.name}
                error={editNameAttempted && !editMeta.name.trim() ? 'Indiquez le nom de la salle pour enregistrer.' : undefined}
                onChange={(e) => {
                  setEditMeta((m) => ({ ...m, name: e.target.value }));
                  if (e.target.value.trim()) setEditNameAttempted(false);
                }}
                className="text-base sm:text-sm min-h-11"
              />
              <Input
                label="Étage / Aile"
                value={editMeta.floor}
                onChange={(e) => setEditMeta((m) => ({ ...m, floor: e.target.value }))}
                className="text-base sm:text-sm min-h-11"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Emplacement"
                  value={editMeta.location}
                  onChange={(e) => setEditMeta((m) => ({ ...m, location: e.target.value }))}
                  className="text-base sm:text-sm min-h-11"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor={editNotesFieldId} className={labelClass}>
                  Description
                </label>
                <textarea
                  id={editNotesFieldId}
                  value={editMeta.description}
                  onChange={(e) => setEditMeta((m) => ({ ...m, description: e.target.value }))}
                  rows={3}
                  className={fieldClass}
                />
              </div>
            </div>
            </div>
            <div
              role="tabpanel"
              id="edit-panel-elements"
              aria-labelledby="edit-tab-elements"
              hidden={editPane !== 'elements'}
              className="space-y-3"
            >
            <p className="text-sm text-muted">Tables, murs, étages et décor — sans changer le nom de la salle.</p>
            {rooms.filter((room) => room.id !== editingRoom?.id && room.layoutBlueprint).length > 0 ? (
              <ParamSelect
                label="Copier le style depuis une autre salle"
                value=""
                onChange={(roomId) => {
                  if (!roomId || !editBlueprint) return;
                  const source = rooms.find((room) => room.id === roomId);
                  if (!source?.layoutBlueprint) return;
                  const preset = captureRoomAmbienceFromBlueprint(
                    source.layoutBlueprint as RoomLayoutBlueprint,
                    `copy-${source.id}`,
                    source.name,
                  );
                  setEditBlueprint(applyRoomAmbiencePreset(editBlueprint, preset));
                }}
              >
                <option value="">Choisir une salle…</option>
                {rooms
                  .filter((room) => room.id !== editingRoom?.id && room.layoutBlueprint)
                  .map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
              </ParamSelect>
            ) : null}
            {editElementsReady ? (
            <RoomLayoutEditor
              blueprint={editBlueprint}
              onChange={setEditBlueprint}
              allowThemesFixtures={planFeatures?.roomThemesFixtures === true}
              editorLevel={planFeatures?.roomEditorLevel}
              paused={editPane !== 'elements'}
              onRegenerate={() => {
                setEditBlueprint(refreshBlueprintMetadata(generateRoomBlueprint(editBlueprint.roomType)));
              }}
            />
            ) : null}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(listingRoom)}
        onClose={() => setListingRoom(null)}
        title={listingRoom ? `Publier — ${listingRoom.name}` : 'Marketplace'}
        description="Visible sur le marketplace. Les plans de table d’événements privés ne sont jamais exposés."
        size="xl"
        footer={
          <div className="flex w-full justify-between gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setListingRoom(null)}>
              Annuler
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={savingListing}
                onClick={() => handleSaveListing(false)}
                leftIcon={<GlobeLock className="w-4 h-4" />}
              >
                Enregistrer sans publier
              </Button>
              <Button
                type="button"
                variant="success"
                size="sm"
                loading={savingListing}
                onClick={() => handleSaveListing(true)}
                leftIcon={<Globe className="w-4 h-4" />}
              >
                Publier
              </Button>
            </div>
          </div>
        }
      >
        {listingRoom && (
          <div className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <MarketplaceFormTabs
              value={listingTab}
              onChange={setListingTab}
              include={
                listingRoom.venueListing?.id
                  ? ['details', 'map', 'medias', 'activity']
                  : ['details', 'map', 'medias']
              }
            />
            {listingRoom.venueListing?.isPublic && listingRoom.venueListing.slug && listingTab === 'details' && (
              <p className="text-xs text-muted">
                Fiche actuelle :{' '}
                <Link href={`/dashboard/catalogue/salles/${listingRoom.venueListing.slug}`} className="font-semibold text-primary hover:underline">
                  {listingRoom.venueListing.headline || listingRoom.venueListing.slug}
                </Link>
              </p>
            )}
            {listingTab === 'details' && (
              <>
            <Input
              label="Titre public"
              value={listingDraft.headline}
              onChange={(e) => setListingDraft((d) => ({ ...d, headline: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <CityLocationFields
                  city={listingDraft.city}
                  commune={listingDraft.commune}
                  neighborhood={listingDraft.neighborhood}
                  onChange={({ city, commune, neighborhood }) =>
                    setListingDraft((d) => ({ ...d, city, commune, neighborhood }))
                  }
                />
              </div>
              <Input
                label="Adresse"
                value={listingDraft.address}
                onChange={(e) => setListingDraft((d) => ({ ...d, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={`Tarif de départ (${formatFc(Number(listingDraft.priceFromFc) || 0)})`}
                type="number"
                min={0}
                value={listingDraft.priceFromFc}
                onChange={(e) => setListingDraft((d) => ({ ...d, priceFromFc: e.target.value }))}
              />
              <label>
                <span className={labelClass}>Unité</span>
                <select
                  value={listingDraft.priceUnit}
                  onChange={(e) => setListingDraft((d) => ({ ...d, priceUnit: e.target.value as VenuePriceUnit }))}
                  className={fieldClass}
                >
                  {PRICE_UNIT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <Input
                label="Quota min. invités"
                type="number"
                min={0}
                value={listingDraft.quotaMin}
                onChange={(e) => setListingDraft((d) => ({ ...d, quotaMin: e.target.value }))}
              />
              <Input
                label="Quota max. invités"
                type="number"
                min={0}
                value={listingDraft.quotaMax}
                onChange={(e) => setListingDraft((d) => ({ ...d, quotaMax: e.target.value }))}
              />
            </div>
            <ListingDetailsFields
              kind="venue"
              value={listingDraft.details}
              onChange={(details: ListingDetails) => setListingDraft((d) => ({ ...d, details }))}
            />
            <BlockedDatesField
              value={listingDraft.blockedDates}
              bookedDates={listingDraft.bookedDates}
              onChange={(blockedDates) => setListingDraft((d) => ({ ...d, blockedDates }))}
            />
              </>
            )}
            {listingTab === 'map' && (
              <LocationPickerMap
                latitude={listingDraft.latitude}
                longitude={listingDraft.longitude}
                city={listingDraft.city}
                commune={listingDraft.commune}
                required
                onChange={({ latitude, longitude }) => setListingDraft((d) => ({ ...d, latitude, longitude }))}
              />
            )}
            {listingTab === 'medias' && (
              <MarketplaceMediaField
                urls={listingDraft.photos}
                onChange={(photos) => setListingDraft((d) => ({ ...d, photos }))}
              />
            )}
            {listingTab === 'activity' && (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted">
                  Les réalisations liées à cette salle se gèrent dans l’espace Réalisations.
                </p>
                <Button href="/dashboard/publications?tab=create" size="sm">
                  Ouvrir Réalisations
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
