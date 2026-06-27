'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, MapPin, Users, PlusCircle, Trash2, Edit3, 
  ChevronRight, ArrowLeft, Check, Upload, Mail, Send, 
  Sparkles, CheckCircle2, XCircle, AlertCircle, HelpCircle, Loader2,
  Copy, MessageSquare, Share2
} from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  tenant?: { name: string };
}

interface GuestItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  category: string;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  preferences: any;
}

interface TemplateItem {
  id: string;
  name: string;
}

interface InvitationItem {
  id: string;
  subject: string;
  body: string;
  channel: string;
  template?: { name: string } | null;
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'guests' | 'invitations'>('guests');

  // Event form
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLoc, setEventLocation] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Guest form
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCategory, setGuestCategory] = useState('Famille');
  const [guestPrefs, setGuestPreferences] = useState('');
  const [guests, setGuests] = useState<GuestItem[]>([]);

  // Import guests
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  // Invitation form
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [inviteSubject, setInviteSubject] = useState('');
  const [inviteBody, setInviteBody] = useState('');
  const [inviteChannel, setInviteChannel] = useState('EMAIL');

  // Broadcast results
  const [broadcastResults, setBroadcastResults] = useState<any[] | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);
  const [sharingGuest, setSharingGuest] = useState<GuestItem | null>(null);

  // Error/Success state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        setEvents(data);
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

  const handleCreateOrUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        title: eventTitle,
        description: eventDesc,
        date: eventDate,
        location: eventLoc,
      };

      if (editingEventId) {
        await api.put(`/events/${editingEventId}`, payload);
        setSuccess('Événement mis à jour avec succès !');
      } else {
        await api.post('/events', payload);
        setSuccess('Événement créé avec succès !');
      }

      // Reset
      setEventTitle('');
      setEventDescription('');
      setEventDate('');
      setEventLocation('');
      setEditingEventId(null);
      setShowEventModal(false);
      loadEvents();
    } catch (err: any) {
      setError(err.message || "Erreur d'enregistrement de l'événement");
    }
  };

  const handleEditEventClick = (event: EventItem) => {
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventDate(new Date(event.date).toISOString().slice(0, 16));
    setEventLocation(event.location);
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

  // Manage Event Details
  const handleManageEvent = async (event: EventItem) => {
    setSelectedEvent(event);
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

  // Create Guest
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setError('');

    try {
      const payload = {
        firstName: guestFirstName,
        lastName: guestLastName,
        email: guestEmail,
        category: guestCategory,
        preferences: guestPrefs ? { notes: guestPrefs } : {},
      };

      const newGuest = await api.post(`/events/${selectedEvent.id}/guests`, payload);
      setGuests([...guests, newGuest]);
      setGuestFirstName('');
      setGuestLastName('');
      setGuestEmail('');
      setGuestPreferences('');
      setShowGuestModal(false);
      setSuccess('Invité ajouté avec succès !');
    } catch (err: any) {
      setError(err.message || "Erreur d'ajout de l'invité");
    }
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

  // Bulk Import Guests CSV
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !importText.trim()) return;
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/events/${selectedEvent.id}/guests/import`, { csvData: importText });
      setGuests([...guests, ...response.guests]);
      setImportText('');
      setShowImportModal(false);
      setSuccess(`${response.count} invités importés avec succès !`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'importation CSV.");
    }
  };

  // Create Invitation
  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setError('');

    try {
      const payload = {
        templateId: selectedTemplateId || null,
        subject: inviteSubject,
        body: inviteBody,
        channel: inviteChannel,
      };

      const newInvite = await api.post(`/events/${selectedEvent.id}/invitations`, payload);
      setInvitations([...invitations, newInvite]);
      setInviteSubject('');
      setInviteBody('');
      setSelectedTemplateId('');
      setShowInviteModal(false);
      setSuccess('Invitation configurée avec succès !');
    } catch (err: any) {
      setError(err.message || "Erreur de configuration de l'invitation");
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

    try {
      const response = await api.post(`/events/${selectedEvent.id}/invitations/${inviteId}/broadcast`);
      setBroadcastResults(response.results);
      setShowBroadcastModal(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la diffusion.');
    }
  };

  const handleCopyLink = (guestId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedGuestId(guestId);
    setTimeout(() => setCopiedGuestId(null), 2000);
  };

  const getWhatsAppShareUrl = (guestName: string, rsvpLink: string) => {
    const text = `Bonjour ${guestName}, vous êtes chaleureusement invité(e) ! Veuillez confirmer votre présence en ouvrant votre invitation personnalisée ici : ${rsvpLink}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const getSMSShareUrl = (guestName: string, rsvpLink: string) => {
    const text = `Bonjour ${guestName}, vous êtes chaleureusement invité(e) ! Veuillez confirmer votre présence en ouvrant votre invitation personnalisée ici : ${rsvpLink}`;
    return `sms:?&body=${encodeURIComponent(text)}`;
  };

  const getXShareUrl = (guestName: string, rsvpLink: string) => {
    const text = `Bonjour ${guestName}, vous êtes invité(e) ! Confirmez votre présence ici : ${rsvpLink}`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  };

  const getGuestRsvpLink = (guestId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/rsvp/${guestId}`;
    }
    return `http://localhost:3000/rsvp/${guestId}`;
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
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3 animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      {!selectedEvent ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Vos Événements</h1>
            <p className="text-slate-500 mt-1">Créez et gérez vos réceptions privées, vos listes d'invités et vos invitations.</p>
          </div>
          <button 
            onClick={() => { setEditingEventId(null); setShowEventModal(true); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-indigo-100 text-sm"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            Créer un événement
          </button>
        </div>
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
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {selectedEvent.location}</span>
            </p>
          </div>
          <div className="flex gap-2">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white border border-slate-200 rounded-3xl">
              <Calendar className="w-16 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Aucun événement planifié</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Commencez par créer votre premier événement pour y ajouter vos invités.</p>
              <button 
                onClick={() => { setEditingEventId(null); setShowEventModal(true); }}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
              >
                Créer mon premier événement
              </button>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight line-clamp-1">{event.title}</h3>
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                    {new Date(event.date).toLocaleDateString('fr-FR', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  {event.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{event.description}</p>
                  )}
                  <div className="pt-2 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button 
                    onClick={() => handleManageEvent(event)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition"
                  >
                    Gérer l'événement
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    title="Supprimer l'événement"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Event Management View (Tabs) */}
      {selectedEvent && (
        <div className="space-y-8">
          {/* Tabs Selector */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('guests')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition ${activeTab === 'guests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5" />
                Invités ({guests.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-4 px-6 text-sm font-bold border-b-2 transition ${activeTab === 'invitations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2">
                <Mail className="w-4.5 h-4.5" />
                Invitations & Diffusion ({invitations.length})
              </span>
            </button>
          </div>

          {/* Tab Content: Guests */}
          {activeTab === 'guests' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Liste des Invités</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Ajoutez des invités manuellement ou importez-les en bloc à partir d'un fichier CSV.</p>
                </div>
                <div className="flex gap-2.5">
                  <button 
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
                  >
                    <Upload className="w-4 h-4" />
                    Importer CSV
                  </button>
                  <button 
                    onClick={() => setShowGuestModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Ajouter un invité
                  </button>
                </div>
              </div>

              {/* Guests Table */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {guests.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-bold text-slate-700">Aucun invité</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Ajoutez des invités pour commencer à diffuser vos invitations.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="py-3.5 px-6 font-semibold">Nom complet</th>
                          <th className="py-3.5 px-6 font-semibold">Email</th>
                          <th className="py-3.5 px-6 font-semibold">Catégorie</th>
                          <th className="py-3.5 px-6 font-semibold">Statut RSVP</th>
                          <th className="py-3.5 px-6 font-semibold">Préférences & Allergies</th>
                          <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {guests.map((g) => (
                          <tr key={g.id} className="hover:bg-slate-50/30 transition-colors">
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
                                onClick={() => setSharingGuest(g)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Partager l'invitation (WhatsApp, SMS, X, Instagram)"
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
                  onClick={() => setShowInviteModal(true)}
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
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-700">
                            Canal: {invite.channel}
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
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-100"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Simuler la diffusion (Liens RSVP)
                        </button>
                        <button 
                          onClick={() => handleDeleteInvitation(invite.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
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
        </div>
      )}

      {/* MODALS */}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEventId ? "Modifier l'événement" : 'Créer un événement'}
              </h3>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateEvent} className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lieu</label>
                  <input 
                    type="text" 
                    value={eventLoc}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="ex. Hôtel Fleuve Congo"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
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
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
                >
                  Enregistrer
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
              <h3 className="text-lg font-bold text-slate-900">Ajouter un invité</h3>
              <button onClick={() => setShowGuestModal(false)} className="text-slate-400 hover:text-slate-600 transition">
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
                  onClick={() => setShowGuestModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Importer des invités en bloc</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleBulkImport} className="space-y-4">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs text-indigo-950 space-y-2 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-indigo-600" /> Format CSV requis :</div>
                <p>Copiez et collez vos lignes d'invités en respectant l'ordre des colonnes séparées par des virgules :</p>
                <pre className="bg-white p-2.5 rounded-xl border border-indigo-100 font-mono text-[11px] text-slate-700 overflow-x-auto">
                  Prénom, Nom, Email, Catégorie{'\n'}
                  Jean, Kabeya, jean.kabeya@gmail.com, VIP{'\n'}
                  Sarah, Mwamba, sarah.m@outlook.com, Ami
                </pre>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Données CSV</label>
                <textarea 
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Prénom, Nom, Email, Catégorie..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500 transition h-40 resize-none"
                  required
                />
              </div>
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
                >
                  Importer
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
              <h3 className="text-lg font-bold text-slate-900">Configurer une invitation</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600 transition">
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
                    <option value="LINK">Lien unique (Simulation)</option>
                  </select>
                </div>
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
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Variables: {'{{firstName}}'}, {'{{rsvpLink}}'}
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
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Simulation Modal */}
      {showBroadcastModal && broadcastResults && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Simulation de diffusion réussie !</h3>
              </div>
              <button onClick={() => { setShowBroadcastModal(false); setBroadcastResults(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-500 leading-relaxed">
                L'application a généré des liens d'invitations individuels et sécurisés pour chacun de vos invités. En conditions réelles, ces liens sont envoyés par e-mail.
              </p>
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3 max-h-96 overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2">Liens RSVP individuels et options de partage direct :</div>
                {broadcastResults.map((res, index) => (
                  <div key={index} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 py-3 border-b border-slate-100/80 last:border-0 pb-3 last:pb-0">
                    <div className="space-y-0.5 min-w-[200px]">
                      <div className="font-bold text-slate-800 text-sm">{res.guestName}</div>
                      <div className="text-slate-400 text-xs truncate max-w-xs">{res.email}</div>
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
                        href={getWhatsAppShareUrl(res.guestName, res.rsvpLink)}
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

                      {/* SMS */}
                      <a
                        href={getSMSShareUrl(res.guestName, res.rsvpLink)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        title="Envoyer par SMS"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        SMS
                      </a>

                      {/* X (Twitter) */}
                      <a
                        href={getXShareUrl(res.guestName, res.rsvpLink)}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => { setShowBroadcastModal(false); setBroadcastResults(null); }}
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
                    href={getWhatsAppShareUrl(`${sharingGuest.firstName} ${sharingGuest.lastName}`, getGuestRsvpLink(sharingGuest.id))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.753-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.013-5.101-2.859-6.948C16.572 2.011 14.1 1 11.999 1c-5.438 0-9.863 4.37-9.868 9.8-.001 1.77.463 3.498 1.345 5.021l-.993 3.624 5.164-.991zm11.767-6.828c-.3-.15-1.774-.875-2.048-.975-.274-.1-.474-.15-.674.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-1.2-.6-2.007-1.05-2.8-2.425-.2-.3-.2-.125.1-.425.275-.275.6-.65.75-.875.15-.225.075-.425-.038-.625-.112-.2-.95-2.275-1.3-3.125-.34-.817-.68-.707-.95-.721-.24-.012-.514-.015-.788-.015-.274 0-.724.1-1.1.5-.375.4-1.425 1.4-1.425 3.4s1.45 3.925 1.65 4.175c.2.275 2.855 4.35 6.915 6.1 1.12.484 1.91.775 2.56.975 1.12.35 2.14.3 2.95.175.9-.137 2.775-1.125 3.175-2.225.4-1.1.4-2.05.275-2.25-.125-.2-.475-.3-.775-.45z"/>
                    </svg>
                    WhatsApp
                  </a>

                  {/* SMS */}
                  <a
                    href={getSMSShareUrl(`${sharingGuest.firstName} ${sharingGuest.lastName}`, getGuestRsvpLink(sharingGuest.id))}
                    className="flex items-center justify-center gap-2 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    SMS
                  </a>

                  {/* X (Twitter) */}
                  <a
                    href={getXShareUrl(`${sharingGuest.firstName} ${sharingGuest.lastName}`, getGuestRsvpLink(sharingGuest.id))}
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
                    className="col-span-2 flex items-center justify-center gap-2 p-3 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 hover:opacity-90 text-white rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 2.191 4.919 5.4c.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 5.271-4.919 5.418-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-2.199-4.919-5.42-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-5.271 4.919-5.419 1.265-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    Partager sur Instagram DM (Copier le lien)
                  </button>
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
    </div>
  );
}
