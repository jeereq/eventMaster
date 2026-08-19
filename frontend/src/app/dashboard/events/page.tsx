'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';
import { 
 Calendar, MapPin, Users, PlusCircle, Trash2, Edit3, 
 ChevronRight, ArrowLeft, Check, Upload, Mail, Send, 
 Sparkles, CheckCircle2, XCircle, AlertCircle, Loader2,
 Copy, MessageSquare, Share2, Search, Filter, RefreshCw,
 Eye, Utensils, FileSpreadsheet, Download, LayoutGrid, Building2, ScanLine, Shirt, Globe, GlobeLock, Ticket, LayoutTemplate
} from 'lucide-react';
import TablePlanner from './TablePlanner';
import EventStaffPanel from './EventStaffPanel';
import EventFeedManager from './EventFeedManager';
import GuestProtocolPanel from './GuestProtocolPanel';
import EventGuestGuidelinesEditor from '@/components/EventGuestGuidelinesEditor';
import EventWorkflowPanel from '@/components/EventWorkflowPanel';
import MarketplaceMediaField from '@/components/MarketplaceMediaField';
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
import { PageHeader, Button, ProjectCard, ListRowAction, StatusPill, ViewModeToggle, useViewMode, listStackClass, SkeletonEventsView, Breadcrumbs, Modal, Input, Pagination, paginateItems, PhoneInput, usePageSize, coverFromPhotos } from '@/components/ui';
import CatalogueFilterBar, { CatalogueChoicePills, CatalogueFilterField, type CatalogueFilterChip } from '@/components/CatalogueFilterBar';
import { EVENT_ENTRY_OPTIONS } from '@/lib/catalogueEntityFilters';
import { cn } from '@/lib/cn';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import { parseStoredPhone } from '@/components/ui/PhoneInput';
import GettingStartedChecklist from '@/components/GettingStartedChecklist';
import { canonicalShareUrl, guestRsvpUrl } from '@/lib/share';
import {
 getFeatureLockMessage,
 getQuotaActionMessage,
 getQuotaLockMessage,
 isAtQuota,
 isPlanFeatureLocked,
} from '@/lib/planAccess';
import PlanLimitCallout from '@/components/PlanLimitCallout';
import { eventDashboardHref, eventsListHref, isEventWorkspaceTab } from '@/lib/eventRoutes';
import {
 displayGuestEmail,
 isPlaceholderGuestEmail,
 isRealGuestEmail,
 resolveGuestFormEmail,
} from '@/lib/guestContact';
import InvitationMessagePreview from '@/components/InvitationMessagePreview';
import {
 extractRsvpFieldsFromTemplateContent,
 supplementFieldsFromGuestPreferences,
 getCustomFieldValue,
 isBooleanFieldType,
 listGuestCustomFieldDetails,
 SPECIAL_MEAL_OPTIONS,
 specialMealLabel,
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
 isPublic?: boolean;
 slug?: string | null;
 publishedAt?: string | null;
 ticketingEnabled?: boolean;
 ticketPriceFc?: number;
 ticketsTotal?: number | null;
 ticketsSold?: number;
 photos?: string[] | null;
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
 feedPostCount?: number;
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
 phone?: string | null;
 phoneCountryCode?: string | null;
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
 phoneCountryCode?: string | null;
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
 failureReasons?: {
 noPhone?: number;
 noEmail?: number;
 provider?: number;
 };
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
 return { label: status, classes: 'bg-surface-muted text-muted border-border' };
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

function guestHasValidEmail(guest: GuestItem): boolean {
 return isRealGuestEmail(guest.email);
}

function guestHasPhone(guest: GuestItem): boolean {
 const stored = guest.phone
  || (guest.preferences && typeof guest.preferences === 'object'
   ? guest.preferences.phone || guest.preferences.telephone
   : '')
  || '';
 if (String(stored).replace(/\D/g, '').length >= 7) return true;
 return /^\+?[0-9\s\-()]{7,20}$/.test(String(guest.email || '').trim()) && !isPlaceholderGuestEmail(guest.email);
}

function channelNeedsEmail(channel: string): boolean {
 return channel === 'EMAIL' || channel === 'EMAIL_AND_WHATSAPP' || channel === 'EMAIL_AND_SMS' || channel === 'ALL_CHANNELS';
}

function channelNeedsWhatsApp(channel: string): boolean {
 return channel === 'WHATSAPP' || channel === 'EMAIL_AND_WHATSAPP' || channel === 'EMAIL_AND_SMS' || channel === 'ALL_CHANNELS' || channel === 'SMS';
}

function summarizeSendAudience(guestList: GuestItem[], channel: string) {
 const needEmail = channelNeedsEmail(channel);
 const needWhatsApp = channelNeedsWhatsApp(channel);
 let alreadySent = 0;
 let missingEmail = 0;
 let missingPhone = 0;
 let reachable = 0;

 for (const guest of guestList) {
  if (guest.preferences?.invitationSentAt) alreadySent += 1;
  const okEmail = !needEmail || guestHasValidEmail(guest);
  const okPhone = !needWhatsApp || guestHasPhone(guest);
  if (needEmail && !guestHasValidEmail(guest)) missingEmail += 1;
  if (needWhatsApp && !guestHasPhone(guest)) missingPhone += 1;
  if (okEmail && okPhone) reachable += 1;
  else if (needEmail && needWhatsApp && (guestHasValidEmail(guest) || guestHasPhone(guest))) {
   reachable += 1;
  }
 }

 return {
  total: guestList.length,
  alreadySent,
  missingEmail,
  missingPhone,
  reachable,
 };
}

function SendAudienceStats({
 stats,
}: {
 stats: ReturnType<typeof summarizeSendAudience>;
}) {
 return (
  <div className="grid grid-cols-2 gap-2 text-xs">
   <div className="rounded-xl border border-border bg-surface-muted/60 px-3 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Destinataires</p>
    <p className="text-sm font-bold text-foreground mt-0.5">{stats.total}</p>
   </div>
   <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Prêts à recevoir</p>
    <p className="text-sm font-bold text-emerald-800 mt-0.5">{stats.reachable}</p>
   </div>
   {stats.alreadySent > 0 && (
    <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
     <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Déjà invités</p>
     <p className="text-sm font-bold text-amber-800 mt-0.5">{stats.alreadySent} — seront renvoyés</p>
    </div>
   )}
   {stats.missingEmail > 0 && (
    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
     <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">Sans e-mail</p>
     <p className="text-sm font-bold text-rose-800 mt-0.5">{stats.missingEmail}</p>
    </div>
   )}
   {stats.missingPhone > 0 && (
    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
     <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">Sans WhatsApp</p>
     <p className="text-sm font-bold text-rose-800 mt-0.5">{stats.missingPhone}</p>
    </div>
   )}
  </div>
 );
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
 const { user, access, planFeatures, planQuota, tenant } = useAuth();
 const router = useRouter();
 const params = useParams();
 const searchParams = useSearchParams();
 const eventIdFromRoute = typeof params?.eventId === 'string' ? params.eventId : null;
 const { mode: eventsViewMode, setViewMode: setEventsViewMode, columns: eventsColumns, setGridColumns: setEventsColumns, gridClassName: eventsGridClass } = useViewMode('em-view-events', 'grid', 3);
 const {
   mode: guestsViewMode,
   setViewMode: setGuestsViewMode,
   columns: guestsColumns,
   setGridColumns: setGuestsColumns,
   gridClassName: guestsGridClass,
 } = useViewMode('em-view-guests', 'list', 3);
 const [eventsListPage, setEventsListPage] = useState(1);
 const [guestsListPage, setGuestsListPage] = useState(1);
 const [eventsPageSize, setEventsPageSize] = usePageSize('org-events', 8);
 const [guestsPageSize, setGuestsPageSize] = usePageSize('org-guests', 8);
 const isProtocolOnly = access?.isProtocolOnly ?? false;
 const [protocolDesk, setProtocolDesk] = useState(isProtocolOnly);
 const canManageEvents = access?.canManageAllEvents ?? false;
 const eventsAtLimit = isAtQuota(planQuota?.usage.events, planQuota?.limits.maxEvents);
 const guestsAtLimit = isAtQuota(planQuota?.usage.guests, planQuota?.limits.maxGuests);
 const protocolLocked = isPlanFeatureLocked(planFeatures, 'protocolQr');
 const seatNotificationsLocked = isPlanFeatureLocked(planFeatures, 'seatNotifications');
 const eventsQuotaMsg = getQuotaLockMessage('events', planQuota);
 const guestsQuotaMsg = getQuotaLockMessage('guests', planQuota);
 const protocolLockMsg = getFeatureLockMessage('protocolQr', tenant?.plan);
 const [events, setEvents] = useState<EventItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
 const [eventSearch, setEventSearch] = useState('');
 const [eventWhen, setEventWhen] = useState<'ALL' | 'upcoming' | 'past'>('ALL');
 const [eventVisibility, setEventVisibility] = useState<'all' | 'public' | 'private'>('all');
 const [eventEntry, setEventEntry] = useState<'' | 'paid' | 'free'>('');
 
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
 const [eventIsPublic, setEventIsPublic] = useState(false);
 const [eventTicketing, setEventTicketing] = useState(false);
 const [eventTicketPrice, setEventTicketPrice] = useState('');
 const [eventTicketsTotal, setEventTicketsTotal] = useState('');
 const [eventPhotos, setEventPhotos] = useState<string[]>([]);
 const [eventRoomId, setEventRoomId] = useState('');
 const [eventFormTemplateId, setEventFormTemplateId] = useState('');
 const [openTablePlanAfterSave, setOpenTablePlanAfterSave] = useState(false);
 const [orgRooms, setOrgRooms] = useState<OrgRoomOption[]>([]);
 const [loadingRooms, setLoadingRooms] = useState(false);
 const [editingEventId, setEditingEventId] = useState<string | null>(null);
 const [savingEvent, setSavingEvent] = useState(false);
 const [importingLayout, setImportingLayout] = useState(false);
 const [guestGuidelines, setGuestGuidelines] = useState<GuestGuidelines>(defaultGuestGuidelines());
 const [savingGuidelines, setSavingGuidelines] = useState(false);

 // Map Picker States & Refs
 const [eventMapOpen, setEventMapOpen] = useState(false);
 const [searchingLocation, setSearchingLocation] = useState(false);
 const [searchError, setSearchError] = useState('');
 const mapRef = useRef<any>(null);
 const markerRef = useRef<any>(null);

 // Guest form
 const [showGuestModal, setShowGuestModal] = useState(false);
 const [guestFirstName, setGuestFirstName] = useState('');
 const [guestLastName, setGuestLastName] = useState('');
 const [guestEmail, setGuestEmail] = useState('');
 const [guestPhoneCountryCode, setGuestPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
 const [guestPhoneNational, setGuestPhoneNational] = useState('');
 const [guestCategory, setGuestCategory] = useState('Famille');
 const [guestPrefs, setGuestPreferences] = useState('');
 const [guestAllergies, setGuestAllergies] = useState('');
 const [guestSpecialMeal, setGuestSpecialMeal] = useState('none');
 const [guestRsvp, setGuestRsvp] = useState<'PENDING' | 'ACCEPTED' | 'DECLINED'>('PENDING');
 const [guests, setGuests] = useState<GuestItem[]>([]);
 const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
 const [savingGuest, setSavingGuest] = useState(false);

 // Guest filtering states
 const [searchQuery, setSearchQuery] = useState('');
 const [rsvpFilter, setRsvpFilter] = useState<'ALL' | 'ACCEPTED' | 'DECLINED' | 'PENDING'>('ALL');
 const [categoryFilter, setCategoryFilter] = useState('ALL');
 const [dietFilter, setDietFilter] = useState<string>('ALL');
 const [checkinFilter, setCheckinFilter] = useState<'ALL' | 'in' | 'out'>('ALL');
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
 const [lastBroadcastInviteId, setLastBroadcastInviteId] = useState<string | null>(null);
 const [broadcastingInviteId, setBroadcastingInviteId] = useState<string | null>(null);
 const [broadcastConfirmInviteId, setBroadcastConfirmInviteId] = useState<string | null>(null);
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
 const matchesCheckin = checkinFilter === 'ALL'
  || (checkinFilter === 'in' && Boolean(g.checkedInAt))
  || (checkinFilter === 'out' && !g.checkedInAt);
 
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
 
 return matchesSearch && matchesRsvp && matchesCategory && matchesDiet && matchesCustom && matchesCheckin;
 });

 useEffect(() => {
 setGuestsListPage(1);
 }, [searchQuery, rsvpFilter, categoryFilter, dietFilter, checkinFilter, customFilters]);

 useEffect(() => {
 setEventsListPage(1);
 }, [events.length]);

 useEffect(() => {
 setProtocolDesk(isProtocolOnly || searchParams.get('mode') === 'protocol');
 }, [isProtocolOnly, searchParams]);

 useEffect(() => {
 if (protocolDesk && selectedEvent) {
 setActiveTab('protocol');
 }
 }, [protocolDesk, selectedEvent?.id]);

 const filteredEventsList = events.filter((event) => {
 const q = eventSearch.trim().toLowerCase();
 const matchesSearch = !q
  || event.title.toLowerCase().includes(q)
  || event.location.toLowerCase().includes(q)
  || (event.room?.name || '').toLowerCase().includes(q);
 const when = new Date(event.date).getTime();
 const matchesWhen = eventWhen === 'ALL'
  || (eventWhen === 'upcoming' && when >= Date.now())
  || (eventWhen === 'past' && when < Date.now());
 const matchesVisibility = eventVisibility === 'all'
  || (eventVisibility === 'public' && Boolean(event.isPublic))
  || (eventVisibility === 'private' && !event.isPublic);
 const paid = Boolean(event.ticketingEnabled && event.ticketPriceFc != null && event.ticketPriceFc > 0);
 const matchesEntry = !eventEntry
  || (eventEntry === 'paid' && paid)
  || (eventEntry === 'free' && !paid);
 return matchesSearch && matchesWhen && matchesVisibility && matchesEntry;
 });
 const paginatedEventsList = paginateItems(filteredEventsList, eventsListPage, eventsPageSize);
 const paginatedGuestsList = paginateItems(filteredGuests, guestsListPage, guestsPageSize);

 const isAllFilteredSelected = filteredGuests.length > 0 && filteredGuests.every(g => selectedGuestIds.includes(g.id));

 const eventWorkflow = useMemo(
 () =>
 computeEventWorkflowState({
 guests,
 invitations,
 tablePlan: selectedEvent?.tablePlan,
 eventDate: selectedEvent?.date,
 isProtocolOnly,
 guestGuidelines: selectedEvent?.guestGuidelines ?? guestGuidelines,
 feedPostCount: selectedEvent?.feedPostCount ?? 0,
 }),
 [guests, invitations, selectedEvent?.tablePlan, selectedEvent?.date, selectedEvent?.guestGuidelines, selectedEvent?.feedPostCount, guestGuidelines, isProtocolOnly],
 );

 const broadcastConfirmInvite = invitations.find((invite) => invite.id === broadcastConfirmInviteId) || null;
 const broadcastAudience = useMemo(
 () => (broadcastConfirmInvite ? summarizeSendAudience(guests, broadcastConfirmInvite.channel) : null),
 [broadcastConfirmInvite, guests],
 );
 const bulkAudience = useMemo(
 () => summarizeSendAudience(
 guests.filter((guest) => selectedGuestIds.includes(guest.id)),
 bulkSelectedChannel,
 ),
 [guests, selectedGuestIds, bulkSelectedChannel],
 );

 const handleWorkflowNavigate = useCallback((tab: EventWorkflowTab) => {
 if (tab === 'analytics') return;
 setActiveTab(tab);
 if (eventIdFromRoute) {
 router.replace(eventDashboardHref(eventIdFromRoute, { tab, protocol: protocolDesk }), { scroll: false });
 }
 }, [eventIdFromRoute, protocolDesk, router]);

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

 useEffect(() => {
 if (guests.length === 0) return;
 try {
 const raw = localStorage.getItem('em-getting-started');
 const flow = raw ? JSON.parse(raw) : {};
 if (!flow.guestsDone) {
 localStorage.setItem('em-getting-started', JSON.stringify({ ...flow, guestsDone: true }));
 }
 } catch {
 /* ignore */
 }
 }, [guests.length]);

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
 setEvents([]);
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
 if (!showEventModal || !eventMapOpen) {
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
 }, [showEventModal, eventMapOpen]);

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
 setEventIsPublic(false);
 setEventTicketing(false);
 setEventTicketPrice('');
 setEventTicketsTotal('');
 setEventPhotos([]);
 setEventRoomId('');
 setEventFormTemplateId('');
 setOpenTablePlanAfterSave(false);
 setEditingEventId(null);
 setEventMapOpen(false);
 setSearchError('');
 setGuestGuidelines(defaultGuestGuidelines());
 };

 const openCreateEventModal = () => {
 if (eventsAtLimit) {
 setError(getQuotaActionMessage('events', planQuota, tenant?.plan));
 return;
 }
 resetEventForm();
 setShowEventModal(true);
 };

 const defaultRsvpInviteBody = (title: string) =>
 `Bonjour {{firstName}},

Vous êtes invité(e) à ${title}.

Rendez-vous le {{date}} à {{location}}.

Merci de confirmer votre présence :
{{rsvpLink}}`;

 const syncEventRsvpForm = async (eventId: string, templateId: string, title: string) => {
 if (!templateId) return;
 const invites = await api.get(`/events/${eventId}/invitations`);
 const list = Array.isArray(invites) ? invites : [];
 const first = list[0] as InvitationItem | undefined;
 const payload = {
 templateId,
 subject: first?.subject || `Invitation : ${title}`,
 body: first?.body || defaultRsvpInviteBody(title),
 channel: first?.channel || 'EMAIL',
 };
 if (first?.id) {
 await api.put(`/events/${eventId}/invitations/${first.id}`, payload);
 } else {
 await api.post(`/events/${eventId}/invitations`, payload);
 }
 };

 const openEventTablePlan = async (event: EventItem) => {
 setShowEventModal(false);
 router.push(eventDashboardHref(event.id, { tab: 'tablePlan', protocol: protocolDesk }));
 };

 useEffect(() => {
 if (!showEventModal) return;
 let cancelled = false;
 (async () => {
 try {
 const templatesData = await api.get('/templates');
 if (!cancelled) setTemplates(Array.isArray(templatesData) ? templatesData : []);
 } catch {
 /* ignore */
 }
 if (!editingEventId) return;
 try {
 const invitesData = await api.get(`/events/${editingEventId}/invitations`);
 if (cancelled) return;
 const first = Array.isArray(invitesData) ? invitesData[0] : null;
 setEventFormTemplateId(first?.template?.id || '');
 } catch {
 if (!cancelled) setEventFormTemplateId('');
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [showEventModal, editingEventId]);

 const openAddGuestModal = () => {
 if (guestsAtLimit && !editingGuestId) {
 setError(getQuotaActionMessage('guests', planQuota, tenant?.plan));
 return;
 }
 setEditingGuestId(null);
 setGuestFirstName('');
 setGuestLastName('');
 setGuestEmail('');
 setGuestPhoneCountryCode(DEFAULT_PHONE_COUNTRY_CODE);
 setGuestPhoneNational('');
 setGuestPreferences('');
 setGuestAllergies('');
 setGuestSpecialMeal('none');
 setGuestRsvp('PENDING');
 setGuestCategory('Famille');
 setShowGuestModal(true);
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
 isPublic: eventIsPublic,
 ticketingEnabled: eventIsPublic && eventTicketing,
 ticketPriceFc: eventIsPublic && eventTicketing ? Number(eventTicketPrice) || 0 : 0,
 ticketsTotal: eventIsPublic && eventTicketsTotal ? Number(eventTicketsTotal) : null,
 photos: eventPhotos,
 guestGuidelines,
 };

 if (editingEventId) {
 const savedEvent: EventItem = await api.put(`/events/${editingEventId}`, payload);
 if (eventFormTemplateId) {
 await syncEventRsvpForm(savedEvent.id, eventFormTemplateId, eventTitle);
 }
 setSuccess('Événement mis à jour avec succès !');
 if (selectedEvent?.id === editingEventId) {
 setSelectedEvent((prev) => (prev ? { ...prev, ...savedEvent } : prev));
 }
 if (openTablePlanAfterSave) {
 setShowEventModal(false);
 resetEventForm();
 loadEvents();
 await openEventTablePlan(savedEvent);
 return;
 }
 } else {
 const savedEvent: EventItem = await api.post('/events', {
 ...payload,
 importRoomLayout: Boolean(eventRoomId),
 });
 if (eventFormTemplateId) {
 await syncEventRsvpForm(savedEvent.id, eventFormTemplateId, eventTitle);
 }
 const importedPlan = savedEvent.tablePlan?.tables?.length;
 setSuccess(
 importedPlan
 ? 'Événement créé et plan de table importé depuis la salle.'
 : eventFormTemplateId
 ? 'Événement créé avec le formulaire RSVP.'
 : 'Événement créé avec succès !'
 );
 if (openTablePlanAfterSave) {
 setShowEventModal(false);
 resetEventForm();
 loadEvents();
 await openEventTablePlan(savedEvent);
 return;
 }
 resetEventForm();
 setShowEventModal(false);
 loadEvents();
 router.push(eventDashboardHref(savedEvent.id, { protocol: protocolDesk }));
 return;
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
 setEventIsPublic(Boolean(event.isPublic));
 setEventTicketing(Boolean(event.ticketingEnabled));
 setEventTicketPrice(event.ticketPriceFc != null && event.ticketPriceFc > 0 ? String(event.ticketPriceFc) : '');
 setEventTicketsTotal(event.ticketsTotal != null ? String(event.ticketsTotal) : '');
 setEventPhotos(Array.isArray(event.photos) ? event.photos.filter((u): u is string => typeof u === 'string') : []);
 setEventRoomId(event.roomId || event.room?.id || '');
 setGuestGuidelines(normalizeGuestGuidelines(event.guestGuidelines));
 setEditingEventId(event.id);
 setEventMapOpen(
 event.latitude !== undefined && event.latitude !== null &&
 event.longitude !== undefined && event.longitude !== null,
 );
 setSearchError('');
 setShowEventModal(true);
 };

 const handleDeleteEvent = async (id: string) => {
 if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement et l\'ensemble de ses invités ?')) return;
 try {
 await api.delete(`/events/${id}`);
 setEvents(events.filter(e => e.id !== id));
 if (selectedEvent?.id === id) {
 router.push(eventsListHref(protocolDesk));
 }
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
 `Plan enregistré. ${notified} invité${notified > 1 ? 's' : ''} notifié${notified > 1 ? 's' : ''} (table, siège et voisins). Les invités déjà confirmés reçoivent aussi le PDF et le GPS.`,
 );
 } else {
 setSuccess(
 `Plan enregistré. ${notified} invité${notified > 1 ? 's' : ''} notifié${notified > 1 ? 's' : ''} (table, siège et voisins). Le PDF et le GPS à la confirmation RSVP nécessitent Premium ou supérieur.`,
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

 useEffect(() => {
 const tab = searchParams.get('tab');
 if (isEventWorkspaceTab(tab) && !(protocolDesk && tab !== 'protocol')) {
 setActiveTab(tab);
 }
 }, [searchParams, protocolDesk]);

 useEffect(() => {
 if (!eventIdFromRoute) {
 setSelectedEvent(null);
 return;
 }
 if (selectedEvent?.id === eventIdFromRoute) return;

 const found = events.find((item) => item.id === eventIdFromRoute);
 if (found) {
 void handleManageEvent(found);
 return;
 }
 if (loading && events.length === 0) return;

 let cancelled = false;
 (async () => {
 try {
 const ev = (await api.get(`/events/${eventIdFromRoute}`)) as EventItem;
 if (cancelled) return;
 setEvents((prev) => (prev.some((item) => item.id === ev.id) ? prev : [ev, ...prev]));
 await handleManageEvent(ev);
 } catch {
 if (!cancelled) {
 setError('Événement introuvable.');
 router.replace(eventsListHref(protocolDesk));
 }
 }
 })();
 return () => {
 cancelled = true;
 };
 }, [eventIdFromRoute, events, loading]);

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
 const e164 = composeE164(guestPhoneCountryCode, guestPhoneNational) || undefined;
 const resolvedEmail = resolveGuestFormEmail(guestEmail, e164);
 if (!resolvedEmail) {
  setError(guestEmail.trim()
   ? 'Adresse e-mail invalide. Laissez vide si vous n’avez que le WhatsApp.'
   : 'Indiquez un e-mail ou un numéro WhatsApp.');
  setSavingGuest(false);
  return;
 }
 const payload = {
 firstName: guestFirstName,
 lastName: guestLastName,
 email: isRealGuestEmail(guestEmail) ? guestEmail.trim() : '',
 category: guestCategory,
 rsvp: guestRsvp,
 phone: e164,
 phoneCountryCode: guestPhoneCountryCode,
 nationalNumber: guestPhoneNational,
 preferences: {
 notes: guestPrefs.trim() || undefined,
 allergies: guestAllergies.trim() || undefined,
 specialMeal: guestSpecialMeal || 'none',
 phone: e164,
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
 setGuestPhoneCountryCode(DEFAULT_PHONE_COUNTRY_CODE);
 setGuestPhoneNational('');
 setGuestPreferences('');
 setGuestAllergies('');
 setGuestSpecialMeal('none');
 setGuestRsvp('PENDING');
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
 setGuestEmail(isPlaceholderGuestEmail(guest.email) ? '' : guest.email);
 setGuestCategory(guest.category || 'Famille');

 let notes = '';
 let allergies = '';
 let specialMeal = 'none';
 if (guest.preferences && typeof guest.preferences === 'object') {
 const prefs = guest.preferences as { notes?: string; phone?: string; allergies?: string; specialMeal?: string };
 notes = prefs.notes || '';
 allergies = prefs.allergies || '';
 specialMeal = prefs.specialMeal || 'none';
 }
 const parts = parseStoredPhone(
 guest.phone || (guest.preferences as { phone?: string } | undefined)?.phone,
 guest.phoneCountryCode,
 );
 setGuestPhoneCountryCode(parts.countryCode);
 setGuestPhoneNational(parts.national);
 setGuestPreferences(notes);
 setGuestAllergies(allergies);
 setGuestSpecialMeal(specialMeal);
 setGuestRsvp((guest.rsvp as 'PENDING' | 'ACCEPTED' | 'DECLINED') || 'PENDING');
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
 
 const headers = ["Prénom", "Nom", "Email", "Téléphone", "Catégorie", "Statut RSVP", "Régime", "Allergies", "Notes"];
 const rows = guests.map(g => {
 const phone = g.phone || g.preferences?.phone || g.preferences?.telephone || "";
 const notes = g.preferences?.notes || "";
 const allergies = g.preferences?.allergies || "";
 const meal = specialMealLabel(g.preferences?.specialMeal);
 return [
 g.firstName,
 g.lastName,
 displayGuestEmail(g.email),
 phone,
 g.category || "Général",
 g.rsvp === "ACCEPTED" ? "Accepté" : g.rsvp === "DECLINED" ? "Décliné" : "En attente",
 meal,
 allergies,
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
 const phone = cols[4] || '';
 const email = cols[2] || '';
 if (cols[0] && cols[1] && (email.includes('@') || phone.replace(/\D/g, '').length >= 7)) {
 guestsToImport.push({
 firstName: cols[0],
 lastName: cols[1],
 email: email.includes('@') ? email : '',
 category: cols[3] || 'Général',
 phone,
 specialMeal: cols[5] || 'none',
 allergies: cols[6] || '',
 notes: cols[7] || '',
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
 const allergiesIdx = headers.findIndex(h => h.includes('allerg'));
 const mealIdx = headers.findIndex(h => h.includes('régime') || h.includes('regime') || h.includes('repas') || h.includes('meal') || h.includes('diet'));

 // Fallback to default indices if not found
 const finalFirstNameIdx = firstNameIdx !== -1 ? firstNameIdx : 0;
 const finalLastNameIdx = lastNameIdx !== -1 ? lastNameIdx : 1;
 const finalEmailIdx = emailIdx !== -1 ? emailIdx : 2;
 const finalCategoryIdx = categoryIdx !== -1 ? categoryIdx : 3;
 const finalPhoneIdx = phoneIdx !== -1 ? phoneIdx : 4;
 const finalMealIdx = mealIdx !== -1 ? mealIdx : 5;
 const finalAllergiesIdx = allergiesIdx !== -1 ? allergiesIdx : 6;
 const finalNotesIdx = notesIdx !== -1 ? notesIdx : 7;

 const normalizeMeal = (raw: string) => {
 const v = raw.toLowerCase().trim();
 if (!v || v === 'standard' || v === 'aucun' || v === 'none') return 'none';
 if (v.includes('vegan') || v.includes('végétal')) return 'vegan';
 if (v.includes('végét') || v.includes('veget')) return 'vegetarian';
 if (v.includes('halal')) return 'halal';
 if (v.includes('casher') || v.includes('kosher')) return 'kosher';
 if (['none', 'vegetarian', 'vegan', 'halal', 'kosher'].includes(v)) return v;
 return 'none';
 };

 const guestsList: any[] = [];
 for (let i = 1; i < jsonData.length; i++) {
 const row = jsonData[i];
 if (!row || row.length === 0) continue;

 const email = row[finalEmailIdx]?.toString().trim() || '';
 const firstName = row[finalFirstNameIdx]?.toString().trim() || '';
 const lastName = row[finalLastNameIdx]?.toString().trim() || '';
 const phone = row[finalPhoneIdx]?.toString().trim() || '';

 if (!firstName || !lastName) continue;
 if (!email.includes('@') && phone.replace(/\D/g, '').length < 7) continue;

 guestsList.push({
 firstName,
 lastName,
 email: email.includes('@') ? email : '',
 category: row[finalCategoryIdx]?.toString().trim() || 'Général',
 phone,
 specialMeal: normalizeMeal(row[finalMealIdx]?.toString() || ''),
 allergies: row[finalAllergiesIdx]?.toString().trim() || '',
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
 const headers = ['Prénom', 'Nom', 'Email', 'Catégorie', 'Téléphone', 'Régime', 'Allergies', 'Notes'];
 const sampleRows = [
 ['Jean', 'Kabeya', 'jean.kabeya@gmail.com', 'VIP', '+243812345678', 'halal', '', 'Besoin de transport'],
 ['Sarah', 'Mwamba', 'sarah.m@outlook.com', 'Ami', '+243998765432', 'none', 'Arachides', ''],
 ['Christian', 'Tshilombo', 'c.tshilombo@gmail.com', 'Famille', '', 'vegetarian', 'Gluten', 'Vient avec un accompagnateur'],
 ];

 if (type === 'excel') {
 const wb = XLSX.utils.book_new();
 const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
 XLSX.utils.book_append_sheet(wb, ws, 'Modèle Invités');
 XLSX.writeFile(wb, 'modele_invites_eventmaster.xlsx');
 } else {
 const csvContent = [headers.join(','), ...sampleRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
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
 setLastBroadcastInviteId(inviteId);
 setShowBroadcastModal(true);
 await refreshGuests();
 } catch (err: any) {
 setError(err.message || 'Erreur lors de la diffusion.');
 } finally {
 setBroadcastingInviteId(null);
 }
 };

 const handleRetryFailedBroadcast = async () => {
 if (!selectedEvent || !lastBroadcastInviteId || !broadcastResults) return;
 const failedIds = broadcastResults
 .filter((r) => r.status === 'FAILED')
 .map((r) => r.guestId)
 .filter(Boolean);
 if (failedIds.length === 0) return;

 setError('');
 setBroadcastingInviteId(lastBroadcastInviteId);
 try {
 const response = await api.post(
 `/events/${selectedEvent.id}/invitations/${lastBroadcastInviteId}/broadcast`,
 { guestIds: failedIds },
 );
 setBroadcastResults(response.results || []);
 setBroadcastMessage(response.message || '');
 setBroadcastSummary(response.summary || null);
 await refreshGuests();
 } catch (err: any) {
 setError(err.message || 'Erreur lors de la relance des échecs.');
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
 setLastBroadcastInviteId(bulkSelectedInviteId);
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
 const rsvpLink = guestRsvpUrl(guest.id);
 
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
 const cleanPhone = phone.replace(/\D/g, '');
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

 const getGuestRsvpLink = (guestId: string) => guestRsvpUrl(guestId);

 const publicRsvpLink = (link?: string | null, guestId?: string) => {
   if (link) return canonicalShareUrl(link);
   if (guestId) return guestRsvpUrl(guestId);
   return canonicalShareUrl();
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
 <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white border border-border rounded-3xl p-8 text-center max-w-2xl mx-auto">
 <div className="bg-primary/10 text-primary p-4 rounded-full mb-6">
 <Calendar className="w-12 h-12" />
 </div>
 <h1 className="text-2xl font-black text-foreground">Gestion des Événements (Super Admin)</h1>
 <p className="text-muted mt-3 leading-relaxed">
 En tant que Super Administrateur de la plateforme SaaS, vous n'êtes pas rattaché à une organisation spécifique et ne gérez pas d'événements en nom propre.
 </p>
 <p className="text-muted mt-2 leading-relaxed">
 Veuillez utiliser le <strong className="text-primary">Tableau de bord Admin</strong> pour superviser l'ensemble des organisations, leurs membres et leurs statistiques d'utilisation.
 </p>
 <Link 
 href="/dashboard" 
 className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition shadow-lg shadow-primary/10"
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
 <div className="space-y-6">
 {/* Header */}
 {!selectedEvent ? (
 <>
 <PageHeader
 title={protocolDesk ? 'Accueil jour J' : 'Vos événements'}
 description={
 protocolDesk
 ? 'Choisissez l’événement, puis scannez les badges pour confirmer les présences.'
 : "Créez des réceptions privées (liste d’invités) ou publiques (inscription / billets en ligne)."
 }
 breadcrumbs={
 <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard' }, { label: protocolDesk ? 'Protocole' : 'Événements' }]} />
 }
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
 {access?.canCreateEvents && !protocolDesk ? (
 <div className="flex flex-col items-end gap-1">
 <Button
 onClick={openCreateEventModal}
 disabled={eventsAtLimit}
 title={eventsQuotaMsg || undefined}
 leftIcon={<PlusCircle className="w-4 h-4" />}
 >
 Créer un événement
 </Button>
 {eventsAtLimit && (
 <Link href="/dashboard/billing" className="text-[11px] font-semibold text-amber-700 hover:underline">
 Quota atteint — voir les forfaits
 </Link>
 )}
 </div>
 ) : null}
 </div>
 }
 />
 {eventsAtLimit && (
 <PlanLimitCallout kind="events" planQuota={planQuota} planName={tenant?.plan} />
 )}
 {events.length === 0 && !protocolDesk && (
 <GettingStartedChecklist hasEvents={false} />
 )}
 {events.length > 0 && (
 <CatalogueFilterBar
 search={eventSearch}
 onSearchChange={(value) => { setEventSearch(value); setEventsListPage(1); }}
 searchPlaceholder="Rechercher un événement, un lieu, une salle…"
 view={eventsViewMode}
 onViewChange={(mode) => {
 if (mode === 'grid' || mode === 'list') setEventsViewMode(mode);
 }}
 hideViewToggle
 chips={[
 ...(eventWhen !== 'ALL' ? [{ id: 'when', label: 'Dates', value: eventWhen === 'upcoming' ? 'À venir' : 'Passés' }] : []),
 ...(eventVisibility !== 'all' ? [{ id: 'visibility', label: 'Visibilité', value: eventVisibility === 'public' ? 'Publics' : 'Privés' }] : []),
 ...(eventEntry ? [{ id: 'entry', label: 'Entrée', value: eventEntry === 'paid' ? 'Payant' : 'Libre' }] : []),
 ] as CatalogueFilterChip[]}
 onRemoveChip={(id) => {
 if (id === 'when') setEventWhen('ALL');
 if (id === 'visibility') setEventVisibility('all');
 if (id === 'entry') setEventEntry('');
 setEventsListPage(1);
 }}
 onClearChips={() => {
 setEventSearch('');
 setEventWhen('ALL');
 setEventVisibility('all');
 setEventEntry('');
 setEventsListPage(1);
 }}
 resultLabel={`${filteredEventsList.length} événement${filteredEventsList.length > 1 ? 's' : ''}`}
 modalTitle="Filtrer les événements"
 filters={
 <>
 <CatalogueFilterField label="Dates">
 <CatalogueChoicePills
 options={[
 { id: 'upcoming', label: 'À venir' },
 { id: 'past', label: 'Passés' },
 ]}
 value={eventWhen === 'ALL' ? '' : eventWhen}
 onChange={(id) => { setEventWhen(id === 'upcoming' || id === 'past' ? id : 'ALL'); setEventsListPage(1); }}
 />
 </CatalogueFilterField>
 <CatalogueFilterField label="Visibilité">
 <CatalogueChoicePills
 options={[
 { id: 'all', label: 'Tous' },
 { id: 'public', label: 'Publics' },
 { id: 'private', label: 'Privés' },
 ]}
 value={eventVisibility}
 onChange={(id) => { setEventVisibility((id as 'all' | 'public' | 'private') || 'all'); setEventsListPage(1); }}
 />
 </CatalogueFilterField>
 <CatalogueFilterField label="Entrée" hint="Événements avec billetterie payante, ou entrée libre / inscription.">
 <CatalogueChoicePills
 options={EVENT_ENTRY_OPTIONS}
 value={eventEntry}
 onChange={(id) => { setEventEntry(id === 'paid' || id === 'free' ? id : ''); setEventsListPage(1); }}
 />
 </CatalogueFilterField>
 </>
 }
 />
 )}
 </>
 ) : (
 <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
 <div className="space-y-2 min-w-0">
 <Breadcrumbs
 items={[
 { label: 'Accueil', href: '/dashboard' },
 { label: 'Événements', href: eventsListHref(protocolDesk) },
 { label: selectedEvent.title },
 ]}
 />
 <button
 type="button"
 onClick={() => router.push(eventsListHref(protocolDesk))}
 className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground transition"
 >
 <ArrowLeft className="w-3.5 h-3.5" />
 Tous les événements
 </button>
 <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight truncate">
 {selectedEvent.title}
 </h1>
 <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
 <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-border">
 <Calendar className="w-3.5 h-3.5" />
 {new Date(selectedEvent.date).toLocaleDateString('fr-FR', {
 weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
 })}
 </span>
 <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-border max-w-xs truncate">
 <MapPin className="w-3.5 h-3.5 shrink-0" />
 {selectedEvent.location}
 </span>
 {selectedEvent.room && (
 <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-muted border border-border">
 <Building2 className="w-3.5 h-3.5" />
 {selectedEvent.room.name}
 </span>
 )}
 <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-muted">
 {getReminderFrequencyLabel(selectedEvent.reminderFrequency)}
 </span>
 {selectedEvent.isPublic ? (
 <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
 <Globe className="w-3.5 h-3.5" />
 Public
 {selectedEvent.ticketingEnabled && selectedEvent.ticketPriceFc
  ? ` · ${selectedEvent.ticketsSold ?? 0} billet${(selectedEvent.ticketsSold ?? 0) > 1 ? 's' : ''}`
  : ''}
 </span>
 ) : (
 <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-muted">
 <GlobeLock className="w-3.5 h-3.5" />
 Privé
 </span>
 )}
 {selectedEvent.isPublic && selectedEvent.slug && (
 <a
 href={`/marketplace/evenements/${selectedEvent.slug}`}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-primary font-semibold hover:bg-surface-muted"
 >
 Page publique
 </a>
 )}
 </div>
 </div>
 <div className="flex flex-wrap gap-2 shrink-0">
 <Button
 type="button"
 size="sm"
 variant="secondary"
 onClick={() => handleManageEvent(selectedEvent)}
 disabled={loading}
 leftIcon={<RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />}
 >
 Actualiser
 </Button>
 {!protocolDesk && (
 <Button
 type="button"
 size="sm"
 onClick={() => handleEditEventClick(selectedEvent)}
 leftIcon={<Edit3 className="w-4 h-4" />}
 >
 Configurer
 </Button>
 )}
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
 : listStackClass
 }
 >
 {events.length === 0 ? (
 <div className="col-span-full text-center py-14 px-6 bg-surface border border-border rounded-[var(--radius-card)]">
 {protocolDesk ? (
 <>
 <ScanLine className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
 <h3 className="text-lg font-semibold text-foreground">Aucun événement à accueillir</h3>
 <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
 L’organisateur doit d’abord créer un événement et vous y affecter. Revenez ensuite pour scanner les badges.
 </p>
 </>
 ) : (
 <>
 <Calendar className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
 <h3 className="text-lg font-semibold text-foreground">Créer votre premier événement</h3>
 <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
 Ensuite : ajoutez des invités, choisissez un modèle d&apos;invitation, puis envoyez les RSVP.
 </p>
 <ol className="mt-5 inline-flex flex-col sm:flex-row gap-2 sm:gap-3 text-left text-xs text-muted">
 <li className="px-3 py-2 rounded-lg bg-surface-muted border border-border">1. Événement</li>
 <li className="px-3 py-2 rounded-lg bg-surface-muted border border-border">2. Invités</li>
 <li className="px-3 py-2 rounded-lg bg-surface-muted border border-border">3. Invitation</li>
 </ol>
 {access?.canCreateEvents && (
 <div className="mt-6 flex flex-col items-center gap-2">
 <Button
 onClick={openCreateEventModal}
 disabled={eventsAtLimit}
 title={eventsQuotaMsg || undefined}
 leftIcon={<PlusCircle className="w-4 h-4" />}
 >
 Créer mon premier événement
 </Button>
 {eventsAtLimit && (
 <Link href="/dashboard/billing" className="text-xs font-semibold text-amber-700 hover:underline">
 Quota atteint — voir les forfaits
 </Link>
 )}
 </div>
 )}
 </>
 )}
 </div>
 ) : filteredEventsList.length === 0 ? (
 <div className="col-span-full text-center py-14 px-6 bg-surface border border-border rounded-[var(--radius-card)]">
 <Search className="w-10 h-10 text-muted mx-auto mb-3 opacity-60" />
 <h3 className="font-semibold text-foreground">Aucun événement ne correspond</h3>
 <p className="text-sm text-muted mt-1">Modifiez la recherche ou le filtre de dates.</p>
 </div>
 ) : (
 paginatedEventsList.map((event) => {
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
 <span className="flex items-center gap-1 truncate text-primary dark:text-primary">
 <Building2 className="w-3 h-3 shrink-0" />
 {event.room.name}
 </span>
 )}
 </div>
 );
 const actions = (
 <>
 {eventsViewMode === 'list' && (
 <button
 type="button"
 onClick={() => router.push(eventDashboardHref(event.id, { protocol: protocolDesk }))}
 className="inline-flex items-center"
 title={protocolDesk ? 'Ouvrir le protocole' : 'Voir détails'}
 >
 <ListRowAction />
 </button>
 )}
 {!protocolDesk && canManageEvents && (
 <button
 type="button"
 onClick={() => handleDeleteEvent(event.id)}
 className="p-2 text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
 title="Supprimer l'événement"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </>
 );

 return (
 <ProjectCard
 key={event.id}
 id={event.id}
 title={event.title}
 layout={eventsViewMode}
 icon={<Calendar className="w-4 h-4" />}
 coverUrl={coverFromPhotos(event.photos)}
 overlayMeta={dateLabel}
 badge={
 event.isPublic ? (
 <StatusPill tone="emerald">Public</StatusPill>
 ) : (
 <StatusPill tone="slate">Privé</StatusPill>
 )
 }
 ctaLabel={protocolDesk ? 'Accueillir' : 'Gérer'}
 meta={
 eventsViewMode === 'list'
 ? event.location
 : meta
 }
 value={eventsViewMode === 'list' ? dateLabel : undefined}
 valueMeta={
 eventsViewMode === 'list' && event.room
 ? event.room.name
 : undefined
 }
 description={
 eventsViewMode === 'grid' && event.description
 ? event.description
 : undefined
 }
 onClick={() => router.push(eventDashboardHref(event.id, { protocol: protocolDesk }))}
 actions={actions}
 />
 );
 })
 )}
 </div>
 )}

 {!selectedEvent && (
 <Pagination
 page={eventsListPage}
 pageSize={eventsPageSize}
 total={filteredEventsList.length}
 onPageChange={setEventsListPage}
 onPageSizeChange={setEventsPageSize}
 itemLabel="événements"
 />
 )}

 {/* Event Management View (Tabs) */}
 {selectedEvent && (
 <div className="space-y-5">
 <EventWorkflowPanel
 workflow={eventWorkflow}
 activeTab={activeTab}
 onNavigateTab={handleWorkflowNavigate}
 onAction={handleWorkflowAction}
 compact={isProtocolOnly}
 />

 {/* Tabs */}
 <div className="inline-flex flex-wrap gap-0.5 p-0.5 bg-surface-muted border border-border rounded-[var(--radius-button)] max-w-full overflow-x-auto">
 {([
 !isProtocolOnly && { id: 'guestInfo' as const, label: 'Infos invités', icon: Shirt },
 !isProtocolOnly && { id: 'guests' as const, label: `Invités (${guests.length})`, icon: Users },
 !isProtocolOnly && { id: 'invitations' as const, label: `Invitations (${invitations.length})`, icon: Mail },
 !isProtocolOnly && { id: 'tablePlan' as const, label: 'Plan de table', icon: LayoutGrid },
 !isProtocolOnly && { id: 'feed' as const, label: 'Feed', icon: MessageSquare },
 { id: 'protocol' as const, label: 'Protocole', icon: ScanLine },
 !isProtocolOnly && { id: 'staff' as const, label: 'Équipe', icon: Users },
 ].filter(Boolean) as Array<{ id: typeof activeTab; label: string; icon: React.ComponentType<{ className?: string }> }>).map(({ id, label, icon: Icon }) => {
 const locked = id === 'protocol' && protocolLocked;
 return (
 <button
 key={id}
 type="button"
 onClick={() => {
 setActiveTab(id);
 if (eventIdFromRoute) {
 router.replace(eventDashboardHref(eventIdFromRoute, { tab: id, protocol: protocolDesk }), { scroll: false });
 }
 }}
 title={locked ? protocolLockMsg : undefined}
 className={cn(
 'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
 activeTab === id
 ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
 : 'text-muted hover:text-foreground',
 locked && 'opacity-70',
 )}
 >
 <Icon className="w-3.5 h-3.5" />
 {label}
 {locked ? (
 <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
 Forfait
 </span>
 ) : null}
 </button>
 );
 })}
 </div>

 {activeTab === 'protocol' && selectedEvent && (
 <>
 {protocolLocked ? (
 <PlanLimitCallout feature="protocolQr" planName={tenant?.plan} />
 ) : (
 <GuestProtocolPanel eventId={selectedEvent.id} />
 )}
 </>
 )}

 {/* Tab Content: Guests */}
 {activeTab === 'guests' && !isProtocolOnly && (
 <div className="space-y-5">
 <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
 <div className="space-y-1">
 <h2 className="text-lg font-semibold text-foreground tracking-tight">Invités</h2>
 <p className="text-muted text-sm">Ajoutez, importez ou filtrez votre liste d&apos;invités.</p>
 </div>
 <div className="flex flex-wrap gap-2">
 {selectedGuestIds.length > 0 && (
 <button 
 onClick={() => {
 if (invitations.length === 0) {
 alert("Configurez d'abord une invitation dans l'onglet Invitations.");
 return;
 }
 setBulkSelectedInviteId(invitations[0]?.id || '');
 setBulkSelectedChannel(invitations[0]?.channel || 'EMAIL');
 setShowBulkInviteModal(true);
 }}
 className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-[var(--radius-button)] text-sm transition"
 >
 <Send className="w-4 h-4" />
 Inviter ({selectedGuestIds.length})
 </button>
 )}
 <button 
 onClick={() => {
 if (guestsAtLimit) {
 setError(getQuotaActionMessage('guests', planQuota, tenant?.plan));
 return;
 }
 setShowImportModal(true);
 }}
 disabled={guestsAtLimit}
 title={guestsQuotaMsg || undefined}
 className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-border text-muted hover:bg-surface-muted font-semibold rounded-[var(--radius-button)] text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <FileSpreadsheet className="w-4 h-4" />
 Importer
 </button>
 {guests.length > 0 && (
 <button 
 onClick={handleExportGuests}
 className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-border text-muted hover:bg-surface-muted font-semibold rounded-[var(--radius-button)] text-sm transition"
 title="Exporter tous les invités en fichier CSV"
 >
 <Download className="w-4 h-4" />
 Exporter
 </button>
 )}
 <button 
 onClick={openAddGuestModal}
 disabled={guestsAtLimit}
 title={guestsQuotaMsg || undefined}
 className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-[var(--radius-button)] text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <PlusCircle className="w-4 h-4" />
 Ajouter
 </button>
 </div>
 </div>
 {guestsAtLimit && (
 <PlanLimitCallout kind="guests" planQuota={planQuota} planName={tenant?.plan} />
 )}

 {/* Search & Filtering Controls */}
 {guests.length > 0 && (
 <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5 sm:p-4 space-y-3">
 <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
 <div className="relative w-full lg:flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Rechercher un invité par nom ou email..."
 className="w-full pl-9 pr-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs focus:outline-none focus:border-primary transition"
 />
 </div>

 <div className="w-full lg:w-44">
 <select
 value={rsvpFilter}
 onChange={(e) => setRsvpFilter(e.target.value as any)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs focus:outline-none focus:border-primary transition font-semibold text-foreground"
 >
 <option value="ALL">Tous les statuts RSVP</option>
 <option value="ACCEPTED">Présent uniquement</option>
 <option value="DECLINED">Absent uniquement</option>
 <option value="PENDING">Sans réponse uniquement</option>
 </select>
 </div>

 <div className="w-full lg:w-44">
 <select
 value={checkinFilter}
 onChange={(e) => setCheckinFilter(e.target.value as 'ALL' | 'in' | 'out')}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs focus:outline-none focus:border-primary transition font-semibold text-foreground"
 >
 <option value="ALL">Présence jour J</option>
 <option value="in">Enregistrés</option>
 <option value="out">Non enregistrés</option>
 </select>
 </div>

 <div className="w-full lg:w-44">
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs focus:outline-none focus:border-primary transition font-semibold text-foreground"
 >
 <option value="ALL">Toutes les catégories</option>
 {uniqueCategories.map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </select>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <button
 type="button"
 onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
 className={cn(
 'px-3 py-2 rounded-[var(--radius-button)] text-xs font-semibold transition inline-flex items-center gap-1.5 border',
 showAdvancedFilters
 ? 'bg-primary/10 border-primary/30 text-primary'
 : 'bg-surface-muted border-border text-muted hover:bg-surface-muted/80',
 )}
 >
 <Filter className="w-3.5 h-3.5" />
 Filtres avancés
 </button>

 {(searchQuery || rsvpFilter !== 'ALL' || categoryFilter !== 'ALL' || dietFilter !== 'ALL' || checkinFilter !== 'ALL' || Object.values(customFilters).some(v => v !== 'ALL' && v !== '')) && (
 <button
 type="button"
 onClick={() => {
 setSearchQuery('');
 setRsvpFilter('ALL');
 setCategoryFilter('ALL');
 setDietFilter('ALL');
 setCheckinFilter('ALL');
 setCustomFilters({});
 }}
 className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary transition bg-primary/10 hover:bg-primary/15 px-3 py-2 rounded-[var(--radius-button)]"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 Réinitialiser
 </button>
 )}

 <ViewModeToggle
 storageKey="em-view-guests"
 value={guestsViewMode}
 onChange={setGuestsViewMode}
 columns={guestsColumns}
 onColumnsChange={setGuestsColumns}
 defaultMode="list"
 defaultColumns={3}
 />
 </div>
 </div>

 {showAdvancedFilters && (
 <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
 <div className="space-y-1">
 <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">Régime alimentaire</label>
 <select
 value={dietFilter}
 onChange={(e) => setDietFilter(e.target.value)}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs focus:outline-none focus:border-primary transition font-semibold text-foreground"
 >
 <option value="ALL">Tous les régimes</option>
 <option value="none">Standard</option>
 <option value="vegetarian">Végétarien</option>
 <option value="vegan">Végétalien (Vegan)</option>
 <option value="halal">Halal</option>
 <option value="kosher">Casher</option>
 </select>
 </div>

 {getCustomRsvpFields().map(field => {
 const currentValue = customFilters[field.label] || 'ALL';
 return (
 <div key={field.id} className="space-y-1">
 <label className="text-[10px] font-semibold text-muted uppercase tracking-wider truncate block max-w-full" title={field.label}>
 {field.label}
 </label>
 {isBooleanFieldType(field.type) ? (
 <select
 value={currentValue}
 onChange={(e) => setCustomFilters({ ...customFilters, [field.label]: e.target.value })}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs focus:outline-none focus:border-primary transition font-semibold text-foreground"
 >
 <option value="ALL">Tous</option>
 <option value="Oui">Coché (Oui)</option>
 <option value="Non">Non coché (Non)</option>
 </select>
 ) : (field.type === 'select' || field.type === 'radio') && field.options ? (
 <select
 value={currentValue}
 onChange={(e) => setCustomFilters({ ...customFilters, [field.label]: e.target.value })}
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs focus:outline-none focus:border-primary transition font-semibold text-foreground"
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
 className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs focus:outline-none focus:border-primary transition font-semibold text-foreground"
 />
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {/* Guests cards */}
 {guests.length === 0 ? (
 <div className="rounded-[var(--radius-card)] border border-border bg-surface text-center py-14 px-6">
 <Users className="w-12 h-12 text-muted mx-auto mb-4 opacity-60" />
 <h3 className="font-semibold text-foreground">Étape suivante : ajouter des invités</h3>
 <p className="text-sm text-muted mt-1 max-w-sm mx-auto leading-relaxed">
 Importez un fichier CSV ou ajoutez-les un par un. Vous pourrez ensuite envoyer les invitations.
 </p>
 <div className="mt-5 flex flex-wrap justify-center gap-2">
 <Button
 onClick={openAddGuestModal}
 disabled={guestsAtLimit}
 title={guestsQuotaMsg || undefined}
 leftIcon={<PlusCircle className="w-4 h-4" />}
 >
 Ajouter un invité
 </Button>
 <Button
 variant="secondary"
 onClick={() => {
 if (guestsAtLimit) {
 setError(getQuotaActionMessage('guests', planQuota, tenant?.plan));
 return;
 }
 setShowImportModal(true);
 }}
 disabled={guestsAtLimit}
 title={guestsQuotaMsg || undefined}
 >
 Importer CSV
 </Button>
 </div>
 {guestsAtLimit && (
 <PlanLimitCallout kind="guests" planQuota={planQuota} planName={tenant?.plan} className="mt-3" />
 )}
 </div>
 ) : filteredGuests.length === 0 ? (
 <div className="rounded-[var(--radius-card)] border border-border bg-surface text-center py-16 px-6">
 <Search className="w-12 h-12 text-muted mx-auto mb-4" />
 <h3 className="font-semibold text-foreground">Aucun résultat</h3>
 <p className="text-sm text-muted mt-1 max-w-xs mx-auto">Aucun invité ne correspond à vos critères de recherche ou de filtrage.</p>
 <button
 type="button"
 onClick={() => {
 setSearchQuery('');
 setRsvpFilter('ALL');
 setCategoryFilter('ALL');
 }}
 className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary transition bg-primary/10 hover:bg-primary/15 px-3 py-2 rounded-[var(--radius-button)]"
 >
 Effacer les filtres
 </button>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="flex items-center justify-between gap-3 px-0.5">
 <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted cursor-pointer select-none">
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
 className="rounded border-border text-primary focus:ring-primary h-4 w-4"
 />
 Tout sélectionner
 {selectedGuestIds.length > 0 && (
 <span className="text-primary font-medium">({selectedGuestIds.length})</span>
 )}
 </label>
 </div>

 <div className={guestsViewMode === 'grid' ? guestsGridClass : listStackClass}>
 {paginatedGuestsList.map((g) => {
 const isSelected = selectedGuestIds.includes(g.id);
 const rsvpTone = (g.rsvp === 'ACCEPTED' ? 'emerald' : g.rsvp === 'DECLINED' ? 'rose' : 'amber') as 'emerald' | 'rose' | 'amber';
 const rsvpLabel = g.rsvp === 'ACCEPTED' ? 'Présent' : g.rsvp === 'DECLINED' ? 'Absent' : 'En attente';
 const rsvpChip = <StatusPill tone={rsvpTone}>{rsvpLabel}</StatusPill>;
 const categoryChip = <StatusPill tone="slate">{g.category || 'Général'}</StatusPill>;

 const inviteStatusNote =
 g.preferences?.invitationLastStatus === 'FAILED' ? (
 <span className="text-[11px] text-rose-600" title={g.preferences?.invitationLastError || 'Échec d’envoi'}>
 Envoi échoué
 </span>
 ) : g.preferences?.invitationLastStatus === 'SENT' && g.preferences?.invitationSentAt ? (
 <span className="text-[11px] text-emerald-600">Invitation envoyée</span>
 ) : null;

 const prefsLine = g.preferences ? (
 [
 g.preferences.diet && `Régime: ${g.preferences.diet}`,
 g.preferences.allergies && `Allergies: ${g.preferences.allergies}`,
 g.preferences.plusOne !== undefined && `Accompagné: ${g.preferences.plusOne ? 'Oui' : 'Non'}`,
 g.preferences.notes && `Notes: ${g.preferences.notes}`,
 ].filter(Boolean).join(' · ') || null
 ) : null;

 const toggleSelect = (checked: boolean) => {
 if (checked) {
 setSelectedGuestIds([...selectedGuestIds, g.id]);
 } else {
 setSelectedGuestIds(selectedGuestIds.filter(id => id !== g.id));
 }
 };

 const actions = (
 <>
 {guestsViewMode === 'list' ? (
 <button
 type="button"
 onClick={() => setSelectedGuestDetails(g)}
 className="inline-flex items-center"
 title="Voir les détails et choix de l'invité"
 >
 <ListRowAction />
 </button>
 ) : (
 <button
 type="button"
 onClick={() => setSelectedGuestDetails(g)}
 className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition"
 title="Voir les détails et choix de l'invité"
 >
 <Eye className="w-4 h-4" />
 </button>
 )}
 <button
 type="button"
 onClick={() => handleEditGuestClick(g)}
 className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition"
 title="Modifier l'invité"
 >
 <Edit3 className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={() => setSharingGuest(g)}
 className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition"
 title="Partager l'invitation (WhatsApp, X, Instagram)"
 >
 <Share2 className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={() => handleDeleteGuest(g.id)}
 className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
 title="Supprimer l'invité"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </>
 );

 return (
 <div
 key={g.id}
 className={cn(
 'relative',
 isSelected && 'ring-2 ring-primary/25 rounded-[var(--radius-card)]',
 )}
 >
 <label
 className={cn(
 'absolute z-10 flex items-center justify-center',
 guestsViewMode === 'grid'
 ? 'top-2.5 right-2.5 h-7 w-7 rounded-lg bg-white/95 border border-white/80 shadow-sm'
 : 'left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-surface/95 border border-border shadow-sm',
 )}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 >
 <input
 type="checkbox"
 checked={isSelected}
 onChange={(e) => toggleSelect(e.target.checked)}
 className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
 aria-label={`Sélectionner ${g.firstName} ${g.lastName}`}
 />
 </label>
 <ProjectCard
 id={g.id}
 title={`${g.firstName} ${g.lastName}`}
 layout={guestsViewMode}
 icon={<Users className="w-4 h-4" />}
 badge={rsvpChip}
 ctaLabel="Fiche invité"
 onClick={() => setSelectedGuestDetails(g)}
 meta={
 guestsViewMode === 'list' ? (
 <span className="truncate">{displayGuestEmail(g.email) || g.phone || 'WhatsApp / e-mail manquant'}</span>
 ) : (
 <div className="space-y-1.5">
 <p className="truncate text-xs">{displayGuestEmail(g.email) || g.phone || 'Sans e-mail'}</p>
 <div className="flex flex-wrap gap-1.5">
 {rsvpChip}
 {categoryChip}
 </div>
 </div>
 )
 }
 status={guestsViewMode === 'list' ? rsvpChip : undefined}
 aside={guestsViewMode === 'list' ? categoryChip : undefined}
 description={
 <div className="space-y-0.5">
 {inviteStatusNote}
 {prefsLine ? (
 <span className="line-clamp-2">{prefsLine}</span>
 ) : guestsViewMode === 'grid' ? (
 <span className="italic text-muted">Aucune préférence</span>
 ) : null}
 </div>
 }
 actions={actions}
 />
 </div>
 );
 })}
 </div>

 <Pagination
 page={guestsListPage}
 pageSize={guestsPageSize}
 total={filteredGuests.length}
 onPageChange={setGuestsListPage}
 onPageSizeChange={setGuestsPageSize}
 itemLabel="invités"
 />
 </div>
 )}
 </div>
 )}


 {/* Tab Content: Invitations */}
 {activeTab === 'invitations' && (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-xl font-bold text-foreground">Invitations</h2>
 <p className="text-muted text-sm mt-0.5">Rédigez le message, choisissez e-mail ou WhatsApp, puis envoyez le lien RSVP. Le PDF de table part après confirmation.</p>
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
 className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-primary/10"
 >
 <PlusCircle className="w-4 h-4" />
 Configurer une invitation
 </button>
 </div>

 {/* Invitations List */}
 <div className="grid md:grid-cols-2 gap-6">
 {invitations.length === 0 ? (
 <div className="col-span-full text-center py-16 bg-white border border-border rounded-3xl">
 <Mail className="w-12 h-12 text-muted mx-auto mb-4" />
 <h3 className="font-bold text-foreground">Aucune invitation configurée</h3>
 <p className="text-sm text-muted mt-1 max-w-xs mx-auto">Créez une invitation pour pouvoir envoyer des liens RSVP personnalisés à vos invités.</p>
 </div>
 ) : (
 invitations.map((invite) => (
 <div key={invite.id} className="bg-white border border-border rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
 invite.channel === 'EMAIL' ? 'bg-primary/10 border-primary/20 text-primary' :
 invite.channel === 'WHATSAPP' || invite.channel === 'SMS' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
 invite.channel === 'EMAIL_AND_WHATSAPP' || invite.channel === 'EMAIL_AND_SMS' || invite.channel === 'ALL_CHANNELS' ? 'bg-primary/10 border-primary/20 text-primary' :
 'bg-surface-muted border-border-subtle text-foreground'
 }`}>
 Canal: {getChannelLabel(invite.channel)}
 </span>
 <span className="text-xs text-muted font-semibold">
 Modèle: {invite.template?.name || 'Aucun'}
 </span>
 </div>
 <h3 className="font-bold text-foreground text-base line-clamp-1">{invite.subject}</h3>
 <p className="text-sm text-muted line-clamp-3 leading-relaxed whitespace-pre-line">{invite.body}</p>
 </div>
 <div className="flex gap-2 pt-4 border-t border-border-subtle">
 <button 
 onClick={() => setBroadcastConfirmInviteId(invite.id)}
 disabled={broadcastingInviteId !== null}
 className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs transition shadow-md shadow-primary/10 disabled:bg-primary/50 disabled:cursor-not-allowed"
 >
 {broadcastingInviteId === invite.id ? (
 <>
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 Envoi en cours...
 </>
 ) : (
 <>
 <Send className="w-3.5 h-3.5" />
 Envoyer les invitations
 </>
 )}
 </button>
 <button 
 onClick={() => handleEditInvitationClick(invite)}
 disabled={broadcastingInviteId !== null}
 className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition disabled:opacity-50"
 title="Modifier l'invitation"
 >
 <Edit3 className="w-4 h-4" />
 </button>
 <button 
 onClick={() => handleDeleteInvitation(invite.id)}
 disabled={broadcastingInviteId !== null}
 className="p-2 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition disabled:opacity-50"
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
 <div className="space-y-4 animate-fade-in">
 <div className="space-y-1">
 <h2 className="text-lg font-semibold text-foreground tracking-tight">Infos invités</h2>
 <p className="text-sm text-muted">Dress code, avantages (parking, cadeaux, extras) et notes visibles sur le portail RSVP et dans l’invitation.</p>
 </div>
 <EventGuestGuidelinesEditor
 value={guestGuidelines}
 onChange={setGuestGuidelines}
 onSave={handleSaveGuestGuidelines}
 saving={savingGuidelines}
 />
 </div>
 )}

 {activeTab === 'tablePlan' && (
 <div className="space-y-4">
 {seatNotificationsLocked && (
 <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
 <p className="font-semibold">Notifications PDF / GPS non incluses</p>
 <p className="text-xs mt-1 text-amber-800">
 Vous pouvez placer les invités. L’envoi automatique du PDF, du plan et du GPS dès acceptation RSVP
 nécessite Premium 1 ou supérieur (forfait actuel : {tenant?.plan || 'FREE'}).
 </p>
 <Link href="/dashboard/billing" className="inline-block mt-2 text-xs font-bold text-primary hover:underline">
 Voir les forfaits →
 </Link>
 </div>
 )}
 <TablePlanner
 key={`${selectedEvent.id}_${selectedEvent.tablePlan?.importedAt ?? 'empty'}`}
 guests={guests}
 initialTablePlan={selectedEvent.tablePlan}
 onSave={handleSaveTablePlan}
 roomName={selectedEvent.room?.name}
 canImportRoomLayout={selectedRoomHasLayout || Boolean(selectedEvent.roomId && orgRooms.find((r) => r.id === selectedEvent.roomId)?.layoutBlueprint)}
 editorLevel={planFeatures?.roomEditorLevel}
 onImportRoomLayout={handleImportRoomLayout}
 importingLayout={importingLayout}
 />
 </div>
 )}

 {/* Tab Content: Feed & Shares */}
 {activeTab === 'staff' && selectedEvent && (
 <EventStaffPanel eventId={selectedEvent.id} />
 )}

 {activeTab === 'feed' && (
 <EventFeedManager
 key={`feed_${selectedEvent.id}`}
 eventId={selectedEvent.id}
 canPublishOnListing={Boolean(selectedEvent.isPublic)}
 onPostsChange={(count) => {
 setSelectedEvent((prev) => (prev ? { ...prev, feedPostCount: count } : prev));
 setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? { ...e, feedPostCount: count } : e)));
 }}
 />
 )}
 </div>
 )}

 {/* MODALS */}

 {/* Event Modal */}
 <Modal
 open={showEventModal}
 onClose={() => setShowEventModal(false)}
 title={editingEventId ? 'Configurer l’événement' : 'Nouvel événement'}
 description="Renseignez l’essentiel. La carte GPS est optionnelle."
 size="lg"
 footer={
 <div className="flex w-full justify-end gap-2">
 <Button type="button" variant="secondary" size="sm" onClick={() => setShowEventModal(false)}>
 Annuler
 </Button>
 <Button
 type="submit"
 form="event-config-form"
 size="sm"
 loading={savingEvent}
 disabled={!editingEventId && eventsAtLimit}
 title={!editingEventId && eventsQuotaMsg ? eventsQuotaMsg : undefined}
 >
 Enregistrer
 </Button>
 </div>
 }
 >
 <form id="event-config-form" onSubmit={handleCreateOrUpdateEvent} className="space-y-5">
 <section className="space-y-3">
 <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Essentiel</h4>
 <Input
 label="Titre"
 value={eventTitle}
 onChange={(e) => setEventTitle(e.target.value)}
 placeholder="ex. Mariage de Claire & Alexandre"
 required
 />
 <label className="block space-y-1.5">
 <span className="block text-xs font-semibold text-muted dark:text-muted">Description</span>
 <textarea
 value={eventDesc}
 onChange={(e) => setEventDescription(e.target.value)}
 placeholder="Optionnel — ambiance, précisions générales…"
 rows={2}
 className="w-full px-3.5 py-2.5 bg-surface-muted dark:bg-background border border-border dark:border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary resize-none"
 />
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <Input
 label="Date & heure"
 type="datetime-local"
 value={eventDate}
 onChange={(e) => setEventDate(e.target.value)}
 required
 />
 <Input
 label="Lieu"
 value={eventLoc}
 onChange={(e) => setEventLocation(e.target.value)}
 placeholder="ex. Hôtel Fleuve Congo"
 required
 leftIcon={<MapPin className="w-4 h-4" />}
 />
 </div>
 </section>

 <section className="space-y-3 pt-1 border-t border-border">
 <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-3">Visibilité &amp; billets</h4>
 <div className="flex flex-wrap gap-1.5">
 {[
 { id: false, label: 'Privé — liste d’invités', icon: GlobeLock },
 { id: true, label: 'Public — inscription ouverte', icon: Globe },
 ].map((opt) => (
 <button
 key={String(opt.id)}
 type="button"
 onClick={() => {
 setEventIsPublic(opt.id);
 if (!opt.id) setEventTicketing(false);
 }}
 className={cn(
 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition',
 eventIsPublic === opt.id
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
 {eventIsPublic
 ? 'La fiche sera listée sur le marketplace (grille, liste et carte). Les visiteurs s’inscrivent ou achètent un billet ; ils apparaissent ensuite dans Invités. Placez le pin GPS pour qu’il apparaisse sur la carte.'
 : 'Seules les personnes que vous ajoutez (ou invitez) ont accès via leur lien RSVP.'}
 </p>
 {eventIsPublic && (
 <div className="space-y-3">
 <label className="flex items-center gap-2 text-sm">
 <input
 type="checkbox"
 checked={eventTicketing}
 onChange={(e) => setEventTicketing(e.target.checked)}
 className="rounded border-border"
 />
 <span className="inline-flex items-center gap-1.5 font-medium">
 <Ticket className="w-4 h-4" />
 Billets payants en ligne
 </span>
 </label>
 {eventTicketing && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <Input
 label="Prix du billet (FC)"
 type="number"
 min={0}
 value={eventTicketPrice}
 onChange={(e) => setEventTicketPrice(e.target.value)}
 placeholder="ex. 25000"
 required
 />
 <Input
 label="Nombre de places (optionnel)"
 type="number"
 min={1}
 value={eventTicketsTotal}
 onChange={(e) => setEventTicketsTotal(e.target.value)}
 placeholder="Illimité"
 />
 </div>
 )}
 {!eventTicketing && (
 <Input
 label="Capacité (optionnel)"
 type="number"
 min={1}
 value={eventTicketsTotal}
 onChange={(e) => setEventTicketsTotal(e.target.value)}
 placeholder="Illimité"
 />
 )}
 <p className="text-[11px] text-muted">
 {eventTicketing
 ? 'Paiement par carte (Stripe). En développement, le paiement est simulé. L’acheteur reçoit le lien RSVP / badge QR.'
 : 'Inscription gratuite : le visiteur renseigne nom et e-mail, puis reçoit son lien RSVP.'}
 </p>
 </div>
 )}
 </section>

 <section className="space-y-3 pt-1 border-t border-border">
 <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-3">Galerie</h4>
 <MarketplaceMediaField urls={eventPhotos} onChange={setEventPhotos} />
 <p className="text-[11px] text-muted leading-relaxed">
 Photos et vidéos affichées sur la fiche publique, le marketplace et la carte si l’événement est public.
 </p>
 </section>

 <section className="space-y-3 pt-1 border-t border-border">
 <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-3">Infos invités</h4>
 <p className="text-[11px] text-muted leading-relaxed">
 Dress code, avantages (parking, cadeaux, extras) et notes pratiques. Ils apparaissent sur le portail RSVP et peuvent être insérés dans l’invitation. Vous pourrez affiner dans l’onglet Infos invités.
 </p>
 <EventGuestGuidelinesEditor
 value={guestGuidelines}
 onChange={setGuestGuidelines}
 compact
 />
 </section>

 <section className="space-y-3 pt-1 border-t border-border">
 <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-3">Salle & rappels</h4>
 <label className="block space-y-1.5">
 <span className="flex items-center gap-1.5 text-xs font-semibold text-muted dark:text-muted">
 <Building2 className="w-3.5 h-3.5" />
 Salle (optionnel)
 </span>
 <select
 value={eventRoomId}
 onChange={(e) => handleRoomChange(e.target.value)}
 disabled={loadingRooms}
 className="w-full px-3.5 py-2.5 bg-surface-muted dark:bg-background border border-border dark:border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
 >
 <option value="">Aucune — lieu libre</option>
 {orgRooms.map((room) => (
 <option key={room.id} value={room.id}>
 {room.name}
 {room.floor ? ` (${room.floor})` : ''}
 {room.capacity ? ` · ${room.capacity} pl.` : ''}
 </option>
 ))}
 </select>
 <p className="text-[11px] text-muted">
 {orgRooms.length === 0
 ? (
 <>
 Créez des salles dans{' '}
 <Link href="/dashboard/rooms" className="font-semibold text-primary hover:underline">
 Salles
 </Link>
 , ou parcourez le marketplace.
 </>
 )
 : 'Préremplit le lieu et lie le staff de la salle. À la création, le plan 2D de la salle est importé si un modèle existe.'}
 {' '}
 <Link href="/marketplace/salles" className="font-semibold text-primary hover:underline">
 Trouver une salle
 </Link>
 {' · '}
 <Link href="/marketplace/prestataires" className="font-semibold text-primary hover:underline">
 Trouver un prestataire
 </Link>
 </p>
 </label>
 <label className="block space-y-1.5">
 <span className="block text-xs font-semibold text-muted dark:text-muted">Rappels RSVP</span>
 <select
 value={eventReminderFrequency}
 onChange={(e) => setEventReminderFrequency(e.target.value)}
 className="w-full px-3.5 py-2.5 bg-surface-muted dark:bg-background border border-border dark:border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
 >
 <option value="NONE">Pas de rappel automatique</option>
 <option value="DAILY">Chaque jour</option>
 <option value="EVERY_3_DAYS">Tous les 3 jours</option>
 <option value="EVERY_5_DAYS">Tous les 5 jours</option>
 <option value="WEEKLY">Chaque semaine</option>
 </select>
 <p className="text-[11px] text-muted">
 Envoyés aux invités encore « en attente ».
 </p>
 </label>
 </section>

 <section className="space-y-3 pt-1 border-t border-border">
 <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted pt-3">Plan de table &amp; formulaire RSVP</h4>
 <p className="text-[11px] text-muted leading-relaxed">
 Associez une salle ci-dessus pour importer son plan 2D à la création. Vous pouvez aussi ouvrir l’éditeur après enregistrement. Le modèle définit les champs du formulaire RSVP (allergies, accompagnants, etc.).
 </p>
 <label className="block space-y-1.5">
 <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
 <LayoutTemplate className="w-3.5 h-3.5" />
 Modèle de formulaire RSVP
 </span>
 <select
 value={eventFormTemplateId}
 onChange={(e) => setEventFormTemplateId(e.target.value)}
 className="w-full px-3.5 py-2.5 bg-surface-muted dark:bg-background border border-border dark:border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
 >
 <option value="">Aucun — je configurerai plus tard</option>
 {templates.map((t) => (
 <option key={t.id} value={t.id}>{t.name}</option>
 ))}
 </select>
 {templates.length === 0 ? (
 <p className="text-[11px] text-muted">
 Aucun modèle pour l’instant. Créez-en un dans{' '}
 <Link href="/dashboard/templates" className="font-semibold text-primary hover:underline">Modèles</Link>
 .
 </p>
 ) : (
 <p className="text-[11px] text-muted">
 Une invitation e-mail sera créée (ou mise à jour) avec ce modèle. Vous pourrez encore modifier le message dans l’onglet Invitations.
 </p>
 )}
 </label>
 {editingEventId ? (
 <Button
 type="button"
 variant="secondary"
 size="sm"
 leftIcon={<LayoutGrid className="w-3.5 h-3.5" />}
 onClick={() => {
 const event = events.find((e) => e.id === editingEventId);
 if (event) void openEventTablePlan(event);
 }}
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
 <span className="block text-[11px] text-muted">Utile si vous n’avez pas de salle liée, pour dessiner les tables à la main.</span>
 </span>
 </label>
 )}
 </section>

 <section className="pt-1 border-t border-border">
 <button
 type="button"
 onClick={() => setEventMapOpen((v) => !v)}
 className="w-full flex items-center justify-between py-3 text-left"
 >
 <div>
 <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Localisation GPS</h4>
 <p className="text-xs text-muted mt-0.5">
 {eventLatitude && eventLongitude
 ? `${eventLatitude}, ${eventLongitude}`
 : 'Optionnel — pin WhatsApp à l’acceptation RSVP, et carte marketplace si l’événement est public'}
 </p>
 </div>
 <span className={cn(
 'text-xs font-medium px-2.5 py-1 rounded-md border border-border',
 eventMapOpen ? 'bg-foreground text-background border-transparent' : 'text-muted',
 )}>
 {eventMapOpen ? 'Masquer' : 'Afficher'}
 </span>
 </button>

 {eventMapOpen && (
 <div className="space-y-3 pb-1">
 <div className="flex items-center justify-end">
 <button
 type="button"
 onClick={searchLocationOnMap}
 disabled={searchingLocation}
 className="text-xs font-medium text-foreground hover:underline inline-flex items-center gap-1 disabled:opacity-50"
 >
 {searchingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
 Rechercher le lieu saisi
 </button>
 </div>
 {searchError && <p className="text-xs text-rose-600">{searchError}</p>}
 <div
 id="map-picker"
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
 placeholder="-4.3014"
 />
 <Input
 label="Longitude"
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
 placeholder="15.3048"
 />
 </div>
 <p className="text-[11px] text-muted">
 Cliquez sur la carte ou faites glisser le marqueur.
 </p>
 </div>
 )}
 </section>
 </form>
 </Modal>

 {/* Guest Modal */}
 {showGuestModal && (
 <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/60 backdrop-blur-sm">
 <div className="bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-lg p-6 space-y-6">
 <div className="flex items-center justify-between border-b border-border pb-4">
 <h3 className="text-lg font-bold text-foreground">
 {editingGuestId ? "Modifier l'invité" : "Ajouter un invité"}
 </h3>
 <button onClick={() => { setShowGuestModal(false); setEditingGuestId(null); }} className="text-muted hover:text-foreground transition">
 <XCircle className="w-6 h-6" />
 </button>
 </div>
 <form onSubmit={handleAddGuest} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Prénom</label>
 <input 
 type="text" 
 value={guestFirstName}
 onChange={(e) => setGuestFirstName(e.target.value)}
 placeholder="ex. Jean"
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 required
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Nom de famille</label>
 <input 
 type="text" 
 value={guestLastName}
 onChange={(e) => setGuestLastName(e.target.value)}
 placeholder="ex. Kabeya"
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 required
 />
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Email (optionnel)</label>
 <input 
 type="email" 
 value={guestEmail}
 onChange={(e) => setGuestEmail(e.target.value)}
 placeholder="ex. jean.kabeya@gmail.com"
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 />
 <p className="text-[11px] text-muted">E-mail ou WhatsApp : au moins un des deux.</p>
 </div>
 <PhoneInput
 label="Téléphone (WhatsApp)"
 countryCode={guestPhoneCountryCode}
 national={guestPhoneNational}
 onCountryCodeChange={setGuestPhoneCountryCode}
 onNationalChange={setGuestPhoneNational}
 hint="Indicatif + numéro national (sans le 0)."
 />
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Catégorie</label>
 <select 
 value={guestCategory}
 onChange={(e) => setGuestCategory(e.target.value)}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 >
 <option value="Famille">Famille</option>
 <option value="Ami">Ami</option>
 <option value="Collègue">Collègue</option>
 <option value="VIP">VIP</option>
 <option value="Général">Général</option>
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Statut RSVP</label>
 <select
 value={guestRsvp}
 onChange={(e) => setGuestRsvp(e.target.value as 'PENDING' | 'ACCEPTED' | 'DECLINED')}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 >
 <option value="PENDING">En attente</option>
 <option value="ACCEPTED">Accepté</option>
 <option value="DECLINED">Décliné</option>
 </select>
 </div>
 </div>

 <div className="rounded-[var(--radius-card)] border border-border bg-surface-muted/50 p-3 space-y-3">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
 Reporting restauration
 </p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted">Régime alimentaire</label>
 <select
 value={guestSpecialMeal}
 onChange={(e) => setGuestSpecialMeal(e.target.value)}
 className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 >
 {SPECIAL_MEAL_OPTIONS.map((opt) => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted">Allergies</label>
 <input
 type="text"
 value={guestAllergies}
 onChange={(e) => setGuestAllergies(e.target.value)}
 placeholder="ex. Arachides, gluten"
 className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 />
 </div>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted">Notes (optionnel)</label>
 <input
 type="text"
 value={guestPrefs}
 onChange={(e) => setGuestPreferences(e.target.value)}
 placeholder="ex. Table d'honneur, mobilité réduite"
 className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 />
 </div>
 <p className="text-[10px] text-muted leading-relaxed">
 Ces informations alimentent les filtres, statistiques et exports CSV de reporting.
 </p>
 </div>
 <div className="pt-4 flex gap-3 border-t border-border">
 <button 
 type="button"
 onClick={() => { setShowGuestModal(false); setEditingGuestId(null); }}
 className="flex-1 py-2.5 border border-border text-muted font-semibold rounded-xl text-sm hover:bg-surface-muted transition"
 disabled={savingGuest}
 >
 Annuler
 </button>
 <button 
 type="submit"
 disabled={savingGuest || (!editingGuestId && guestsAtLimit)}
 title={!editingGuestId && guestsQuotaMsg ? guestsQuotaMsg : undefined}
 className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
 <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/60 backdrop-blur-sm">
 <div className="bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-2xl p-6 space-y-6 overflow-y-auto max-h-[90vh]">
 <div className="flex items-center justify-between border-b border-border pb-4">
 <div className="flex items-center gap-2">
 <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
 <FileSpreadsheet className="w-5 h-5" />
 </div>
 <h3 className="text-lg font-bold text-foreground">Importer des invités en bloc</h3>
 </div>
 <button 
 onClick={() => {
 setShowImportModal(false);
 setParsedPreview(null);
 setImportText('');
 }} 
 className="text-muted hover:text-foreground transition"
 >
 <XCircle className="w-6 h-6" />
 </button>
 </div>

 {/* Import Methods Selector */}
 <div className="flex bg-surface-muted p-1 rounded-xl">
 <button
 type="button"
 onClick={() => {
 setImportImportMethod('excel');
 setParsedPreview(null);
 }}
 className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
 importMethod === 'excel' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-foreground'
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
 importMethod === 'csv' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-foreground'
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
 importMethod === 'text' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-foreground'
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
 <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-2xl p-4">
 <div className="space-y-1">
 <div className="text-xs font-bold text-primary flex items-center gap-1.5">
 <Sparkles className="w-4 h-4 text-primary" />
 Modèle de document requis
 </div>
 <p className="text-[11px] text-primary/80">
 Colonnes : Prénom, Nom, Email, Catégorie, Téléphone, Régime, Allergies, Notes.
 </p>
 </div>
 <button
 type="button"
 onClick={() => downloadSampleTemplate(importMethod)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition shadow-sm"
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
 ? 'border-primary bg-primary/10' 
 : 'border-border bg-surface-muted/50 hover:bg-surface-muted'
 }`}
 >
 <input 
 type="file"
 id="file-upload"
 accept={importMethod === 'excel' ? '.xlsx, .xls' : '.csv'}
 onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
 className="hidden"
 />
 <div className="bg-surface p-3 rounded-2xl border border-border shadow-sm text-muted">
 <Upload className="w-6 h-6" />
 </div>
 <div className="space-y-1">
 <p className="text-xs font-bold text-foreground">
 Glissez et déposez votre fichier ici, ou{' '}
 <label htmlFor="file-upload" className="text-primary hover:text-primary cursor-pointer underline">
 parcourez vos fichiers
 </label>
 </p>
 <p className="text-[10px] text-muted">
 Formats acceptés : {importMethod === 'excel' ? '.xlsx, .xls' : '.csv'} (Taille max 10 Mo)
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Text Area CSV Copy Paste */}
 {importMethod === 'text' && (
 <div className="space-y-4">
 <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl text-xs text-primary space-y-2 leading-relaxed">
 <div className="font-bold flex items-center gap-1.5">
 <Sparkles className="w-4 h-4 text-primary" /> Format CSV requis :
 </div>
 <p>Copiez et collez vos lignes d'invités en respectant l'ordre des colonnes séparées par des virgules :</p>
 <pre className="bg-surface p-2.5 rounded-xl border border-primary/20 font-mono text-[11px] text-foreground overflow-x-auto">
 Prénom, Nom, Email, Catégorie, Téléphone, Régime, Allergies, Notes{'\n'}
 Jean, Kabeya, jean.kabeya@gmail.com, VIP, +243812345678, halal, , Table d&apos;honneur{'\n'}
 Sarah, Mwamba, sarah.m@outlook.com, Ami, +243998765432, none, Arachides,
 </pre>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Données CSV</label>
 <textarea 
 value={importText}
 onChange={(e) => setImportText(e.target.value)}
 placeholder="Prénom, Nom, Email, Catégorie, Téléphone, Régime, Allergies, Notes..."
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:border-primary transition h-40 resize-none"
 required
 />
 </div>
 </div>
 )}

 {/* Preview Section */}
 {parsedPreview && parsedPreview.length > 0 && (
 <div className="space-y-2 border-t border-border pt-4">
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">
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
 <div className="em-data-table-wrap max-h-48 overflow-y-auto">
 <table className="em-data-table">
 <thead>
 <tr>
 <th>Prénom</th>
 <th>Nom</th>
 <th>Email</th>
 <th>Catégorie</th>
 <th>Téléphone</th>
 <th>Notes</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-xs text-foreground">
 {parsedPreview.slice(0, 5).map((p, idx) => (
 <tr key={idx} className="hover:bg-surface-muted/50">
 <td className="py-2 px-3 font-semibold">{p.firstName}</td>
 <td className="py-2 px-3">{p.lastName}</td>
 <td className="py-2 px-3 font-mono text-[11px] text-muted">{p.email}</td>
 <td className="py-2 px-3">
 <span className="px-2 py-0.5 bg-surface-muted text-muted rounded-full text-[10px] font-bold">
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
 <div className="bg-surface-muted text-center py-2 text-[10px] font-bold text-muted border-t border-border">
 Et {parsedPreview.length - 5} autres lignes...
 </div>
 )}
 </div>
 </div>
 )}

 {/* Action Buttons */}
 <div className="pt-4 flex gap-3 border-t border-border">
 <button 
 type="button"
 onClick={() => {
 setShowImportModal(false);
 setParsedPreview(null);
 setImportText('');
 }}
 className="flex-1 py-2.5 border border-border text-muted font-semibold rounded-xl text-sm hover:bg-surface-muted transition"
 disabled={importingFile}
 >
 Annuler
 </button>
 <button 
 type="submit"
 disabled={importingFile || (importMethod !== 'text' && (!parsedPreview || parsedPreview.length === 0))}
 className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-primary/10 flex items-center justify-center gap-2"
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
 <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/60 backdrop-blur-sm">
 <div className="bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-lg p-6 space-y-6">
 <div className="flex items-center justify-between border-b border-border pb-4">
 <div className="flex items-center gap-2">
 <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
 <Send className="w-5 h-5" />
 </div>
 <h3 className="text-lg font-bold text-foreground">Envoyer une invitation groupée</h3>
 </div>
 <button onClick={() => setShowBulkInviteModal(false)} className="text-muted hover:text-foreground transition">
 <XCircle className="w-6 h-6" />
 </button>
 </div>
 <form onSubmit={handleBulkSendInvitation} className="space-y-4">
 <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
 <p className="text-xs text-primary font-semibold leading-relaxed">
 Envoi à <strong className="text-primary font-extrabold">{selectedGuestIds.length} invité{selectedGuestIds.length > 1 ? 's' : ''}</strong> — lien RSVP uniquement, pas le PDF de table.
 </p>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Sélectionner l'invitation précise</label>
 <select 
 value={bulkSelectedInviteId}
 onChange={(e) => {
 const id = e.target.value;
 setBulkSelectedInviteId(id);
 const invite = invitations.find((item) => item.id === id);
 if (invite?.channel) setBulkSelectedChannel(invite.channel);
 }}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 required
 >
 <option value="">-- Choisir une invitation --</option>
 {invitations.map(i => (
 <option key={i.id} value={i.id}>{i.subject} (Modèle: {i.template?.name || 'Aucun'})</option>
 ))}
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Moyen de diffusion (Canal)</label>
 <select 
 value={bulkSelectedChannel}
 onChange={(e) => setBulkSelectedChannel(e.target.value)}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 >
 <option value="EMAIL">E-mail uniquement</option>
 <option value="WHATSAPP">WhatsApp uniquement</option>
 <option value="EMAIL_AND_WHATSAPP">E-mail et WhatsApp</option>
 </select>
 </div>

 <SendAudienceStats stats={bulkAudience} />
 {bulkAudience.reachable === 0 && (
  <p className="text-xs text-rose-600 font-medium">
   Aucun invité n’a le contact nécessaire pour ce canal.
  </p>
 )}

 <div className="pt-4 flex gap-3 border-t border-border">
 <button 
 type="button"
 disabled={isBulkSending}
 onClick={() => setShowBulkInviteModal(false)}
 className="flex-1 py-2.5 border border-border text-muted font-semibold rounded-xl text-sm hover:bg-surface-muted transition disabled:opacity-50"
 >
 Annuler
 </button>
 <button 
 type="submit"
 disabled={isBulkSending || bulkAudience.reachable === 0}
 className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 disabled:bg-primary/50 disabled:cursor-not-allowed"
 >
 {isBulkSending ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 Envoi en cours...
 </>
 ) : (
 <>
 <Send className="w-4 h-4" />
 Envoyer
 </>
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 <Modal
 open={Boolean(broadcastConfirmInviteId)}
 onClose={() => setBroadcastConfirmInviteId(null)}
 title="Envoyer les invitations ?"
 description="Le premier message contient uniquement le lien RSVP. Le PDF de table part après confirmation, si une place est attribuée."
 size="md"
 footer={
  <div className="flex w-full justify-end gap-2">
   <Button type="button" variant="secondary" size="sm" onClick={() => setBroadcastConfirmInviteId(null)}>
    Annuler
   </Button>
   <Button
    type="button"
    size="sm"
    disabled={!broadcastAudience || broadcastAudience.reachable === 0 || broadcastingInviteId !== null}
    loading={broadcastingInviteId === broadcastConfirmInviteId}
    onClick={() => {
     const inviteId = broadcastConfirmInviteId;
     if (!inviteId) return;
     setBroadcastConfirmInviteId(null);
     void handleSimulateBroadcast(inviteId);
    }}
   >
    Envoyer à tous
   </Button>
  </div>
 }
 >
  <div className="space-y-3">
   <p className="text-sm text-muted">
    Canal : <span className="font-semibold text-foreground">{getChannelLabel(broadcastConfirmInvite?.channel || 'EMAIL')}</span>
    {broadcastConfirmInvite?.subject ? ` · ${broadcastConfirmInvite.subject}` : ''}
   </p>
   {broadcastAudience ? <SendAudienceStats stats={broadcastAudience} /> : null}
   {broadcastAudience && broadcastAudience.reachable === 0 ? (
    <p className="text-xs text-rose-600 font-medium">
     {broadcastAudience.total === 0
      ? 'Ajoutez des invités avant d’envoyer.'
      : 'Aucun invité n’a le contact nécessaire pour ce canal.'}
    </p>
   ) : null}
   {broadcastAudience && broadcastAudience.alreadySent > 0 ? (
    <p className="text-xs text-amber-800">
     Les personnes déjà invitées recevront le message à nouveau.
    </p>
   ) : null}
  </div>
 </Modal>

 {/* Invitation Configuration Modal */}
 {showInviteModal && (
 <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/60 backdrop-blur-sm">
 <div className="bg-white rounded-3xl border border-border shadow-2xl w-full max-w-2xl p-6 space-y-6 max-h-[92vh] overflow-y-auto">
 <div className="flex items-center justify-between border-b border-border-subtle pb-4">
 <h3 className="text-lg font-bold text-foreground">
 {editingInviteId ? "Modifier l'invitation" : "Configurer une invitation"}
 </h3>
 <button onClick={() => { setShowInviteModal(false); setEditingInviteId(null); }} className="text-muted hover:text-muted transition">
 <XCircle className="w-6 h-6" />
 </button>
 </div>
 <form onSubmit={handleCreateInvitation} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Modèle de design</label>
 <p className="text-[11px] text-muted">Page RSVP que l’invité voit. Pas le texte du message.</p>
 <select 
 value={selectedTemplateId}
 onChange={(e) => setSelectedTemplateId(e.target.value)}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 >
 <option value="">-- Aucun modèle visuel --</option>
 {templates.map(t => (
 <option key={t.id} value={t.id}>{t.name}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Canal de diffusion</label>
 <select 
 value={inviteChannel}
 onChange={(e) => setInviteChannel(e.target.value)}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 >
 <option value="EMAIL">E-mail</option>
 <option value="WHATSAPP">WhatsApp</option>
 <option value="EMAIL_AND_WHATSAPP">E-mail et WhatsApp</option>
 </select>
 </div>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Modèles de message prédéfinis (Optionnel)</label>
 <select 
 onChange={(e) => handleSelectMessageTemplate(e.target.value)}
 defaultValue=""
 className="w-full px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition"
 >
 <option value="">-- Choisir un modèle de message pour pré-remplir --</option>
 {MESSAGE_TEMPLATES.map(mt => (
 <option key={mt.id} value={mt.id}>{mt.name}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Objet du message</label>
 <input 
 type="text" 
 value={inviteSubject}
 onChange={(e) => setInviteSubject(e.target.value)}
 placeholder="ex. Invitation officielle : Gala de Charité d'Élite"
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition"
 required
 />
 </div>
 <div className="space-y-1.5">
 <div className="flex justify-between items-center gap-3">
 <label className="text-xs font-bold text-muted uppercase tracking-wider">Corps du message</label>
 </div>
 <p className="text-[11px] text-muted leading-relaxed">
 Variables utilisables : {'{{firstName}}'}, {'{{lastName}}'}, {'{{rsvpLink}}'}, {'{{title}}'}, {'{{date}}'}, {'{{location}}'}, {'{{description}}'}, {'{{orgName}}'}, {'{{dressCode}}'}, {'{{guestGuidelines}}'}. La table et le siège s’ajoutent après confirmation RSVP, pas ici.
 </p>
 <textarea 
 value={inviteBody}
 onChange={(e) => setInviteBody(e.target.value)}
 placeholder="Cher(e) {{firstName}},&#10;Nous avons l'honneur de vous inviter...&#10;&#10;Veuillez confirmer votre présence ici : {{rsvpLink}}"
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition h-32 resize-none"
 required
 />
 </div>
 {selectedEvent && (
 <InvitationMessagePreview
  subject={inviteSubject.replaceAll('{{title}}', selectedEvent.title)}
  body={(() => {
   const formattedDate = new Date(selectedEvent.date).toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
   });
   let text = inviteBody
    .replaceAll('{{firstName}}', 'Marie')
    .replaceAll('{{lastName}}', 'Kabeya')
    .replaceAll('{{rsvpLink}}', 'https://…/rsvp/exemple')
    .replaceAll('{{title}}', selectedEvent.title || '')
    .replaceAll('{{description}}', selectedEvent.description || '')
    .replaceAll('{{location}}', selectedEvent.location || '')
    .replaceAll('{{date}}', formattedDate)
    .replaceAll('{{orgName}}', tenant?.name || 'Organisation');
   return applyInvitationGuidelineVariables(text, selectedEvent.guestGuidelines);
  })()}
  channel={inviteChannel}
  orgName={tenant?.name || 'Organisation'}
  primary={tenant?.branding?.primary}
  accent={tenant?.branding?.accent}
 />
 )}
 <div className="pt-4 flex gap-3 border-t border-border-subtle">
 <button 
 type="button"
 onClick={() => { setShowInviteModal(false); setEditingInviteId(null); }}
 className="flex-1 py-2.5 border border-border text-muted font-semibold rounded-xl text-sm hover:bg-surface-muted transition"
 disabled={savingInvite}
 >
 Annuler
 </button>
 <button 
 type="submit"
 disabled={savingInvite}
 className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-primary/10 flex items-center justify-center gap-2"
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
 <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/60 backdrop-blur-sm">
 <div className="bg-white rounded-3xl border border-border shadow-2xl w-full max-w-4xl p-6 space-y-6">
 <div className="flex items-center justify-between border-b border-border-subtle pb-4">
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
 <h3 className="text-lg font-bold text-foreground">
 {broadcastSummary?.failed === broadcastSummary?.total
 ? 'Échec de l\'envoi'
 : broadcastSummary?.allSimulated
 ? 'Envoi simulé'
 : (broadcastSummary?.failed || 0) > 0
 ? 'Envoi partiel'
 : 'Envoi des invitations effectué !'}
 </h3>
 {broadcastMessage && (
 <p className="text-sm text-muted mt-0.5">{broadcastMessage}</p>
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
 className="text-muted hover:text-muted transition"
 >
 <XCircle className="w-6 h-6" />
 </button>
 </div>

 {broadcastSummary && (
 <div className="space-y-3">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div className="bg-surface-muted border border-border rounded-xl p-3 text-center">
 <div className="text-xl font-black text-foreground">{broadcastSummary.total}</div>
 <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Total</div>
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
 {broadcastSummary.failed > 0 && broadcastSummary.failureReasons && (
 <div className="flex flex-wrap items-center gap-2 text-xs">
 {(broadcastSummary.failureReasons.noPhone || 0) > 0 && (
 <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 font-semibold">
 {broadcastSummary.failureReasons.noPhone} sans WhatsApp
 </span>
 )}
 {(broadcastSummary.failureReasons.noEmail || 0) > 0 && (
 <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 font-semibold">
 {broadcastSummary.failureReasons.noEmail} e-mail invalide
 </span>
 )}
 {(broadcastSummary.failureReasons.provider || 0) > 0 && (
 <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 font-semibold">
 {broadcastSummary.failureReasons.provider} erreur fournisseur
 </span>
 )}
 {lastBroadcastInviteId && (
 <Button
 size="sm"
 variant="secondary"
 onClick={handleRetryFailedBroadcast}
 disabled={broadcastingInviteId !== null}
 loading={broadcastingInviteId === lastBroadcastInviteId}
 >
 Relancer les échecs
 </Button>
 )}
 </div>
 )}
 </div>
 )}

 <div className="space-y-4">
 <p className="text-sm text-muted leading-relaxed">
 Détail par invité ci-dessous. Les envois réels passent par SendGrid (e-mail) et UltraMsg (WhatsApp), configurables dans le panneau Super Admin ou via les variables d&apos;environnement du serveur.
 </p>
 <div className="p-4 bg-surface-muted border border-border rounded-2xl space-y-3 max-h-96 overflow-y-auto">
 <div className="text-xs font-bold text-muted uppercase tracking-wider border-b border-border pb-2 mb-2">
 Résultats d&apos;envoi et options de partage manuel :
 </div>
 {broadcastResults.map((res, index) => {
 const statusMeta = getBroadcastStatusMeta(res.status);
 return (
 <div key={res.guestId || index} className="flex flex-col gap-3 py-3 border-b border-border-subtle/80 last:border-0 pb-3 last:pb-0">
 <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
 <div className="space-y-1 min-w-[200px]">
 <div className="flex flex-wrap items-center gap-2">
 <div className="font-bold text-foreground text-sm">{res.guestName}</div>
 <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.classes}`}>
 {statusMeta.label}
 </span>
 {res.channel && (
 <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-muted text-muted border border-border">
 {res.channel.split(',').map(c => getChannelLabel(c.trim())).join(' + ')}
 </span>
 )}
 </div>
 <div className="text-muted text-xs truncate max-w-xs">{res.email}</div>
 {res.phone && (
 <div className="text-muted text-xs font-mono">{res.phone}</div>
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
 href={publicRsvpLink(res.rsvpLink, res.guestId)} 
 target="_blank" 
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-primary hover:text-primary font-bold transition hover:underline text-xs mr-2"
 >
 Ouvrir
 <ChevronRight className="w-3.5 h-3.5" />
 </a>

 {/* Copy Link */}
 <button
 onClick={() => handleCopyLink(res.guestId || index.toString(), publicRsvpLink(res.rsvpLink, res.guestId))}
 className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
 copiedGuestId === (res.guestId || index.toString())
 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
 : 'bg-white border-border text-muted hover:bg-surface-muted'
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
 href={getWhatsAppShareUrl(res.guestName, publicRsvpLink(res.rsvpLink, res.guestId), res.phone, res.body)}
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
 href={getXShareUrl(res.guestName, publicRsvpLink(res.rsvpLink, res.guestId), res.body)}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-background hover:bg-background text-white rounded-xl text-xs font-bold transition shadow-sm"
 title="Partager sur X"
 >
 <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
 </svg>
 X
 </a>

 {/* Instagram */}
 <button
 onClick={() => handleCopyLink(res.guestId || index.toString(), publicRsvpLink(res.rsvpLink, res.guestId))}
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
 href={getFacebookShareUrl(publicRsvpLink(res.rsvpLink, res.guestId))}
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
 <div className="pt-4 border-t border-border-subtle flex justify-end">
 <button
 onClick={() => {
 setShowBroadcastModal(false);
 setBroadcastResults(null);
 setBroadcastMessage('');
 setBroadcastSummary(null);
 }}
 className="px-6 py-2.5 bg-background hover:bg-surface-muted text-white font-semibold rounded-xl text-sm transition"
 >
 Fermer
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Individual Guest Sharing Modal */}
 {sharingGuest && (
 <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/60 backdrop-blur-sm">
 <div className="bg-white rounded-3xl border border-border shadow-2xl w-full max-w-lg p-6 space-y-6">
 <div className="flex items-center justify-between border-b border-border-subtle pb-4">
 <div className="flex items-center gap-2">
 <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
 <Share2 className="w-5 h-5" />
 </div>
 <h3 className="text-lg font-bold text-foreground">Partager l'invitation</h3>
 </div>
 <button onClick={() => setSharingGuest(null)} className="text-muted hover:text-muted transition">
 <XCircle className="w-6 h-6" />
 </button>
 </div>
 <div className="space-y-4">
 <div className="p-4 bg-surface-muted border border-border rounded-2xl space-y-1">
 <div className="text-xs font-bold text-muted uppercase tracking-wider">Destinataire :</div>
 <div className="font-bold text-foreground text-sm">{sharingGuest.firstName} {sharingGuest.lastName}</div>
 <div className="text-muted text-xs">{sharingGuest.email}</div>
 </div>

 <div className="space-y-2">
 <div className="text-xs font-bold text-muted uppercase tracking-wider">Options de partage direct :</div>
 <div className="grid grid-cols-2 gap-3">
 {/* Copy Link */}
 <button
 onClick={() => handleCopyLink(sharingGuest.id, getGuestRsvpLink(sharingGuest.id))}
 className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition ${
 copiedGuestId === sharingGuest.id
 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
 : 'bg-white border-border text-foreground hover:bg-surface-muted'
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
 className="flex items-center justify-center gap-2 p-3 bg-background hover:bg-background text-white rounded-xl text-sm font-bold transition shadow-sm"
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
 <div className="pt-4 border-t border-border-subtle flex justify-end">
 <button 
 onClick={() => setSharingGuest(null)}
 className="px-6 py-2.5 bg-background hover:bg-surface-muted text-white font-semibold rounded-xl text-sm transition"
 >
 Fermer
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Guest Details Modal */}
 {selectedGuestDetails && (() => {
 const customFieldDetails = listGuestCustomFieldDetails(
 selectedGuestDetails.preferences,
 getCustomRsvpFields(),
 );
 const hasPrefs =
 Boolean(selectedGuestDetails.preferences?.specialMeal) ||
 Boolean(selectedGuestDetails.preferences?.allergies) ||
 Boolean(selectedGuestDetails.preferences?.notes);

 return (
 <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/60 backdrop-blur-sm">
 <div className="bg-surface rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-soft)] w-full max-w-lg p-5 sm:p-6 space-y-5">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="flex items-center gap-2 min-w-0">
 <div className="bg-primary/10 text-primary p-1.5 rounded-[var(--radius-button)] shrink-0">
 <Users className="w-4.5 h-4.5" />
 </div>
 <div className="min-w-0">
 <h3 className="text-base font-semibold text-foreground tracking-tight">Détails de l&apos;invité</h3>
 <p className="text-xs text-muted truncate">
 {selectedGuestDetails.firstName} {selectedGuestDetails.lastName}
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setSelectedGuestDetails(null)}
 className="text-muted hover:text-foreground transition p-1"
 aria-label="Fermer"
 >
 <XCircle className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-0.5">
 <div className="grid grid-cols-2 gap-3 bg-surface-muted p-3.5 rounded-[var(--radius-card)] border border-border">
 <div>
 <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">Prénom & Nom</div>
 <div className="font-semibold text-foreground text-sm mt-0.5">
 {selectedGuestDetails.firstName} {selectedGuestDetails.lastName}
 </div>
 </div>
 <div>
 <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">Catégorie</div>
 <div className="font-semibold text-foreground text-sm mt-0.5">
 {selectedGuestDetails.category || 'Général'}
 </div>
 </div>
 <div className="col-span-2">
 <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">E-mail</div>
 <div className="font-semibold text-foreground text-sm mt-0.5 truncate">{displayGuestEmail(selectedGuestDetails.email) || selectedGuestDetails.phone || '—'}</div>
 </div>
 {(selectedGuestDetails.preferences?.phone || selectedGuestDetails.preferences?.telephone) && (
 <div className="col-span-2">
 <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">Téléphone</div>
 <div className="font-semibold text-foreground text-sm mt-0.5">
 {selectedGuestDetails.preferences.phone || selectedGuestDetails.preferences.telephone}
 </div>
 </div>
 )}
 </div>

 <div className="flex items-center justify-between p-3.5 bg-surface border border-border rounded-[var(--radius-card)]">
 <span className="text-xs font-semibold text-muted uppercase tracking-wider">Statut RSVP</span>
 <StatusPill
 tone={
 selectedGuestDetails.rsvp === 'ACCEPTED'
 ? 'emerald'
 : selectedGuestDetails.rsvp === 'DECLINED'
 ? 'rose'
 : 'amber'
 }
 >
 {selectedGuestDetails.rsvp === 'ACCEPTED'
 ? 'Présent'
 : selectedGuestDetails.rsvp === 'DECLINED'
 ? 'Absent'
 : 'En attente'}
 </StatusPill>
 </div>

 {(selectedGuestDetails.rsvp === 'ACCEPTED' || hasPrefs) && (
 <div className="p-3.5 border border-border rounded-[var(--radius-card)] space-y-3 bg-surface">
 <div className="text-xs font-semibold text-muted uppercase tracking-wider border-b border-border pb-2 flex items-center gap-1.5">
 <Utensils className="w-3.5 h-3.5 text-primary" />
 <span>Préférences de repas & notes</span>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">Type de menu</div>
 <div className="font-medium text-foreground text-xs mt-1">
 {specialMealLabel(selectedGuestDetails.preferences?.specialMeal)}
 </div>
 </div>
 <div>
 <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">Allergies</div>
 <div className="font-medium text-foreground text-xs mt-1">
 {selectedGuestDetails.preferences?.allergies || (
 <span className="italic text-muted">Aucune</span>
 )}
 </div>
 </div>
 <div className="col-span-2">
 <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">Notes / Remarques</div>
 <div className="font-medium text-foreground text-xs mt-1">
 {selectedGuestDetails.preferences?.notes || (
 <span className="italic text-muted">Aucune note</span>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 <div className="p-3.5 border border-border rounded-[var(--radius-card)] space-y-3 bg-surface">
 <div className="text-xs font-semibold text-muted uppercase tracking-wider border-b border-border pb-2 flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5 text-primary" />
 <span>Champs personnalisés</span>
 {customFieldDetails.length > 0 && (
 <span className="ml-auto normal-case tracking-normal text-[10px] font-medium text-muted">
 {customFieldDetails.filter((f) => f.answered).length}/{customFieldDetails.length} renseigné
 {customFieldDetails.filter((f) => f.answered).length > 1 ? 's' : ''}
 </span>
 )}
 </div>
 {customFieldDetails.length === 0 ? (
 <p className="text-xs text-muted italic py-1">
 Aucun champ personnalisé sur le modèle d&apos;invitation, ni réponse enregistrée.
 </p>
 ) : (
 <div className="space-y-2.5">
 {customFieldDetails.map((field) => (
 <div
 key={field.key}
 className="rounded-[var(--radius-button)] border border-border bg-surface-muted/60 px-3 py-2.5"
 >
 <div className="flex items-start justify-between gap-2">
 <div className="text-[11px] font-semibold text-foreground leading-snug">
 {field.label}
 </div>
 {field.typeLabel && (
 <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-muted px-1.5 py-0.5 rounded bg-surface border border-border">
 {field.typeLabel}
 </span>
 )}
 </div>
 <div className="mt-1 text-sm font-medium text-foreground break-words">
 {field.answered ? (
 field.displayValue
 ) : (
 <span className="italic text-muted text-xs">Non renseigné</span>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 <div className="pt-3 border-t border-border">
 <button
 type="button"
 onClick={() => setSelectedGuestDetails(null)}
 className="w-full py-2.5 bg-surface-muted hover:bg-card-hover text-foreground font-semibold rounded-[var(--radius-button)] text-sm transition border border-border"
 >
 Fermer
 </button>
 </div>
 </div>
 </div>
 );
 })()}
 </div>
 );
}
