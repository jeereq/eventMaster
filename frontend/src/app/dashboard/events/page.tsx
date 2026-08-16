'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';
import { 
  Calendar, MapPin, Users, PlusCircle, Trash2, Edit3, 
  ChevronRight, ArrowLeft, Check, Upload, Mail, Send, 
  Sparkles, CheckCircle2, XCircle, AlertCircle, HelpCircle, Loader2,
  Copy, MessageSquare, Share2, Search, Filter, RefreshCw,
  Eye, Utensils, FileSpreadsheet, Download, LayoutGrid, Building2, ScanLine, Shirt
} from 'lucide-react';
import TablePlanner from './TablePlanner';
import EventStaffPanel from './EventStaffPanel';
import EventFeedManager from './EventFeedManager';
import GuestProtocolPanel from './GuestProtocolPanel';
import EventGuestGuidelinesEditor from '@/components/EventGuestGuidelinesEditor';
import EventWorkflowPanel from '@/components/EventWorkflowPanel';
import {
  computeEventWorkflowState,
  type EventWorkflowTab,
} from '@/lib/eventWorkflow';
import {
  type GuestGuidelines,
  defaultGuestGuidelines,
  normalizeGuestGuidelines,
  applyInvitationGuidelineVariables,
} from '@/lib/guestGuidelines';
import { PageHeader, Button, ProjectCard, ViewModeToggle, useViewMode, SkeletonEventsView } from '@/components/ui';
import {
  extractRsvpFieldsFromTemplateContent,
  supplementFieldsFromGuestPreferences,
  getCustomFieldValue,
  formatCustomFieldValueForDisplay,
  isBooleanFieldType,
  type RsvpFormDataEntry,
} from '@/lib/rsvpFormFields';

interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  reminderFrequency?: string;
  latitude?: number;
  longitude?: number;
  roomId?: string | null;
  room?: {
    id: string;
    name: string;
    roomType?: string;
    layoutBlueprint?: unknown;
    location?: string | null;
    floor?: string | null;
  } | null;
  tablePlan?: any;
  guestGuidelines?: GuestGuidelines | null;
  tenant?: { name: string };
}

interface OrgRoomOption {
  id: string;
  name: string;
  location: string | null;
  floor: string | null;
  capacity: number | null;
  roomType?: string;
  layoutBlueprint?: unknown;
}

interface GuestItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  category: string;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  preferences: any;
  seatingInvitationPdfUrl?: string | null;
  checkedInAt?: string | null;
}

interface TemplateItem {
  id: string;
  name: string;
  content?: any;
}

interface InvitationItem {
  id: string;
  subject: string;
  body: string;
  channel: string;
  template?: { id: string; name: string } | null;
}

interface BroadcastChannelResult {
  channel: string;
  success: boolean;
  simulated: boolean;
  error?: string | null;
}

interface BroadcastResultItem {
  guestId: string;
  guestName: string;
  email: string;
  phone?: string | null;
  rsvpLink: string;
  subject?: string;
  body?: string;
  channel: string;
  status: 'SENT' | 'SENT_SIMULATED' | 'FAILED' | string;
  simulated?: boolean;
  error?: string | null;
  channelResults?: BroadcastChannelResult[];
}

interface BroadcastSummary {
  total: number;
  sent: number;
  simulated: number;
  failed: number;
  allSimulated: boolean;
}

function getBroadcastStatusMeta(status: string) {
  switch (status) {
    case 'SENT':
      return { label: 'Envoyé', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'SENT_SIMULATED':
      return { label: 'Simulé', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'FAILED':
      return { label: 'Échec', classes: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: status, classes: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
}

function getChannelLabel(channel: string) {
  switch (channel) {
    case 'EMAIL':
      return 'E-mail';
    case 'WHATSAPP':
      return 'WhatsApp';
    case 'EMAIL_AND_WHATSAPP':
    case 'ALL_CHANNELS':
    case 'EMAIL_AND_SMS':
      return 'E-mail et WhatsApp';
    case 'SMS':
      return 'WhatsApp';
    default:
      return channel;
  }
}

const MESSAGE_TEMPLATES = [
  {
    id: 'wedding',
    name: '💍 Mariage',
    subject: 'Invitation officielle à notre mariage : {{title}}',
    body: `Cher(e) {{firstName}} {{lastName}},

Nous avons l'immense joie de vous inviter à célébrer notre mariage : {{title}}.

L'événement aura lieu le {{date}} à {{location}}.

Votre présence est précieuse pour nous. Veuillez confirmer votre venue en cliquant sur le lien ci-dessous :

{{rsvpLink}}

Avec toute notre affection.`
  },
  {
    id: 'birthday',
    name: '🎉 Anniversaire',
    subject: 'Invitation : Célébrons ensemble mon anniversaire !',
    body: `Salut {{firstName}},

Une année de plus, ça se fête ! Je t'invite chaleureusement à mon anniversaire : {{title}}.

On se retrouve le {{date}} à l'adresse suivante : {{location}}.

Merci de me confirmer si tu seras des nôtres en cliquant sur ce lien :

{{rsvpLink}}

Hâte de faire la fête avec toi !`
  },
  {
    id: 'corporate',
    name: '💼 Gala / Professionnel',
    subject: 'Invitation officielle : {{title}}',
    body: `Cher(e) {{firstName}} {{lastName}},

Nous avons l'honneur de vous convier à l'événement : {{title}}.

Cette rencontre prestigieuse se déroulera le {{date}} à {{location}}.

Nous vous prions de bien vouloir confirmer votre participation en complétant le formulaire d'inscription en ligne via le lien suivant :

{{rsvpLink}}

En espérant vous compter parmi nos honorables invités.

Cordialement,
L'équipe organisatrice.`
  },
  {
    id: 'family',
    name: '🏡 Fête de Famille',
    subject: 'Invitation : Retrouvailles familiales - {{title}}',
    body: `Cher(e) {{firstName}},

C'est le moment de se réunir ! Tu es invité(e) à notre fête de famille : {{title}}.

Nous nous rassemblerons le {{date}} à {{location}}.

Pour nous aider à organiser le repas et l'accueil, merci de confirmer ta présence ici :

{{rsvpLink}}

A très vite !`
  }
];

export default function EventsPage() {
  const { user, access, planFeatures, tenant } = useAuth();
  const { mode: eventsViewMode, setViewMode: setEventsViewMode, columns: eventsColumns, setGridColumns: setEventsColumns, gridClassName: eventsGridClass } = useViewMode('em-view-events', 'grid', 3);
  const isProtocolOnly = access?.isProtocolOnly ?? false;
  const canManageEvents = access?.canManageAllEvents ?? false;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'guests' | 'invitations' | 'tablePlan' | 'feed' | 'staff' | 'protocol' | 'guestInfo'>(
    isProtocolOnly ? 'protocol' : 'guests',
  );

  // Event form
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLoc, setEventLocation] = useState('');
  const [eventReminderFrequency, setEventReminderFrequency] = useState('NONE');
  const [eventLatitude, setEventLatitude] = useState('');
  const [eventLongitude, setEventLongitude] = useState('');
  const [eventRoomId, setEventRoomId] = useState('');
  const [orgRooms, setOrgRooms] = useState<OrgRoomOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [importingLayout, setImportingLayout] = useState(false);
  const [guestGuidelines, setGuestGuidelines] = useState<GuestGuidelines>(defaultGuestGuidelines());
  const [savingGuidelines, setSavingGuidelines] = useState(false);

  // Map Picker States & Refs
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState('');
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Guest form
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCategory, setGuestCategory] = useState('Famille');
  const [guestPrefs, setGuestPreferences] = useState('');
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [savingGuest, setSavingGuest] = useState(false);

  // Guest filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'ALL' | 'ACCEPTED' | 'DECLINED' | 'PENDING'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dietFilter, setDietFilter] = useState<string>('ALL');
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedGuestDetails, setSelectedGuestDetails] = useState<GuestItem | null>(null);

  // Import guests
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importingFile, setImportingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null);
  const [importMethod, setImportImportMethod] = useState<'excel' | 'csv' | 'text'>('excel');

  // Invitation form
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [inviteSubject, setInviteSubject] = useState('');
  const [inviteBody, setInviteBody] = useState('');
  const [inviteChannel, setInviteChannel] = useState('EMAIL');
  const [editingInviteId, setEditingInviteId] = useState<string | null>(null);
  const [savingInvite, setSavingInvite] = useState(false);

  // Broadcast results
  const [broadcastResults, setBroadcastResults] = useState<BroadcastResultItem[] | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSummary, setBroadcastSummary] = useState<BroadcastSummary | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastingInviteId, setBroadcastingInviteId] = useState<string | null>(null);
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);
  const [sharingGuest, setSharingGuest] = useState<GuestItem | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);

  // Bulk guest selection & sending
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [bulkSelectedInviteId, setBulkSelectedInviteId] = useState('');
  const [bulkSelectedChannel, setBulkSelectedChannel] = useState('EMAIL');

  // Error/Success state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Guest filtering
  const uniqueCategories = Array.from(new Set(guests.map(g => g.category || 'Général')));

  const getCustomRsvpFields = () => {
    const fields = invitations.flatMap((invite) => {
      const templateId = invite.template?.id || (invite as { templateId?: string }).templateId;
      const template = templates.find((t) => t.id === templateId);
      if (!template?.content) return [];
      return extractRsvpFieldsFromTemplateContent(template.content);
    });

    return supplementFieldsFromGuestPreferences(fields, guests);
  };

  const filteredGuests = guests.filter(g => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      `${g.firstName} ${g.lastName}`.toLowerCase().includes(searchLower) || 
      g.email.toLowerCase().includes(searchLower) ||
      (g.preferences?.phone && g.preferences.phone.toLowerCase().includes(searchLower)) ||
      (g.preferences?.telephone && g.preferences.telephone.toLowerCase().includes(searchLower)) ||
      (g.category && g.category.toLowerCase().includes(searchLower)) ||
      (g.preferences?.allergies && g.preferences.allergies.toLowerCase().includes(searchLower)) ||
      (g.preferences?.notes && g.preferences.notes.toLowerCase().includes(searchLower)) ||
      (g.preferences?.specialMeal && g.preferences.specialMeal.toLowerCase().includes(searchLower)) ||
      (g.preferences?.customFields && Object.entries(g.preferences.customFields).some(([key, val]) => 
        key.toLowerCase().includes(searchLower) || 
        (val !== undefined && val !== null && val.toString().toLowerCase().includes(searchLower))
      ));

    const matchesRsvp = rsvpFilter === 'ALL' || g.rsvp === rsvpFilter;
    const matchesCategory = categoryFilter === 'ALL' || (g.category || 'Général') === categoryFilter;
    const matchesDiet = dietFilter === 'ALL' || (g.preferences?.specialMeal || 'none') === dietFilter;
    
    let matchesCustom = true;
    Object.entries(customFilters).forEach(([label, value]) => {
      if (value && value !== 'ALL' && value.trim() !== '') {
        const fieldDef = getCustomRsvpFields().find((f) => f.label === label);
        const guestVal = fieldDef
          ? getCustomFieldValue(g.preferences, fieldDef)
          : g.preferences?.customFields?.[label];
        
        if (value === 'Oui') {
          if (guestVal !== true) matchesCustom = false;
        } else if (value === 'Non') {
          if (guestVal === true) matchesCustom = false; // undefined, null, false are all considered "Non"
        } else {
          // Text or select filter
          if (guestVal === undefined || guestVal === null) {
            matchesCustom = false;
          } else if (!guestVal.toString().toLowerCase().includes(value.toLowerCase())) {
            matchesCustom = false;
          }
        }
      }
    });
    
    return matchesSearch && matchesRsvp && matchesCategory && matchesDiet && matchesCustom;
  });

  const isAllFilteredSelected = filteredGuests.length > 0 && filteredGuests.every(g => selectedGuestIds.includes(g.id));

  const eventWorkflow = useMemo(
    () =>
      computeEventWorkflowState({
        guests,
        invitations,
        tablePlan: selectedEvent?.tablePlan,
        eventDate: selectedEvent?.date,
        isProtocolOnly,
      }),
    [guests, invitations, selectedEvent?.tablePlan, selectedEvent?.date, isProtocolOnly],
  );

  const handleWorkflowNavigate = useCallback((tab: EventWorkflowTab) => {
    if (tab === 'analytics') return;
    setActiveTab(tab);
  }, []);

  const handleWorkflowAction = useCallback((stepId: string) => {
    switch (stepId) {
      case 'guests':
        if (guests.length === 0) setShowGuestModal(true);
        break;
      case 'invitation':
        if (invitations.length === 0) setShowInviteModal(true);
        break;
      default:
        break;
    }
  }, [guests.length, invitations.length]);

  const refreshGuests = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const guestsData = await api.get(`/events/${selectedEvent.id}/guests`);
      setGuests(guestsData);
    } catch {
      /* ignore refresh errors */
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      if (user?.role === 'SUPER_ADMIN') {
        const data = await api.get('/admin/stats');
        // Extract all events from all tenants
        const allEvents: EventItem[] = [];
        data.tenants.forEach((t: any) => {
          // We can call a custom endpoint or map from the stats if we had events list,
          // but since stats only has count, let's fetch events if we can.
          // Wait, the backend /events endpoint for SUPER_ADMIN will return "Tenant non identifié" because req.user.tenantId is null.
          // Let's handle this gracefully.
        });
        // For Super Admin, they shouldn't manage individual events directly from this page,
        // or we can show a message. Let's make sure they are redirected or shown an admin view.
      } else {
        const data = await api.get('/events');
        setEvents(Array.isArray(data) ? data : data.events || []);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  // Leaflet Map Initialization Effect
  useEffect(() => {
    if (!showEventModal) {
      // Clean up refs when modal is closed
      mapRef.current = null;
      markerRef.current = null;
      return;
    }

    let mapInstance: any = null;
    let markerInstance: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      // Default coordinates: Kinshasa (-4.3224, 15.3070)
      const initialLat = eventLatitude ? parseFloat(eventLatitude) : -4.3224;
      const initialLng = eventLongitude ? parseFloat(eventLongitude) : 15.3070;

      const mapContainer = document.getElementById('map-picker');
      if (!mapContainer) return;

      // Clear existing map container content
      mapContainer.innerHTML = '';
      const mapDiv = document.createElement('div');
      mapDiv.style.height = '100%';
      mapDiv.style.width = '100%';
      mapContainer.appendChild(mapDiv);

      try {
        mapInstance = L.map(mapDiv).setView([initialLat, initialLng], 13);
        mapRef.current = mapInstance;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);

        // Add marker if coordinates exist
        if (eventLatitude && eventLongitude) {
          markerInstance = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance);
          markerRef.current = markerInstance;
        }

        // Map click handler
        mapInstance.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setEventLatitude(lat.toFixed(6));
          setEventLongitude(lng.toFixed(6));

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const newMarker = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
            markerRef.current = newMarker;
            
            newMarker.on('dragend', (de: any) => {
              const position = newMarker.getLatLng();
              setEventLatitude(position.lat.toFixed(6));
              setEventLongitude(position.lng.toFixed(6));
            });
          }
        });

        if (markerInstance) {
          markerInstance.on('dragend', (de: any) => {
            const position = markerInstance.getLatLng();
            setEventLatitude(position.lat.toFixed(6));
            setEventLongitude(position.lng.toFixed(6));
          });
        }
      } catch (err) {
        console.error('Error initializing Leaflet map:', err);
      }
    };

    // Check if Leaflet is already loaded
    if (!(window as any).L) {
      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        initMap();
      };
      document.body.appendChild(script);
    } else {
      // Wait a brief moment for the modal transition to complete and container to be rendered
      const timer = setTimeout(initMap, 200);
      return () => clearTimeout(timer);
    }

    return () => {
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (e) {
          console.error('Error removing map instance:', e);
        }
      }
    };
  }, [showEventModal]);

  // Geocoding search function
  const searchLocationOnMap = async () => {
    if (!eventLoc) {
      setSearchError('Veuillez d\'abord saisir un lieu dans le champ "Lieu".');
      return;
    }
    setSearchingLocation(true);
    setSearchError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(eventLoc)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        setEventLatitude(lat.toFixed(6));
        setEventLongitude(lon.toFixed(6));
        
        const L = (window as any).L;
        if (L && mapRef.current) {
          mapRef.current.setView([lat, lon], 15);
          
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lon]);
          } else {
            const newMarker = L.marker([lat, lon], { draggable: true }).addTo(mapRef.current);
            markerRef.current = newMarker;
            
            newMarker.on('dragend', (de: any) => {
              const position = newMarker.getLatLng();
              setEventLatitude(position.lat.toFixed(6));
              setEventLongitude(position.lng.toFixed(6));
            });
          }
        }
      } else {
        setSearchError('Lieu non trouvé. Essayez de préciser la ville (ex. Kinshasa).');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Erreur lors de la recherche du lieu.');
    } finally {
      setSearchingLocation(false);
    }
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventDate('');
    setEventLocation('');
    setEventReminderFrequency('NONE');
    setEventLatitude('');
    setEventLongitude('');
    setEventRoomId('');
    setEditingEventId(null);
  };

  const openCreateEventModal = () => {
    resetEventForm();
    setShowEventModal(true);
  };

  useEffect(() => {
    if (!showEventModal || user?.role !== 'USER') return;

    async function loadRooms() {
      setLoadingRooms(true);
      try {
        const data = await api.get('/rooms');
        setOrgRooms(data.rooms || []);
      } catch {
        setOrgRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    }

    loadRooms();
  }, [showEventModal, user?.role]);

  const handleRoomChange = (roomId: string) => {
    setEventRoomId(roomId);
    if (!roomId) return;
    const room = orgRooms.find((r) => r.id === roomId);
    if (!room) return;
    const parts = [room.name, room.floor, room.location].filter(Boolean);
    if (parts.length > 0) {
      setEventLocation(parts.join(' — '));
    }
  };

  const handleCreateOrUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setSavingEvent(true);
    try {
      const payload = {
        title: eventTitle,
        description: eventDesc,
        date: eventDate,
        location: eventLoc,
        reminderFrequency: eventReminderFrequency,
        latitude: eventLatitude ? parseFloat(eventLatitude) : null,
        longitude: eventLongitude ? parseFloat(eventLongitude) : null,
        roomId: eventRoomId || null,
      };

      if (editingEventId) {
        const savedEvent: EventItem = await api.put(`/events/${editingEventId}`, payload);
        setSuccess('Événement mis à jour avec succès !');
        if (selectedEvent?.id === editingEventId) {
          setSelectedEvent((prev) => (prev ? { ...prev, ...savedEvent } : prev));
        }
      } else {
        const savedEvent: EventItem = await api.post('/events', {
          ...payload,
          importRoomLayout: Boolean(eventRoomId),
        });
        const importedPlan = savedEvent.tablePlan?.tables?.length;
        setSuccess(
          importedPlan
            ? 'Événement créé et plan de table importé depuis la salle.'
            : 'Événement créé avec succès !'
        );
      }

      resetEventForm();
      setShowEventModal(false);
      loadEvents();
    } catch (err: any) {
      setError(err.message || "Erreur d'enregistrement de l'événement");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEditEventClick = (event: EventItem) => {
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventDate(new Date(event.date).toISOString().slice(0, 16));
    setEventLocation(event.location);
    setEventReminderFrequency(event.reminderFrequency || 'NONE');
    setEventLatitude(event.latitude !== undefined && event.latitude !== null ? event.latitude.toString() : '');
    setEventLongitude(event.longitude !== undefined && event.longitude !== null ? event.longitude.toString() : '');
    setEventRoomId(event.roomId || event.room?.id || '');
    setEditingEventId(event.id);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement et l\'ensemble de ses invités ?')) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents(events.filter(e => e.id !== id));
      if (selectedEvent?.id === id) setSelectedEvent(null);
      setSuccess('Événement supprimé.');
    } catch (err: any) {
      setError(err.message || 'Erreur de suppression');
    }
  };

  const handleSaveTablePlan = async (newTablePlan: any) => {
    if (!selectedEvent) return;
    try {
      const updatedEvent = await api.put(`/events/${selectedEvent.id}`, {
        tablePlan: newTablePlan,
      });
      setSelectedEvent(updatedEvent);
      setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e));
      const notified = updatedEvent.assignmentNotifications?.notified ?? 0;
      const skippedReason = updatedEvent.assignmentNotifications?.skippedReason as string | undefined;
      const isFreePlan = tenant?.plan === 'FREE' || skippedReason === 'forfait';

      if (isFreePlan) {
        setSuccess(
          'Plan de table enregistré. Les notifications de placement aux invités nécessitent un forfait payant.',
        );
      } else if (notified > 0) {
        if (planFeatures?.seatNotifications) {
          setSuccess(
            `Plan enregistré. ${notified} invité${notified > 1 ? 's' : ''} notifié${notified > 1 ? 's' : ''} (table, siège et voisins de table). Le PDF et le GPS seront envoyés à l'arrivée.`,
          );
        } else {
          setSuccess(
            `Plan enregistré. ${notified} invité${notified > 1 ? 's' : ''} notifié${notified > 1 ? 's' : ''} (table, siège et voisins de table). Le PDF et le GPS au check-in nécessitent un forfait Premium ou supérieur.`,
          );
        }
      } else {
        setSuccess('Plan de table enregistré.');
      }
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde du plan de table:', err);
      throw err;
    }
  };

  const handleImportRoomLayout = async (replaceExisting: boolean) => {
    if (!selectedEvent) return;
    if (replaceExisting && !confirm('Remplacer le plan de table actuel par le modèle de la salle ? Les assignations seront perdues.')) {
      return;
    }
    setImportingLayout(true);
    setError('');
    try {
      const updatedEvent = await api.post(`/events/${selectedEvent.id}/import-room-layout`, {
        replaceExisting,
      });
      setSelectedEvent(updatedEvent);
      setEvents(events.map((e) => (e.id === selectedEvent.id ? updatedEvent : e)));
      setSuccess('Plan de table importé depuis la salle.');
    } catch (err: any) {
      if (err.message?.includes('existe déjà') || err.hasExistingPlan) {
        if (confirm('Un plan existe déjà. Voulez-vous le remplacer par le modèle de la salle ?')) {
          setImportingLayout(false);
          return handleImportRoomLayout(true);
        }
      } else {
        setError(err.message || 'Impossible d\'importer le plan de la salle.');
      }
    } finally {
      setImportingLayout(false);
    }
  };

  const selectedRoomHasLayout = Boolean(
    selectedEvent?.room?.layoutBlueprint &&
    typeof selectedEvent.room.layoutBlueprint === 'object' &&
    (selectedEvent.room.layoutBlueprint as { furniture?: unknown[] }).furniture?.length
  );

  // Manage Event Details
  const handleManageEvent = async (event: EventItem) => {
    setSelectedEvent(event);
    setGuestGuidelines(normalizeGuestGuidelines(event.guestGuidelines));
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [guestsData, templatesData, invitesData] = await Promise.all([
        api.get(`/events/${event.id}/guests`),
        api.get('/templates'),
        api.get(`/events/${event.id}/invitations`),
      ]);
      setGuests(guestsData);
      setTemplates(templatesData);
      setInvitations(invitesData);
    } catch (err: any) {
      setError('Erreur lors du chargement des invités ou modèles.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGuestGuidelines = async () => {
    if (!selectedEvent) return;
    setSavingGuidelines(true);
    setError('');
    try {
      const updatedEvent = await api.put(`/events/${selectedEvent.id}`, {
        guestGuidelines,
      });
      setSelectedEvent((prev) => (prev ? { ...prev, ...updatedEvent } : prev));
      setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? { ...e, ...updatedEvent } : e)));
      setSuccess('Infos invités enregistrées.');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement des infos invités.');
    } finally {
      setSavingGuidelines(false);
    }
  };

  // Create or Update Guest
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setError('');
    setSavingGuest(true);

    try {
      const payload = {
        firstName: guestFirstName,
        lastName: guestLastName,
        email: guestEmail,
        category: guestCategory,
        preferences: {
          notes: guestPrefs || undefined,
          phone: guestPhone || undefined,
        },
      };

      if (editingGuestId) {
        const updatedGuest = await api.put(`/events/${selectedEvent.id}/guests/${editingGuestId}`, payload);
        setGuests(guests.map(g => g.id === editingGuestId ? updatedGuest : g));
        setSuccess('Invité mis à jour avec succès !');
      } else {
        const newGuest = await api.post(`/events/${selectedEvent.id}/guests`, payload);
        setGuests([...guests, newGuest]);
        setSuccess('Invité ajouté avec succès !');
      }

      setGuestFirstName('');
      setGuestLastName('');
      setGuestEmail('');
      setGuestPhone('');
      setGuestPreferences('');
      setEditingGuestId(null);
      setShowGuestModal(false);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de l'invité");
    } finally {
      setSavingGuest(false);
    }
  };

  const handleEditGuestClick = (guest: GuestItem) => {
    setEditingGuestId(guest.id);
    setGuestFirstName(guest.firstName);
    setGuestLastName(guest.lastName);
    setGuestEmail(guest.email);
    setGuestCategory(guest.category || 'Famille');
    
    let phone = '';
    let notes = '';
    if (guest.preferences && typeof guest.preferences === 'object') {
      const prefs = guest.preferences as any;
      phone = prefs.phone || '';
      notes = prefs.notes || '';
    }
    setGuestPhone(phone);
    setGuestPreferences(notes);
    setShowGuestModal(true);
  };

  // Delete Guest
  const handleDeleteGuest = async (guestId: string) => {
    if (!selectedEvent || !confirm('Supprimer cet invité ?')) return;
    try {
      await api.delete(`/events/${selectedEvent.id}/guests/${guestId}`);
      setGuests(guests.filter(g => g.id !== guestId));
      setSuccess('Invité supprimé.');
    } catch (err: any) {
      setError('Erreur de suppression.');
    }
  };

  // Export Guests to CSV
  const handleExportGuests = () => {
    if (guests.length === 0) {
      alert("Aucun invité à exporter.");
      return;
    }
    
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Catégorie", "Statut RSVP", "Préférences & Notes"];
    const rows = guests.map(g => {
      const phone = g.preferences?.phone || g.preferences?.telephone || "";
      const notes = g.preferences?.notes || "";
      return [
        g.firstName,
        g.lastName,
        g.email,
        phone,
        g.category || "Général",
        g.rsvp === "ACCEPTED" ? "Accepté" : g.rsvp === "DECLINED" ? "Décliné" : "En attente",
        notes
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invites_${selectedEvent?.title.replace(/\s+/g, '_') || 'evenement'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk Import Guests (CSV & Excel)
  const handleBulkImport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedEvent) return;
    setError('');
    setSuccess('');
    setImportingFile(true);

    try {
      let guestsToImport: any[] = [];

      if (importMethod === 'text') {
        if (!importText.trim()) {
          setError('Veuillez saisir du texte CSV valide.');
          setImportingFile(false);
          return;
        }
        // Parse CSV text manually
        const lines = importText.split('\n');
        lines.forEach((line, index) => {
          if (index === 0 && (line.toLowerCase().includes('prénom') || line.toLowerCase().includes('prenom') || line.toLowerCase().includes('email'))) {
            // Skip header
            return;
          }
          const cols = line.split(',').map(c => c.trim());
          if (cols.length >= 3 && cols[2].includes('@')) {
            guestsToImport.push({
              firstName: cols[0],
              lastName: cols[1],
              email: cols[2],
              category: cols[3] || 'Général',
              phone: cols[4] || '',
              notes: cols[5] || '',
            });
          }
        });
      } else {
        if (!parsedPreview || parsedPreview.length === 0) {
          setError('Aucune donnée valide à importer.');
          setImportingFile(false);
          return;
        }
        guestsToImport = parsedPreview;
      }

      if (guestsToImport.length === 0) {
        setError('Aucun invité valide trouvé dans le fichier ou le texte.');
        setImportingFile(false);
        return;
      }

      const response = await api.post(`/events/${selectedEvent.id}/guests/import`, { guests: guestsToImport });
      
      // Refresh guest list
      const updatedGuests = await api.get(`/events/${selectedEvent.id}/guests`);
      setGuests(updatedGuests);
      
      setImportText('');
      setParsedPreview(null);
      setShowImportModal(false);
      setSuccess(response.message || `${guestsToImport.length} invités importés avec succès !`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'importation.");
    } finally {
      setImportingFile(false);
    }
  };

  // Handle Excel or CSV File Selection
  const handleFileChange = (file: File) => {
    if (!file) return;
    setError('');
    setSuccess('');
    setImportingFile(true);

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          setError("Le fichier semble vide ou ne contient pas d'en-tête.");
          setImportingFile(false);
          return;
        }

        // Find column indices based on header mapping
        const headers = jsonData[0].map(h => h?.toString().toLowerCase().trim() || '');
        
        const firstNameIdx = headers.findIndex(h => h.includes('prénom') || h.includes('prenom') || h.includes('first') || h.includes('nom1') || h === 'pnom');
        const lastNameIdx = headers.findIndex(h => h.includes('nom') && !h.includes('prénom') && !h.includes('prenom') || h.includes('last') || h === 'name' || h === 'nom2');
        const emailIdx = headers.findIndex(h => h.includes('mail') || h.includes('courriel') || h === 'email');
        const categoryIdx = headers.findIndex(h => h.includes('cat') || h.includes('groupe') || h.includes('type'));
        const phoneIdx = headers.findIndex(h => h.includes('tel') || h.includes('tél') || h.includes('phone') || h.includes('whatsapp') || h.includes('mobile'));
        const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('pref') || h.includes('remarque') || h.includes('commentaire'));

        // Fallback to default indices if not found
        const finalFirstNameIdx = firstNameIdx !== -1 ? firstNameIdx : 0;
        const finalLastNameIdx = lastNameIdx !== -1 ? lastNameIdx : 1;
        const finalEmailIdx = emailIdx !== -1 ? emailIdx : 2;
        const finalCategoryIdx = categoryIdx !== -1 ? categoryIdx : 3;
        const finalPhoneIdx = phoneIdx !== -1 ? phoneIdx : 4;
        const finalNotesIdx = notesIdx !== -1 ? notesIdx : 5;

        const guestsList: any[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const email = row[finalEmailIdx]?.toString().trim() || '';
          const firstName = row[finalFirstNameIdx]?.toString().trim() || '';
          const lastName = row[finalLastNameIdx]?.toString().trim() || '';

          // Skip rows without minimum required info
          if (!email && !firstName && !lastName) continue;

          guestsList.push({
            firstName: firstName || 'Invité',
            lastName: lastName || `N°${i}`,
            email: email || `invite.${i}@simulation.com`,
            category: row[finalCategoryIdx]?.toString().trim() || 'Général',
            phone: row[finalPhoneIdx]?.toString().trim() || '',
            notes: row[finalNotesIdx]?.toString().trim() || '',
          });
        }

        if (guestsList.length === 0) {
          setError("Aucun invité valide n'a pu être extrait du fichier.");
        } else {
          setParsedPreview(guestsList);
          setSuccess(`${guestsList.length} invités détectés avec succès. Veuillez vérifier l'aperçu ci-dessous puis valider.`);
        }
      } catch (err: any) {
        setError("Erreur lors de la lecture du fichier : " + err.message);
      } finally {
        setImportingFile(false);
      }
    };

    reader.onerror = () => {
      setError("Erreur lors du chargement du fichier.");
      setImportingFile(false);
    };

    reader.readAsBinaryString(file);
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const isCsv = file.name.endsWith('.csv');
      
      if (isExcel) {
        setImportImportMethod('excel');
        handleFileChange(file);
      } else if (isCsv) {
        setImportImportMethod('csv');
        handleFileChange(file);
      } else {
        setError("Format de fichier non supporté. Veuillez déposer un fichier .xlsx, .xls ou .csv.");
      }
    }
  };

  // Download Sample Template File
  const downloadSampleTemplate = (type: 'excel' | 'csv') => {
    const headers = ['Prénom', 'Nom', 'Email', 'Catégorie', 'Téléphone', 'Notes/Préférences'];
    const sampleRows = [
      ['Jean', 'Kabeya', 'jean.kabeya@gmail.com', 'VIP', '+243812345678', 'Besoin de transport, régime Halal'],
      ['Sarah', 'Mwamba', 'sarah.m@outlook.com', 'Ami', '+243998765432', 'Allergique aux arachides'],
      ['Christian', 'Tshilombo', 'c.tshilombo@gmail.com', 'Famille', '', 'Végétarien, vient avec un accompagnateur'],
    ];

    if (type === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      XLSX.utils.book_append_sheet(wb, ws, 'Modèle Invités');
      XLSX.writeFile(wb, 'modele_invites_eventmaster.xlsx');
    } else {
      const csvContent = [headers.join(','), ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'modele_invites_eventmaster.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Create or Update Invitation
  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setError('');
    setSavingInvite(true);

    try {
      const payload = {
        templateId: selectedTemplateId || null,
        subject: inviteSubject,
        body: inviteBody,
        channel: inviteChannel,
      };

      if (editingInviteId) {
        const updatedInvite = await api.put(`/events/${selectedEvent.id}/invitations/${editingInviteId}`, payload);
        setInvitations(invitations.map(i => i.id === editingInviteId ? updatedInvite : i));
        setSuccess('Invitation mise à jour avec succès !');
      } else {
        const newInvite = await api.post(`/events/${selectedEvent.id}/invitations`, payload);
        setInvitations([...invitations, newInvite]);
        setSuccess('Invitation configurée avec succès !');
      }

      setInviteSubject('');
      setInviteBody('');
      setSelectedTemplateId('');
      setEditingInviteId(null);
      setShowInviteModal(false);
    } catch (err: any) {
      setError(err.message || "Erreur de configuration de l'invitation");
    } finally {
      setSavingInvite(false);
    }
  };

  const handleEditInvitationClick = (invite: InvitationItem) => {
    setEditingInviteId(invite.id);
    setInviteSubject(invite.subject);
    setInviteBody(invite.body);
    setSelectedTemplateId(invite.template?.id || '');
    setInviteChannel(invite.channel || 'EMAIL');
    setShowInviteModal(true);
  };

  const handleSelectMessageTemplate = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setInviteSubject(template.subject);
      setInviteBody(template.body);
    }
  };

  // Delete Invitation
  const handleDeleteInvitation = async (inviteId: string) => {
    if (!selectedEvent || !confirm('Supprimer cette invitation ?')) return;
    try {
      await api.delete(`/events/${selectedEvent.id}/invitations/${inviteId}`);
      setInvitations(invitations.filter(i => i.id !== inviteId));
      setSuccess('Invitation supprimée.');
    } catch (err: any) {
      setError('Erreur de suppression.');
    }
  };

  // Simulate Broadcast
  const handleSimulateBroadcast = async (inviteId: string) => {
    if (!selectedEvent) return;
    setError('');
    setSuccess('');
    setBroadcastingInviteId(inviteId);

    try {
      const response = await api.post(`/events/${selectedEvent.id}/invitations/${inviteId}/broadcast`);
      setBroadcastResults(response.results || []);
      setBroadcastMessage(response.message || '');
      setBroadcastSummary(response.summary || null);
      setShowBroadcastModal(true);
      await refreshGuests();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la diffusion.');
    } finally {
      setBroadcastingInviteId(null);
    }
  };

  // Bulk Send Invitation
  const handleBulkSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !bulkSelectedInviteId) {
      setError('Veuillez sélectionner une invitation à envoyer.');
      return;
    }
    setError('');
    setSuccess('');
    setIsBulkSending(true);

    try {
      const response = await api.post(`/events/${selectedEvent.id}/invitations/${bulkSelectedInviteId}/broadcast`, {
        guestIds: selectedGuestIds,
        channel: bulkSelectedChannel,
      });
      setBroadcastResults(response.results || []);
      setBroadcastMessage(response.message || '');
      setBroadcastSummary(response.summary || null);
      setShowBulkInviteModal(false);
      setShowBroadcastModal(true);
      setSelectedGuestIds([]);
      await refreshGuests();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi groupé.");
    } finally {
      setIsBulkSending(false);
    }
  };

  const handleCopyLink = (guestId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedGuestId(guestId);
    setTimeout(() => setCopiedGuestId(null), 2000);
  };

  const getRenderedInvitationBody = (guest: GuestItem) => {
    if (!invitations || invitations.length === 0) return null;
    const invitation = invitations[0]; // Use the first invitation
    const FRONTEND_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const rsvpLink = `${FRONTEND_URL}/rsvp/${guest.id}`;
    
    let body = invitation.body || '';
    body = body.replaceAll('{{firstName}}', guest.firstName || '');
    body = body.replaceAll('{{lastName}}', guest.lastName || '');
    body = body.replaceAll('{{rsvpLink}}', rsvpLink);
    
    if (selectedEvent) {
      body = body.replaceAll('{{title}}', selectedEvent.title || '');
      body = body.replaceAll('{{description}}', selectedEvent.description || '');
      body = body.replaceAll('{{location}}', selectedEvent.location || '');
      const formattedDate = new Date(selectedEvent.date).toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      body = body.replaceAll('{{date}}', formattedDate);
      body = applyInvitationGuidelineVariables(body, selectedEvent.guestGuidelines);
    }
    return body;
  };

  const getWhatsAppShareUrl = (guestName: string, rsvpLink: string, phone?: string | null, customBody?: string | null) => {
    const text = customBody || `Bonjour ${guestName}, vous êtes chaleureusement invité(e) ! Veuillez confirmer votre présence en ouvrant votre invitation personnalisée ici : ${rsvpLink}`;
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const getXShareUrl = (guestName: string, rsvpLink: string, customBody?: string | null) => {
    const text = customBody || `Bonjour ${guestName}, vous êtes invité(e) ! Confirmez votre présence ici : ${rsvpLink}`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  };

  const getFacebookShareUrl = (rsvpLink: string) => {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(rsvpLink)}`;
  };

  const getGuestRsvpLink = (guestId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/rsvp/${guestId}`;
    }
    return `http://localhost:3000/rsvp/${guestId}`;
  };

  const getReminderFrequencyLabel = (freq?: string) => {
    switch (freq) {
      case 'DAILY': return 'Rappel : Quotidien';
      case 'EVERY_3_DAYS': return 'Rappel : Tous les 3 jours';
      case 'EVERY_5_DAYS': return 'Rappel : Tous les 5 jours';
      case 'WEEKLY': return 'Rappel : Hebdomadaire';
      default: return 'Pas de rappel automatique';
    }
  };

  if (user?.role === 'SUPER_ADMIN') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-2xl mx-auto">
        <div className="bg-indigo-50 text-indigo-600 p-4 rounded-full mb-6">
          <Calendar className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Gestion des Événements (Super Admin)</h1>
        <p className="text-slate-500 mt-3 leading-relaxed">
          En tant que Super Administrateur de la plateforme SaaS, vous n'êtes pas rattaché à une organisation spécifique et ne gérez pas d'événements en nom propre.
        </p>
        <p className="text-slate-500 mt-2 leading-relaxed">
          Veuillez utiliser le <strong className="text-indigo-600">Tableau de bord Admin</strong> pour superviser l'ensemble des organisations, leurs membres et leurs statistiques d'utilisation.
        </p>
        <Link 
          href="/dashboard" 
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-100"
        >
          Retour au Tableau de Bord Admin
        </Link>
      </div>
    );
  }

  if (loading) {
    return <SkeletonEventsView mode={eventsViewMode} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      {!selectedEvent ? (
        <PageHeader
          title="Vos événements"
          description="Créez et gérez vos réceptions privées, vos listes d'invités et vos invitations."
          action={
            <div className="flex flex-wrap items-center gap-2">
              {events.length > 0 && (
                <ViewModeToggle
                  storageKey="em-view-events"
                  value={eventsViewMode}
                  onChange={setEventsViewMode}
                  columns={eventsColumns}
                  onColumnsChange={setEventsColumns}
                />
              )}
              {access?.canCreateEvents ? (
                <Button onClick={openCreateEventModal} leftIcon={<PlusCircle className="w-4 h-4" />}>
                  Créer un événement
                </Button>
              ) : null}
            </div>
          }
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux événements
            </button>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{selectedEvent.title}</h1>
            <p className="text-slate-500 text-sm font-medium flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {new Date(selectedEvent.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-4 h-4 text-slate-400" /> 
                <span>{selectedEvent.location}</span>
                {selectedEvent.latitude !== undefined && selectedEvent.latitude !== null && selectedEvent.longitude !== undefined && selectedEvent.longitude !== null && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md font-bold">
                    GPS: {Number(selectedEvent.latitude).toFixed(4)}, {Number(selectedEvent.longitude).toFixed(4)}
                  </span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-700">
                {getReminderFrequencyLabel(selectedEvent.reminderFrequency)}
              </span>
              {selectedEvent.room && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-50 border border-violet-100 text-violet-700">
                  <Building2 className="w-3.5 h-3.5" />
                  Salle : {selectedEvent.room.name}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleManageEvent(selectedEvent)}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition flex items-center gap-1.5 shadow-sm"
              title="Actualiser les données de l'événement"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button 
              onClick={() => handleEditEventClick(selectedEvent)}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
            >
              Modifier l'événement
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Event List View */}
      {!selectedEvent && (
        <div
          className={
            eventsViewMode === 'grid'
              ? eventsGridClass
              : 'flex flex-col gap-2'
          }
        >
          {events.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-surface border border-border rounded-[var(--radius-card)]">
              <Calendar className="w-16 h-12 text-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground">Aucun événement planifié</h3>
              <p className="text-sm text-muted mt-1 max-w-xs mx-auto">
                Commencez par créer votre premier événement pour y ajouter vos invités.
              </p>
              <button
                onClick={openCreateEventModal}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition"
              >
                Créer mon premier événement
              </button>
            </div>
          ) : (
            events.map((event) => {
              const dateLabel = new Date(event.date).toLocaleDateString('fr-FR', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
              const meta = (
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-primary">{dateLabel}</span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                    {event.location}
                  </span>
                  {event.room && (
                    <span className="flex items-center gap-1 truncate text-violet-500 dark:text-violet-300">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {event.room.name}
                    </span>
                  )}
                </div>
              );
              const actions = (
                <>
                  {eventsViewMode === 'grid' ? (
                    <button
                      type="button"
                      onClick={() => handleManageEvent(event)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition"
                    >
                      Gérer
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleManageEvent(event)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-surface-muted transition"
                    >
                      Ouvrir
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
                    title="Supprimer l'événement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              );

              return (
                <ProjectCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  layout={eventsViewMode}
                  meta={eventsViewMode === 'list' ? dateLabel : meta}
                  description={
                    eventsViewMode === 'grid' && event.description
                      ? event.description
                      : undefined
                  }
                  onClick={() => handleManageEvent(event)}
                  actions={actions}
                />
              );
            })
          )}
        </div>
      )}

      {/* Event Management View (Tabs) */}
      {selectedEvent && (
        <div className="space-y-8">
          <EventWorkflowPanel
            workflow={eventWorkflow}
            activeTab={activeTab}
            onNavigateTab={handleWorkflowNavigate}
            onAction={handleWorkflowAction}
            compact={isProtocolOnly}
          />

          {/* Tabs Selector */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {!isProtocolOnly && (
            <button
              onClick={() => setActiveTab('guests')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'guests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5" />
                Invités ({guests.length})
              </span>
            </button>
            )}
            <button
              onClick={() => setActiveTab('protocol')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'protocol' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2">
                <ScanLine className="w-4.5 h-4.5" />
                Protocole
              </span>
            </button>
            {!isProtocolOnly && (
            <>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'invitations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2">
                <Mail className="w-4.5 h-4.5" />
                Invitations & Diffusion ({invitations.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('tablePlan')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'tablePlan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-4.5 h-4.5" />
                Plan de table
              </span>
            </button>
            <button
              onClick={() => setActiveTab('guestInfo')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'guestInfo' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2">
                <Shirt className="w-4.5 h-4.5" />
                Infos invités
              </span>
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'staff' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5" />
                Équipe événement
              </span>
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'feed' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5" />
                Feed & Livre d'or
              </span>
            </button>
            </>
            )}
          </div>

          {activeTab === 'protocol' && selectedEvent && (
            <GuestProtocolPanel eventId={selectedEvent.id} />
          )}

          {/* Tab Content: Guests */}
          {activeTab === 'guests' && !isProtocolOnly && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Liste des Invités</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Ajoutez des invités manuellement ou importez-les en bloc à partir d'un fichier CSV.</p>
                </div>
                <div className="flex gap-2.5">
                  {selectedGuestIds.length > 0 && (
                    <button 
                      onClick={() => {
                        if (invitations.length === 0) {
                          alert("Veuillez d'abord configurer une invitation dans l'onglet 'Invitations & Diffusion'.");
                          return;
                        }
                        setBulkSelectedInviteId(invitations[0]?.id || '');
                        setShowBulkInviteModal(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-emerald-100 animate-fade-in"
                    >
                      <Send className="w-4 h-4" />
                      Inviter la sélection ({selectedGuestIds.length})
                    </button>
                  )}
                  <button 
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Importer Excel / CSV
                  </button>
                  {guests.length > 0 && (
                    <button 
                      onClick={handleExportGuests}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
                      title="Exporter tous les invités en fichier CSV"
                    >
                      <Download className="w-4 h-4" />
                      Exporter CSV
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setEditingGuestId(null);
                      setGuestFirstName('');
                      setGuestLastName('');
                      setGuestEmail('');
                      setGuestPhone('');
                      setGuestPreferences('');
                      setGuestCategory('Famille');
                      setShowGuestModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Ajouter un invité
                  </button>
                </div>
              </div>

              {/* Search & Filtering Controls */}
              {guests.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col md:flex-row gap-3 items-center">
                    {/* Search Input */}
                    <div className="relative w-full md:flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un invité par nom ou email..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition shadow-sm"
                      />
                    </div>

                    {/* RSVP Status Filter */}
                    <div className="w-full md:w-48">
                      <select 
                        value={rsvpFilter}
                        onChange={(e) => setRsvpFilter(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition shadow-sm font-semibold text-slate-700"
                      >
                        <option value="ALL">Tous les statuts RSVP</option>
                        <option value="ACCEPTED">Présent uniquement</option>
                        <option value="DECLINED">Absent uniquement</option>
                        <option value="PENDING">Sans réponse uniquement</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div className="w-full md:w-48">
                      <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition shadow-sm font-semibold text-slate-700"
                      >
                        <option value="ALL">Toutes les catégories</option>
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Advanced Filters Toggle */}
                    <button
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                        showAdvancedFilters 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Filtres avancés
                    </button>

                    {/* Reset Filters Button */}
                    {(searchQuery || rsvpFilter !== 'ALL' || categoryFilter !== 'ALL' || dietFilter !== 'ALL' || Object.values(customFilters).some(v => v !== 'ALL' && v !== '')) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setRsvpFilter('ALL');
                          setCategoryFilter('ALL');
                          setDietFilter('ALL');
                          setCustomFilters({});
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin-once" />
                        Réinitialiser
                      </button>
                    )}
                  </div>

                  {/* Advanced Collapsible Filters */}
                  {showAdvancedFilters && (
                    <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
                      {/* Diet Filter */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Régime alimentaire</label>
                        <select 
                          value={dietFilter}
                          onChange={(e) => setDietFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition shadow-sm font-semibold text-slate-700"
                        >
                          <option value="ALL">Tous les régimes</option>
                          <option value="none">Standard</option>
                          <option value="vegetarian">Végétarien</option>
                          <option value="vegan">Végétalien (Vegan)</option>
                          <option value="halal">Halal</option>
                          <option value="kosher">Casher</option>
                        </select>
                      </div>

                      {/* Dynamic Custom Questions Filters */}
                      {getCustomRsvpFields().map(field => {
                        const currentValue = customFilters[field.label] || 'ALL';
                        return (
                          <div key={field.id} className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate block max-w-full" title={field.label}>
                              {field.label}
                            </label>
                            {isBooleanFieldType(field.type) ? (
                              <select 
                                value={currentValue}
                                onChange={(e) => setCustomFilters({ ...customFilters, [field.label]: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition shadow-sm font-semibold text-slate-700"
                              >
                                <option value="ALL">Tous</option>
                                <option value="Oui">Coché (Oui)</option>
                                <option value="Non">Non coché (Non)</option>
                              </select>
                            ) : (field.type === 'select' || field.type === 'radio') && field.options ? (
                              <select 
                                value={currentValue}
                                onChange={(e) => setCustomFilters({ ...customFilters, [field.label]: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition shadow-sm font-semibold text-slate-700"
                              >
                                <option value="ALL">Tous</option>
                                {field.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input 
                                type="text"
                                value={currentValue === 'ALL' ? '' : currentValue}
                                onChange={(e) => setCustomFilters({ ...customFilters, [field.label]: e.target.value || 'ALL' })}
                                placeholder="Filtrer par réponse..."
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition shadow-sm font-semibold text-slate-700"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Guests Table */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {guests.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-bold text-slate-700">Aucun invité</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Ajoutez des invités pour commencer à diffuser vos invitations.</p>
                  </div>
                ) : filteredGuests.length === 0 ? (
                  <div className="text-center py-16">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-bold text-slate-700">Aucun résultat</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Aucun invité ne correspond à vos critères de recherche ou de filtrage.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setRsvpFilter('ALL');
                        setCategoryFilter('ALL');
                      }}
                      className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl"
                    >
                      Effacer les filtres
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="py-3.5 px-6 font-semibold w-12">
                            <input 
                              type="checkbox" 
                              checked={isAllFilteredSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGuestIds(filteredGuests.map(g => g.id));
                                } else {
                                  setSelectedGuestIds([]);
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                          </th>
                          <th className="py-3.5 px-6 font-semibold">Nom complet</th>
                          <th className="py-3.5 px-6 font-semibold">Email</th>
                          <th className="py-3.5 px-6 font-semibold">Catégorie</th>
                          <th className="py-3.5 px-6 font-semibold">Statut RSVP</th>
                          <th className="py-3.5 px-6 font-semibold">Préférences & Allergies</th>
                          <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredGuests.map((g) => (
                          <tr key={g.id} className={`hover:bg-slate-50/30 transition-colors ${selectedGuestIds.includes(g.id) ? 'bg-indigo-50/10' : ''}`}>
                            <td className="py-4 px-6 w-12">
                              <input 
                                type="checkbox" 
                                checked={selectedGuestIds.includes(g.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGuestIds([...selectedGuestIds, g.id]);
                                  } else {
                                    setSelectedGuestIds(selectedGuestIds.filter(id => id !== g.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              />
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-900">{g.firstName} {g.lastName}</td>
                            <td className="py-4 px-6 text-slate-500 font-medium">{g.email}</td>
                            <td className="py-4 px-6">
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-600">
                                {g.category || 'Général'}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                                g.rsvp === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                g.rsvp === 'DECLINED' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                'bg-amber-50 border-amber-100 text-amber-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  g.rsvp === 'ACCEPTED' ? 'bg-emerald-500' :
                                  g.rsvp === 'DECLINED' ? 'bg-rose-500' : 'bg-amber-500'
                                }`} />
                                {g.rsvp === 'ACCEPTED' ? 'Présent' : g.rsvp === 'DECLINED' ? 'Absent' : 'En attente'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-500 font-medium max-w-xs truncate">
                              {g.preferences ? (
                                <span className="text-xs">
                                  {g.preferences.diet && `Régime: ${g.preferences.diet}`}
                                  {g.preferences.allergies && ` • Allergies: ${g.preferences.allergies}`}
                                  {g.preferences.plusOne !== undefined && ` • Accompagné: ${g.preferences.plusOne ? 'Oui' : 'Non'}`}
                                  {g.preferences.notes && ` • Notes: ${g.preferences.notes}`}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic text-xs">Aucune préférence</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => setSelectedGuestDetails(g)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Voir les détails et choix de l'invité"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleEditGuestClick(g)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Modifier l'invité"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setSharingGuest(g)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Partager l'invitation (WhatsApp, X, Instagram)"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteGuest(g.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Supprimer l'invité"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Tab Content: Invitations */}
          {activeTab === 'invitations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Invitations Configurer</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Associez un modèle visuel d'invitation à votre événement et rédigez le message de diffusion.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingInviteId(null);
                    setInviteSubject('');
                    setInviteBody('');
                    setSelectedTemplateId('');
                    setInviteChannel('EMAIL');
                    setShowInviteModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
                >
                  <PlusCircle className="w-4 h-4" />
                  Configurer une invitation
                </button>
              </div>

              {/* Invitations List */}
              <div className="grid md:grid-cols-2 gap-6">
                {invitations.length === 0 ? (
                  <div className="col-span-full text-center py-16 bg-white border border-slate-200 rounded-3xl">
                    <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-bold text-slate-700">Aucune invitation configurée</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Créez une invitation pour pouvoir envoyer des liens RSVP personnalisés à vos invités.</p>
                  </div>
                ) : (
                  invitations.map((invite) => (
                    <div key={invite.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            invite.channel === 'EMAIL' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                            invite.channel === 'WHATSAPP' || invite.channel === 'SMS' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                            invite.channel === 'EMAIL_AND_WHATSAPP' || invite.channel === 'EMAIL_AND_SMS' || invite.channel === 'ALL_CHANNELS' ? 'bg-violet-50 border-violet-100 text-violet-700' :
                            'bg-slate-50 border-slate-100 text-slate-700'
                          }`}>
                            Canal: {getChannelLabel(invite.channel)}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">
                            Modèle: {invite.template?.name || 'Aucun'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base line-clamp-1">{invite.subject}</h3>
                        <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed whitespace-pre-line">{invite.body}</p>
                      </div>
                      <div className="flex gap-2 pt-4 border-t border-slate-100">
                        <button 
                          onClick={() => handleSimulateBroadcast(invite.id)}
                          disabled={broadcastingInviteId !== null}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-100 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                        >
                          {broadcastingInviteId === invite.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Génération en cours...
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              Générer les invitations & Liens RSVP
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => handleEditInvitationClick(invite)}
                          disabled={broadcastingInviteId !== null}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition disabled:opacity-50"
                          title="Modifier l'invitation"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteInvitation(invite.id)}
                          disabled={broadcastingInviteId !== null}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition disabled:opacity-50"
                          title="Supprimer l'invitation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Table Plan */}
          {activeTab === 'guestInfo' && selectedEvent && !isProtocolOnly && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-sm text-slate-500">
                Définissez le code vestimentaire et les recommandations pratiques visibles par vos invités sur le portail RSVP et dans les invitations.
              </p>
              <EventGuestGuidelinesEditor
                value={guestGuidelines}
                onChange={setGuestGuidelines}
                onSave={handleSaveGuestGuidelines}
                saving={savingGuidelines}
              />
            </div>
          )}

          {activeTab === 'tablePlan' && (
            <TablePlanner
              key={`${selectedEvent.id}_${selectedEvent.tablePlan?.importedAt ?? 'empty'}`}
              guests={guests}
              initialTablePlan={selectedEvent.tablePlan}
              onSave={handleSaveTablePlan}
              roomName={selectedEvent.room?.name}
              canImportRoomLayout={selectedRoomHasLayout || Boolean(selectedEvent.roomId && orgRooms.find((r) => r.id === selectedEvent.roomId)?.layoutBlueprint)}
              onImportRoomLayout={handleImportRoomLayout}
              importingLayout={importingLayout}
            />
          )}

          {/* Tab Content: Feed & Shares */}
          {activeTab === 'staff' && selectedEvent && (
            <EventStaffPanel eventId={selectedEvent.id} />
          )}

          {activeTab === 'feed' && (
            <EventFeedManager
              key={`feed_${selectedEvent.id}`}
              eventId={selectedEvent.id}
            />
          )}
        </div>
      )}

      {/* MODALS */}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEventId ? "Modifier l'événement" : 'Créer un événement'}
              </h3>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateEvent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Event Details */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titre de l'événement</label>
                    <input 
                      type="text" 
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="ex. Mariage de Claire & Alexandre"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description (Optionnel)</label>
                    <textarea 
                      value={eventDesc}
                      onChange={(e) => setEventDescription(e.target.value)}
                      placeholder="Décrivez brièvement le déroulement de la réception..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition h-20 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Heure</label>
                      <input 
                        type="datetime-local" 
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lieu / Adresse</label>
                      <input 
                        type="text" 
                        value={eventLoc}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="ex. Hôtel Fleuve Congo, Kinshasa"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-violet-600" />
                        Salle de l&apos;organisation (optionnel)
                      </label>
                      <select
                        value={eventRoomId}
                        onChange={(e) => handleRoomChange(e.target.value)}
                        disabled={loadingRooms}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="">Aucune salle — lieu libre</option>
                        {orgRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                            {room.floor ? ` (${room.floor})` : ''}
                            {room.capacity ? ` — ${room.capacity} pl.` : ''}
                            {room.roomType && room.roomType !== 'SIMPLE' ? ` · ${room.roomType}` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400">
                        {orgRooms.length === 0
                          ? 'Aucune salle configurée. Créez-en dans Mon compte → Profil.'
                          : 'La sélection d\'une salle préremplit le lieu et lie l\'événement au staff de cette salle.'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fréquence de rappel automatique</label>
                    <select 
                      value={eventReminderFrequency}
                      onChange={(e) => setEventReminderFrequency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="NONE">Pas de rappel automatique</option>
                      <option value="DAILY">Chaque jour (Quotidien)</option>
                      <option value="EVERY_3_DAYS">Tous les 3 jours</option>
                      <option value="EVERY_5_DAYS">Tous les 5 jours</option>
                      <option value="WEEKLY">Chaque semaine (Hebdomadaire)</option>
                    </select>
                    <p className="text-[11px] text-slate-400">
                      Envoie automatiquement un rappel aux invités qui n'ont pas encore répondu (RSVP En attente).
                    </p>
                  </div>
                </div>

                {/* Right Column: Map Picker */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sélectionner sur la carte</label>
                      <button
                        type="button"
                        onClick={searchLocationOnMap}
                        disabled={searchingLocation}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 disabled:opacity-50"
                      >
                        {searchingLocation ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        Rechercher le lieu saisi
                      </button>
                    </div>

                    {searchError && (
                      <p className="text-xs text-rose-500 font-semibold">{searchError}</p>
                    )}

                    {/* Map Container */}
                    <div 
                      id="map-picker" 
                      className="w-full h-56 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative"
                      style={{ minHeight: '220px' }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                        Chargement de la carte...
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latitude GPS</label>
                      <input 
                        type="number" 
                        step="any"
                        value={eventLatitude}
                        onChange={(e) => {
                          setEventLatitude(e.target.value);
                          const lat = parseFloat(e.target.value);
                          const lng = parseFloat(eventLongitude);
                          const L = (window as any).L;
                          if (!isNaN(lat) && !isNaN(lng) && L && mapRef.current) {
                            mapRef.current.setView([lat, lng]);
                            if (markerRef.current) {
                              markerRef.current.setLatLng([lat, lng]);
                            } else {
                              markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
                            }
                          }
                        }}
                        placeholder="ex. -4.3014"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Longitude GPS</label>
                      <input 
                        type="number" 
                        step="any"
                        value={eventLongitude}
                        onChange={(e) => {
                          setEventLongitude(e.target.value);
                          const lat = parseFloat(eventLatitude);
                          const lng = parseFloat(e.target.value);
                          const L = (window as any).L;
                          if (!isNaN(lat) && !isNaN(lng) && L && mapRef.current) {
                            mapRef.current.setView([lat, lng]);
                            if (markerRef.current) {
                              markerRef.current.setLatLng([lat, lng]);
                            } else {
                              markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
                            }
                          }
                        }}
                        placeholder="ex. 15.3048"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Cliquez sur la carte ou utilisez le bouton de recherche pour placer le repère et récupérer automatiquement les coordonnées GPS.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={savingEvent}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {savingEvent ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingGuestId ? "Modifier l'invité" : "Ajouter un invité"}
              </h3>
              <button onClick={() => { setShowGuestModal(false); setEditingGuestId(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prénom</label>
                  <input 
                    type="text" 
                    value={guestFirstName}
                    onChange={(e) => setGuestFirstName(e.target.value)}
                    placeholder="ex. Jean"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom de famille</label>
                  <input 
                    type="text" 
                    value={guestLastName}
                    onChange={(e) => setGuestLastName(e.target.value)}
                    placeholder="ex. Kabeya"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="ex. jean.kabeya@gmail.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone (WhatsApp)</label>
                  <input 
                    type="text" 
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="ex. +243812345678"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catégorie</label>
                  <select 
                    value={guestCategory}
                    onChange={(e) => setGuestCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="Famille">Famille</option>
                    <option value="Ami">Ami</option>
                    <option value="Collègue">Collègue</option>
                    <option value="VIP">VIP</option>
                    <option value="Général">Général</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes (Optionnel)</label>
                  <input 
                    type="text" 
                    value={guestPrefs}
                    onChange={(e) => setGuestPreferences(e.target.value)}
                    placeholder="ex. Table d'honneur"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { setShowGuestModal(false); setEditingGuestId(null); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                  disabled={savingGuest}
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={savingGuest}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  {savingGuest ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Enregistrement...
                    </>
                  ) : (
                    editingGuestId ? "Enregistrer" : "Ajouter"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV & Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl p-6 space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Importer des invités en bloc</h3>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setParsedPreview(null);
                  setImportText('');
                }} 
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Import Methods Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setImportImportMethod('excel');
                  setParsedPreview(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  importMethod === 'excel' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fichier Excel (.xlsx, .xls)
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportImportMethod('csv');
                  setParsedPreview(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  importMethod === 'csv' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fichier CSV (.csv)
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportImportMethod('text');
                  setParsedPreview(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  importMethod === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Copier-Coller Texte CSV
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-4">
              {/* Excel / CSV File Upload Drag & Drop */}
              {(importMethod === 'excel' || importMethod === 'csv') && (
                <div className="space-y-4">
                  {/* Download Templates */}
                  <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Modèle de document requis
                      </div>
                      <p className="text-[11px] text-indigo-900/80">
                        Pour garantir un import parfait, utilisez notre modèle contenant les en-têtes corrects.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadSampleTemplate(importMethod)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Télécharger le modèle
                    </button>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center gap-3 ${
                      dragActive 
                        ? 'border-indigo-500 bg-indigo-50/30' 
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="file"
                      id="file-upload"
                      accept={importMethod === 'excel' ? '.xlsx, .xls' : '.csv'}
                      onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                      className="hidden"
                    />
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-slate-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700">
                        Glissez et déposez votre fichier ici, ou{' '}
                        <label htmlFor="file-upload" className="text-indigo-600 hover:text-indigo-700 cursor-pointer underline">
                          parcourez vos fichiers
                        </label>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Formats acceptés : {importMethod === 'excel' ? '.xlsx, .xls' : '.csv'} (Taille max 10 Mo)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Text Area CSV Copy Paste */}
              {importMethod === 'text' && (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs text-indigo-950 space-y-2 leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" /> Format CSV requis :
                    </div>
                    <p>Copiez et collez vos lignes d'invités en respectant l'ordre des colonnes séparées par des virgules :</p>
                    <pre className="bg-white p-2.5 rounded-xl border border-indigo-100 font-mono text-[11px] text-slate-700 overflow-x-auto">
                      Prénom, Nom, Email, Catégorie, Téléphone, Notes{'\n'}
                      Jean, Kabeya, jean.kabeya@gmail.com, VIP, +243812345678, Table d'honneur{'\n'}
                      Sarah, Mwamba, sarah.m@outlook.com, Ami, +243998765432, Allergie arachides
                    </pre>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Données CSV</label>
                    <textarea 
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Prénom, Nom, Email, Catégorie, Téléphone, Notes..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500 transition h-40 resize-none"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Preview Section */}
              {parsedPreview && parsedPreview.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Aperçu des données ({parsedPreview.length} invités détectés)
                    </label>
                    <button
                      type="button"
                      onClick={() => setParsedPreview(null)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 transition"
                    >
                      Effacer
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2 px-3">Prénom</th>
                          <th className="py-2 px-3">Nom</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Catégorie</th>
                          <th className="py-2 px-3">Téléphone</th>
                          <th className="py-2 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {parsedPreview.slice(0, 5).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold">{p.firstName}</td>
                            <td className="py-2 px-3">{p.lastName}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{p.email}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px]">{p.phone || '-'}</td>
                            <td className="py-2 px-3 truncate max-w-[120px]" title={p.notes}>{p.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedPreview.length > 5 && (
                      <div className="bg-slate-50 text-center py-2 text-[10px] font-bold text-slate-400 border-t border-slate-100">
                        Et {parsedPreview.length - 5} autres lignes...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setParsedPreview(null);
                    setImportText('');
                  }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                  disabled={importingFile}
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={importingFile || (importMethod !== 'text' && (!parsedPreview || parsedPreview.length === 0))}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  {importingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Lancer l'importation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Invitation Sending Modal */}
      {showBulkInviteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Envoyer une invitation groupée</h3>
              </div>
              <button onClick={() => setShowBulkInviteModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleBulkSendInvitation} className="space-y-4">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                <p className="text-xs text-indigo-800 font-semibold leading-relaxed">
                  Vous vous apprêtez à envoyer une invitation personnalisée à <strong className="text-indigo-900 font-extrabold">{selectedGuestIds.length} invités</strong> sélectionnés.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sélectionner l'invitation précise</label>
                <select 
                  value={bulkSelectedInviteId}
                  onChange={(e) => setBulkSelectedInviteId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                  required
                >
                  <option value="">-- Choisir une invitation --</option>
                  {invitations.map(i => (
                    <option key={i.id} value={i.id}>{i.subject} (Modèle: {i.template?.name || 'Aucun'})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moyen de diffusion (Canal)</label>
                <select 
                  value={bulkSelectedChannel}
                  onChange={(e) => setBulkSelectedChannel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="EMAIL">E-mail uniquement</option>
                  <option value="WHATSAPP">WhatsApp uniquement</option>
                  <option value="EMAIL_AND_WHATSAPP">E-mail ET WhatsApp (Simultané)</option>
                  <option value="X">X / Twitter (Partage direct)</option>
                  <option value="INSTAGRAM">Instagram (Copie de lien DM)</option>
                  <option value="FACEBOOK">Facebook (Copie de lien Messenger)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  disabled={isBulkSending}
                  onClick={() => setShowBulkInviteModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isBulkSending}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                  {isBulkSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Générer & Envoyer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invitation Configuration Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingInviteId ? "Modifier l'invitation" : "Configurer une invitation"}
              </h3>
              <button onClick={() => { setShowInviteModal(false); setEditingInviteId(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modèle de design</label>
                  <select 
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="">-- Aucun modèle visuel --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Canal de diffusion</label>
                  <select 
                    value={inviteChannel}
                    onChange={(e) => setInviteChannel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="EMAIL">E-mail</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL_AND_WHATSAPP">E-mail et WhatsApp</option>
                    <option value="LINK">Lien unique (Simulation)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modèles de message prédéfinis (Optionnel)</label>
                <select 
                  onChange={(e) => handleSelectMessageTemplate(e.target.value)}
                  defaultValue=""
                  className="w-full px-4 py-2.5 bg-indigo-50/50 border border-indigo-100 text-indigo-950 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">-- Choisir un modèle de message pour pré-remplir --</option>
                  {MESSAGE_TEMPLATES.map(mt => (
                    <option key={mt.id} value={mt.id}>{mt.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Objet du message</label>
                <input 
                  type="text" 
                  value={inviteSubject}
                  onChange={(e) => setInviteSubject(e.target.value)}
                  placeholder="ex. Invitation officielle : Gala de Charité d'Élite"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Corps du message</label>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <HelpCircle className="w-3.5 h-3.5" /> 
                    <span>Variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{rsvpLink}}'}, {'{{title}}'}, {'{{date}}'}, {'{{location}}'}, {'{{description}}'}, {'{{dressCode}}'}, {'{{recommendations}}'}, {'{{guestGuidelines}}'}, {'{{tableName}}'}, {'{{seatNumber}}'}, {'{{tableMates}}'}, {'{{tableMatesInline}}'}</span>
                  </span>
                </div>
                <textarea 
                  value={inviteBody}
                  onChange={(e) => setInviteBody(e.target.value)}
                  placeholder="Cher(e) {{firstName}},&#10;Nous avons l'honneur de vous inviter...&#10;&#10;Veuillez confirmer votre présence ici : {{rsvpLink}}"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition h-32 resize-none"
                  required
                />
              </div>
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { setShowInviteModal(false); setEditingInviteId(null); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                  disabled={savingInvite}
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={savingInvite}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  {savingInvite ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Enregistrement...
                    </>
                  ) : (
                    editingInviteId ? "Enregistrer" : "Créer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Results Modal */}
      {showBroadcastModal && broadcastResults && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  broadcastSummary?.failed === broadcastSummary?.total
                    ? 'bg-rose-50 text-rose-600'
                    : broadcastSummary?.allSimulated
                      ? 'bg-amber-50 text-amber-600'
                      : (broadcastSummary?.failed || 0) > 0 || (broadcastSummary?.simulated || 0) > 0
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {broadcastSummary?.failed === broadcastSummary?.total ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : broadcastSummary?.allSimulated || (broadcastSummary?.failed || 0) > 0 ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {broadcastSummary?.failed === broadcastSummary?.total
                      ? 'Échec de l\'envoi'
                      : broadcastSummary?.allSimulated
                        ? 'Envoi simulé'
                        : (broadcastSummary?.failed || 0) > 0
                          ? 'Envoi partiel'
                          : 'Envoi des invitations effectué !'}
                  </h3>
                  {broadcastMessage && (
                    <p className="text-sm text-slate-500 mt-0.5">{broadcastMessage}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastResults(null);
                  setBroadcastMessage('');
                  setBroadcastSummary(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {broadcastSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-slate-900">{broadcastSummary.total}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-emerald-700">{broadcastSummary.sent}</div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Envoyés</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-amber-700">{broadcastSummary.simulated}</div>
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Simulés</div>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                  <div className="text-xl font-black text-rose-700">{broadcastSummary.failed}</div>
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Échecs</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-slate-500 leading-relaxed">
                Détail par invité ci-dessous. Les envois réels passent par SendGrid (e-mail) et UltraMsg (WhatsApp), configurables dans le panneau Super Admin ou via les variables d&apos;environnement du serveur.
              </p>
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3 max-h-96 overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2">
                  Résultats d&apos;envoi et options de partage manuel :
                </div>
                {broadcastResults.map((res, index) => {
                  const statusMeta = getBroadcastStatusMeta(res.status);
                  return (
                  <div key={res.guestId || index} className="flex flex-col gap-3 py-3 border-b border-slate-100/80 last:border-0 pb-3 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1 min-w-[200px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-bold text-slate-800 text-sm">{res.guestName}</div>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.classes}`}>
                            {statusMeta.label}
                          </span>
                          {res.channel && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {res.channel.split(',').map(c => getChannelLabel(c.trim())).join(' + ')}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-xs truncate max-w-xs">{res.email}</div>
                        {res.phone && (
                          <div className="text-slate-500 text-xs font-mono">{res.phone}</div>
                        )}
                        {res.error && (
                          <div className="text-rose-600 text-xs font-medium bg-rose-50 border border-rose-100 rounded-lg px-2 py-1 mt-1">
                            {res.error}
                          </div>
                        )}
                        {res.channelResults && res.channelResults.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {res.channelResults.map((cr, crIdx) => (
                              <span
                                key={crIdx}
                                title={cr.error || undefined}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                  cr.success && !cr.simulated
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : cr.simulated
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {getChannelLabel(cr.channel)}
                                {cr.success ? (cr.simulated ? '(simulé)' : '✓') : '✗'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Open Link */}
                      <a 
                        href={res.rsvpLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold transition hover:underline text-xs mr-2"
                      >
                        Ouvrir
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>

                      {/* Copy Link */}
                      <button
                        onClick={() => handleCopyLink(res.guestId || index.toString(), res.rsvpLink)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                          copiedGuestId === (res.guestId || index.toString())
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title="Copier le lien d'invitation"
                      >
                        {copiedGuestId === (res.guestId || index.toString()) ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copié !
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copier
                          </>
                        )}
                      </button>

                      {/* WhatsApp */}
                      <a
                        href={getWhatsAppShareUrl(res.guestName, res.rsvpLink, res.phone, res.body)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        title="Partager sur WhatsApp"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.753-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.013-5.101-2.859-6.948C16.572 2.011 14.1 1 11.999 1c-5.438 0-9.863 4.37-9.868 9.8-.001 1.77.463 3.498 1.345 5.021l-.993 3.624 5.164-.991zm11.767-6.828c-.3-.15-1.774-.875-2.048-.975-.274-.1-.474-.15-.674.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-1.2-.6-2.007-1.05-2.8-2.425-.2-.3-.2-.125.1-.425.275-.275.6-.65.75-.875.15-.225.075-.425-.038-.625-.112-.2-.95-2.275-1.3-3.125-.34-.817-.68-.707-.95-.721-.24-.012-.514-.015-.788-.015-.274 0-.724.1-1.1.5-.375.4-1.425 1.4-1.425 3.4s1.45 3.925 1.65 4.175c.2.275 2.855 4.35 6.915 6.1 1.12.484 1.91.775 2.56.975 1.12.35 2.14.3 2.95.175.9-.137 2.775-1.125 3.175-2.225.4-1.1.4-2.05.275-2.25-.125-.2-.475-.3-.775-.45z"/>
                        </svg>
                        WhatsApp
                      </a>

                      {/* X (Twitter) */}
                      <a
                        href={getXShareUrl(res.guestName, res.rsvpLink, res.body)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        title="Partager sur X"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        X
                      </a>

                      {/* Instagram */}
                      <button
                        onClick={() => handleCopyLink(res.guestId || index.toString(), res.rsvpLink)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        title="Copier pour Instagram DM"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 2.191 4.919 5.4c.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 5.271-4.919 5.418-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-2.199-4.919-5.42-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-5.271 4.919-5.419 1.265-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                        </svg>
                        Instagram
                      </button>

                      {/* Facebook */}
                      <a
                        href={getFacebookShareUrl(res.rsvpLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        title="Partager sur Facebook"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </a>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastResults(null);
                  setBroadcastMessage('');
                  setBroadcastSummary(null);
                }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Guest Sharing Modal */}
      {sharingGuest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Partager l'invitation</h3>
              </div>
              <button onClick={() => setSharingGuest(null)} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destinataire :</div>
                <div className="font-bold text-slate-800 text-sm">{sharingGuest.firstName} {sharingGuest.lastName}</div>
                <div className="text-slate-500 text-xs">{sharingGuest.email}</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Options de partage direct :</div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Copy Link */}
                  <button
                    onClick={() => handleCopyLink(sharingGuest.id, getGuestRsvpLink(sharingGuest.id))}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition ${
                      copiedGuestId === sharingGuest.id
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {copiedGuestId === sharingGuest.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        Lien Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copier le lien
                      </>
                    )}
                  </button>

                  {/* WhatsApp */}
                  <a
                    href={getWhatsAppShareUrl(`${sharingGuest.firstName} ${sharingGuest.lastName}`, getGuestRsvpLink(sharingGuest.id), sharingGuest.preferences && typeof sharingGuest.preferences === 'object' ? (sharingGuest.preferences as any).phone : null, getRenderedInvitationBody(sharingGuest))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.753-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.013-5.101-2.859-6.948C16.572 2.011 14.1 1 11.999 1c-5.438 0-9.863 4.37-9.868 9.8-.001 1.77.463 3.498 1.345 5.021l-.993 3.624 5.164-.991zm11.767-6.828c-.3-.15-1.774-.875-2.048-.975-.274-.1-.474-.15-.674.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-1.2-.6-2.007-1.05-2.8-2.425-.2-.3-.2-.125.1-.425.275-.275.6-.65.75-.875.15-.225.075-.425-.038-.625-.112-.2-.95-2.275-1.3-3.125-.34-.817-.68-.707-.95-.721-.24-.012-.514-.015-.788-.015-.274 0-.724.1-1.1.5-.375.4-1.425 1.4-1.425 3.4s1.45 3.925 1.65 4.175c.2.275 2.855 4.35 6.915 6.1 1.12.484 1.91.775 2.56.975 1.12.35 2.14.3 2.95.175.9-.137 2.775-1.125 3.175-2.225.4-1.1.4-2.05.275-2.25-.125-.2-.475-.3-.775-.45z"/>
                    </svg>
                    WhatsApp
                  </a>

                  {/* X (Twitter) */}
                  <a
                    href={getXShareUrl(`${sharingGuest.firstName} ${sharingGuest.lastName}`, getGuestRsvpLink(sharingGuest.id), getRenderedInvitationBody(sharingGuest))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X
                  </a>

                  {/* Instagram */}
                  <button
                    onClick={() => handleCopyLink(sharingGuest.id, getGuestRsvpLink(sharingGuest.id))}
                    className="flex items-center justify-center gap-2 p-3 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 hover:opacity-90 text-white rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 2.191 4.919 5.4c.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 5.271-4.919 5.418-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-2.199-4.919-5.42-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-5.271 4.919-5.419 1.265-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    Instagram (Copier)
                  </button>

                  {/* Facebook */}
                  <a
                    href={getFacebookShareUrl(getGuestRsvpLink(sharingGuest.id))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSharingGuest(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Details Modal */}
      {selectedGuestDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Détails de l'invité</h3>
              </div>
              <button onClick={() => setSelectedGuestDetails(null)} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prénom & Nom</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedGuestDetails.firstName} {selectedGuestDetails.lastName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catégorie</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedGuestDetails.category || 'Général'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5 truncate">{selectedGuestDetails.email}</div>
                </div>
                {selectedGuestDetails.preferences?.phone && (
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Téléphone</div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedGuestDetails.preferences.phone}</div>
                  </div>
                )}
              </div>

              {/* RSVP Status */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Statut de réponse</span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border ${
                  selectedGuestDetails.rsvp === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                  selectedGuestDetails.rsvp === 'DECLINED' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                  'bg-amber-50 border-amber-100 text-amber-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    selectedGuestDetails.rsvp === 'ACCEPTED' ? 'bg-emerald-500' :
                    selectedGuestDetails.rsvp === 'DECLINED' ? 'bg-rose-500' : 'bg-amber-500'
                  }`} />
                  {selectedGuestDetails.rsvp === 'ACCEPTED' ? 'Présent' : selectedGuestDetails.rsvp === 'DECLINED' ? 'Absent' : 'En attente'}
                </span>
              </div>

              {/* Standard Preferences */}
              {selectedGuestDetails.rsvp === 'ACCEPTED' && (
                <div className="p-4 border border-slate-200 rounded-2xl space-y-3 bg-white">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-indigo-600" />
                    <span>Préférences de repas & Notes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type de Menu</div>
                      <div className="font-bold text-slate-800 text-xs mt-1">
                        {selectedGuestDetails.preferences?.specialMeal === 'vegetarian' ? 'Végétarien' :
                         selectedGuestDetails.preferences?.specialMeal === 'vegan' ? 'Végétalien (Vegan)' :
                         selectedGuestDetails.preferences?.specialMeal === 'halal' ? 'Halal' :
                         selectedGuestDetails.preferences?.specialMeal === 'kosher' ? 'Casher' : 'Standard'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allergies</div>
                      <div className="font-bold text-slate-800 text-xs mt-1">
                        {selectedGuestDetails.preferences?.allergies || <span className="italic text-slate-300">Aucune</span>}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes / Remarques</div>
                      <div className="font-bold text-slate-800 text-xs mt-1">
                        {selectedGuestDetails.preferences?.notes || <span className="italic text-slate-300">Aucune note</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom RSVP Form Fields */}
              {selectedGuestDetails.rsvp === 'ACCEPTED' && (
                (selectedGuestDetails.preferences?.rsvpFormData?.length ?? 0) > 0 ||
                (selectedGuestDetails.preferences?.customFields &&
                  Object.keys(selectedGuestDetails.preferences.customFields).length > 0)
              ) && (
                <div className="p-4 border border-slate-200 rounded-2xl space-y-3 bg-white">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Réponses aux questions personnalisées</span>
                  </div>
                  <div className="space-y-3">
                    {(selectedGuestDetails.preferences?.rsvpFormData?.length
                      ? selectedGuestDetails.preferences.rsvpFormData.map((entry: RsvpFormDataEntry) => (
                          <div key={entry.fieldId || entry.analyticsKey} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                            <div className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">{entry.label}</div>
                            <div className="font-bold text-slate-800 text-xs mt-0.5">
                              {formatCustomFieldValueForDisplay(entry.value) || (
                                <span className="italic text-slate-300">Non renseigné</span>
                              )}
                            </div>
                          </div>
                        ))
                      : Object.entries(selectedGuestDetails.preferences!.customFields!).map(([question, answer]: [string, unknown]) => (
                          <div key={question} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                            <div className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">{question}</div>
                            <div className="font-bold text-slate-800 text-xs mt-0.5">
                              {formatCustomFieldValueForDisplay(answer) || (
                                <span className="italic text-slate-300">Non renseigné</span>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button 
                onClick={() => setSelectedGuestDetails(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
