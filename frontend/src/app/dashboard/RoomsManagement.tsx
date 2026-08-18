'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Building2, Plus, Trash2, Users, UserPlus, CheckCircle2,
  ChevronLeft, ChevronRight, LayoutGrid, Theater, Tent, Presentation, Edit3, Sparkles, Ruler,
  Globe, GlobeLock, Lock,
} from 'lucide-react';
import RoomLayoutPreview from '@/components/RoomLayoutPreview';
import RoomLayoutEditor from '@/components/RoomLayoutEditor';
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
  chairTypeLabels,
  generateRoomBlueprint,
  refreshBlueprintMetadata,
  roomTypeDescriptions,
  roomTypeLabels,
} from '@/lib/roomLayoutUtils';
import { PRICE_UNIT_OPTIONS, bookingDateKeys, missingPublishLocation, parseBlockedDates, type VenuePriceUnit } from '@/lib/marketplace';
import { EMPTY_LISTING_DETAILS, parseListingDetails, type ListingDetails } from '@/lib/listingDetails';
import ListingDetailsFields from '@/components/ListingDetailsFields';
import { formatFc } from '@/config/landingPricing';
import BlockedDatesField from '@/components/BlockedDatesField';
import MarketplaceMediaField from '@/components/MarketplaceMediaField';
import MarketplaceFormTabs, { type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import LocationPickerMap from '@/components/LocationPickerMap';
import CityLocationFields from '@/components/CityLocationFields';
import { getQuotaLockMessage, getRoomTypeLockMessage, ROOM_TYPE_MIN_LEVEL, canPublishVenueCatalog } from '@/lib/planAccess';

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

const defaultParams: Record<RoomType, LayoutParams> = {
  SIMPLE: {},
  BANQUET: { tableCount: 8, tableShape: 'round', seatsPerTable: 8, chairType: 'BANQUET' },
  CONFERENCE: { rowCount: 6, seatsPerRow: 10, chairType: 'THEATER' },
  AMPHITHEATER: { tierCount: 3, rowsPerTier: 2, seatsPerRow: 12, chairType: 'THEATER' },
  TENT: { tentWidthM: 15, tentLengthM: 20, tableCount: 6, seatsPerTable: 8, chairType: 'BANQUET' },
  CUSTOM: {},
};

const WIZARD_STEPS = [
  { id: 1, label: 'Infos' },
  { id: 2, label: 'Type' },
  { id: 3, label: 'Plan' },
] as const;

const fieldClass =
  'w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary';

const labelClass = 'block text-xs font-medium text-muted mb-1.5';

export default function RoomsManagement() {
  const { planFeatures, planQuota, tenant, refreshProfile, refreshPlanFeatures } = useAuth();
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
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [editBlueprint, setEditBlueprint] = useState<RoomLayoutBlueprint | null>(null);
  const [editMeta, setEditMeta] = useState({ name: '', floor: '', location: '', description: '' });
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
    const bp =
      roomType === 'SIMPLE'
        ? generateRoomBlueprint('SIMPLE')
        : generateRoomBlueprint(roomType, layoutParams);
    setBlueprintDraft(refreshBlueprintMetadata(bp));
  };

  const resetWizard = () => {
    setWizardStep(1);
    setName('');
    setDescription('');
    setFloor('');
    setLocation('');
    setRoomType(allowedRoomTypes.includes('BANQUET') ? 'BANQUET' : allowedRoomTypes[0] || 'SIMPLE');
    setLayoutParams(defaultParams.BANQUET);
    setBlueprintDraft(null);
  };

  const closeWizard = () => {
    setShowWizard(false);
    resetWizard();
  };

  const openWizard = () => {
    if (roomsAtLimit) return;
    resetWizard();
    setError('');
    setShowWizard(true);
  };

  const goToStep = (step: number) => {
    setWizardStep(step);
  };

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

  useEffect(() => {
    if (!showWizard) return;
    setBlueprintDraft(refreshBlueprintMetadata(generateRoomBlueprint(roomType, layoutParams)));
  }, [showWizard, roomType, layoutParams]);

  const updateParam = <K extends keyof LayoutParams>(key: K, value: LayoutParams[K]) => {
    setLayoutParams((prev) => ({ ...prev, [key]: value }));
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
    if (!confirm(`Supprimer la salle « ${room.name} » ?`)) return;
    try {
      await api.delete(`/rooms/${room.id}`);
      setSuccess('Salle supprimée.');
      await load();
      await refreshPlanFeatures();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
    }
  };

  const handleSaveRoomLayout = async () => {
    if (!editingRoom || !editBlueprint) return;
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
        setError('Choisissez Kinshasa ou Lubumbashi, puis la commune et le quartier.');
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
      <label>
        <span className={labelClass}>Largeur (m)</span>
        <input
          type="number"
          min={5}
          max={80}
          value={layoutParams[widthKey] ?? (widthKey === 'tentWidthM' ? 15 : 20)}
          onChange={(e) => updateParam(widthKey, parseInt(e.target.value, 10))}
          className={fieldClass}
        />
      </label>
      <label>
        <span className={labelClass}>Longueur (m)</span>
        <input
          type="number"
          min={5}
          max={80}
          value={layoutParams[heightKey] ?? (heightKey === 'tentLengthM' ? 20 : 15)}
          onChange={(e) => updateParam(heightKey, parseInt(e.target.value, 10))}
          className={fieldClass}
        />
      </label>
    </div>
  );

  const renderChairAndShape = (chairDefault: ChairType, withShape = true) => (
    <>
      {withShape && (
        <label>
          <span className={labelClass}>Forme des tables</span>
          <select value={layoutParams.tableShape ?? 'round'} onChange={(e) => updateParam('tableShape', e.target.value as LayoutParams['tableShape'])} className={fieldClass}>
            <option value="round">Ronde</option>
            <option value="rectangular">Rectangulaire</option>
            <option value="square">Carrée</option>
            <option value="oval">Ovale</option>
          </select>
        </label>
      )}
      <label>
        <span className={labelClass}>Type de chaise</span>
        <select value={layoutParams.chairType ?? chairDefault} onChange={(e) => updateParam('chairType', e.target.value as ChairType)} className={fieldClass}>
          {Object.entries(chairTypeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
    </>
  );

  const renderTypeParams = () => {
    switch (roomType) {
      case 'BANQUET':
        return (
          <div className="space-y-3">
            {renderCanvasDims()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label>
                <span className={labelClass}>Nombre de tables</span>
                <input type="number" min={1} max={80} value={layoutParams.tableCount ?? 8} onChange={(e) => updateParam('tableCount', parseInt(e.target.value, 10))} className={fieldClass} />
              </label>
              <label>
                <span className={labelClass}>Places / table</span>
                <input type="number" min={2} max={24} value={layoutParams.seatsPerTable ?? 8} onChange={(e) => updateParam('seatsPerTable', parseInt(e.target.value, 10))} className={fieldClass} />
              </label>
              {renderChairAndShape('BANQUET')}
            </div>
          </div>
        );
      case 'CONFERENCE':
        return (
          <div className="space-y-3">
            {renderCanvasDims()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label>
                <span className={labelClass}>Nombre de rangées</span>
                <input type="number" min={1} max={30} value={layoutParams.rowCount ?? 6} onChange={(e) => updateParam('rowCount', parseInt(e.target.value, 10))} className={fieldClass} />
              </label>
              <label>
                <span className={labelClass}>Places / rangée</span>
                <input type="number" min={2} max={40} value={layoutParams.seatsPerRow ?? 10} onChange={(e) => updateParam('seatsPerRow', parseInt(e.target.value, 10))} className={fieldClass} />
              </label>
              {renderChairAndShape('THEATER', false)}
            </div>
          </div>
        );
      case 'AMPHITHEATER':
        return (
          <div className="space-y-3">
            {renderCanvasDims()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label>
                <span className={labelClass}>Gradins</span>
                <input type="number" min={1} max={10} value={layoutParams.tierCount ?? 3} onChange={(e) => updateParam('tierCount', parseInt(e.target.value, 10))} className={fieldClass} />
              </label>
              <label>
                <span className={labelClass}>Rangées / gradin</span>
                <input type="number" min={1} max={10} value={layoutParams.rowsPerTier ?? 2} onChange={(e) => updateParam('rowsPerTier', parseInt(e.target.value, 10))} className={fieldClass} />
              </label>
              <label>
                <span className={labelClass}>Places / rangée</span>
                <input type="number" min={2} max={40} value={layoutParams.seatsPerRow ?? 12} onChange={(e) => updateParam('seatsPerRow', parseInt(e.target.value, 10))} className={fieldClass} />
              </label>
              {renderChairAndShape('THEATER', false)}
            </div>
          </div>
        );
      case 'TENT':
        return (
          <div className="space-y-3">
            {renderCanvasDims('tentWidthM', 'tentLengthM')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label>
                <span className={labelClass}>Tables intérieures</span>
                <input type="number" min={0} max={40} value={layoutParams.tableCount ?? 0} onChange={(e) => updateParam('tableCount', parseInt(e.target.value, 10))} className={fieldClass} />
              </label>
              <label>
                <span className={labelClass}>Places / table</span>
                <input type="number" min={2} max={24} value={layoutParams.seatsPerTable ?? 8} onChange={(e) => updateParam('seatsPerTable', parseInt(e.target.value, 10))} className={fieldClass} />
              </label>
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
            Créez une salle en 3 étapes : infos, type, puis plan 2D.
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

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {roomsAtLimit && (
        <Alert variant="warning">
          {roomsQuotaMsg || `Quota de salles atteint pour le forfait ${tenant?.plan || 'actuel'}.`}{' '}
          <Link href="/dashboard/billing" className="font-semibold underline">Voir les forfaits</Link>
        </Alert>
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
                    options={[
                      { id: 'Kinshasa', label: 'Kinshasa' },
                      { id: 'Lubumbashi', label: 'Lubumbashi' },
                    ]}
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
        onClose={closeWizard}
        title="Nouvelle salle"
        description="Infos, type d’espace, dimensions et plan 2D — tout est personnalisable ensuite."
        size={wizardStep === 3 ? 'full' : 'lg'}
        footer={
          <div className="flex w-full justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={wizardStep === 1}
              onClick={() => goToStep(wizardStep - 1)}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Précédent
            </Button>
            {wizardStep < 3 ? (
              <Button
                type="button"
                size="sm"
                disabled={wizardStep === 1 && !name.trim()}
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
                disabled={!name.trim()}
                onClick={handleCreate}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Créer la salle
              </Button>
            )}
          </div>
        }
      >
        {/* Stepper */}
        <div className="flex items-center gap-1 sm:gap-2 mb-5">
          {WIZARD_STEPS.map((step, idx) => {
            const active = wizardStep === step.id;
            const done = wizardStep > step.id;
            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div className={cn('h-px flex-1 min-w-2', done ? 'bg-primary' : 'bg-border')} />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (step.id < wizardStep || (step.id === wizardStep + 1 && (wizardStep > 1 || name.trim()))) {
                      goToStep(step.id);
                    }
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0',
                    active && 'bg-primary/10 text-primary',
                    done && !active && 'text-primary',
                    !active && !done && 'text-muted',
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold border',
                      active && 'bg-primary text-white border-primary',
                      done && !active && 'bg-primary/15 text-primary border-primary/30',
                      !active && !done && 'border-border bg-surface',
                    )}
                  >
                    {done && !active ? '✓' : step.id}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {wizardStep === 1 && (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface-muted/60 p-4">
              <p className="text-xs font-semibold text-foreground">Identité de la salle</p>
              <p className="text-[11px] text-muted mt-0.5">Ces informations restent modifiables après création.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nom de la salle" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Grand salon" />
              <Input label="Étage / Aile" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Ex. RDC" />
              <div className="sm:col-span-2">
                <Input label="Emplacement" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex. Bâtiment A, jardin" />
              </div>
            </div>
            <label className="block">
              <span className={labelClass}>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ambiance, contraintes, notes pour le protocole…"
                className={fieldClass}
              />
            </label>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Types disponibles selon votre forfait
              {planFeatures?.roomEditorLevel ? ` (éditeur ${planFeatures.roomEditorLevel})` : ''}.
              Les autres restent visibles mais verrouillés.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {selectableRoomTypes.map((type) => {
                const locked = Boolean(planFeatures) && !allowedRoomTypes.includes(type);
                const minLevel = ROOM_TYPE_MIN_LEVEL[type];
                return (
                <button
                  key={type}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (locked) return;
                    setRoomType(type);
                    setLayoutParams(defaultParams[type]);
                    setBlueprintDraft(null);
                  }}
                  className={cn(
                    'text-left p-3.5 rounded-[var(--radius-card)] border transition-colors',
                    locked && 'opacity-60 cursor-not-allowed bg-surface-muted',
                    !locked && roomType === type
                      ? 'border-primary bg-primary/5'
                      : !locked
                        ? 'border-border bg-surface hover:bg-surface-muted'
                        : 'border-border',
                  )}
                >
                  <div className={cn('mb-2 flex items-center justify-between', roomType === type && !locked ? 'text-primary' : 'text-muted')}>
                    {roomTypeIcons[type]}
                    {locked && <Lock className="w-3.5 h-3.5" />}
                  </div>
                  <p className="font-semibold text-sm text-foreground">{roomTypeLabels[type]}</p>
                  <p className="text-[11px] text-muted mt-1 leading-relaxed">{roomTypeDescriptions[type]}</p>
                  {locked && (
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-2">
                      {minLevel === 'standard' ? 'Business+' : minLevel === 'advanced' ? 'Premium+' : 'Enterprise 1+'}
                    </p>
                  )}
                </button>
                );
              })}
            </div>
            {planFeatures && allowedRoomTypes.length < selectableRoomTypes.length && (
              <p className="text-[11px] text-muted">
                <Link href="/dashboard/billing" className="font-semibold text-primary hover:underline">
                  Changer de forfait
                </Link>
                {' '}pour débloquer banquet, conférence, tente ou salle personnalisée.
              </p>
            )}
          </div>
        )}

        {wizardStep === 3 && blueprintDraft && (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary" />
                  Paramètres — {roomTypeLabels[roomType]}
                </h3>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {blueprintDraft.metadata.totalSeats} places · {blueprintDraft.canvas.widthM}×{blueprintDraft.canvas.heightM} m
                </p>
              </div>
              {renderTypeParams()}
            </div>
            <RoomLayoutEditor
              blueprint={blueprintDraft}
              onChange={setBlueprintDraft}
              onRegenerate={regenerateBlueprint}
              allowThemesFixtures={planFeatures?.roomThemesFixtures === true}
            />
          </div>
        )}
      </Modal>

      {loading ? (
        <SkeletonRoomsView mode={roomsViewMode} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Aucune salle configurée"
          description="Créez votre première salle pour générer un plan 2D et y assigner le staff."
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
            const actions = canManage ? (
              <>
                {canCatalogPublish && (
                <button
                  type="button"
                  onClick={() => openListing(room)}
                  className="p-2 text-muted hover:text-primary hover:bg-surface-muted rounded-[var(--radius-button)]"
                  title={room.venueListing?.isPublic ? 'Fiche marketplace' : 'Publier cette salle'}
                >
                  {room.venueListing?.isPublic ? <Globe className="w-4 h-4" /> : <GlobeLock className="w-4 h-4" />}
                </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditLayout(room)}
                  className={cn(
                    roomsViewMode === 'list'
                      ? 'inline-flex items-center'
                      : 'p-2 text-muted hover:text-primary hover:bg-surface-muted rounded-[var(--radius-button)]',
                  )}
                  title="Modifier le plan 2D"
                >
                  {roomsViewMode === 'list' ? <ListRowAction>Plan 2D</ListRowAction> : <Edit3 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(room)}
                  className="p-2 text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-[var(--radius-button)]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : undefined;

            return (
              <div key={room.id} className="space-y-2">
                <ProjectCard
                  id={room.id}
                  title={room.name}
                  layout={roomsViewMode}
                  meta={
                    roomsViewMode === 'list' ? (
                      <span>{metaLine}</span>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="inline-flex text-[10px] font-semibold uppercase tracking-wide text-primary">
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
                  {roomsViewMode === 'grid' && room.layoutBlueprint && (
                    <div className="max-h-28 overflow-hidden rounded-md border border-border bg-surface-muted [&_.aspect-\[4\/3\]]:aspect-auto [&_.aspect-\[4\/3\]]:h-24">
                      <RoomLayoutPreview
                        blueprint={room.layoutBlueprint as RoomLayoutBlueprint}
                        className="!space-y-0 [&_>div:first-child]:hidden"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
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
                            <span className="ml-1.5 text-[10px] font-semibold uppercase text-primary">
                              {roleLabels[s.staffRole]}
                            </span>
                          </div>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStaff(room.id, s.user.id)}
                              className="text-rose-500 hover:text-rose-700 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                      <select
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        className={cn(fieldClass, 'flex-1 min-w-[140px]')}
                      >
                        <option value="">Choisir un utilisateur</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name || m.email}</option>
                        ))}
                      </select>
                      <select
                        value={assignRole}
                        onChange={(e) => setAssignRole(e.target.value as 'MANAGER' | 'PROTOCOL')}
                        className={fieldClass}
                      >
                        <option value="MANAGER">Manager</option>
                        <option value="PROTOCOL">Protocole</option>
                      </select>
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
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline px-1"
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
        open={Boolean(editingRoom && editBlueprint)}
        onClose={() => { setEditingRoom(null); setEditBlueprint(null); }}
        title={editingRoom ? `Salle — ${editingRoom.name}` : 'Plan 2D'}
        description="Modifiez les infos, la disposition, les chaises, les couleurs et les éléments fixes."
        size="full"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingRoom(null); setEditBlueprint(null); }}>
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
              Enregistrer le plan
            </Button>
          </div>
        }
      >
        {editBlueprint && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-[var(--radius-card)] border border-border bg-surface-muted/50">
              <Input
                label="Nom de la salle"
                value={editMeta.name}
                onChange={(e) => setEditMeta((m) => ({ ...m, name: e.target.value }))}
              />
              <Input
                label="Étage / Aile"
                value={editMeta.floor}
                onChange={(e) => setEditMeta((m) => ({ ...m, floor: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Emplacement"
                  value={editMeta.location}
                  onChange={(e) => setEditMeta((m) => ({ ...m, location: e.target.value }))}
                />
              </div>
              <label className="sm:col-span-2">
                <span className={labelClass}>Description</span>
                <textarea
                  value={editMeta.description}
                  onChange={(e) => setEditMeta((m) => ({ ...m, description: e.target.value }))}
                  rows={2}
                  className={fieldClass}
                />
              </label>
            </div>
            <RoomLayoutEditor
              blueprint={editBlueprint}
              onChange={setEditBlueprint}
              allowThemesFixtures={planFeatures?.roomThemesFixtures === true}
              onRegenerate={() => {
                setEditBlueprint(refreshBlueprintMetadata(generateRoomBlueprint(editBlueprint.roomType)));
              }}
            />
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
            <MarketplaceFormTabs value={listingTab} onChange={setListingTab} />
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
          </div>
        )}
      </Modal>
    </div>
  );
}
