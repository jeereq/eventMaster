'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { 
  Calendar, Users, Award, Shield, CheckCircle, Mail, 
  ArrowRight, Lock, Layout, Sparkles, Compass, Heart, 
  Briefcase, Smartphone, Star, ShieldCheck, Check, XCircle,
  PartyPopper, Loader2, LayoutGrid
} from 'lucide-react';

interface MockTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  style: {
    bg: string;
    border: string;
    textTitle: string;
    textBody: string;
    btnBg: string;
    btnText: string;
  };
  elements: Array<{
    type: 'text' | 'button' | 'rsvp';
    content: string;
    color?: string;
    fontSize?: string;
  }>;
}

export default function Home() {
  const { user, tenant, logout } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<string>('');
  const [modalTemplate, setModalTemplate] = useState<any | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Static fallback templates in case database is empty or offline
  const fallbackTemplates: MockTemplate[] = [
    {
      id: 'wedding',
      name: 'Mariage Élégant & Romantique',
      category: 'private',
      description: 'Un modèle aux tons pastel avec des polices serif élégantes, parfait pour les grands jours.',
      style: {
        bg: 'bg-stone-50',
        border: 'border-amber-100',
        textTitle: 'text-stone-800 font-serif',
        textBody: 'text-stone-600',
        btnBg: 'bg-stone-800 hover:bg-stone-700',
        btnText: 'text-white font-serif'
      },
      elements: [
        { type: 'text', content: 'CÉLÉBRATION DE NOTRE UNION', color: '#9a3412', fontSize: 'text-xs tracking-widest' },
        { type: 'text', content: 'Claire & Alexandre', color: '#1c1917', fontSize: 'text-3xl sm:text-4xl font-extrabold' },
        { type: 'text', content: 'Nous sommes impatients de célébrer ce moment entourés de nos proches. Rejoignez-nous pour notre mariage suivi d\'une réception privée.', color: '#44403c', fontSize: 'text-sm' },
        { type: 'button', content: 'Confirmer ma Présence (RSVP)' }
      ]
    },
    {
      id: 'gala',
      name: 'Gala Prestige & Entreprise',
      category: 'corporate',
      description: 'Fond sombre premium et liserés dorés pour vos dîners caritatifs, lancements et remises de prix.',
      style: {
        bg: 'bg-slate-950',
        border: 'border-amber-500/20',
        textTitle: 'text-amber-400 font-sans',
        textBody: 'text-slate-400',
        btnBg: 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600',
        btnText: 'text-slate-950 font-black'
      },
      elements: [
        { type: 'text', content: 'SOIRÉE ANNUELLE DE BIENFAISANCE', color: '#f59e0b', fontSize: 'text-xs tracking-widest' },
        { type: 'text', content: 'Gala d\'Excellence 2026', color: '#ffffff', fontSize: 'text-3xl font-black' },
        { type: 'text', content: 'Une soirée prestigieuse dédiée à l\'innovation et à la solidarité internationale. Tenue de soirée exigée.', color: '#94a3b8', fontSize: 'text-sm' },
        { type: 'button', content: 'Réserver mon Billet Individuel' }
      ]
    },
    {
      id: 'cocktail',
      name: 'Cocktail & Networking',
      category: 'casual',
      description: 'Mise en page dynamique et colorée pour les cocktails dînatoires et événements professionnels décontractés.',
      style: {
        bg: 'bg-indigo-950',
        border: 'border-indigo-800/30',
        textTitle: 'text-indigo-300 font-sans',
        textBody: 'text-indigo-200/80',
        btnBg: 'bg-indigo-600 hover:bg-indigo-500',
        btnText: 'text-white'
      },
      elements: [
        { type: 'text', content: 'NETWORKING & COCKTAIL', color: '#a5b4fc', fontSize: 'text-xs tracking-widest' },
        { type: 'text', content: 'Cocktail d\'Inauguration', color: '#ffffff', fontSize: 'text-3xl font-black' },
        { type: 'text', content: 'Rencontrez l\'écosystème local et découvrez nos nouveaux locaux autour d\'une sélection de mets raffinés.', color: '#cbd5e1', fontSize: 'text-sm' },
        { type: 'button', content: 'S\'inscrire à la Soirée' }
      ]
    }
  ];

  useEffect(() => {
    async function checkServerAndFetchTemplates() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/health`);
        if (response.ok) {
          setServerStatus('online');
          
          // Fetch templates configured for landing page
          const templatesData = await api.get('/public/templates');
          if (Array.isArray(templatesData) && templatesData.length > 0) {
            // Map DB templates to MockTemplate structure
            const mapped = templatesData.map((t: any) => {
              const content = t.content || {};
              return {
                id: t.id,
                name: t.name,
                category: content.category || 'private',
                description: content.description || 'Modèle personnalisé configuré par l\'administrateur.',
                style: content.style || {
                  bg: 'bg-white',
                  border: 'border-slate-200',
                  textTitle: 'text-slate-900 font-sans',
                  textBody: 'text-slate-600',
                  btnBg: 'bg-indigo-600 hover:bg-indigo-700',
                  btnText: 'text-white'
                },
                elements: content.elements || [
                  { type: 'text', content: t.name.toUpperCase(), color: '#4f46e5', fontSize: 'text-xs tracking-widest' },
                  { type: 'text', content: content.subject || 'Vous êtes invité !', color: '#0f172a', fontSize: 'text-2xl font-extrabold' },
                  { type: 'text', content: content.body || 'Rejoignez-nous pour cet événement exceptionnel.', color: '#475569', fontSize: 'text-sm' },
                  { type: 'button', content: 'Confirmer ma présence' }
                ]
              };
            });
            setDbTemplates(mapped);
            setPreviewTemplate(mapped[0].id);
          } else {
            setDbTemplates([]);
            setPreviewTemplate('wedding');
          }
        } else {
          setServerStatus('offline');
          setPreviewTemplate('wedding');
        }
      } catch (err) {
        setServerStatus('offline');
        setPreviewTemplate('wedding');
      } finally {
        setLoadingTemplates(false);
      }
    }
    checkServerAndFetchTemplates();
  }, []);

  const categories = [
    { id: 'all', name: 'Tous les modèles' },
    { id: 'private', name: 'Privé & Célébrations' },
    { id: 'corporate', name: 'Professionnel & Gala' },
    { id: 'casual', name: 'Moderne & Cocktail' },
  ];

  // Use DB templates if available, otherwise fall back to static ones
  const activeTemplatesList = dbTemplates.length > 0 ? dbTemplates : fallbackTemplates;

  const filteredTemplates = selectedCategory === 'all' 
    ? activeTemplatesList 
    : activeTemplatesList.filter(t => t.category === selectedCategory);

  const activePreview = activeTemplatesList.find(t => t.id === previewTemplate) || activeTemplatesList[0];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <PartyPopper className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              EventMaster
            </span>
            
            {/* Indicateur de connexion API en temps réel */}
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500">
              <span className={`w-2 h-2 rounded-full ${
                serverStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 
                serverStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span>
                {serverStatus === 'online' ? 'API Connectée' : 
                 serverStatus === 'offline' ? 'API Déconnectée' : 'Vérification API...'}
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-xs text-slate-500 font-semibold hidden md:inline">
                  Connecté en tant que <span className="font-bold text-indigo-600">{user.name}</span> {tenant ? `(${tenant.name})` : ''}
                </span>
                <Link href="/dashboard" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-100">
                  Tableau de Bord
                </Link>
                <button 
                  onClick={logout}
                  className="text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl transition"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition">
                  Connexion
                </Link>
                <Link href="/register" className="text-sm font-semibold bg-indigo-600 text-white px-4.5 py-2 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-100">
                  Essai Gratuit
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-80" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Left: Value Proposition */}
            <div className="space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Plateforme SaaS Multi-tenant</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-none">
                Gérez vos événements privés en toute <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">sécurité</span>.
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                EventMaster centralise l'organisation de vos réceptions, de l'import de vos invités au suivi en temps réel de leurs préférences, avec un créateur d'invitations interactif et un cloisonnement strict par organisation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xl shadow-indigo-150 transition group text-base">
                    Accéder à mon Tableau de Bord
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xl shadow-indigo-100 transition group text-base">
                      Créer mon organisation
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                    </Link>
                    <Link href="/login" className="inline-flex items-center justify-center px-6 py-3.5 border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 font-semibold rounded-xl bg-white transition text-base shadow-sm">
                      Accéder à mon espace
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Hero Right: Live Interactive Presentation of Models */}
            <div className="bg-slate-100 p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-lg relative flex flex-col justify-between">
              <div className="absolute -top-3 -right-3 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow z-10 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-white" />
                Aperçu du designer
              </div>

              {loadingTemplates ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : activePreview ? (
                <>
                  {/* Selector within Preview Widget */}
                  <div className="flex gap-2 mb-4 border-b border-slate-200 pb-3 overflow-x-auto">
                    {activeTemplatesList.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setPreviewTemplate(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${previewTemplate === t.id ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {t.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  {/* Invitation Model Render Card */}
                  <div className={`rounded-2xl border ${activePreview.style.bg} ${activePreview.style.border} p-6 sm:p-8 space-y-6 shadow-md transition-all duration-300 min-h-[340px] flex flex-col justify-between relative overflow-hidden`}>
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                    
                    <div className="space-y-4 pt-2">
                      {activePreview.elements.map((el: any, i: number) => {
                        if (el.type === 'text') {
                          return (
                            <div 
                              key={i} 
                              style={{ color: el.color }}
                              className={`${el.fontSize || 'text-base'} text-center leading-relaxed`}
                            >
                              {el.content}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <div className="flex justify-center pt-4">
                      <div className={`px-5 py-2.5 rounded-xl font-bold text-center inline-block text-sm shadow-md cursor-pointer ${activePreview.style.btnBg} ${activePreview.style.btnText}`}>
                        {activePreview.elements.find((el: any) => el.type === 'button')?.content || 'S\'inscrire'}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-slate-500">
                  Aucun modèle disponible.
                </div>
              )}

              <div className="mt-4 text-center text-xs text-slate-500 font-medium">
                Générez des liens RSVP sécurisés et uniques pour chaque invité.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ce Que Nous Faisons (What We Do / Value Prop) */}
      <section className="py-20 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ce Que Nous Faisons</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              EventMaster fournit aux créateurs d'événements, aux professionnels et aux entreprises un outil SaaS complet de gestion d'invitations privées, assurant une parfaite étanchéité de leurs données.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:shadow-lg transition">
              <div className="bg-indigo-50 text-indigo-600 w-11 h-11 rounded-xl flex items-center justify-center mb-5">
                <ShieldCheck className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">Isolation Multi-tenant</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Chaque organisation possède son propre espace logique. Les bases de données filtrent vos événements et modèles de manière hermétique pour une protection optimale des données de vos convives.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:shadow-lg transition">
              <div className="bg-violet-50 text-violet-600 w-11 h-11 rounded-xl flex items-center justify-center mb-5">
                <Users className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">Gestion d'Invités & Excel</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gérez la liste de vos invités avec un contrôle RSVP complet. Importez instantanément des listes entières à partir de fichiers Excel (.xlsx) ou CSV avec aperçu dynamique, et exportez vos données en un clic.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:shadow-lg transition">
              <div className="bg-amber-50 text-amber-600 w-11 h-11 rounded-xl flex items-center justify-center mb-5">
                <LayoutGrid className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">Plan de Table Interactif</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Organisez vos salles de réception en 2D grâce à notre plan de table interactif. Créez des tables de formes variées (rondes, rectangulaires, carrées, ovales), déplacez-les par glisser-déposer et placez vos invités.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:shadow-lg transition">
              <div className="bg-emerald-50 text-emerald-600 w-11 h-11 rounded-xl flex items-center justify-center mb-5">
                <Smartphone className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">Portail RSVP & Badge QR</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Chaque convive accède à un portail de réponse personnalisé. Dès sa confirmation, un badge unique avec un QR Code aux couleurs de la plateforme et logo central lui est généré pour un émargement ultra-rapide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nos Modèles Possibles (Invitation Models Showcase) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Nos Modèles Possibles</h2>
            <p className="text-slate-600">Explorez quelques-unes des structures de modèles d'invitation pré-configurées ou créez les vôtres de toutes pièces.</p>
            
            {/* Filter buttons */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${selectedCategory === c.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {loadingTemplates ? (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Chargement des modèles...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-slate-500 font-medium">
                Aucun modèle disponible dans cette catégorie.
              </div>
            ) : (
              filteredTemplates.map((t) => (
                <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:shadow-md transition duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {t.category === 'private' ? 'Événement Privé' : t.category === 'corporate' ? 'Professionnel' : 'Cocktail'}
                      </span>
                      <button
                        onClick={() => setModalTemplate(t)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        Apercevoir
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{t.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>

                    {/* Component preview badges */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="bg-white border border-slate-200 px-2 py-1 rounded-md text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                        <Layout className="w-3.5 h-3.5 text-indigo-500" /> Elements JSON
                      </span>
                      <span className="bg-white border border-slate-200 px-2 py-1 rounded-md text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> Mobile Ready
                      </span>
                      <span className="bg-white border border-slate-200 px-2 py-1 rounded-md text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-indigo-500" /> RSVP Inclus
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 pt-4 mt-6 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="truncate max-w-[150px]">Modèle {t.name}</span>
                    <Link href="/register" className="text-indigo-600 hover:underline">
                      Utiliser ce modèle
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Grille des Pricing (Pricing Options) */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Des Tarifs Transparents pour Chaque Échelle</h2>
            <p className="text-slate-600">Sélectionnez le forfait adapté à la taille de votre organisation et débloquez de nouvelles limites.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
            {/* Free Plan */}
            <div className="border border-slate-200 rounded-3xl p-6 bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Plan Gratuit</h3>
                  <p className="text-xs text-slate-500 mt-1">Parfait pour tester l'application ou organiser un petit événement.</p>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-extrabold text-slate-900">0 FC</span>
                    <span className="text-slate-500 text-sm">/sans engagement</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Jusqu'à 3 événements actifs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Maximum 50 invités</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>2 modèles d'invitation simples</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400 line-through">
                    <span>Modèles d'invitations customisés</span>
                  </li>
                </ul>
              </div>

              <Link href="/register" className="w-full text-center py-2.5 mt-6 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition text-xs">
                S'inscrire gratuitement
              </Link>
            </div>

            {/* Standard Plan */}
            <div className="border border-slate-200 rounded-3xl p-6 bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Plan Standard</h3>
                  <p className="text-xs text-slate-500 mt-1">Idéal pour les événements de taille moyenne.</p>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-extrabold text-slate-900">40.000 FC</span>
                    <span className="text-slate-500 text-sm">/mois</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Jusqu'à 8 événements actifs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Maximum 150 invités</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>5 modèles d'invitations</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400 line-through">
                    <span>Modèles d'invitations customisés</span>
                  </li>
                </ul>
              </div>

              <Link href="/register" className="w-full text-center py-2.5 mt-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition text-xs shadow-md">
                Activer le Plan Standard
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="border-2 border-indigo-600 rounded-3xl p-6 bg-white flex flex-col justify-between shadow-lg relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                Recommandé
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Plan Premium</h3>
                  <p className="text-xs text-slate-500 mt-1">Conçu pour les organisateurs réguliers d'événements.</p>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-extrabold text-indigo-600">80.000 FC</span>
                    <span className="text-slate-500 text-sm">/mois</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Jusqu'à 20 événements actifs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Maximum 500 invités</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>10 modèles d'invitations</span>
                  </li>
                  <li className="flex items-center gap-2.5 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Modèles customisés (JSON Editor)</span>
                  </li>
                </ul>
              </div>

              <Link href="/register" className="w-full text-center py-2.5 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-100 text-xs">
                Activer le Plan Premium
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="border border-slate-200 rounded-3xl p-6 bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Plan Enterprise</h3>
                  <p className="text-xs text-slate-500 mt-1">Pour les grandes agences événementielles ou besoins sur-mesure.</p>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-extrabold text-slate-900">275.000 FC</span>
                    <span className="text-slate-500 text-sm">/mois</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Nombre d'événements illimités</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Nombre d'invités illimités</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Modèles illimités</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Rapports avancés et CA</span>
                  </li>
                </ul>
              </div>

              <Link href="/register" className="w-full text-center py-2.5 mt-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition text-xs shadow-md">
                Prendre contact
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:flex sm:justify-between sm:items-center">
          <div className="flex items-center justify-center gap-2 mb-4 sm:mb-0">
            <PartyPopper className="w-5 h-5 text-indigo-500" />
            <span className="text-white font-bold">EventMaster</span>
          </div>
          <p className="text-xs">© 2026 EventMaster SaaS. Isolation stricte garantie. Tous droits réservés.</p>
        </div>
      </footer>

      {/* Modal de prévisualisation de modèle */}
      {modalTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
            
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {modalTemplate.category === 'private' ? 'Événement Privé' : modalTemplate.category === 'corporate' ? 'Professionnel' : 'Cocktail'}
              </span>
              <button 
                onClick={() => setModalTemplate(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900 leading-tight">{modalTemplate.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{modalTemplate.description}</p>
            </div>

            {/* Rendered Card */}
            <div className={`rounded-2xl border ${modalTemplate.style.bg} ${modalTemplate.style.border} p-6 sm:p-8 space-y-6 shadow-inner relative overflow-hidden`}>
              <div className="space-y-4">
                {modalTemplate.elements.map((el: any, i: number) => {
                  if (el.type === 'text') {
                    return (
                      <div 
                        key={i} 
                        style={{ color: el.color }}
                        className={`${el.fontSize || 'text-sm'} text-center leading-relaxed`}
                      >
                        {el.content}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              <div className="flex justify-center pt-4">
                <div className={`px-5 py-2.5 rounded-xl font-bold text-center inline-block text-sm shadow-md ${modalTemplate.style.btnBg} ${modalTemplate.style.btnText}`}>
                  {modalTemplate.elements.find((el: any) => el.type === 'button')?.content || 'S\'inscrire'}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalTemplate(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Fermer
              </button>
              <Link
                href="/register"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs text-center transition shadow-md shadow-indigo-100"
              >
                Utiliser ce modèle
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
