'use client';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';
import Image from 'next/image';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Globe,
  GlobeLock,
  LayoutGrid,
  LayoutTemplate,
  Loader2,
  Search,
  Ticket,
  Sparkles,
  Check,
  Calendar,
  Clock,
  CheckCircle2,
  Layers,
  Box,
  Coins,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Info,
  ShieldCheck,
  AlertCircle,
  PartyPopper,
  Crown,
  Sliders,
  X,
  Heart,
  Wallet,
  Briefcase,
  Users,
  AlertTriangle,
} from '@/components/icons';
import { api } from '@/lib/api';
import { Button, ConfirmDialog, Input, Modal, PhoneInput, parseStoredPhone } from '@/components/ui';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';
import MarketplaceMediaField from '@/components/MarketplaceMediaField';
import CityLocationFields from '@/components/CityLocationFields';
import EventGuestGuidelinesEditor from '@/components/EventGuestGuidelinesEditor';
import { cn } from '@/lib/cn';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import {
  DRESS_CODE_PRESETS,
  type DressCodePresetId,
  type GuestGuidelines,
} from '@/lib/guestGuidelines';
import { INVITATION_COLOR_THEMES } from '@/lib/templateColorThemes';
import {
  createEmptyProgram,
  createProgramSlot,
  normalizeEventProgram,
  type EventProgram,
} from '@/lib/eventProgram';
import { lightingPresetLabels, type LightingPreset } from '@/lib/roomRenderQuality';
import { ensureBlueprintDefaults, type RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import dynamic from 'next/dynamic';
import type { RoomPreviewQuality } from '@/components/RoomLayoutPreview';
import type { TablePlanPreviewTable } from '@/lib/tablePlanPreviewBlueprint';
import {
  EVENT_CONFIG_TABS,
  EVENT_CONFIG_TAB_DETAILS,
  EVENT_KIND_LABELS,
  EVENT_KINDS_PRO,
  EVENT_KINDS_SIMPLE,
  firstInvalidEventConfigTab,
  guidelinesFromEvent,
  kindFromEvent,
  nextEventConfigTab,
  previousEventConfigTab,
  parseWeddingNames,
  photosFromEvent,
  toDateTimeLocalValue,
  weddingTitle,
  type EventConfigMode,
  type EventConfigPayload,
  type EventConfigSource,
  type EventConfigTab,
  type EventKindId,
  type NeighborSharingMode,
  type NeighborSharingPolicy,
} from '@/lib/eventConfig';
import {
  createEmptyPricingZone,
  normalizeTicketPricingMode,
  pricingZonesFromTablePlan,
  TICKETING_ZONE_PRESETS,
  type PricingZone,
  type TicketPricingMode,
} from '@/lib/ticketPricing';
import { findRdcCommune } from '@/lib/rdcCities';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { useAuth } from '@/context/AuthContext';
import { isB2cPlanId } from '@/config/landingPricing';
import {
  resolveDonationsAccess,
  DEFAULT_DONATIONS_ACCESS,
  type EventDonationsConfig,
} from '@/lib/donationsAccess';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import { templateContentToLandingPreview } from '@/lib/landingTemplateAdapter';
import CollectionTermsAcceptanceModal from '@/components/CollectionTermsAcceptanceModal';
import EventNotificationSettingsFields from '@/components/EventNotificationSettingsFields';
import {
  DEFAULT_EVENT_NOTIFICATION_SETTINGS,
  resolveEventNotificationSettings,
  type EventNotificationSettings,
} from '@/lib/eventNotifications';
import { hasValidCollectionTermsAcceptance } from '@/lib/collectionTerms';
import {
  COLLECTION_COMMISSION_MAX_PERCENT,
  COLLECTION_COMMISSION_MIN_PERCENT,
} from '@/config/legalConfig';

const RoomLayoutPreview = dynamic(() => import('@/components/RoomLayoutPreview'), {
  ssr: false,
  loading: () => <div className="h-64 rounded-[var(--radius-card)] bg-surface-muted animate-pulse" aria-hidden />,
});
const PublicEventZoneStudio3D = dynamic(() => import('@/components/PublicEventZoneStudio3D'), {
  ssr: false,
  loading: () => <div className="h-64 rounded-[var(--radius-card)] bg-surface-muted animate-pulse" aria-hidden />,
});

const SELECT_CLASS =
  'w-full px-3.5 py-2.5 bg-surface dark:bg-background border border-border/80 dark:border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

const TEXTAREA_CLASS =
  'w-full px-3.5 py-2.5 bg-surface dark:bg-background border border-border/80 dark:border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all';

/** Raccourci discret sous un champ (dates, durées). */
const QUICK_CHIP_CLASS =
  'inline-flex min-h-8 items-center rounded-full bg-surface-muted px-3 text-xs font-medium text-muted transition-colors hover:text-foreground touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

const SIMPLE_DRESS_PRESETS: Array<Exclude<DressCodePresetId, 'custom' | 'white_tie' | 'theme_color'>> = [
  'cocktail',
  'smart_casual',
  'traditional',
  'outdoor',
  'black_tie',
];

const KIND_ICONS: Record<EventKindId, React.ComponentType<{ className?: string }>> = {
  WEDDING: Heart,
  BIRTHDAY: PartyPopper,
  BAPTISM: Sparkles,
  CORPORATE: Briefcase,
  CONFERENCE: Users,
  GALA: Crown,
  OTHER: Calendar,
};

/** Teinte de chaque type d'événement (couleurs des graphiques, valables en clair et en sombre). */
const KIND_TINTS: Record<EventKindId, string> = {
  WEDDING: 'var(--chart-6)',
  BIRTHDAY: 'var(--chart-5)',
  BAPTISM: 'var(--chart-2)',
  CORPORATE: 'var(--chart-4)',
  CONFERENCE: 'var(--chart-1)',
  GALA: 'var(--chart-3)',
  OTHER: 'var(--muted)',
};

/** Première étape d'une création : une carte par type d'événement. */
function EventKindPicker({
  kinds,
  selected,
  onPick,
}: {
  kinds: EventKindId[];
  selected: EventKindId | '';
  onPick: (kind: EventKindId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {kinds.map((kind) => {
        const KindIcon = KIND_ICONS[kind] || Calendar;
        const tint = KIND_TINTS[kind];
        const isSelected = selected === kind;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onPick(kind)}
            className={cn(
              'group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[20px] bg-surface-muted p-3 text-left transition-[transform,box-shadow] duration-150 sm:min-h-[164px]',
              'hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_rgba(16,24,40,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
              'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
              isSelected && 'ring-2 ring-offset-2',
            )}
            style={isSelected ? { ['--tw-ring-color' as string]: tint } : undefined}
          >
            <Image
              src={kindPhotoUrl(kind)}
              alt=""
              fill
              sizes="(min-width: 640px) 260px, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <span
              aria-hidden
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm"
              style={{ color: tint }}
            >
              <KindIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="relative text-[15px] font-semibold text-white drop-shadow-sm">{EVENT_KIND_LABELS[kind]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Photo de chaque type (Unsplash, licence libre ; identifiants vérifiés sur unsplash.com). */
const KIND_PHOTOS: Record<EventKindId, string> = {
  WEDDING: '1608009232260-9b527a5bb9bd',
  BIRTHDAY: '1530103862676-de8c9debad1d',
  BAPTISM: '1566516171511-1c411a59c8ba',
  CORPORATE: '1542744173-8e7e53415bb0',
  CONFERENCE: '1587825140708-dfaf72ae4b04',
  GALA: '1536392706976-e486e2ba97af',
  OTHER: '1492684223066-81342ee5ff30',
};
const kindPhotoUrl = (kind: EventKindId) =>
  `https://images.unsplash.com/photo-${KIND_PHOTOS[kind]}?auto=format&fit=crop&w=640&h=420&q=75`;

type RoomOption = {
  id: string;
  name: string;
  location: string | null;
  floor: string | null;
  capacity: number | null;
  layoutBlueprint?: unknown;
};

type TemplateOption = {
  id: string;
  name: string;
  content?: unknown;
};

type EventConfigFormProps = {
  open: boolean;
  onClose: () => void;
  initialEvent?: EventConfigSource | null;
  defaultMode: EventConfigMode;
  rooms: RoomOption[];
  loadingRooms?: boolean;
  templates: TemplateOption[];
  saving?: boolean;
  /** Erreur renvoyée par l’enregistrement (affichée dans le formulaire resté ouvert). */
  saveError?: string;
  createDisabled?: boolean;
  createDisabledTitle?: string;
  onSave: (payload: EventConfigPayload) => Promise<void> | void;
  onOpenTablePlan?: (eventId: string) => void;
};

export default function EventConfigForm({
  open,
  onClose,
  initialEvent = null,
  defaultMode,
  rooms,
  loadingRooms = false,
  templates,
  saving = false,
  saveError = '',
  createDisabled = false,
  createDisabledTitle,
  onSave,
  onOpenTablePlan,
}: EventConfigFormProps) {
  const messaging = useMessagingChannels();
  const editingId = initialEvent?.id ?? null;
  const [mode, setMode] = useState<EventConfigMode>(defaultMode);
  const [tab, setTab] = useState<EventConfigTab>('essentials');
  const [title, setTitle] = useState('');
  const [titleManual, setTitleManual] = useState(false);
  const [partnerFirst, setPartnerFirst] = useState('');
  const [partnerSecond, setPartnerSecond] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [eventKind, setEventKind] = useState<EventKindId | ''>('');
  /** Première étape d'une création : choisir le type avant le formulaire. */
  const [pickingKind, setPickingKind] = useState(false);
  const [clientName, setClientName] = useState('');
  const [estimatedGuests, setEstimatedGuests] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState('NONE');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [ticketing, setTicketing] = useState(false);
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketPricingMode, setTicketPricingMode] = useState<TicketPricingMode>('global');
  const [pricingZones, setPricingZones] = useState<PricingZone[]>([]);
  const [tableZoneAssignments, setTableZoneAssignments] = useState<Record<string, string>>({});
  const [ticketsTotal, setTicketsTotal] = useState('');
  const [ticketsPerBuyerLimit, setTicketsPerBuyerLimit] = useState('');
  const [seatSelection, setSeatSelection] = useState(false);
  const [neighborSharingMode, setNeighborSharingMode] = useState<NeighborSharingMode>('first_name');
  const [shareSameTable, setShareSameTable] = useState(true);
  const [shareSameZone, setShareSameZone] = useState(false);
  const [eventProgram, setEventProgram] = useState<EventProgram>(() => createEmptyProgram());
  const [notificationSettings, setNotificationSettings] = useState<EventNotificationSettings>(
    () => ({ ...DEFAULT_EVENT_NOTIFICATION_SETTINGS }),
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('');
  const [roomPreviewQuality, setRoomPreviewQuality] = useState<Exclude<RoomPreviewQuality, 'thumb'>>('standard');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [openTablePlanAfterSave, setOpenTablePlanAfterSave] = useState(false);
  const [guestGuidelines, setGuestGuidelines] = useState<GuestGuidelines>(guidelinesFromEvent(null));
  const [themeId, setThemeId] = useState<string | null>(initialEvent?.themeId ?? null);
  const [contactName, setContactName] = useState('');
  const [contactCc, setContactCc] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [contactNational, setContactNational] = useState('');
  const [payoutCc, setPayoutCc] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [payoutNational, setPayoutNational] = useState('');
  const [payoutHolderName, setPayoutHolderName] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [formError, setFormError] = useState('');
  const [baselineToken, setBaselineToken] = useState(0);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const complete = mode === 'complete';
  const kinds = complete ? EVENT_KINDS_PRO : EVENT_KINDS_SIMPLE;
  const { site } = usePlatformSite();
  const { tenant, planFeatures } = useAuth();
  /** Forfaits Particulier (B2C) : événements privés uniquement. */
  const canPublishEvents = !(
    isB2cPlanId(tenant?.plan || '') ||
    planFeatures?.audience === 'B2C' ||
    (tenant?.plan === 'FREE' && isB2cPlanId(tenant?.pendingPlan || ''))
  );
  const onlinePaymentsEnabled = site.onlinePaymentsEnabled !== false;

  const [donationsEnabled, setDonationsEnabled] = useState(false);
  const [donationTargetFc, setDonationTargetFc] = useState('');
  const [donationMinAmountFc, setDonationMinAmountFc] = useState('1000');
  const [donationCause, setDonationCause] = useState('');
  const [donationSuggestedFc, setDonationSuggestedFc] = useState('2500, 5000, 10000, 25000, 50000');
  const [donorAttendancePass, setDonorAttendancePass] = useState(true);

  const tenantId = initialEvent?.tenantId || tenant?.id;
  const donationAccessStatus = useMemo(
    () => resolveDonationsAccess(tenantId, site.donationsAccess),
    [tenantId, site.donationsAccess],
  );
  const donationsAllowedByAdmin = donationAccessStatus.allowed;

  // Sous-onglets pour scinder les formulaires volumineux
  const [accessSubTab, setAccessSubTab] = useState<'ticketing' | 'seating' | 'donations' | 'program'>('ticketing');

  // Sécurité et validation explicite en cas de billets déjà vendus
  const [pendingTicketRisks, setPendingTicketRisks] = useState<Array<{ title: string; risk: string }> | null>(null);
  const [ticketRiskConfirmed, setTicketRiskConfirmed] = useState(false);
  const [collectionTermsAccepted, setCollectionTermsAccepted] = useState(false);
  const [collectionTermsModal, setCollectionTermsModal] = useState<'ticketing' | 'donations' | 'both' | null>(
    null,
  );
  const [pendingCollectionEnable, setPendingCollectionEnable] = useState<
    'ticketing' | 'donations' | 'public-ticketing' | 'save' | null
  >(null);

  useEffect(() => {
    if (!onlinePaymentsEnabled && ticketing) setTicketing(false);
  }, [onlinePaymentsEnabled, ticketing]);

  useEffect(() => {
    if (!open) return;
    setConfirmDiscard(false);
    setBaseline(null);
    setBaselineToken((n) => n + 1);
    setTab('essentials');
    setAccessSubTab('ticketing');
    setPendingTicketRisks(null);
    setTicketRiskConfirmed(false);
    setCollectionTermsAccepted(hasValidCollectionTermsAcceptance(initialEvent?.collectionTerms));
    setCollectionTermsModal(null);
    setPendingCollectionEnable(null);
    setMode(defaultMode);
    setFormError('');
    setSearchError('');
    setPickingKind(!initialEvent);
    if (!initialEvent) {
      setTitle('');
      setTitleManual(false);
      setPartnerFirst('');
      setPartnerSecond('');
      setDescription('');
      setDate('');
      setEndsAt('');
      setLocation('');
      setCity('');
      setCommune('');
      setNeighborhood('');
      setEventKind('');
      setClientName('');
      setEstimatedGuests('');
      setReminderFrequency('NONE');
      setLatitude('');
      setLongitude('');
      setIsPublic(false);
      setTicketing(false);
      setTicketPrice('');
      setTicketPricingMode('global');
      setPricingZones([]);
      setTableZoneAssignments({});
      setTicketsTotal('');
      setSeatSelection(false);
      setEventProgram(createEmptyProgram());
      setPhotos([]);
      setRoomId('');
      setRoomPreviewQuality('standard');
      setFormTemplateId('');
      setOpenTablePlanAfterSave(false);
      setGuestGuidelines(guidelinesFromEvent(null));
      setContactName('');
      setContactCc(DEFAULT_PHONE_COUNTRY_CODE);
      setContactNational('');
      setPayoutCc(DEFAULT_PHONE_COUNTRY_CODE);
      setPayoutNational('');
      setPayoutHolderName('');
      setDonationsEnabled(false);
      setDonationTargetFc('');
      setDonationMinAmountFc('1000');
      setDonationCause('');
      setDonationSuggestedFc('2500, 5000, 10000, 25000, 50000');
      setDonorAttendancePass(true);
      return;
    }

    const kind = kindFromEvent(initialEvent.eventKind);
    const names = kind === 'WEDDING' ? parseWeddingNames(initialEvent.title) : null;
    setTitle(initialEvent.title || '');
    setTitleManual(!names);
    setPartnerFirst(names?.first || '');
    setPartnerSecond(names?.second || '');
    setDescription(initialEvent.description || '');
    setDate(toDateTimeLocalValue(initialEvent.date));
    setEndsAt(toDateTimeLocalValue(initialEvent.endsAt));
    setLocation(initialEvent.location || '');
    setCity(initialEvent.city || '');
    setCommune(initialEvent.commune || '');
    setNeighborhood(initialEvent.neighborhood || '');
    setEventKind(kind);
    setClientName(initialEvent.clientName || '');
    setEstimatedGuests(initialEvent.estimatedGuests != null ? String(initialEvent.estimatedGuests) : '');
    setReminderFrequency(initialEvent.reminderFrequency || 'NONE');
    setNotificationSettings(resolveEventNotificationSettings(initialEvent.notificationSettings));
    setLatitude(initialEvent.latitude != null ? String(initialEvent.latitude) : '');
    setLongitude(initialEvent.longitude != null ? String(initialEvent.longitude) : '');
    setIsPublic(canPublishEvents && Boolean(initialEvent.isPublic));
    setTicketing(Boolean(initialEvent.ticketingEnabled));
    setTicketPrice(
      initialEvent.ticketPriceFc != null && initialEvent.ticketPriceFc > 0
        ? String(initialEvent.ticketPriceFc)
        : '',
    );
    setTicketPricingMode(normalizeTicketPricingMode(initialEvent.ticketPricingMode));
    setPricingZones(pricingZonesFromTablePlan(initialEvent.tablePlan));

    if (initialEvent?.tablePlan && typeof initialEvent.tablePlan === 'object') {
      const tPlan = initialEvent.tablePlan as any;
      if (Array.isArray(tPlan.tables)) {
        const map: Record<string, string> = {};
        for (const t of tPlan.tables) {
          if (t.id && t.pricingZoneId) map[t.id] = t.pricingZoneId;
        }
        setTableZoneAssignments(map);
      } else {
        setTableZoneAssignments({});
      }
    } else {
      setTableZoneAssignments({});
    }

    setTicketsTotal(initialEvent.ticketsTotal != null ? String(initialEvent.ticketsTotal) : '');
    setTicketsPerBuyerLimit(
      initialEvent.ticketsPerBuyerLimit != null ? String(initialEvent.ticketsPerBuyerLimit) : '',
    );
    setSeatSelection(Boolean((initialEvent as { seatSelectionEnabled?: boolean }).seatSelectionEnabled));

    const initialSharingPolicy = (initialEvent?.tablePlan as any)?.neighborSharingPolicy || (initialEvent as any)?.neighborSharingPolicy;
    if (initialSharingPolicy && typeof initialSharingPolicy === 'object') {
      setNeighborSharingMode(initialSharingPolicy.mode || (initialEvent?.isPublic ? 'first_name' : 'full'));
      setShareSameTable(initialSharingPolicy.shareSameTable !== false);
      setShareSameZone(Boolean(initialSharingPolicy.shareSameZone));
    } else {
      setNeighborSharingMode(initialEvent?.isPublic ? 'first_name' : 'full');
      setShareSameTable(true);
      setShareSameZone(false);
    }

    setEventProgram(normalizeEventProgram((initialEvent as { eventProgram?: unknown }).eventProgram));
    setPhotos(photosFromEvent(initialEvent.photos));
    setRoomId(initialEvent.roomId || initialEvent.room?.id || '');
    setOpenTablePlanAfterSave(false);
    setGuestGuidelines(guidelinesFromEvent(initialEvent.guestGuidelines));
    setContactName(initialEvent.dayOfContactName || '');
    const phone = parseStoredPhone(initialEvent.dayOfContactPhone);
    setContactCc(phone.countryCode);
    setContactNational(phone.national);
    const payoutPhone = parseStoredPhone(
      initialEvent.payoutAccount?.phone ? `+${initialEvent.payoutAccount.phone.replace(/^\+/, '')}` : null,
    );
    setPayoutCc(payoutPhone.countryCode);
    setPayoutNational(payoutPhone.national);
    setPayoutHolderName(initialEvent.payoutAccount?.holderName || '');

    const dConfig = initialEvent.donations;
    setDonationsEnabled(Boolean(dConfig?.enabled));
    setDonationTargetFc(dConfig?.targetAmountFc ? String(dConfig.targetAmountFc) : '');
    setDonationMinAmountFc(dConfig?.minAmountFc ? String(dConfig.minAmountFc) : '1000');
    setDonationCause(dConfig?.cause || '');
    setDonationSuggestedFc(
      dConfig?.suggestedAmountsFc && dConfig.suggestedAmountsFc.length > 0
        ? dConfig.suggestedAmountsFc.join(', ')
        : '2500, 5000, 10000, 25000, 50000',
    );
    setDonorAttendancePass(dConfig?.donorAttendancePass !== false);
  }, [open, initialEvent?.id]);

  useEffect(() => {
    if (!open || !editingId) {
      if (open && !editingId) setFormTemplateId('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const invitesData = await api.get(`/events/${editingId}/invitations`);
        if (cancelled) return;
        const first = Array.isArray(invitesData) ? invitesData[0] : null;
        setFormTemplateId(first?.template?.id || '');
      } catch {
        if (!cancelled) setFormTemplateId('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editingId]);

  useEffect(() => {
    if (!open || tab !== 'place') {
      mapRef.current = null;
      markerRef.current = null;
      return;
    }

    let mapInstance: any = null;
    let markerInstance: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;
      const initialLat = latitude ? parseFloat(latitude) : -4.3224;
      const initialLng = longitude ? parseFloat(longitude) : 15.307;
      const mapContainer = document.getElementById('event-config-map-picker');
      if (!mapContainer) return;
      mapContainer.innerHTML = '';
      const mapDiv = document.createElement('div');
      mapDiv.style.height = '100%';
      mapDiv.style.width = '100%';
      mapContainer.appendChild(mapDiv);

      try {
        mapInstance = L.map(mapDiv).setView([initialLat, initialLng], 13);
        mapRef.current = mapInstance;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapInstance);

        if (latitude && longitude) {
          markerInstance = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance);
          markerRef.current = markerInstance;
        }

        mapInstance.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setLatitude(lat.toFixed(6));
          setLongitude(lng.toFixed(6));
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const newMarker = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
            markerRef.current = newMarker;
            newMarker.on('dragend', () => {
              const position = newMarker.getLatLng();
              setLatitude(position.lat.toFixed(6));
              setLongitude(position.lng.toFixed(6));
            });
          }
        });

        if (markerInstance) {
          markerInstance.on('dragend', () => {
            const position = markerInstance.getLatLng();
            setLatitude(position.lat.toFixed(6));
            setLongitude(position.lng.toFixed(6));
          });
        }
      } catch (err) {
        console.error('Error initializing Leaflet map:', err);
      }
    };

    if (!(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.body.appendChild(script);
      return () => {
        if (mapInstance) {
          try {
            mapInstance.remove();
          } catch {
            /* ignore */
          }
        }
      };
    }

    const timer = setTimeout(initMap, 200);
    return () => {
      clearTimeout(timer);
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch {
          /* ignore */
        }
      }
    };
  }, [open, tab]);

  const applyKind = (kind: EventKindId | '') => {
    setEventKind(kind);
    if (kind === 'WEDDING' && !titleManual) {
      const generated = weddingTitle(partnerFirst, partnerSecond);
      if (generated) setTitle(generated);
    }
  };

  const applyPartner = (first: string, second: string) => {
    setPartnerFirst(first);
    setPartnerSecond(second);
    if (!titleManual) {
      const generated = weddingTitle(first, second);
      if (generated) setTitle(generated);
    }
  };

  const applyPlace = (next: { city: string; commune: string; neighborhood: string }) => {
    const communeChanged = next.commune !== commune;
    const missingGps = !latitude.trim() || !longitude.trim();
    setCity(next.city);
    setCommune(next.commune);
    setNeighborhood(next.neighborhood);
    const communeMeta = findRdcCommune(next.city, next.commune);
    if (communeMeta && (missingGps || communeChanged)) {
      const latText = communeMeta.center.lat.toFixed(6);
      const lngText = communeMeta.center.lng.toFixed(6);
      setLatitude(latText);
      setLongitude(lngText);
      syncMarker(latText, lngText);
    }
  };

  const applyRoom = (nextRoomId: string) => {
    setRoomId(nextRoomId);
    setRoomPreviewQuality('standard');
    if (!nextRoomId) return;
    const room = rooms.find((item) => item.id === nextRoomId);
    if (!room) return;
    const parts = [room.name, room.floor, room.location].filter(Boolean);
    if (parts.length > 0) setLocation(parts.join(' — '));
  };

  const selectedRoom = useMemo(
    () => (roomId ? rooms.find((item) => item.id === roomId) : undefined),
    [rooms, roomId],
  );

  const selectedRoomBlueprint = useMemo((): RoomLayoutBlueprint | null => {
    if (!selectedRoom?.layoutBlueprint || typeof selectedRoom.layoutBlueprint !== 'object') {
      return null;
    }
    return ensureBlueprintDefaults(selectedRoom.layoutBlueprint as RoomLayoutBlueprint);
  }, [selectedRoom]);

  const roomPreviewLighting = useMemo((): Exclude<LightingPreset, 'auto'> => {
    const slot = eventProgram.slots[0];
    if (slot?.lighting) return slot.lighting;
    return 'dusk';
  }, [eventProgram.slots]);

  const availableTables = useMemo((): TablePlanPreviewTable[] => {
    if (selectedRoomBlueprint?.furniture) {
      const tableItems = selectedRoomBlueprint.furniture.filter(
        (f): f is Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'table' }> => f.kind === 'table',
      );
      if (tableItems.length > 0) {
        return tableItems.map((t) => ({
          id: t.id,
          name: t.name,
          shape: t.shape,
          capacity: t.capacity,
          x: t.x,
          y: t.y,
          tableColor: t.tableColor,
          chairType: t.chairType,
          pricingZoneId: tableZoneAssignments[t.id] || pricingZones[0]?.id,
        }));
      }
    }
    if (initialEvent?.tablePlan && typeof initialEvent.tablePlan === 'object') {
      const tPlan = initialEvent.tablePlan as any;
      if (Array.isArray(tPlan.tables) && tPlan.tables.length > 0) {
        return tPlan.tables.map((t: any) => ({
          id: t.id,
          name: t.name,
          shape: t.shape || 'round',
          capacity: t.capacity || 8,
          x: t.x,
          y: t.y,
          tableColor: t.tableColor,
          chairType: t.chairType,
          pricingZoneId: tableZoneAssignments[t.id] || t.pricingZoneId || pricingZones[0]?.id,
        }));
      }
    }
    return [];
  }, [selectedRoomBlueprint, initialEvent, tableZoneAssignments, pricingZones]);

  const setDatePreset = (preset: 'this_saturday' | 'next_saturday' | 'in_month') => {
    const d = new Date();
    if (preset === 'this_saturday') {
      const day = d.getDay();
      const diff = (6 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(18, 0, 0, 0);
    } else if (preset === 'next_saturday') {
      const day = d.getDay();
      const diff = ((6 - day + 7) % 7 || 7) + 7;
      d.setDate(d.getDate() + diff);
      d.setHours(18, 0, 0, 0);
    } else if (preset === 'in_month') {
      d.setMonth(d.getMonth() + 1);
      d.setHours(19, 0, 0, 0);
    }
    setDate(toDateTimeLocalValue(d.toISOString()));
  };

  const setEndsAtPreset = (hoursToAdd: number, orMidnight?: boolean) => {
    if (!date) return;
    const start = new Date(date);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start);
    if (orMidnight) {
      end.setHours(23, 59, 0, 0);
    } else {
      end.setHours(end.getHours() + hoursToAdd);
    }
    setEndsAt(toDateTimeLocalValue(end.toISOString()));
  };

  const applyDressPreset = (presetId: DressCodePresetId | '') => {
    if (!presetId) {
      setGuestGuidelines((prev) => ({
        ...prev,
        dressCode: { ...prev.dressCode, enabled: false },
      }));
      return;
    }
    const preset = presetId !== 'custom' ? DRESS_CODE_PRESETS[presetId] : null;
    setGuestGuidelines((prev) => ({
      ...prev,
      dressCode: {
        ...prev.dressCode,
        enabled: true,
        presetId,
        customText: preset?.defaultText ?? prev.dressCode.customText,
        examples: preset?.examples ?? prev.dressCode.examples,
      },
    }));
  };

  const syncMarker = (latText: string, lngText: string) => {
    const lat = parseFloat(latText);
    const lng = parseFloat(lngText);
    const L = (window as any).L;
    if (Number.isNaN(lat) || Number.isNaN(lng) || !L || !mapRef.current) return;
    mapRef.current.setView([lat, lng]);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
    }
  };

  const searchLocationOnMap = async () => {
    if (!location.trim()) {
      setSearchError('Saisissez d’abord le lieu, la commune et le quartier.');
      return;
    }
    setSearchingLocation(true);
    setSearchError('');
    try {
      const query = [location.trim(), neighborhood, commune, city, 'RD Congo']
        .filter(Boolean)
        .join(', ');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const latText = lat.toFixed(6);
        const lonText = lon.toFixed(6);
        setLatitude(latText);
        setLongitude(lonText);
        const L = (window as any).L;
        if (L && mapRef.current) {
          mapRef.current.setView([lat, lon], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lon]);
          } else {
            const newMarker = L.marker([lat, lon], { draggable: true }).addTo(mapRef.current);
            markerRef.current = newMarker;
            newMarker.on('dragend', () => {
              const position = newMarker.getLatLng();
              setLatitude(position.lat.toFixed(6));
              setLongitude(position.lng.toFixed(6));
            });
          }
        }
      } else {
        setSearchError('Lieu non trouvé. Essayez de préciser la ville (ex. Kinshasa).');
      }
    } catch {
      setSearchError('Erreur lors de la recherche du lieu.');
    } finally {
      setSearchingLocation(false);
    }
  };

  const buildPayload = (): EventConfigPayload => {
    const publicEvent = canPublishEvents && (complete ? isPublic : Boolean(initialEvent?.isPublic));
    const paid = complete ? publicEvent && ticketing : Boolean(initialEvent?.ticketingEnabled);

    const neighborSharingPolicy: NeighborSharingPolicy = {
      mode: neighborSharingMode,
      shareSameTable,
      shareSameZone,
    };

    const existingPlan = initialEvent?.tablePlan && typeof initialEvent.tablePlan === 'object'
      ? (initialEvent.tablePlan as Record<string, unknown>)
      : {};

    const planToSave = {
      ...existingPlan,
      pricingZones: complete && paid && ticketPricingMode === 'by_zone' ? pricingZones : pricingZonesFromTablePlan(initialEvent?.tablePlan),
      ...(availableTables.length > 0
        ? {
            tables: availableTables.map((t) => ({
              ...t,
              pricingZoneId: tableZoneAssignments[t.id] ?? t.pricingZoneId ?? pricingZones[0]?.id,
            })),
          }
        : {}),
      neighborSharingPolicy,
    };

    return {
      title: title.trim(),
      description: description.trim(),
      date,
      location: location.trim(),
      city: city.trim(),
      commune: commune.trim(),
      neighborhood: neighborhood.trim(),
      reminderFrequency,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      roomId: roomId || null,
      isPublic: publicEvent,
      ticketingEnabled: paid,
      ticketPriceFc: complete
        ? paid
          ? ticketPricingMode === 'global'
            ? Number(ticketPrice) || 0
            : 0
          : 0
        : initialEvent?.ticketPriceFc ?? 0,
      ticketPricingMode: complete && paid ? ticketPricingMode : normalizeTicketPricingMode(initialEvent?.ticketPricingMode),
      pricingZones: complete && paid && ticketPricingMode === 'by_zone' ? pricingZones : pricingZonesFromTablePlan(initialEvent?.tablePlan),
      ticketsTotal: complete
        ? publicEvent && ticketsTotal
          ? Number(ticketsTotal)
          : null
        : initialEvent?.ticketsTotal ?? null,
      ticketsPerBuyerLimit: complete
        ? publicEvent && paid && ticketsPerBuyerLimit
          ? Number(ticketsPerBuyerLimit)
          : null
        : initialEvent?.ticketsPerBuyerLimit ?? null,
      seatSelectionEnabled: complete ? publicEvent && seatSelection : Boolean((initialEvent as { seatSelectionEnabled?: boolean } | undefined)?.seatSelectionEnabled),
      neighborSharingPolicy,
      eventProgram,
      notificationSettings,
      photos,
      guestGuidelines,
      formTemplateId,
      openTablePlanAfterSave,
      importRoomLayout: Boolean(roomId) && !editingId,
      eventKind: eventKind || null,
      clientName: complete ? clientName.trim() || null : initialEvent?.clientName || null,
      endsAt: complete ? endsAt || null : initialEvent?.endsAt ? toDateTimeLocalValue(initialEvent.endsAt) : null,
      estimatedGuests: complete
        ? estimatedGuests
          ? Number(estimatedGuests) || null
          : null
        : initialEvent?.estimatedGuests ?? null,
      dayOfContactName: complete ? contactName.trim() || null : initialEvent?.dayOfContactName || null,
      dayOfContactPhone: complete
        ? composeE164(contactCc, contactNational) || null
        : initialEvent?.dayOfContactPhone || null,
      themeId: themeId || null,
      tablePlan: planToSave,
      donations: donationsEnabled
        ? {
            enabled: true,
            targetAmountFc: donationTargetFc ? Math.round(Number(donationTargetFc)) : null,
            minAmountFc: donationMinAmountFc ? Math.round(Number(donationMinAmountFc)) : 1000,
            cause: donationCause.trim() || null,
            suggestedAmountsFc: donationSuggestedFc
              .split(/[,;\s]+/)
              .map((s) => Math.round(Number(s.trim())))
              .filter((n) => Number.isFinite(n) && n >= (Number(donationMinAmountFc) || 1000)),
            donorAttendancePass,
          }
        : {
            enabled: false,
            targetAmountFc: null,
            minAmountFc: Number(donationMinAmountFc) || 1000,
            cause: donationCause.trim() || null,
            suggestedAmountsFc: [],
            donorAttendancePass: true,
          },
      acceptCollectionTerms: collectionTermsAccepted,
      payoutPhone: composeE164(payoutCc, payoutNational) || null,
      payoutHolderName: payoutHolderName.trim() || null,
    };
  };

  /** Billetterie payante ou dons actifs : un numéro de reversement est obligatoire. */
  const collectsMoney =
    (complete ? isPublic && ticketing : Boolean(initialEvent?.ticketingEnabled)) || donationsEnabled;

  const missingTab = firstInvalidEventConfigTab({ title, date, location, commune, neighborhood });

  const getTicketHolderRisks = () => {
    if (!initialEvent?.ticketsSold || initialEvent.ticketsSold <= 0) return [];
    const risks: Array<{ title: string; risk: string }> = [];

    // 1. Billetterie désactivée
    if (initialEvent.ticketingEnabled && !ticketing) {
      risks.push({
        title: 'Désactivation de la billetterie payante',
        risk: `Vous désactivez la billetterie alors que ${initialEvent.ticketsSold} billet(s) ont déjà été achetés. Les acheteurs ne pourront plus accéder aux fonctions de leurs billets.`,
      });
    }

    // 2. Choix de places désactivé
    if (initialEvent.seatSelectionEnabled && !seatSelection) {
      risks.push({
        title: 'Désactivation du choix des places sur plan',
        risk: 'Des participants ont réservé des sièges précis. La désactivation du choix de place risque de masquer ou dissocier leurs réservations de places.',
      });
    }

    // 3. Changement de salle
    if (initialEvent.roomId && roomId !== initialEvent.roomId) {
      risks.push({
        title: 'Changement de salle de réception',
        risk: 'Changer de salle modifie la disposition 2D/3D et entraîne la désynchronisation ou la perte des places déjà attribuées aux acheteurs.',
      });
    }

    // 4. Capacité totale inférieure aux billets vendus
    if (ticketsTotal && Number(ticketsTotal) < initialEvent.ticketsSold) {
      risks.push({
        title: 'Capacité inférieure au nombre de billets vendus',
        risk: `La nouvelle capacité renseignée (${ticketsTotal}) est inférieure au nombre de billets déjà vendus (${initialEvent.ticketsSold}).`,
      });
    }

    // 5. Abandon des zones tarifaires 3D
    if (initialEvent.ticketPricingMode === 'by_zone' && ticketPricingMode !== 'by_zone') {
      risks.push({
        title: 'Suppression du mode zones tarifaires au profit du tarif unique',
        risk: 'Des billets ont été achetés dans des zones tarifaires distinctes (VIP, Standard...). Ce changement réinitialise la structure tarifaire.',
      });
    }

    // 6. Changement de date de l’événement
    if (initialEvent.date && date && new Date(date).getTime() !== new Date(initialEvent.date).getTime()) {
      const oldD = new Date(initialEvent.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      const newD = new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      risks.push({
        title: 'Modification de la date / heure de l’événement',
        risk: `La date passe de ${oldD} à ${newD}. Les billets émis et les confirmations d’achat contiendront une date caduque si aucun avis n'est envoyé.`,
      });
    }

    return risks;
  };

  const collectionModalContext = (
    pending: 'ticketing' | 'donations' | 'public-ticketing' | 'save' | null,
  ): 'ticketing' | 'donations' | 'both' => {
    if (pending === 'donations') return ticketing ? 'both' : 'donations';
    if (pending === 'ticketing' || pending === 'public-ticketing') {
      return donationsEnabled ? 'both' : 'ticketing';
    }
    if (ticketing && donationsEnabled) return 'both';
    if (donationsEnabled) return 'donations';
    return 'ticketing';
  };

  const requestEnableCollection = (
    action: 'ticketing' | 'donations' | 'public-ticketing',
  ) => {
    if (collectionTermsAccepted) {
      if (action === 'public-ticketing') {
        setIsPublic(true);
        setTicketing(true);
        return;
      }
      if (action === 'ticketing') {
        setTicketing(true);
        return;
      }
      setDonationsEnabled(true);
      return;
    }
    setPendingCollectionEnable(action);
    setCollectionTermsModal(collectionModalContext(action));
  };

  const handleAcceptCollectionTerms = async () => {
    setCollectionTermsAccepted(true);
    const pending = pendingCollectionEnable;
    setCollectionTermsModal(null);
    setPendingCollectionEnable(null);
    if (pending === 'public-ticketing') {
      setIsPublic(true);
      setTicketing(true);
      return;
    }
    if (pending === 'ticketing') {
      setTicketing(true);
      return;
    }
    if (pending === 'donations') {
      setDonationsEnabled(true);
      return;
    }
    if (pending === 'save') {
      setFormError('');
      await onSave({
        ...buildPayload(),
        acceptCollectionTerms: true,
      });
    }
  };

  const submit = async () => {
    if (missingTab) {
      setTab(missingTab);
      setFormError(
        missingTab === 'essentials'
          ? 'Indiquez au moins un titre et une date.'
          : 'Indiquez le lieu, la commune et le quartier.',
      );
      return;
    }
    if (complete && isPublic && ticketing && ticketPricingMode === 'global' && !ticketPrice) {
      setTab('access');
      setFormError('Indiquez le prix du billet.');
      return;
    }
    if (complete && isPublic && ticketing && ticketPricingMode === 'by_zone') {
      const validZones = pricingZones.filter((z) => z.name.trim() && z.priceFc > 0);
      if (validZones.length === 0) {
        setTab('access');
        setFormError('Ajoutez au moins une zone tarifaire avec un prix.');
        return;
      }
    }

    const willCollect = collectsMoney;
    if (willCollect && !composeE164(payoutCc, payoutNational)) {
      setTab('access');
      setFormError(
        'Indiquez le numéro Mobile Money sur lequel EventMaster vous reversera l’argent collecté (billetterie ou dons).',
      );
      return;
    }
    if (willCollect && !collectionTermsAccepted) {
      setTab('access');
      setPendingCollectionEnable('save');
      setCollectionTermsModal(collectionModalContext('save'));
      setFormError(
        'Pour activer la billetterie ou les dons, validez les conditions de la plateforme en vigueur.',
      );
      return;
    }

    // Interception de sécurité : Si des billets ont été vendus et que des changements à risque sont détectés
    const ticketRisks = getTicketHolderRisks();
    if (ticketRisks.length > 0 && !ticketRiskConfirmed) {
      setPendingTicketRisks(ticketRisks);
      return;
    }

    setFormError('');
    await onSave(buildPayload());
  };

  const handleConfirmTicketRisks = async () => {
    setTicketRiskConfirmed(true);
    setPendingTicketRisks(null);
    setFormError('');
    await onSave(buildPayload());
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  // À la création, « Entrée » dans un champ avance d’une étape au lieu de tout valider d’un coup.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.defaultPrevented || e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    const target = e.target as HTMLElement;
    if (target.tagName !== 'INPUT') return;
    const type = (target as HTMLInputElement).type;
    if (type === 'checkbox' || type === 'radio' || type === 'file') return;
    if (editingId || !nextEventConfigTab(tab)) return;
    e.preventDefault();
    handleNext();
  };

  const handleSkip = async () => {
    await submit();
  };

  const handlePrev = () => {
    const prev = previousEventConfigTab(tab);
    if (prev) {
      setFormError('');
      setTab(prev);
    }
  };

  const handleNext = () => {
    if (tab === 'essentials' && (!title.trim() || !date)) {
      setFormError('Indiquez au moins un titre et une date pour continuer.');
      return;
    }
    if (tab === 'place' && (!location.trim() || !commune.trim() || !neighborhood.trim())) {
      setFormError('Indiquez le lieu, la commune et le quartier.');
      return;
    }
    const next = nextEventConfigTab(tab);
    if (next) {
      setFormError('');
      setTab(next);
    }
  };

  const tabStatus = useMemo(() => {
    const essentialsDone = Boolean(title.trim() && date);
    const placeDone = Boolean(location.trim() && commune.trim() && neighborhood.trim());
    const accessDone =
      !complete ||
      !isPublic ||
      !ticketing ||
      (ticketPricingMode === 'global'
        ? Boolean(ticketPrice && Number(ticketPrice) > 0)
        : pricingZones.some((zone) => zone.name.trim() && zone.priceFc > 0));
    const allRequiredDone = essentialsDone && placeDone && accessDone;

    return {
      essentialsDone,
      placeDone,
      accessDone,
      allRequiredDone,
    };
  }, [title, date, location, commune, neighborhood, complete, isPublic, ticketing, ticketPricingMode, ticketPrice, pricingZones]);

  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    if (!title.trim()) missing.push('titre');
    if (!date) missing.push('date');
    if (!(location.trim() && commune.trim() && neighborhood.trim())) missing.push('lieu');
    if (!tabStatus.accessDone) missing.push('prix du billet');
    return missing;
  }, [title, date, location, commune, neighborhood, tabStatus.accessDone]);

  const formattedDatePreview = useMemo(() => {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    // Seul le jour de la semaine est nouveau : la date et l’heure sont déjà dans le champ.
    return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  }, [date]);

  const durationPreview = useMemo(() => {
    if (!date || !endsAt) return null;
    const start = new Date(date);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return { error: true, text: 'L’heure de fin doit être postérieure au début' };
    const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
    // Seule la durée est nouvelle : l’heure de fin est déjà dans son champ.
    return {
      error: false,
      text: `${diffHours.toLocaleString('fr-FR')} h`,
    };
  }, [date, endsAt]);

  const activeTheme = useMemo(
    () => INVITATION_COLOR_THEMES.find((t) => t.id === themeId),
    [themeId],
  );

  // Empreinte des champs saisis à la main, pour prévenir avant de fermer sans enregistrer.
  const draftSnapshot = JSON.stringify([
    title, partnerFirst, partnerSecond, description, date, endsAt, location, city, commune, neighborhood,
    eventKind, clientName, estimatedGuests, isPublic, ticketing, ticketPrice, ticketsTotal, photos,
    roomId, contactName, contactNational, donationsEnabled, donationCause, donationTargetFc,
    payoutNational, payoutHolderName, notificationSettings,
  ]);

  // Relevé au rendu qui suit la réinitialisation, une fois les valeurs chargées.
  const [baselineFor, setBaselineFor] = useState(0);
  if (open && baselineFor !== baselineToken) {
    setBaselineFor(baselineToken);
    setBaseline(draftSnapshot);
  }

  const isDirty = open && baseline !== null && baseline !== draftSnapshot;

  const requestClose = () => {
    if (saving) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  // Un seul bouton plein : « Créer » dès qu’il est utilisable (ou à la dernière étape), sinon « Suivant ».
  const createIsPrimary =
    Boolean(editingId) || !nextEventConfigTab(tab) || (tabStatus.allRequiredDone && !createDisabled);

  /** Réglage des dons : proposé aux événements publics comme privés (les invités donnent depuis leur invitation). */
  const donationsCard = (
      <div className="rounded-2xl border border-border bg-surface p-3.5 sm:p-4 space-y-3.5 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <label className={cn('flex items-start gap-3', donationsAllowedByAdmin ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed')}>
            <input
              type="checkbox"
              checked={donationsEnabled}
              disabled={!donationsAllowedByAdmin}
              onChange={(e) => {
                if (e.target.checked) {
                  requestEnableCollection('donations');
                  return;
                }
                setDonationsEnabled(false);
              }}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 mt-0.5"
            />
            <div>
              <span className="inline-flex items-center gap-1.5 font-bold text-foreground text-sm">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                Collecte de dons à montant libre
              </span>
              <p className="text-xs text-muted mt-0.5">
                Permet aux participants et donateurs d’effectuer un don financier solidaire libre en FC ou USD via Mobile Money et Carte bancaire.
                En plus de l&apos;abonnement, EventMaster se réserve le droit de prélever une commission de{' '}
                {COLLECTION_COMMISSION_MIN_PERCENT} à {COLLECTION_COMMISSION_MAX_PERCENT}&nbsp;% du
                montant global collecté. L&apos;activation exige l&apos;acceptation des conditions en
                vigueur.
              </p>
            </div>
          </label>
          <span
            className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
              donationsAllowedByAdmin
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                : 'text-amber-700 dark:text-amber-300 bg-amber-500/15',
            )}
          >
            {donationsAllowedByAdmin ? 'Autorisé' : 'Restreint'}
          </span>
        </div>

        {!donationsAllowedByAdmin && (
          <div className="rounded-xl border border-border bg-surface p-3 text-xs text-foreground space-y-1 shadow-2xs">
            <p className="font-semibold flex items-center gap-1.5 text-foreground">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
              Option soumise à autorisation de l&apos;administrateur
            </p>
            <p className="text-xs leading-relaxed text-muted">
              La collecte de dons à montant libre est actuellement restreinte par la politique du Super Admin pour votre organisation.
              Contactez le support EventMaster pour demander l&apos;activation des donations pour vos événements.
            </p>
          </div>
        )}

        {donationsAllowedByAdmin && donationsEnabled && (
          <div className="space-y-3.5 pt-2 border-t border-border">
            <Input
              label="Cause / Motif de la collecte"
              value={donationCause}
              onChange={(e) => setDonationCause(e.target.value)}
              placeholder="ex. Soutien aux orphelinats de Kinshasa, levée de fonds pour bourses scolaires..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Objectif cible en FC (optionnel — affiche une jauge de collecte)"
                type="number"
                min={0}
                value={donationTargetFc}
                onChange={(e) => setDonationTargetFc(e.target.value)}
                placeholder="ex. 10000000"
              />
              <Input
                label="Montant minimum d'un don (FC)"
                type="number"
                min={100}
                step={1}
                value={donationMinAmountFc}
                onChange={(e) => setDonationMinAmountFc(e.target.value)}
                placeholder="1000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted block">
                Suggestions rapides de montants (FC, séparés par virgules)
              </label>
              <Input
                value={donationSuggestedFc}
                onChange={(e) => setDonationSuggestedFc(e.target.value)}
                placeholder="2500, 5000, 10000, 25000, 50000, 100000"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {donationSuggestedFc
                  .split(/[,;\s]+/)
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0)
                  .map((amt) => (
                    <span key={amt} className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface-muted text-foreground border border-border">
                      {amt.toLocaleString('fr-FR')} FC
                    </span>
                  ))}
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={donorAttendancePass}
                onChange={(e) => setDonorAttendancePass(e.target.checked)}
                className="rounded border-border mt-0.5 w-4 h-4 text-primary focus:ring-primary/30"
              />
              <div>
                <span className="font-semibold">Attribuer un pass invité « Donateur » avec badge QR</span>
                <span className="block text-xs text-muted">
                  Si activé, chaque donateur reçoit automatiquement un pass d’accès confirmé et son QR code pour assister à l’événement.
                </span>
              </div>
            </label>
          </div>
        )}
      </div>
  );

  return (
    <>
      <Modal
      open={open}
      onClose={requestClose}
      title={
        pickingKind
          ? 'Quel événement préparez-vous ?'
          : editingId
            ? `Modifier « ${initialEvent?.title || 'l’événement'} »`
            : 'Nouvel événement'
      }
      size="xl"
      footer={
        pickingKind ? (
          <div className="flex w-full justify-between gap-3">
            {/* Revenir au formulaire si un type est déjà choisi ; sinon, fermer la création. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={editingId || eventKind ? <ArrowLeft className="w-4 h-4" /> : undefined}
              onClick={editingId || eventKind ? () => setPickingKind(false) : requestClose}
            >
              {editingId || eventKind ? 'Retour' : 'Annuler'}
            </Button>
          </div>
        ) : (
        <div className="flex w-full flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={requestClose}>
              Annuler
            </Button>
            {!tabStatus.allRequiredDone && missingRequired.length > 0 && (
              <span
                className={cn(
                  'min-w-0 text-xs',
                  formError ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted',
                )}
              >
                À compléter : {missingRequired.join(', ')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {tab !== 'essentials' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={handlePrev}
              >
                Précédent
              </Button>
            )}

            {tab !== 'welcome' && (
              <Button
                type="button"
                variant={createIsPrimary ? 'secondary' : 'primary'}
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
                className="font-semibold"
              >
                Suivant
              </Button>
            )}

            <Button
              type="submit"
              form="event-config-form"
              variant={createIsPrimary ? 'primary' : 'secondary'}
              size="sm"
              loading={saving}
              disabled={!editingId && (createDisabled || !tabStatus.allRequiredDone)}
              title={
                editingId
                  ? undefined
                  : createDisabledTitle && createDisabled
                    ? createDisabledTitle
                    : !tabStatus.allRequiredDone
                      ? `À compléter : ${missingRequired.join(', ')}`
                      : undefined
              }
              className="font-semibold"
            >
              {editingId ? 'Enregistrer les modifications' : 'Créer l’événement'}
            </Button>
          </div>
        </div>
        )
      }
    >
      {pickingKind ? (
        <EventKindPicker
          kinds={kinds}
          selected={eventKind}
          onPick={(kind) => {
            applyKind(kind);
            setPickingKind(false);
            setTab('essentials');
          }}
        />
      ) : (
      <form id="event-config-form" onSubmit={handleFormSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
        {/* Étapes et mode */}
        <div className="flex flex-col-reverse gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center" role="tablist" aria-label="Étapes de configuration">
            {EVENT_CONFIG_TABS.map((item) => {
              const details = EVENT_CONFIG_TAB_DETAILS[item.id];
              const isCurrent = tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  title={details.subtitle}
                  onClick={() => {
                    setFormError('');
                    setTab(item.id);
                  }}
                  className={cn(
                    'relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 text-sm transition-colors touch-manipulation sm:px-4',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                    isCurrent
                      ? 'font-semibold text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary sm:after:inset-x-4'
                      : 'font-medium text-muted hover:text-foreground',
                  )}
                >
                  {details.label}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Mode du formulaire"
            className={cn('inline-flex shrink-0 self-end sm:mb-2', SEGMENTED_TRACK)}
          >
            <button
              type="button"
              aria-pressed={!complete}
              onClick={() => setMode('simple')}
              className={segmentedItem(!complete, 'min-h-9 px-3 text-xs sm:min-h-8')}
              title="Titre, date et lieu"
            >
              Express
            </button>
            <button
              type="button"
              aria-pressed={complete}
              onClick={() => setMode('complete')}
              className={segmentedItem(complete, 'min-h-9 px-3 text-xs sm:min-h-8')}
              title="Billetterie, zones tarifaires, staff et programme"
            >
              Avancé
            </button>
          </div>
        </div>

        {(formError || saveError) && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
            <span>{formError || saveError}</span>
          </div>
        )}

        {tab === 'essentials' && (
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted/40 py-2 pl-2 pr-1.5">
              <span className="flex min-w-0 items-center gap-2.5">
                {(() => {
                  const KindIcon = eventKind ? KIND_ICONS[eventKind] : Calendar;
                  const tint = eventKind ? KIND_TINTS[eventKind] : 'var(--muted)';
                  return (
                    <span
                      aria-hidden
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `color-mix(in srgb, ${tint} 16%, var(--surface))`, color: tint }}
                    >
                      <KindIcon className="h-[18px] w-[18px]" />
                    </span>
                  );
                })()}
                <span className="truncate text-sm font-semibold text-foreground">
                  {eventKind ? EVENT_KIND_LABELS[eventKind] : 'Type d’événement'}
                </span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPickingKind(true)}>
                {eventKind ? 'Changer' : 'Choisir'}
              </Button>
            </div>

            {eventKind === 'WEDDING' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Prénom conjoint(e) 1"
                  value={partnerFirst}
                  onChange={(e) => applyPartner(e.target.value, partnerSecond)}
                  placeholder="Claire"
                />
                <Input
                  label="Prénom conjoint(e) 2"
                  value={partnerSecond}
                  onChange={(e) => applyPartner(partnerFirst, e.target.value)}
                  placeholder="Alexandre"
                />
              </div>
            )}

            <Input
              label="Titre de l’événement"
              value={title}
              onChange={(e) => {
                setTitleManual(true);
                setTitle(e.target.value);
              }}
              placeholder={eventKind === 'WEDDING' ? 'Mariage de Claire & Alexandre' : 'ex. Anniversaire de Léa'}
              required
            />

            <div className="space-y-2">
              <div className={cn('grid grid-cols-1 gap-x-3 gap-y-5', complete ? 'sm:grid-cols-2' : '')}>
                <div className="space-y-2">
                  <Input
                    label="Date & heure de début"
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => setDatePreset('this_saturday')} className={QUICK_CHIP_CLASS}>
                      Ce samedi (18h)
                    </button>
                    <button type="button" onClick={() => setDatePreset('next_saturday')} className={QUICK_CHIP_CLASS}>
                      Samedi prochain
                    </button>
                    <button type="button" onClick={() => setDatePreset('in_month')} className={QUICK_CHIP_CLASS}>
                      Dans 1 mois
                    </button>
                  </div>
                </div>

                {complete && (
                  <div className="space-y-2">
                    <Input
                      label="Heure de fin (optionnel)"
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                    />
                    {date && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted">Durée :</span>
                        <button type="button" onClick={() => setEndsAtPreset(2)} className={QUICK_CHIP_CLASS}>
                          +2h
                        </button>
                        <button type="button" onClick={() => setEndsAtPreset(4)} className={QUICK_CHIP_CLASS}>
                          +4h
                        </button>
                        <button type="button" onClick={() => setEndsAtPreset(6, true)} className={QUICK_CHIP_CLASS}>
                          Soirée (minuit)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Aperçu lisible de la date & durée */}
              {(formattedDatePreview || durationPreview) && (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {formattedDatePreview && (
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="inline-block first-letter:uppercase">{formattedDatePreview}</span>
                    </span>
                  )}
                  {durationPreview && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        durationPreview.error ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-muted',
                      )}
                    >
                      {durationPreview.error ? (
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : (
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                      <span>{durationPreview.text}</span>
                    </span>
                  )}
                </p>
              )}
            </div>

            {!complete && (
              <div className="space-y-3">
                <Input
                  label="Lieu"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="ex. Hôtel Fleuve Congo"
                />
                <CityLocationFields
                  city={city}
                  commune={commune}
                  neighborhood={neighborhood}
                  onChange={applyPlace}
                  hint=""
                />
              </div>
            )}

            {complete && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Client / dossier"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="ex. Famille Mbemba"
                  />
                  <Input
                    label="Effectif estimé"
                    type="number"
                    min={1}
                    value={estimatedGuests}
                    onChange={(e) => setEstimatedGuests(e.target.value)}
                    placeholder="ex. 180"
                  />
                </div>

                <label className="block space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="block text-xs font-semibold text-muted">Description de l’événement</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!title) return;
                        const hints = [
                          "Préparez-vous à vivre un moment inoubliable avec nous.",
                          "Nous sommes ravis de vous convier à cet événement exceptionnel.",
                          "Rejoignez-nous pour célébrer ensemble dans la joie et la bonne humeur.",
                          "Une journée festive et chaleureuse pleine de surprises vous attend."
                        ];
                        setDescription(`Bienvenue à "${title}". ${hints[Math.floor(Math.random() * hints.length)]}`);
                      }}
                      disabled={!title.trim()}
                      className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover disabled:opacity-40 transition-colors touch-manipulation"
                      title="Suggérer un texte d'accueil chaleureux basé sur le titre"
                    >
                      <Sparkles className="w-3 h-3" /> Suggérer un texte
                    </button>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optionnel — ambiance, précisions générales…"
                    rows={3}
                    className={TEXTAREA_CLASS}
                  />
                </label>

                <div className="space-y-2">
                  <span id="event-config-visibility-label" className="block text-xs font-semibold text-muted">
                    Visibilité
                  </span>
                  <div
                    role="group"
                    aria-labelledby="event-config-visibility-label"
                    className={cn('grid grid-cols-2', SEGMENTED_TRACK)}
                  >
                    <button
                      type="button"
                      aria-pressed={!isPublic}
                      onClick={() => {
                        setIsPublic(false);
                        setTicketing(false);
                      }}
                      title="Sur invitation nominative"
                      className={segmentedItem(!isPublic, 'inline-flex items-center justify-center gap-2')}
                    >
                      <GlobeLock className="h-4 w-4 shrink-0" aria-hidden />
                      Privé
                    </button>
                    <button
                      type="button"
                      aria-pressed={isPublic}
                      disabled={!canPublishEvents}
                      onClick={() => {
                        if (!canPublishEvents) return;
                        if (onlinePaymentsEnabled) {
                          requestEnableCollection('public-ticketing');
                          return;
                        }
                        setIsPublic(true);
                      }}
                      title="Fiche marketplace et billetterie"
                      className={segmentedItem(
                        isPublic,
                        'inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted',
                      )}
                    >
                      <Globe className="h-4 w-4 shrink-0" aria-hidden />
                      Public
                    </button>
                  </div>
                  {!canPublishEvents && (
                    <p className="text-xs text-muted">Public : forfaits organisation uniquement.</p>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {tab === 'place' && (
          <section className="space-y-4">
            {/* Sous-onglet 1 : Salle & Modèle 3D (ou en mode express si sélectionné) */}
            {(
              <div className="space-y-4">
                {selectedRoom && (
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-primary/25 bg-primary/5 dark:bg-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{selectedRoom.name}</p>
                        <p className="text-xs text-muted truncate">
                          {selectedRoom.capacity ? `${selectedRoom.capacity} places assises · ` : ''}
                          {selectedRoom.floor ? `Étage : ${selectedRoom.floor} · ` : ''}
                          {selectedRoomBlueprint ? '✓ Plan 3D rattaché' : 'Lieu sans plan'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyRoom('')}
                      className="text-xs text-rose-600 font-semibold hover:underline shrink-0 px-2 py-1"
                    >
                      Détacher la salle
                    </button>
                  </div>
                )}

                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                    <Building2 className="w-3.5 h-3.5" />
                    Sélectionner une salle enregistrée (optionnel)
                  </span>
                  <select
                    value={roomId}
                    onChange={(e) => applyRoom(e.target.value)}
                    disabled={loadingRooms}
                    className={SELECT_CLASS}
                  >
                    <option value="">Aucune — lieu libre</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                        {room.floor ? ` (${room.floor})` : ''}
                        {room.capacity ? ` · ${room.capacity} pl.` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted">
                    {rooms.length === 0 ? (
                      <>
                        Créez des salles dans{' '}
                        <Link href="/dashboard/rooms" className="font-semibold text-primary hover:underline">
                          Salles
                        </Link>
                        , ou parcourez le marketplace.
                      </>
                    ) : (
                      'Préremplit le lieu et lie le staff. À la création, le plan de table est importé si un modèle existe.'
                    )}{' '}
                    <Link href="/marketplace/salles" className="font-semibold text-primary hover:underline">
                      Trouver une salle
                    </Link>
                    {' · '}
                    <Link href="/marketplace/prestataires" className="font-semibold text-primary hover:underline">
                      Trouver un prestataire
                    </Link>
                  </p>
                </label>

                {selectedRoom && (
                  <div className="rounded-[var(--radius-card)] border border-border bg-surface-muted/30 p-3 sm:p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-semibold text-foreground">Aperçu de la salle</h4>
                        {selectedRoomBlueprint ? (
                          <p className="text-xs text-muted leading-relaxed">
                            Ambiance{' '}
                            <span className="font-semibold text-foreground">
                              {lightingPresetLabels[roomPreviewLighting]}
                            </span>
                            {eventProgram.slots[0]
                              ? ` · créneau « ${eventProgram.slots[0].label} »`
                              : ' · définissez un créneau dans Accès pour ajuster l’éclairage'}
                          </p>
                        ) : (
                          <p className="text-xs text-muted leading-relaxed">
                            Cette salle n’a pas encore de modèle. Créez-en un dans{' '}
                            <Link href="/dashboard/rooms" className="font-semibold text-primary hover:underline">
                              Salles
                            </Link>
                            .
                          </p>
                        )}
                      </div>
                      {selectedRoomBlueprint && (
                        <div className="flex shrink-0 gap-1 rounded-full border border-border bg-surface p-0.5">
                          {([
                            { id: 'standard' as const, label: 'Rapide' },
                            { id: 'showcase' as const, label: '3D showcase' },
                          ]).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setRoomPreviewQuality(opt.id)}
                              className={cn(
                                'px-2.5 py-1 rounded-full text-xs font-semibold transition',
                                roomPreviewQuality === opt.id
                                  ? 'bg-foreground text-background'
                                  : 'text-muted hover:text-foreground',
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedRoomBlueprint ? (
                      <>
                        <RoomLayoutPreview
                          blueprint={selectedRoomBlueprint}
                          quality={roomPreviewQuality}
                          lightingPreset={roomPreviewLighting}
                          showMeta
                          className="[&_.em-floor-canvas]:rounded-xl"
                        />
                        <p className="text-xs text-muted leading-relaxed">
                          Orbitez pour inspecter la salle. Le plan de table sera importé automatiquement à la création.{' '}
                          <Link href="/dashboard/rooms" className="font-semibold text-primary hover:underline">
                            Modifier le modèle
                          </Link>
                        </p>
                      </>
                    ) : (
                      <div className="aspect-[4/3] rounded-xl border border-dashed border-border bg-surface flex flex-col items-center justify-center gap-2 text-center px-4">
                        <LayoutGrid className="w-8 h-8 text-muted" />
                        <p className="text-xs text-muted">
                          Aucun plan disponible pour « {selectedRoom.name} ».
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Sous-onglet 2 : Adresse & Coordonnées GPS */}
            {(
              <div className="space-y-4">
                <Input
                  label="Lieu / salle"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="ex. Hôtel Fleuve Congo"
                  required
                />
                <CityLocationFields
                  city={city}
                  commune={commune}
                  neighborhood={neighborhood}
                  onChange={applyPlace}
                  hint="Commune et quartier aident les invités à se repérer. La carte se cadre sur la commune."
                />

                <div className="space-y-3 pt-1 border-t border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-muted">Localisation GPS</h4>
                      <p className="text-xs text-muted mt-0.5">
                        {latitude && longitude ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Coordonnées actives ({latitude}, {longitude})
                          </span>
                        ) : (
                          messaging.whatsapp
                            ? 'Optionnel — pour le pin WhatsApp et l’itinéraire GPS'
                            : 'Optionnel — pour l’itinéraire GPS'
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {latitude && longitude && (
                        <button
                          type="button"
                          onClick={() => {
                            setLatitude('');
                            setLongitude('');
                          }}
                          className="text-xs text-rose-600 font-semibold hover:underline"
                        >
                          Effacer GPS
                        </button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void searchLocationOnMap()}
                        disabled={searchingLocation}
                        leftIcon={searchingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      >
                        Rechercher sur la carte
                      </Button>
                    </div>
                  </div>
                  {searchError && <p className="text-xs text-rose-600 font-medium">{searchError}</p>}
                  <div
                    id="event-config-map-picker"
                    className="w-full h-48 bg-surface-muted rounded-[var(--radius-card)] border border-border overflow-hidden relative"
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">
                      Chargement de la carte…
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    Cliquez sur la carte ou faites glisser le marqueur — les coordonnées GPS sont enregistrées automatiquement.
                  </p>
                </div>

              </div>
            )}
          </section>
        )}

        {tab === 'access' && (
          <section className="space-y-4">
            {complete && isPublic && (
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-surface-muted border border-border rounded-2xl mb-2">
                <button
                  type="button"
                  onClick={() => setAccessSubTab('ticketing')}
                  className={cn(
                    'flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5',
                    accessSubTab === 'ticketing'
                      ? 'bg-surface text-foreground shadow-2xs border border-border/80'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  <Ticket className="w-3.5 h-3.5 text-primary" />
                  <span>Billetterie &amp; Tarifs</span>
                  {ticketing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setAccessSubTab('seating')}
                  className={cn(
                    'flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5',
                    accessSubTab === 'seating'
                      ? 'bg-surface text-foreground shadow-2xs border border-border/80'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  <Box className="w-3.5 h-3.5 text-primary" />
                  <span>Places &amp; Voisins</span>
                  {seatSelection && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setAccessSubTab('donations')}
                  className={cn(
                    'flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5',
                    accessSubTab === 'donations'
                      ? 'bg-surface text-foreground shadow-2xs border border-border/80'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Dons libres</span>
                  {donationsEnabled && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setAccessSubTab('program')}
                  className={cn(
                    'flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5',
                    accessSubTab === 'program'
                      ? 'bg-surface text-foreground shadow-2xs border border-border/80'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Ambiance &amp; réponses</span>
                  {formTemplateId && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </button>
              </div>
            )}

            {collectsMoney && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 sm:p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Wallet className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Numéro de reversement (obligatoire)</p>
                    <p className="text-xs text-muted leading-relaxed">
                      EventMaster vous reverse sur ce numéro Mobile Money le montant net collecté (billets et dons,
                      après commission), automatiquement à minuit (heure de Kinshasa) dès que le montant peut être reversé.
                      Les responsables de l’organisation sont prévenus à chaque reversement et à chaque changement de numéro.
                    </p>
                  </div>
                </div>
                <PhoneInput
                  label="Numéro Mobile Money"
                  countryCode={payoutCc}
                  national={payoutNational}
                  onCountryCodeChange={setPayoutCc}
                  onNationalChange={setPayoutNational}
                />
                <Input
                  label="Titulaire du compte (facultatif)"
                  value={payoutHolderName}
                  onChange={(e) => setPayoutHolderName(e.target.value)}
                  placeholder="ex. Association Les Amis"
                />
              </div>
            )}

            {complete && isPublic ? (
              <>
                {/* SOUS-ONGLET 1 : Billetterie & Tarifs */}
                {accessSubTab === 'ticketing' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-surface p-3.5 sm:p-4 space-y-3.5">
                      <label className={`flex items-start gap-3 text-sm cursor-pointer ${!onlinePaymentsEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={ticketing}
                          disabled={!onlinePaymentsEnabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              requestEnableCollection('ticketing');
                              return;
                            }
                            setTicketing(false);
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 mt-0.5"
                        />
                        <div>
                          <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                            <Ticket className="w-4 h-4 text-primary" />
                            Billetterie en ligne payante
                          </span>
                          <p className="text-xs text-muted mt-0.5">
                            Paiement sécurisé par Mobile Money (Orange Money, M-Pesa, Airtel Money) et Carte bancaire.
                            En plus de l&apos;abonnement, EventMaster se réserve le droit de prélever une commission de{' '}
                            {COLLECTION_COMMISSION_MIN_PERCENT} à {COLLECTION_COMMISSION_MAX_PERCENT}&nbsp;% du
                            montant global collecté. L&apos;activation exige l&apos;acceptation des conditions en
                            vigueur.
                          </p>
                        </div>
                      </label>

                      {!onlinePaymentsEnabled && (
                        <p className="text-xs text-muted bg-surface-muted border border-border rounded-lg px-3 py-2">
                          Les paiements en ligne sont désactivés par le Super Admin. Seule l&apos;inscription gratuite est disponible.
                        </p>
                      )}

                      {ticketing && (
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-xs text-primary">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Validation automatique de présence &amp; Billets partagés</span>
                          </div>
                          <ul className="text-xs text-muted space-y-1 pl-4 list-disc leading-relaxed">
                            <li><strong>Présence validée automatiquement :</strong> Dès qu’un participant paie son billet, son statut passe directement à Présent (réponse validée).</li>
                            <li><strong>Billets partagés personnalisables :</strong> Les bénéficiaires d’un lot de billets peuvent chacun personnaliser leur nom, prénom et téléphone sur leur pass d’accès.</li>
                          </ul>
                        </div>
                      )}

                      {ticketing && (
                        <div className="space-y-3.5 pt-2 border-t border-border">
                          <div>
                            <p className="text-xs font-bold text-foreground mb-1.5">Mode tarifaire</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <button
                                type="button"
                                onClick={() => setTicketPricingMode('global')}
                                className={cn(
                                  'p-3 rounded-xl border text-left transition relative flex flex-col gap-1 min-h-11',
                                  ticketPricingMode === 'global'
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                                    : 'border-border bg-surface hover:bg-surface-muted'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-foreground">Tarif Unique</span>
                                  {ticketPricingMode === 'global' && <Check className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <span className="text-xs text-muted">Un prix unique pour tous les billets de l’événement.</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setTicketPricingMode('by_zone');
                                  setTicketPrice('');
                                  if (pricingZones.length === 0) {
                                    setPricingZones([createEmptyPricingZone(0), createEmptyPricingZone(1)]);
                                  }
                                }}
                                className={cn(
                                  'p-3 rounded-xl border text-left transition relative flex flex-col gap-1 min-h-11',
                                  ticketPricingMode === 'by_zone'
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                                    : 'border-border bg-surface hover:bg-surface-muted'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                    <Box className="w-3.5 h-3.5 text-primary" />
                                    Zones Tarifaires 3D
                                  </span>
                                  {ticketPricingMode === 'by_zone' && <Check className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <span className="text-xs text-muted">Catégories distinctes (VIP, Carré d’Or, Standard) avec modélisation 3D et tarifs distincts.</span>
                              </button>
                            </div>
                          </div>

                          {ticketPricingMode === 'global' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <Input
                                label="Prix du billet (FC)"
                                type="number"
                                min={0}
                                value={ticketPrice}
                                onChange={(e) => setTicketPrice(e.target.value)}
                                placeholder="ex. 25000"
                                required
                              />
                              <Input
                                label="Nombre de places (optionnel)"
                                type="number"
                                min={1}
                                value={ticketsTotal}
                                onChange={(e) => setTicketsTotal(e.target.value)}
                                placeholder="Illimité"
                              />
                            </div>
                          ) : (
                            <div className="space-y-3 pt-1">
                              <PublicEventZoneStudio3D
                                blueprint={selectedRoomBlueprint}
                                pricingZones={pricingZones}
                                onUpdatePricingZones={setPricingZones}
                                tables={availableTables}
                                tableZoneAssignments={tableZoneAssignments}
                                onAssignTableZone={(tableId, zoneId) =>
                                  setTableZoneAssignments((prev) => ({ ...prev, [tableId]: zoneId }))
                                }
                                onBulkAssignTables={(assignments, updatedZones) => {
                                  setTableZoneAssignments((prev) => ({ ...prev, ...assignments }));
                                  if (updatedZones) setPricingZones(updatedZones);
                                }}
                                roomName={selectedRoom?.name}
                                lightingPreset={roomPreviewLighting}
                                onOpenRoomPicker={() => setTab('place')}
                              />

                              <Input
                                label="Nombre de places total (optionnel)"
                                type="number"
                                min={1}
                                value={ticketsTotal}
                                onChange={(e) => setTicketsTotal(e.target.value)}
                                placeholder="Illimité"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {!ticketing && (
                        <Input
                          label="Capacité (optionnel)"
                          type="number"
                          min={1}
                          value={ticketsTotal}
                          onChange={(e) => setTicketsTotal(e.target.value)}
                          placeholder="Illimité"
                        />
                      )}
                      {ticketing && (
                        <Input
                          label="Limite de billets par personne"
                          type="number"
                          min={1}
                          value={ticketsPerBuyerLimit}
                          onChange={(e) => setTicketsPerBuyerLimit(e.target.value)}
                          placeholder="Illimité"
                          hint="Nombre maximal de billets qu’un même e-mail peut payer. Laissez vide pour autoriser plusieurs achats sans plafond."
                        />
                      )}
                      <p className="text-xs text-muted">
                        {ticketing
                          ? 'Paiements par Mobile Money et Carte (FlexPay). Une même personne peut racheter des billets, dans la limite que vous fixez. Chaque commande génère des pass QR distincts.'
                          : 'Inscription gratuite : le visiteur renseigne son nom et téléphone, puis reçoit son pass d’accès.'}
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setAccessSubTab('seating')}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        Suivant : Places &amp; Voisins
                      </Button>
                    </div>
                  </div>
                )}

                {/* SOUS-ONGLET 2 : Places & Voisins */}
                {accessSubTab === 'seating' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-2">
                      <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={seatSelection}
                          onChange={(e) => setSeatSelection(e.target.checked)}
                          className="rounded border-border mt-0.5 w-4 h-4 text-primary focus:ring-primary/30"
                        />
                        <div>
                          <span className="font-bold text-foreground">
                            Activer le choix de place sur le plan 2D / 3D à l’achat
                          </span>
                          <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                            Permet aux acheteurs de choisir leur siège ou table directement sur le plan interactif 2D ou 3D. 1 billet = 1 siège garanti.
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Confidentialité & Partage entre participants */}
                    <div className="rounded-2xl border border-border bg-surface p-3.5 sm:p-4 space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          <span className="font-bold text-xs text-foreground">
                            Confidentialité &amp; Partage entre convives (Événement public)
                          </span>
                        </div>
                        <span className="text-xs uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          RGPD &amp; Vie privée
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Déterminez si les participants peuvent voir les identités des personnes assises à leur table, allée ou zone sur les plans 2D/3D.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1" role="radiogroup" aria-label="Mode de visibilité des voisins">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={neighborSharingMode === 'first_name'}
                          onClick={() => setNeighborSharingMode('first_name')}
                          className={cn(
                            'p-2.5 rounded-xl border text-left transition flex flex-col gap-1 min-h-11 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            neighborSharingMode === 'first_name'
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                              : 'border-border bg-surface hover:bg-surface-muted'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">Prénoms seuls</span>
                            {neighborSharingMode === 'first_name' && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <span className="text-xs text-muted leading-snug">
                            Prénom visible (ex. &quot;Sarah M.&quot;). Idéal pour la convivialité et la discrétion. (Recommandé)
                          </span>
                        </button>

                        <button
                          type="button"
                          role="radio"
                          aria-checked={neighborSharingMode === 'hidden'}
                          onClick={() => setNeighborSharingMode('hidden')}
                          className={cn(
                            'p-2.5 rounded-xl border text-left transition flex flex-col gap-1 min-h-11 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            neighborSharingMode === 'hidden'
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                              : 'border-border bg-surface hover:bg-surface-muted'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">Anonymat total</span>
                            {neighborSharingMode === 'hidden' && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <span className="text-xs text-muted leading-snug">
                            Aucun nom visible. Les sièges apparaissent simplement &quot;Occupés&quot;.
                          </span>
                        </button>

                        <button
                          type="button"
                          role="radio"
                          aria-checked={neighborSharingMode === 'full'}
                          onClick={() => setNeighborSharingMode('full')}
                          className={cn(
                            'p-2.5 rounded-xl border text-left transition flex flex-col gap-1 min-h-11 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            neighborSharingMode === 'full'
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                              : 'border-border bg-surface hover:bg-surface-muted'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">Partage complet</span>
                            {neighborSharingMode === 'full' && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <span className="text-xs text-muted leading-snug">
                            Prénom et nom affichés. Adapté aux conférences ou galas d&apos;affaires.
                          </span>
                        </button>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border">
                        <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shareSameTable}
                            onChange={(e) => setShareSameTable(e.target.checked)}
                            className="rounded border-border mt-0.5 w-4 h-4 text-primary focus:ring-primary/30"
                          />
                          <div>
                            <span className="font-semibold text-foreground">
                              Autoriser le partage des informations entre personnes de la même table
                            </span>
                            <span className="block text-xs text-muted mt-0.5">
                              Si décoché, l&apos;invité ne voit aucun détail sur les autres sièges de sa table.
                            </span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shareSameZone}
                            onChange={(e) => setShareSameZone(e.target.checked)}
                            className="rounded border-border mt-0.5 w-4 h-4 text-primary focus:ring-primary/30"
                          />
                          <div>
                            <span className="font-semibold text-foreground">
                              Autoriser le partage des informations entre voisins de la même allée ou zone
                            </span>
                            <span className="block text-xs text-muted mt-0.5">
                              Permet aux participants d&apos;une même zone tarifaire ou allée de voir la liste des convives présents.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAccessSubTab('ticketing')}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                      >
                        Billetterie &amp; Tarifs
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setAccessSubTab('donations')}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        Suivant : Dons libres
                      </Button>
                    </div>
                  </div>
                )}

                {/* SOUS-ONGLET 3 : Dons libres */}
                {accessSubTab === 'donations' && (
                  <div className="space-y-4">
                    {donationsCard}

                    <div className="pt-2 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAccessSubTab('seating')}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                      >
                        Places &amp; Voisins
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setAccessSubTab('program')}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        Suivant : Ambiance &amp; réponses
                      </Button>
                    </div>
                  </div>
                )}

                {/* SOUS-ONGLET 4 : Ambiance & réponses */}
                {accessSubTab === 'program' && (
                  <div className="space-y-4">
                    <div className="space-y-2 p-3.5 rounded-2xl border border-border bg-surface">
                      <p className="text-xs font-semibold text-foreground">Programme &amp; ambiance</p>
                      <p className="text-xs text-muted">
                        Créneaux Soleil / Crépuscule / Nuit — reflétés dans l’aperçu salle et la vue extérieure.
                      </p>
                      {eventProgram.slots.map((slot) => (
                        <div key={slot.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end p-2 rounded-xl border border-border bg-surface-muted/40">
                          <Input
                            label="Titre"
                            value={slot.label}
                            onChange={(e) => setEventProgram((p) => ({
                              ...p,
                              slots: p.slots.map((s) => (s.id === slot.id ? { ...s, label: e.target.value } : s)),
                            }))}
                          />
                          <Input
                            label="Début (HH:mm)"
                            value={slot.startsAt}
                            onChange={(e) => setEventProgram((p) => ({
                              ...p,
                              slots: p.slots.map((s) => (s.id === slot.id ? { ...s, startsAt: e.target.value } : s)),
                            }))}
                            placeholder="18:00"
                          />
                          <label className="text-xs space-y-1 block">
                            <span className="text-muted">Ambiance</span>
                            <select
                              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                              value={slot.lighting ?? 'dusk'}
                              onChange={(e) => setEventProgram((p) => ({
                                ...p,
                                slots: p.slots.map((s) => (s.id === slot.id
                                  ? { ...s, lighting: e.target.value as Exclude<LightingPreset, 'auto'> }
                                  : s)),
                              }))}
                            >
                              {(['day', 'dusk', 'night'] as const).map((k) => (
                                <option key={k} value={k}>{lightingPresetLabels[k]}</option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            className="text-xs text-rose-600 font-semibold py-2"
                            onClick={() => setEventProgram((p) => ({
                              ...p,
                              slots: p.slots.filter((s) => s.id !== slot.id),
                            }))}
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setEventProgram((p) => ({
                          ...p,
                          slots: [...p.slots, createProgramSlot({
                            label: `Créneau ${p.slots.length + 1}`,
                            startsAt: p.slots.length === 0 ? '14:00' : '19:00',
                            lighting: p.slots.length === 0 ? 'day' : 'night',
                          })],
                        }))}
                      >
                        Ajouter un créneau
                      </Button>
                    </div>

                    <label className="block space-y-1.5">
                      <span className="block text-xs font-semibold text-muted">Rappels de réponse</span>
                      <select
                        value={reminderFrequency}
                        onChange={(e) => setReminderFrequency(e.target.value)}
                        className={SELECT_CLASS}
                      >
                        <option value="NONE">Pas de rappel automatique</option>
                        <option value="DAILY">Chaque jour</option>
                        <option value="EVERY_3_DAYS">Tous les 3 jours</option>
                        <option value="EVERY_5_DAYS">Tous les 5 jours</option>
                        <option value="WEEKLY">Chaque semaine</option>
                      </select>
                      <p className="text-xs text-muted">Envoyés aux invités encore « en attente ».</p>
                    </label>

                    <EventNotificationSettingsFields
                      value={notificationSettings}
                      onChange={setNotificationSettings}
                      ticketingEnabled={isPublic && ticketing}
                      donationsEnabled={donationsEnabled}
                    />

                    <div className="block space-y-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <LayoutTemplate className="w-3.5 h-3.5" />
                        Modèle de réponses d’invitation
                      </span>
                      <p className="text-xs text-muted">
                        Choisissez le visuel de réponse que vos invités verront. Aperçu en direct.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormTemplateId('')}
                          className={cn(
                            'rounded-xl border p-3 text-left min-h-[7rem] flex flex-col justify-between transition',
                            !formTemplateId
                              ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40',
                          )}
                        >
                          <span className="text-xs font-bold text-foreground">Plus tard</span>
                          <span className="text-xs text-muted">Je configurerai le formulaire ensuite.</span>
                        </button>
                        {templates.map((item) => {
                          const selected = formTemplateId === item.id;
                          const preview = templateContentToLandingPreview({
                            id: item.id,
                            name: item.name,
                            content: item.content,
                          });
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFormTemplateId(item.id)}
                              className={cn(
                                'rounded-xl border overflow-hidden text-left transition relative',
                                selected
                                  ? 'border-primary ring-2 ring-primary/30'
                                  : 'border-border hover:border-primary/40',
                              )}
                            >
                              <div className="pointer-events-none max-h-[140px] overflow-hidden">
                                <LandingInvitationPreview template={preview} compact className="!rounded-none !border-0 !shadow-none !min-h-[120px] !max-h-[140px]" />
                              </div>
                              <div className="px-2 py-1.5 border-t border-border bg-surface flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
                                {selected ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {templates.length === 0 ? (
                        <p className="text-xs text-muted">
                          Aucun modèle pour l’instant. Créez-en un dans{' '}
                          <Link href="/dashboard/templates" className="font-semibold text-primary hover:underline">
                            Modèles
                          </Link>
                          .
                        </p>
                      ) : (
                        <p className="text-xs text-muted">
                          Une invitation e-mail sera créée (ou mise à jour) avec ce modèle.
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 pt-1 border-t border-border">
                      <h4 className="text-xs font-semibold text-muted pt-2">Contact jour J</h4>
                      <Input
                        label="Nom"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="ex. Chef protocole"
                      />
                      <PhoneInput
                        label="Téléphone"
                        countryCode={contactCc}
                        national={contactNational}
                        onCountryCodeChange={setContactCc}
                        onNationalChange={setContactNational}
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAccessSubTab('donations')}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                      >
                        Dons libres
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setTab('welcome')}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        Étape suivante : Accueil
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Événement privé ou mode simple */
              <div className="space-y-4">
                {!complete && (
                  <p className="text-xs text-muted leading-relaxed">
                    Événement privé par défaut. Les rappels et le formulaire de réponse peuvent attendre.
                  </p>
                )}

                {/* Dons : aussi pour un événement privé, les invités donnent depuis leur page d'invitation. */}
                {donationsCard}

                {complete && (
                  <div className="space-y-2 p-3.5 rounded-2xl border border-border bg-surface">
                    <p className="text-xs font-semibold text-foreground">Programme &amp; ambiance</p>
                    <p className="text-xs text-muted">
                      Créneaux Soleil / Crépuscule / Nuit — reflétés dans l’aperçu salle et la vue extérieure.
                    </p>
                    {eventProgram.slots.map((slot) => (
                      <div key={slot.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end p-2 rounded-xl border border-border bg-surface-muted/40">
                        <Input
                          label="Titre"
                          value={slot.label}
                          onChange={(e) => setEventProgram((p) => ({
                            ...p,
                            slots: p.slots.map((s) => (s.id === slot.id ? { ...s, label: e.target.value } : s)),
                          }))}
                        />
                        <Input
                          label="Début (HH:mm)"
                          value={slot.startsAt}
                          onChange={(e) => setEventProgram((p) => ({
                            ...p,
                            slots: p.slots.map((s) => (s.id === slot.id ? { ...s, startsAt: e.target.value } : s)),
                          }))}
                          placeholder="18:00"
                        />
                        <label className="text-xs space-y-1 block">
                          <span className="text-muted">Ambiance</span>
                          <select
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                            value={slot.lighting ?? 'dusk'}
                            onChange={(e) => setEventProgram((p) => ({
                              ...p,
                              slots: p.slots.map((s) => (s.id === slot.id
                                ? { ...s, lighting: e.target.value as Exclude<LightingPreset, 'auto'> }
                                : s)),
                            }))}
                          >
                            {(['day', 'dusk', 'night'] as const).map((k) => (
                              <option key={k} value={k}>{lightingPresetLabels[k]}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="text-xs text-rose-600 font-semibold py-2"
                          onClick={() => setEventProgram((p) => ({
                            ...p,
                            slots: p.slots.filter((s) => s.id !== slot.id),
                          }))}
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setEventProgram((p) => ({
                        ...p,
                        slots: [...p.slots, createProgramSlot({
                          label: `Créneau ${p.slots.length + 1}`,
                          startsAt: p.slots.length === 0 ? '14:00' : '19:00',
                          lighting: p.slots.length === 0 ? 'day' : 'night',
                        })],
                      }))}
                    >
                      Ajouter un créneau
                    </Button>
                  </div>
                )}

                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold text-muted">Rappels de réponse</span>
                  <select
                    value={reminderFrequency}
                    onChange={(e) => setReminderFrequency(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="NONE">Pas de rappel automatique</option>
                    <option value="DAILY">Chaque jour</option>
                    <option value="EVERY_3_DAYS">Tous les 3 jours</option>
                    <option value="EVERY_5_DAYS">Tous les 5 jours</option>
                    <option value="WEEKLY">Chaque semaine</option>
                  </select>
                  <p className="text-xs text-muted">Envoyés aux invités encore « en attente ».</p>
                </label>

                <EventNotificationSettingsFields
                  value={notificationSettings}
                  onChange={setNotificationSettings}
                  ticketingEnabled={isPublic && ticketing}
                  donationsEnabled={donationsEnabled}
                />

                <div className="block space-y-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    Modèle de réponses d’invitation
                  </span>
                  <p className="text-xs text-muted">
                    Choisissez le visuel de réponse que vos invités verront. Aperçu en direct.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTemplateId('')}
                      className={cn(
                        'rounded-xl border p-3 text-left min-h-[7rem] flex flex-col justify-between transition',
                        !formTemplateId
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <span className="text-xs font-bold text-foreground">Plus tard</span>
                      <span className="text-xs text-muted">Je configurerai le formulaire ensuite.</span>
                    </button>
                    {templates.map((item) => {
                      const selected = formTemplateId === item.id;
                      const preview = templateContentToLandingPreview({
                        id: item.id,
                        name: item.name,
                        content: item.content,
                      });
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFormTemplateId(item.id)}
                          className={cn(
                            'rounded-xl border overflow-hidden text-left transition relative',
                            selected
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-border hover:border-primary/40',
                          )}
                        >
                          <div className="pointer-events-none max-h-[140px] overflow-hidden">
                            <LandingInvitationPreview template={preview} compact className="!rounded-none !border-0 !shadow-none !min-h-[120px] !max-h-[140px]" />
                          </div>
                          <div className="px-2 py-1.5 border-t border-border bg-surface flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
                            {selected ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {templates.length === 0 ? (
                    <p className="text-xs text-muted">
                      Aucun modèle pour l’instant. Créez-en un dans{' '}
                      <Link href="/dashboard/templates" className="font-semibold text-primary hover:underline">
                        Modèles
                      </Link>
                      .
                    </p>
                  ) : (
                    <p className="text-xs text-muted">
                      Une invitation e-mail sera créée (ou mise à jour) avec ce modèle.
                    </p>
                  )}
                </div>

                {complete && (
                  <div className="space-y-3 pt-1 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted pt-2">Contact jour J</h4>
                    <Input
                      label="Nom"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="ex. Chef protocole"
                    />
                    <PhoneInput
                      label="Téléphone"
                      countryCode={contactCc}
                      national={contactNational}
                      onCountryCodeChange={setContactCc}
                      onNationalChange={setContactNational}
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {tab === 'welcome' && (
          <section className="space-y-4">
            {complete ? (
              <>
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted">Galerie</h4>
                  <MarketplaceMediaField urls={photos} onChange={setPhotos} />
                  <p className="text-xs text-muted leading-relaxed">
                    Photos et vidéos affichées sur la fiche publique, le marketplace et la carte si l’événement est public.
                  </p>
                </div>
                <div className="space-y-3 pt-1 border-t border-border">
                  <h4 className="text-xs font-semibold text-muted pt-3">Infos invités</h4>
                  <p className="text-xs text-muted leading-relaxed">
                    Dress code, avantages et notes pratiques. Ils apparaissent sur le portail invité.
                  </p>
                  <EventGuestGuidelinesEditor value={guestGuidelines} onChange={setGuestGuidelines} compact />
                </div>
                <div className="space-y-3 pt-1 border-t border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-muted pt-2">Thème visuel de l'invitation & portail</h4>
                      <p className="text-xs text-muted">
                        {activeTheme ? (
                          <>
                            Actif : <strong className="text-foreground">{activeTheme.name}</strong> — {activeTheme.description}
                          </>
                        ) : (
                          'Palette par défaut'
                        )}
                      </p>
                    </div>
                    {themeId && (
                      <button
                        type="button"
                        onClick={() => setThemeId(null)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                    {INVITATION_COLOR_THEMES.map((theme) => {
                      const isSelected = themeId === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setThemeId(theme.id)}
                          className={cn(
                            'relative w-11 h-11 rounded-2xl border-2 transition overflow-hidden group touch-manipulation flex items-center justify-center',
                            isSelected
                              ? 'border-primary ring-2 ring-primary/40 shadow-xs scale-105'
                              : 'border-border/80 hover:border-primary/50 hover:scale-105',
                          )}
                          style={{ backgroundColor: theme.palette.background }}
                          title={`${theme.name} (${theme.description})`}
                        >
                          <div
                            className="w-5 h-5 rounded-full shadow-2xs"
                            style={{ backgroundColor: theme.palette.primary }}
                          />
                          <div
                            className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white/50"
                            style={{ backgroundColor: theme.palette.accent }}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white stroke-[3] drop-shadow" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1">
                    <Link href={`/dashboard/templates?previewTheme=${themeId || 'default'}`} target="_blank" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                      <span>Prévisualiser l'espace invité</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted">Pour les invités</h4>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDressPreset('')}
                    className={cn(
                      'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                      !guestGuidelines.dressCode.enabled
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-surface text-muted border-border hover:text-foreground',
                    )}
                  >
                    Aucune tenue
                  </button>
                  {SIMPLE_DRESS_PRESETS.map((presetId) => (
                    <button
                      key={presetId}
                      type="button"
                      onClick={() => applyDressPreset(presetId)}
                      className={cn(
                        'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                        guestGuidelines.dressCode.enabled && guestGuidelines.dressCode.presetId === presetId
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-surface text-muted border-border hover:text-foreground',
                      )}
                    >
                      {DRESS_CODE_PRESETS[presetId].label}
                    </button>
                  ))}
                </div>
                <label className="block space-y-1.5">
                  <span className="block text-xs font-semibold text-muted">Note pratique</span>
                  <textarea
                    value={guestGuidelines.additionalNotes || ''}
                    onChange={(e) =>
                      setGuestGuidelines((prev) => ({ ...prev, additionalNotes: e.target.value }))
                    }
                    placeholder="Parking, heure d’arrivée, entrée…"
                    rows={3}
                    className={TEXTAREA_CLASS}
                  />
                </label>
              </div>
            )}

            <div className="pt-2 border-t border-border">
              {editingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<LayoutGrid className="w-3.5 h-3.5" />}
                  onClick={() => onOpenTablePlan?.(editingId)}
                >
                  Ouvrir l’atelier plan de table (2D & 3D)
                </Button>
              ) : (
                <label className="flex items-start gap-2.5 text-sm cursor-pointer p-2.5 rounded-xl border border-border bg-surface-muted/40 hover:bg-surface-muted transition">
                  <input
                    type="checkbox"
                    checked={openTablePlanAfterSave}
                    onChange={(e) => setOpenTablePlanAfterSave(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary/30"
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      Ouvrir l’atelier 3D complet du plan après création
                    </span>
                    <span className="block text-xs text-muted leading-relaxed">
                      {isPublic && ticketing && ticketPricingMode === 'by_zone'
                        ? 'Permet d’ajuster les tables, les sièges et la disposition des zones tarifaires dans l’atelier 3D.'
                        : 'Permet de dessiner et peaufiner les tables, les sièges et les convives immédiatement.'}
                    </span>
                  </div>
                </label>
              )}
            </div>
          </section>
        )}
      </form>
      )}
    </Modal>

    <Modal
      open={pendingTicketRisks !== null && pendingTicketRisks.length > 0}
      onClose={() => {
        setPendingTicketRisks(null);
        setTicketRiskConfirmed(false);
      }}
      title={
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Validation requise : Billets déjà vendus</span>
        </div>
      }
      description="Cette modification impacte directement des acheteurs qui possèdent déjà un billet valide pour cet événement."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPendingTicketRisks(null);
              setTicketRiskConfirmed(false);
            }}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!ticketRiskConfirmed}
            onClick={handleConfirmTicketRisks}
            leftIcon={<AlertTriangle className="w-4 h-4" />}
          >
            Confirmer et appliquer
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-900 dark:text-rose-200">
          <p className="font-semibold mb-1">
            Attention : {initialEvent?.ticketsSold ?? 'Des'} billet(s) ont déjà été vendu(s) pour cet événement.
          </p>
          <p className="text-rose-700 dark:text-rose-300">
            Les changements détectés peuvent créer des incohérences ou entraîner la perte de droits d’accès et réservations de places :
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 font-medium">
            {pendingTicketRisks?.map((item, idx) => (
              <li key={idx}>
                <span className="font-semibold text-rose-950 dark:text-rose-100">{item.title} : </span>
                <span>{item.risk}</span>
              </li>
            ))}
          </ul>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-surface-muted/40 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={ticketRiskConfirmed}
            onChange={(e) => setTicketRiskConfirmed(e.target.checked)}
            className="rounded border-border mt-0.5 w-4 h-4 text-rose-600 focus:ring-rose-500/30"
          />
          <span className="text-foreground font-medium leading-relaxed">
            Je confirme avoir pris connaissance de ces risques de perte de données et j’assume expressément la validation de ces changements.
          </span>
        </label>
      </div>
    </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        title={editingId ? 'Abandonner les modifications ?' : 'Abandonner ce nouvel événement ?'}
        description={
          editingId
            ? 'Les changements non enregistrés seront perdus.'
            : 'Les informations saisies seront perdues.'
        }
        cancelLabel="Continuer la saisie"
        confirmLabel="Abandonner"
        tone="danger"
      />

      <CollectionTermsAcceptanceModal
        open={collectionTermsModal !== null}
        context={collectionTermsModal || 'ticketing'}
        onClose={() => {
          setCollectionTermsModal(null);
          setPendingCollectionEnable(null);
        }}
        onAccept={() => {
          void handleAcceptCollectionTerms();
        }}
      />
  </>
);
}
