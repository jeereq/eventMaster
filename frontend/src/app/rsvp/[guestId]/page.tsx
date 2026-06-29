'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  Calendar, MapPin, CheckCircle2, XCircle, AlertCircle, 
  HelpCircle, Utensils, Loader2, Award, Sparkles 
} from 'lucide-react';

interface GuestRsvpData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  preferences: any;
  event: {
    title: string;
    description: string;
    date: string;
    location: string;
    latitude?: number;
    longitude?: number;
    invitations?: Array<{
      template?: {
        id: string;
        name: string;
        content: any;
      } | null;
    }>;
  };
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

export default function RsvpPage() {
  const params = useParams();
  const guestId = params.guestId as string;

  const [guest, setGuest] = useState<GuestRsvpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'ACCEPTED' | 'DECLINED'>('ACCEPTED');
  
  // Preferences form
  const [allergies, setAllergies] = useState('');
  const [specialMeal, setSpecialMeal] = useState('none');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadRsvpDetails() {
      if (!guestId) return;
      try {
        const data = await api.get(`/rsvp/${guestId}`);
        setGuest(data);
        if (data.rsvp && data.rsvp !== 'PENDING') {
          setRsvpStatus(data.rsvp);
          setSubmitted(true);
        }
        if (data.preferences) {
          setAllergies(data.preferences.allergies || '');
          setSpecialMeal(data.preferences.specialMeal || 'none');
          setAdditionalNotes(data.preferences.notes || '');
          setCustomFieldValues(data.preferences.customFields || {});
        }
      } catch (err: any) {
        console.error('Error fetching RSVP details:', err);
        setError('Le lien d\'invitation est invalide ou a expiré.');
      } finally {
        setLoading(false);
      }
    }
    loadRsvpDetails();
  }, [guestId]);

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const preferences = {
        allergies,
        specialMeal,
        notes: additionalNotes,
        customFields: customFieldValues,
      };

      await api.post(`/rsvp/${guestId}`, {
        rsvp: rsvpStatus,
        preferences,
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la soumission de votre réponse.');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Ouverture de votre invitation personnalisée...</p>
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="bg-rose-50 text-rose-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Erreur d'Invitation</h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            {error || 'Lien d\'invitation invalide.'}
          </p>
          <p className="text-xs text-slate-400">Veuillez contacter l'organisateur de l'événement.</p>
        </div>
      </div>
    );
  }

  if (submitted && !submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.7))]" />

        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl text-center space-y-6 relative z-10">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-3xl" />

          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 leading-none">Réponse enregistrée</h2>
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest pt-1">
              Merci, {guest.firstName} !
            </p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Votre statut de participation a été enregistré : <br />
            <span className={`inline-block mt-3 px-3.5 py-1 text-xs font-black uppercase tracking-wider border rounded-full ${guest.rsvp === 'ACCEPTED' || rsvpStatus === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
              {guest.rsvp === 'ACCEPTED' || rsvpStatus === 'ACCEPTED' ? 'Présence confirmée (Oui)' : 'Décliné (Absence)'}
            </span>
          </p>

          {(guest.rsvp === 'ACCEPTED' || rsvpStatus === 'ACCEPTED') && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Votre Badge d'Émargement QR Code</span>
              <div className="flex justify-center">
                <div className="relative p-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${guest.id}&color=4f-46-e5&bgcolor=ffffff&qzone=1`} 
                    alt="QR Code d'émargement"
                    className="w-40 h-40"
                  />
                  {/* Embedded Logo in the middle of the QR Code */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1.5 rounded-xl border border-slate-150 shadow-xs flex items-center justify-center w-9 h-9">
                    <span className="text-sm">✨</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                Présentez ce QR Code à l'entrée de l'événement pour valider votre présence.
              </p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="text-left bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Événement</div>
              <div className="font-extrabold text-slate-900 text-base">{guest.event.title}</div>
              <div className="text-xs text-slate-600 font-medium space-y-1">
                <div>Date : {new Date(guest.event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div>Lieu : {guest.event.location}</div>
              </div>
            </div>

            <button 
              onClick={() => setSubmitted(false)}
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
            >
              Modifier ma réponse
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatText = (text: string) => {
    if (!text) return '';
    let formatted = text
      .replace(/\{\{firstName\}\}/g, guest.firstName)
      .replace(/\{\{lastName\}\}/g, guest.lastName);
    
    if (guest.event) {
      formatted = formatted
        .replace(/\{\{title\}\}/g, guest.event.title)
        .replace(/\{\{description\}\}/g, guest.event.description || '')
        .replace(/\{\{location\}\}/g, guest.event.location)
        .replace(/\{\{date\}\}/g, new Date(guest.event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    }
    return formatted;
  };

  const template = guest.event.invitations?.[0]?.template;
  const global = template?.content?.global || {};
  const bgType = global.bgType || 'color';
  const bgColor = global.bgColor || '#ffffff';
  const bgImageUrl = global.bgImageUrl || '';
  const bgPattern = global.bgPattern || 'none';
  const frameType = global.frameType || 'none';
  const floralColor = global.floralColor || '#b91c1c';
  const floralType = global.floralType || 'roses';
  const floralDensity = global.floralDensity !== undefined ? global.floralDensity : 40;

  const renderRsvpFormControls = (el: any) => {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 space-y-5 text-center shadow-sm">
        <div className="font-bold text-slate-800 text-sm">{formatText(el.text)}</div>
        
        {/* Yes/No Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setRsvpStatus('ACCEPTED')}
            className={`py-3.5 px-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition ${rsvpStatus === 'ACCEPTED' ? 'border-emerald-600 bg-emerald-50/20 text-emerald-800 shadow-md shadow-emerald-50' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
          >
            <CheckCircle2 className={`w-6 h-6 ${rsvpStatus === 'ACCEPTED' ? 'text-emerald-600' : 'text-slate-300'}`} />
            <span className="text-xs font-bold">Oui, avec joie !</span>
          </button>

          <button
            type="button"
            onClick={() => setRsvpStatus('DECLINED')}
            className={`py-3.5 px-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition ${rsvpStatus === 'DECLINED' ? 'border-rose-600 bg-rose-50/20 text-rose-800 shadow-md shadow-rose-50' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
          >
            <XCircle className={`w-6 h-6 ${rsvpStatus === 'DECLINED' ? 'text-rose-600' : 'text-slate-300'}`} />
            <span className="text-xs font-bold">Non, désolé(e)</span>
          </button>
        </div>

        {/* If attending, show custom and standard fields */}
        {rsvpStatus === 'ACCEPTED' && (
          <div className="space-y-4 border-t border-slate-200/60 pt-4 text-left">
            {/* Custom Fields */}
            {el.rsvpFields && el.rsvpFields.map((field: any) => (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={customFieldValues[field.id] || ''}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                    required={field.required}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-indigo-500 bg-white"
                    placeholder="Votre réponse..."
                  />
                )}
                {field.type === 'select' && (
                  <select
                    value={customFieldValues[field.id] || ''}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                    required={field.required}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-indigo-500 bg-white"
                  >
                    <option value="">Sélectionnez une option...</option>
                    {field.options?.split(',').map((opt: string) => (
                      <option key={opt.trim()} value={opt.trim()}>
                        {opt.trim()}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === 'checkbox' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      checked={customFieldValues[field.id] || false}
                      onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.checked })}
                      required={field.required}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-600 font-semibold">{field.label}</span>
                  </label>
                )}
              </div>
            ))}

            {/* Standard Fields */}
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type de Menu</label>
                <select
                  value={specialMeal}
                  onChange={e => setSpecialMeal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-indigo-500 bg-white"
                >
                  <option value="none">Standard</option>
                  <option value="vegetarian">Végétarien</option>
                  <option value="vegan">Végétalien (Vegan)</option>
                  <option value="halal">Halal</option>
                  <option value="kosher">Casher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Allergies éventuelles</label>
                <input
                  type="text"
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-indigo-500 bg-white"
                  placeholder="Ex: Arachides, fruits de mer..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message à l'organisateur</label>
                <textarea
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-indigo-500 bg-white"
                  placeholder="Ex: Je serai accompagné(e) de..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Envoi de la réponse...
            </>
          ) : (
            'Envoyer ma Réponse'
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      {/* Load Google Fonts stylesheet */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Dancing+Script:wght@500;700&family=Great+Vibes&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Pinyon+Script&family=Monsieur+La+Doulaise&family=Italiana&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Allura&family=Parisienne&family=Prata&family=Sacramento&family=Marcellus&display=swap" 
        rel="stylesheet" 
      />

      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.7))]" />

      <div 
        style={template ? getBackgroundStyle(bgType, bgColor, bgImageUrl, bgPattern) : { backgroundColor: '#ffffff' }}
        className={`max-w-lg w-full border border-slate-200 shadow-2xl relative z-10 overflow-hidden flex flex-col transition-all duration-300 ${
          template && frameType === 'arch' ? 'rounded-t-[240px] border-t-2 border-x-2 border-amber-200/60' : 'rounded-3xl'
        }`}
      >
        {/* Top visual envelope flap (only shown if not using custom template) */}
        {!template && <div className="h-3 bg-gradient-to-r from-indigo-500 to-violet-500" />}

        {/* Double Border Frame */}
        {template && frameType === 'double-border' && (
          <>
            <div className="absolute inset-3 border border-amber-500/20 rounded-2xl pointer-events-none" />
            <div className="absolute inset-4 border border-amber-500/10 rounded-2xl pointer-events-none" />
          </>
        )}

        {/* Gold Border Frame */}
        {template && frameType === 'gold-border' && (
          <div className="absolute inset-3 border border-amber-500/30 rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(197,160,89,0.05)]" />
        )}

        {/* Floral Wreath Frame */}
        {template && frameType === 'floral-wreath' && (
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
        {template && frameType === 'floral-arch' && (
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
        {template && frameType === 'boho-dried' && (
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
        {template && frameType === 'gold-leaves-circle' && (
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
        {template && frameType === 'minimal-leaves' && (
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

        {/* Boho Botanical Corners */}
        {template && bgPattern === 'boho' && (
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

        {/* Event Card Content */}
        <div className="p-8 space-y-8 flex-1 relative z-10">
          {/* Header */}
          {template ? (
            <form onSubmit={handleSubmitRsvp} className="flex flex-wrap gap-y-4 -mx-2 pt-2">
              {template.content?.elements?.map((el: any) => {
                const widthClass = el.width === 'half' ? 'w-1/2 px-2' : el.width === 'third' ? 'w-1/3 px-2' : 'w-full px-2';
                
                return (
                  <div key={el.id} className={widthClass}>
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
                        className="leading-relaxed break-words"
                      >
                        {formatText(el.text)}
                      </div>
                    )}
                    {el.type === 'button' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
                        {el.buttonLink ? (
                          el.buttonLink === '{{rsvpLink}}' || el.buttonLink === '#rsvp' || el.buttonLink === '#rsvp-section' ? (
                            <button 
                              type="button"
                              onClick={() => {
                                document.getElementById('rsvp-section')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              style={{ 
                                backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || '#4f46e5', 
                                color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || '#4f46e5' : '#ffffff', 
                                borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color || '#4f46e5' : 'transparent',
                                fontSize: el.fontSize,
                                fontFamily: el.fontFamily || 'Cormorant Garamond',
                                letterSpacing: el.letterSpacing || 'normal',
                                fontWeight: el.bold ? 'bold' : 'normal',
                                fontStyle: el.italic ? 'italic' : 'normal'
                              }}
                              className={`font-bold text-center inline-block transition-all cursor-pointer ${
                                el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2 shadow-sm' :
                                el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
                                el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
                                el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
                                el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none shadow-none' :
                                'px-5 py-2.5 rounded-xl shadow-md shadow-indigo-100'
                              }`}
                            >
                              {formatText(el.text)}
                            </button>
                          ) : (
                            <a 
                              href={formatText(el.buttonLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || '#4f46e5', 
                                color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || '#4f46e5' : '#ffffff', 
                                borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color || '#4f46e5' : 'transparent',
                                fontSize: el.fontSize,
                                fontFamily: el.fontFamily || 'Cormorant Garamond',
                                letterSpacing: el.letterSpacing || 'normal',
                                fontWeight: el.bold ? 'bold' : 'normal',
                                fontStyle: el.italic ? 'italic' : 'normal',
                                display: 'inline-block'
                              }}
                              className={`font-bold text-center transition-all cursor-pointer ${
                                el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2 shadow-sm' :
                                el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
                                el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
                                el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
                                el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none shadow-none' :
                                'px-5 py-2.5 rounded-xl shadow-md shadow-indigo-100'
                              }`}
                            >
                              {formatText(el.text)}
                            </a>
                          )
                        ) : (
                          <div 
                            style={{ 
                              backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || '#4f46e5', 
                              color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || '#4f46e5' : '#ffffff', 
                              borderColor: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' || el.buttonStyle === 'minimalist' ? el.color || '#4f46e5' : 'transparent',
                              fontSize: el.fontSize,
                              fontFamily: el.fontFamily || 'Cormorant Garamond',
                              letterSpacing: el.letterSpacing || 'normal',
                              fontWeight: el.bold ? 'bold' : 'normal',
                              fontStyle: el.italic ? 'italic' : 'normal'
                            }}
                            className={`font-bold text-center inline-block transition-all ${
                              el.buttonStyle === 'outline' ? 'px-6 py-2.5 rounded-xl border-2 shadow-sm' :
                              el.buttonStyle === 'pill' ? 'px-6 py-2.5 rounded-full shadow-md' :
                              el.buttonStyle === 'gold-glow' ? 'px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.4)]' :
                              el.buttonStyle === 'double-border' ? 'px-6 py-2 rounded-xl border-4 border-double' :
                              el.buttonStyle === 'minimalist' ? 'px-2 py-1 border-b-2 rounded-none shadow-none' :
                              'px-5 py-2.5 rounded-xl shadow-md shadow-indigo-100'
                            }`}
                          >
                            {formatText(el.text)}
                          </div>
                        )}
                      </div>
                    )}
                    {el.type === 'image' && (
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'}`}>
                        {el.imageUrl ? (
                          <img 
                            src={el.imageUrl} 
                            alt="Invitation" 
                            style={{ width: el.imageWidth || '100%', height: el.imageHeight || 'auto', objectFit: el.imageObjectFit || 'cover' }}
                            className={`border border-slate-200 shadow-sm ${
                              el.imageStyle === 'circle' ? 'rounded-full border-2 border-amber-200 aspect-square' :
                              el.imageStyle === 'arch' ? 'rounded-t-[120px] border-2 border-amber-100' :
                              el.imageStyle === 'oval' ? 'rounded-[50%] border-2 border-amber-100 aspect-[3/4]' :
                              el.imageStyle === 'gold-frame' ? 'rounded-2xl border-4 border-amber-400/80 p-1 bg-white shadow-lg' :
                              el.imageStyle === 'vintage' ? 'rounded-none border-8 border-amber-950/10 shadow-xl sepia contrast-[1.1]' :
                              el.imageStyle === 'shadow-luxury' ? 'rounded-3xl border border-slate-100 shadow-[0_15px_30px_rgba(197,160,89,0.12)]' :
                              'rounded-2xl'
                            }`}
                          />
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500 font-semibold w-full">
                            {el.text || "Image d'illustration"}
                          </div>
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
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-2`}>
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
                      <div className={`flex justify-${el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'center'} py-2`}>
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
                      <div id="rsvp-section">
                        {renderRsvpFormControls(el)}
                      </div>
                    )}
                  </div>
                );
              })}
            </form>
          ) : (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Invitation Privée
                </div>
                <h1 className="text-3xl font-black text-slate-950 tracking-tight leading-tight">
                  {guest.event.title}
                </h1>
                <p className="text-sm font-semibold text-slate-500">
                  Chaleureusement adressée à <span className="text-indigo-600 font-bold">{guest.firstName} {guest.lastName}</span>
                </p>
              </div>

              {/* Event Details Box */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4 shadow-sm text-sm">
                {guest.event.description && (
                  <p className="text-slate-600 italic leading-relaxed text-center border-b border-slate-100 pb-3.5">
                    "{guest.event.description}"
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl"><Calendar className="w-5 h-5" /></div>
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</div>
                      <div className="font-extrabold text-slate-800 text-xs">
                        {new Date(guest.event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl"><MapPin className="w-5 h-5" /></div>
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lieu</div>
                      <div className="font-extrabold text-slate-800 text-xs truncate max-w-[150px]">{guest.event.location}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default RSVP Form */}
              <form onSubmit={handleSubmitRsvp} className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-1">
                    Serez-vous parmi nous ?
                  </label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRsvpStatus('ACCEPTED')}
                      className={`py-4 px-6 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 transition ${rsvpStatus === 'ACCEPTED' ? 'border-emerald-600 bg-emerald-50/20 text-emerald-800 shadow-md shadow-emerald-50' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      <CheckCircle2 className={`w-7 h-7 ${rsvpStatus === 'ACCEPTED' ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span className="text-sm font-bold">Oui, avec joie !</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRsvpStatus('DECLINED')}
                      className={`py-4 px-6 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 transition ${rsvpStatus === 'DECLINED' ? 'border-rose-600 bg-rose-50/20 text-rose-800 shadow-md shadow-rose-50' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      <XCircle className={`w-7 h-7 ${rsvpStatus === 'DECLINED' ? 'text-rose-600' : 'text-slate-300'}`} />
                      <span className="text-sm font-bold">Non, désolé(e)</span>
                    </button>
                  </div>
                </div>

                {/* Meal Preferences Panel - Only show if attending */}
                {rsvpStatus === 'ACCEPTED' && (
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white space-y-4 shadow-sm animate-fade-in text-sm">
                    <div className="flex items-center gap-2 font-bold text-slate-950 border-b border-slate-100 pb-3">
                      <Utensils className="w-5 h-5 text-indigo-600" />
                      <h4>Préférences de repas & Notes</h4>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type de Menu</label>
                        <select
                          value={specialMeal}
                          onChange={e => setSpecialMeal(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-indigo-500"
                        >
                          <option value="none">Standard</option>
                          <option value="vegetarian">Végétarien</option>
                          <option value="vegan">Végétalien (Vegan)</option>
                          <option value="halal">Halal</option>
                          <option value="kosher">Casher</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Allergies éventuelles</label>
                        <input
                          type="text"
                          value={allergies}
                          onChange={e => setAllergies(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-indigo-500"
                          placeholder="Ex: Arachides, fruits de mer, lactose..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Remarques / Message à l'organisateur
                  </label>
                  <textarea
                    value={additionalNotes}
                    onChange={e => setAdditionalNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-indigo-500"
                    placeholder="Ex: Je serai accompagné(e) de..."
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi de la réponse...
                    </>
                  ) : (
                    'Envoyer ma Réponse'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Event Location & Directions Card */}
      {guest && guest.event?.location && (
        <div className="w-full max-w-lg bg-white/90 backdrop-blur-md rounded-[24px] border border-slate-200/60 shadow-xl p-6 space-y-4 text-center relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-200 via-yellow-500 to-amber-200" />
          <div className="flex flex-col items-center gap-2">
            <div className="bg-amber-50 text-amber-700 p-2.5 rounded-full border border-amber-100/50">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-serif">Lieu de Réception</h3>
            <p className="text-sm text-slate-700 font-semibold max-w-md mx-auto leading-relaxed">
              {guest.event.location}
            </p>
          </div>

          {/* Interactive Map Embed */}
          <div className="w-full overflow-hidden rounded-2xl border border-slate-100 shadow-inner h-[250px] relative bg-slate-50">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={
                guest.event.latitude && guest.event.longitude
                  ? `https://maps.google.com/maps?q=${guest.event.latitude},${guest.event.longitude}&z=16&output=embed`
                  : `https://maps.google.com/maps?q=${encodeURIComponent(guest.event.location)}&z=15&output=embed`
              }
              className="absolute inset-0"
            ></iframe>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <a 
              href={
                guest.event.latitude && guest.event.longitude
                  ? `https://www.google.com/maps/search/?api=1&query=${guest.event.latitude},${guest.event.longitude}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(guest.event.location)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-slate-200 hover:shadow-lg"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Ouvrir dans Google Maps
            </a>
            {guest.event.latitude && guest.event.longitude && (
              <a 
                href={`https://www.waze.com/ul?ll=${guest.event.latitude},${guest.event.longitude}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-sky-100 hover:shadow-lg"
              >
                🚗 Naviguer avec Waze
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
