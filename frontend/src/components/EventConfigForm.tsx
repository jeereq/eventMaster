'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Globe,
  GlobeLock,
  LayoutGrid,
  LayoutTemplate,
  Loader2,
  MapPin,
  Search,
  Ticket,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input, Modal, PhoneInput, parseStoredPhone } from '@/components/ui';
import MarketplaceMediaField from '@/components/MarketplaceMediaField';
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
import RoomLayoutPreview, { type RoomPreviewQuality } from '@/components/RoomLayoutPreview';
import {
  EVENT_CONFIG_TABS,
  EVENT_KIND_LABELS,
  EVENT_KINDS_PRO,
  EVENT_KINDS_SIMPLE,
  firstInvalidEventConfigTab,
  guidelinesFromEvent,
  kindFromEvent,
  nextEventConfigTab,
  parseWeddingNames,
  photosFromEvent,
  toDateTimeLocalValue,
  weddingTitle,
  type EventConfigMode,
  type EventConfigPayload,
  type EventConfigSource,
  type EventConfigTab,
  type EventKindId,
} from '@/lib/eventConfig';

const SELECT_CLASS =
  'w-full px-3.5 py-2.5 bg-surface-muted/50 backdrop-blur-sm dark:bg-background border border-border/80 dark:border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

const TEXTAREA_CLASS =
  'w-full px-3.5 py-2.5 bg-surface-muted/50 backdrop-blur-sm dark:bg-background border border-border/80 dark:border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all';

const SIMPLE_DRESS_PRESETS: Array<Exclude<DressCodePresetId, 'custom' | 'white_tie' | 'theme_color'>> = [
  'cocktail',
  'smart_casual',
  'traditional',
  'outdoor',
  'black_tie',
];

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
  createDisabled = false,
  createDisabledTitle,
  onSave,
  onOpenTablePlan,
}: EventConfigFormProps) {
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
  const [eventKind, setEventKind] = useState<EventKindId | ''>('');
  const [clientName, setClientName] = useState('');
  const [estimatedGuests, setEstimatedGuests] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState('NONE');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [ticketing, setTicketing] = useState(false);
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketsTotal, setTicketsTotal] = useState('');
  const [seatSelection, setSeatSelection] = useState(false);
  const [eventProgram, setEventProgram] = useState<EventProgram>(() => createEmptyProgram());
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
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [formError, setFormError] = useState('');
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const complete = mode === 'complete';
  const kinds = complete ? EVENT_KINDS_PRO : EVENT_KINDS_SIMPLE;

  useEffect(() => {
    if (!open) return;
    setTab('essentials');
    setMode(defaultMode);
    setFormError('');
    setSearchError('');
    if (!initialEvent) {
      setTitle('');
      setTitleManual(false);
      setPartnerFirst('');
      setPartnerSecond('');
      setDescription('');
      setDate('');
      setEndsAt('');
      setLocation('');
      setEventKind('');
      setClientName('');
      setEstimatedGuests('');
      setReminderFrequency('NONE');
      setLatitude('');
      setLongitude('');
      setIsPublic(false);
      setTicketing(false);
      setTicketPrice('');
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
    setEventKind(kind);
    setClientName(initialEvent.clientName || '');
    setEstimatedGuests(initialEvent.estimatedGuests != null ? String(initialEvent.estimatedGuests) : '');
    setReminderFrequency(initialEvent.reminderFrequency || 'NONE');
    setLatitude(initialEvent.latitude != null ? String(initialEvent.latitude) : '');
    setLongitude(initialEvent.longitude != null ? String(initialEvent.longitude) : '');
    setIsPublic(Boolean(initialEvent.isPublic));
    setTicketing(Boolean(initialEvent.ticketingEnabled));
    setTicketPrice(
      initialEvent.ticketPriceFc != null && initialEvent.ticketPriceFc > 0
        ? String(initialEvent.ticketPriceFc)
        : '',
    );
    setTicketsTotal(initialEvent.ticketsTotal != null ? String(initialEvent.ticketsTotal) : '');
    setSeatSelection(Boolean((initialEvent as { seatSelectionEnabled?: boolean }).seatSelectionEnabled));
    setEventProgram(normalizeEventProgram((initialEvent as { eventProgram?: unknown }).eventProgram));
    setPhotos(photosFromEvent(initialEvent.photos));
    setRoomId(initialEvent.roomId || initialEvent.room?.id || '');
    setOpenTablePlanAfterSave(false);
    setGuestGuidelines(guidelinesFromEvent(initialEvent.guestGuidelines));
    setContactName(initialEvent.dayOfContactName || '');
    const phone = parseStoredPhone(initialEvent.dayOfContactPhone);
    setContactCc(phone.countryCode);
    setContactNational(phone.national);
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
      setSearchError('Saisissez d’abord le lieu.');
      return;
    }
    setSearchingLocation(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.trim())}`,
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
    const publicEvent = complete ? isPublic : Boolean(initialEvent?.isPublic);
    const paid = complete ? publicEvent && ticketing : Boolean(initialEvent?.ticketingEnabled);
    return {
      title: title.trim(),
      description: description.trim(),
      date,
      location: location.trim(),
      reminderFrequency,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      roomId: roomId || null,
      isPublic: publicEvent,
      ticketingEnabled: paid,
      ticketPriceFc: complete
        ? paid
          ? Number(ticketPrice) || 0
          : 0
        : initialEvent?.ticketPriceFc ?? 0,
      ticketsTotal: complete
        ? publicEvent && ticketsTotal
          ? Number(ticketsTotal)
          : null
        : initialEvent?.ticketsTotal ?? null,
      seatSelectionEnabled: complete ? publicEvent && seatSelection : Boolean((initialEvent as { seatSelectionEnabled?: boolean } | undefined)?.seatSelectionEnabled),
      eventProgram,
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
    };
  };

  const missingTab = firstInvalidEventConfigTab({ title, date, location });

  const submit = async () => {
    if (missingTab) {
      setTab(missingTab);
      setFormError(
        missingTab === 'essentials'
          ? 'Indiquez au moins un titre et une date.'
          : 'Indiquez le lieu pour créer l’événement.',
      );
      return;
    }
    if (complete && isPublic && ticketing && !ticketPrice) {
      setTab('access');
      setFormError('Indiquez le prix du billet.');
      return;
    }
    setFormError('');
    await onSave(buildPayload());
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  const handleSkip = async () => {
    await submit();
  };

  const handleNext = () => {
    if (tab === 'essentials' && (!title.trim() || !date)) {
      setFormError('Indiquez au moins un titre et une date.');
      return;
    }
    const next = nextEventConfigTab(tab);
    if (next) {
      setFormError('');
      setTab(next);
    }
  };

  const tabNeedsAttention = (id: EventConfigTab) => {
    if (id === 'essentials') return !title.trim() || !date;
    if (id === 'place') return !location.trim();
    if (id === 'access') return complete && isPublic;
    return false;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingId ? 'Configurer l’événement' : 'Nouvel événement'}
      description={
        complete
          ? 'Renseignez l’essentiel. Vous pouvez enregistrer depuis n’importe quel onglet.'
          : 'Titre, date et lieu suffisent. Passez les autres onglets si vous voulez aller vite.'
      }
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          {!complete && tab !== 'welcome' && (
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleSkip()} disabled={saving || (!editingId && createDisabled)}>
              Passer et {editingId ? 'enregistrer' : 'créer'}
            </Button>
          )}
          {tab !== 'welcome' && (
            <Button type="button" variant="secondary" size="sm" onClick={handleNext}>
              Suivant
            </Button>
          )}
          <Button
            type="submit"
            form="event-config-form"
            size="sm"
            loading={saving}
            disabled={!editingId && createDisabled}
            title={!editingId && createDisabledTitle ? createDisabledTitle : undefined}
          >
            {editingId ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      }
    >
      <form id="event-config-form" onSubmit={handleFormSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border overflow-x-auto">
            {EVENT_CONFIG_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFormError('');
                  setTab(item.id);
                }}
                className={cn(
                  'relative min-h-10 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition whitespace-nowrap',
                  tab === item.id
                    ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                    : 'text-muted hover:text-foreground',
                )}
              >
                {item.label}
                {tabNeedsAttention(item.id) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMode(complete ? 'simple' : 'complete')}
            className="text-[11px] font-semibold text-muted hover:text-foreground underline-offset-2 hover:underline"
          >
            {complete ? 'Formulaire simple' : 'Formulaire complet'}
          </button>
        </div>

        {formError && <p className="text-xs text-rose-600">{formError}</p>}

        {tab === 'essentials' && (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {kinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => applyKind(eventKind === kind ? '' : kind)}
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                    eventKind === kind
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-surface text-muted border-border hover:text-foreground',
                  )}
                >
                  {EVENT_KIND_LABELS[kind]}
                </button>
              ))}
            </div>

            {eventKind === 'WEDDING' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Prénom 1"
                  value={partnerFirst}
                  onChange={(e) => applyPartner(e.target.value, partnerSecond)}
                  placeholder="Claire"
                />
                <Input
                  label="Prénom 2"
                  value={partnerSecond}
                  onChange={(e) => applyPartner(partnerFirst, e.target.value)}
                  placeholder="Alexandre"
                />
              </div>
            )}

            {complete && (
              <Input
                label="Client / dossier"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="ex. Famille Mbemba"
              />
            )}

            <Input
              label="Titre"
              value={title}
              onChange={(e) => {
                setTitleManual(true);
                setTitle(e.target.value);
              }}
              placeholder={eventKind === 'WEDDING' ? 'Mariage de Claire & Alexandre' : 'ex. Anniversaire de Léa'}
              required
            />

            <label className="block space-y-1.5 relative group">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-semibold text-muted">Description</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!title) return;
                    const hints = [
                      "Préparez-vous à vivre un moment inoubliable...",
                      "Nous sommes ravis de vous convier à cet événement exceptionnel.",
                      "Rejoignez-nous pour célébrer ensemble dans la joie et la bonne humeur.",
                      "Une journée magique pleine de surprises vous attend."
                    ];
                    setDescription(`Bienvenue à "${title}". ${hints[Math.floor(Math.random() * hints.length)]}`);
                  }}
                  className="text-[10px] font-semibold text-primary/80 hover:text-primary transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Générer une description magique basée sur le titre"
                >
                  <Sparkles className="w-3 h-3" /> Assistant IA
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

            <div className={cn('grid grid-cols-1 gap-3', complete ? 'sm:grid-cols-2' : '')}>
              <Input
                label="Date & heure"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              {complete && (
                <Input
                  label="Heure de fin (optionnel)"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              )}
            </div>
            {!complete && (
              <Input
                label="Lieu"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ex. Hôtel Fleuve Congo"
                leftIcon={<MapPin className="w-4 h-4" />}
              />
            )}
            {complete && (
              <Input
                label="Effectif estimé"
                type="number"
                min={1}
                value={estimatedGuests}
                onChange={(e) => setEstimatedGuests(e.target.value)}
                placeholder="ex. 180"
              />
            )}

            {complete && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Visibilité</h4>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: false, label: 'Privé — liste d’invités', icon: GlobeLock },
                    { id: true, label: 'Public — inscription ouverte', icon: Globe },
                  ].map((opt) => (
                    <button
                      key={String(opt.id)}
                      type="button"
                      onClick={() => {
                        setIsPublic(opt.id);
                        if (!opt.id) setTicketing(false);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                        isPublic === opt.id
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-surface text-muted border-border hover:text-foreground',
                      )}
                    >
                      <opt.icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {isPublic
                    ? 'La fiche sera listée sur le marketplace. Les visiteurs s’inscrivent ou achètent un billet.'
                    : 'Seules les personnes que vous invitez ont accès via leur lien RSVP.'}
                </p>
              </div>
            )}
          </section>
        )}

        {tab === 'place' && (
          <section className="space-y-3">
            <Input
              label="Lieu"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ex. Hôtel Fleuve Congo"
              required
              leftIcon={<MapPin className="w-4 h-4" />}
            />
            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Building2 className="w-3.5 h-3.5" />
                Salle (optionnel)
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
              <p className="text-[11px] text-muted">
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
                      <p className="text-[11px] text-muted leading-relaxed">
                        Ambiance{' '}
                        <span className="font-semibold text-foreground">
                          {lightingPresetLabels[roomPreviewLighting]}
                        </span>
                        {eventProgram.slots[0]
                          ? ` · créneau « ${eventProgram.slots[0].label} »`
                          : ' · définissez un créneau dans Accès pour ajuster l’éclairage'}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted leading-relaxed">
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
                            'px-2.5 py-1 rounded-full text-[10px] font-semibold transition',
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
                    <p className="text-[11px] text-muted leading-relaxed">
                      Orbitez pour inspecter la salle. Le plan de table sera importé automatiquement à la création.
                      {' '}
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

            <div className="space-y-3 pt-1 border-t border-border">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Localisation GPS</h4>
                  <p className="text-xs text-muted mt-0.5">
                    {latitude && longitude
                      ? `${latitude}, ${longitude}`
                      : 'Optionnel — pin WhatsApp à l’acceptation RSVP'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void searchLocationOnMap()}
                  disabled={searchingLocation}
                  className="text-xs font-medium text-foreground hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {searchingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Rechercher le lieu
                </button>
              </div>
              {searchError && <p className="text-xs text-rose-600">{searchError}</p>}
              <div
                id="event-config-map-picker"
                className="w-full h-48 bg-surface-muted rounded-[var(--radius-card)] border border-border overflow-hidden relative"
              >
                <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">
                  Chargement de la carte…
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(e.target.value);
                    syncMarker(e.target.value, longitude);
                  }}
                  placeholder="-4.3014"
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(e.target.value);
                    syncMarker(latitude, e.target.value);
                  }}
                  placeholder="15.3048"
                />
              </div>
              <p className="text-[11px] text-muted">Cliquez sur la carte ou faites glisser le marqueur.</p>
            </div>
          </section>
        )}

        {tab === 'access' && (
          <section className="space-y-3">
            {complete && isPublic && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={ticketing}
                    onChange={(e) => setTicketing(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Ticket className="w-4 h-4" />
                    Billets payants en ligne
                  </span>
                </label>
                {ticketing && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Prix du billet (FC)"
                      type="number"
                      min={0}
                      value={ticketPrice}
                      onChange={(e) => setTicketPrice(e.target.value)}
                      placeholder="ex. 25000"
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
                <p className="text-[11px] text-muted">
                  {ticketing
                    ? 'Paiement par carte (Stripe). L’acheteur reçoit le lien RSVP / badge QR.'
                    : 'Inscription gratuite : le visiteur renseigne nom et e-mail, puis reçoit son lien RSVP.'}
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={seatSelection}
                    onChange={(e) => setSeatSelection(e.target.checked)}
                    className="rounded border-border mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Choisir sa place à l’achat</span>
                    <span className="block text-[11px] text-muted mt-0.5">
                      Plan de table importé depuis la salle requis. 1 billet = 1 siège.
                    </span>
                  </span>
                </label>
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-foreground">Programme & ambiance</p>
                  <p className="text-[11px] text-muted">
                    Créneaux Soleil / Crépuscule / Nuit — reflétés dans l’aperçu salle et la vue extérieure.
                  </p>
                  {eventProgram.slots.map((slot) => (
                    <div key={slot.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end p-2 rounded border border-border bg-surface-muted/40">
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
                          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
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
              </div>
            )}

            {!complete && (
              <p className="text-xs text-muted leading-relaxed">
                Événement privé par défaut. Les rappels et le formulaire RSVP peuvent attendre.
              </p>
            )}

            <label className="block space-y-1.5">
              <span className="block text-xs font-semibold text-muted">Rappels RSVP</span>
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
              <p className="text-[11px] text-muted">Envoyés aux invités encore « en attente ».</p>
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <LayoutTemplate className="w-3.5 h-3.5" />
                Modèle de formulaire RSVP
              </span>
              <select
                value={formTemplateId}
                onChange={(e) => setFormTemplateId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Aucun — je configurerai plus tard</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {templates.length === 0 ? (
                <p className="text-[11px] text-muted">
                  Aucun modèle pour l’instant. Créez-en un dans{' '}
                  <Link href="/dashboard/templates" className="font-semibold text-primary hover:underline">
                    Modèles
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-[11px] text-muted">
                  Une invitation e-mail sera créée (ou mise à jour) avec ce modèle.
                </p>
              )}
            </label>

            {complete && (
              <div className="space-y-3 pt-1 border-t border-border">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-2">Contact jour J</h4>
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
          </section>
        )}

        {tab === 'welcome' && (
          <section className="space-y-4">
            {complete ? (
              <>
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Galerie</h4>
                  <MarketplaceMediaField urls={photos} onChange={setPhotos} />
                  <p className="text-[11px] text-muted leading-relaxed">
                    Photos et vidéos affichées sur la fiche publique, le marketplace et la carte si l’événement est public.
                  </p>
                </div>
                <div className="space-y-3 pt-1 border-t border-border">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-3">Infos invités</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Dress code, avantages et notes pratiques. Ils apparaissent sur le portail RSVP.
                  </p>
                  <EventGuestGuidelinesEditor value={guestGuidelines} onChange={setGuestGuidelines} compact />
                </div>
                <div className="space-y-3 pt-1 border-t border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-3">Thème de l'invitation</h4>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Choisissez la couleur qui habillera le portail invité et le RSVP.
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {INVITATION_COLOR_THEMES.map(theme => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setThemeId(theme.id)}
                        className={cn(
                          "relative w-10 h-10 rounded-full border-2 transition overflow-hidden group",
                          themeId === theme.id ? "border-foreground ring-2 ring-foreground/20" : "border-transparent hover:border-border"
                        )}
                        style={{ backgroundColor: theme.palette.background }}
                        title={theme.name}
                      >
                        <div 
                          className="absolute inset-0 m-auto w-5 h-5 rounded-full" 
                          style={{ backgroundColor: theme.palette.primary }}
                        />
                        <div 
                          className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: theme.palette.accent }}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Link href={`/dashboard/templates?previewTheme=${themeId || 'default'}`} target="_blank" className="text-xs font-semibold text-primary hover:underline">
                      Prévisualiser l'espace invité ↗
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pour les invités</h4>
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

            <div className="pt-1 border-t border-border">
              {editingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<LayoutGrid className="w-3.5 h-3.5" />}
                  onClick={() => onOpenTablePlan?.(editingId)}
                >
                  Ouvrir le plan de table 2D
                </Button>
              ) : (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={openTablePlanAfterSave}
                    onChange={(e) => setOpenTablePlanAfterSave(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span>
                    Ouvrir le plan de table après création
                    <span className="block text-[11px] text-muted">
                      Utile si vous n’avez pas de salle liée, pour dessiner les tables à la main.
                    </span>
                  </span>
                </label>
              )}
            </div>
          </section>
        )}
      </form>
    </Modal>
  );
}
