'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import {
  buildLandingTemplateGroups,
  type LandingTemplate,
} from '@/config/landingTemplates';
import { fetchPublicLandingTemplates } from '@/lib/landingTemplateAdapter';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import LandingRolesSection from '@/components/landing/LandingRolesSection';
import LandingWorkflowSection from '@/components/landing/LandingWorkflowSection';
import LandingMobileSection from '@/components/landing/LandingMobileSection';
import FaqSection from '@/components/landing/FaqSection';
import LandingInvitationPreview from '@/components/landing/LandingInvitationPreview';
import SiteFooter from '@/components/SiteFooter';
import { 
  Calendar, Users, Award, Shield, CheckCircle, Mail, 
  ArrowRight, Lock, Layout, Sparkles, Compass, Heart, 
  Briefcase, Smartphone, Star, ShieldCheck, Check, XCircle,
  PartyPopper, Loader2, LayoutGrid, Sun, Moon, Menu, X, MessageSquare,
  ScanLine, Building2,
} from 'lucide-react';

function getCategoryLabel(category: string) {
  if (category === 'private') return 'Événement Privé';
  if (category === 'corporate') return 'Professionnel';
  return 'Cocktail';
}

export default function Home() {
  const { user, tenant, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<string>('');
  const [modalTemplate, setModalTemplate] = useState<LandingTemplate | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [dbPlans, setDbPlans] = useState<any>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [publicTemplates, setPublicTemplates] = useState<LandingTemplate[]>([]);
  const [loadingPublicTemplates, setLoadingPublicTemplates] = useState(true);

  useEffect(() => {
    async function checkServerAndFetchPlans() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/health`, {
          cache: 'no-store',
        });
        if (response.ok) {
          setServerStatus('online');
          const plansData = await api.get('/public/plans').catch(() => null);
          if (plansData) setDbPlans(plansData);
        } else {
          setServerStatus('offline');
        }
      } catch {
        setServerStatus('offline');
      } finally {
        setLoadingPlans(false);
      }
    }

    async function loadPublicTemplates() {
      const fromDb = await fetchPublicLandingTemplates();
      setPublicTemplates(fromDb);
      setLoadingPublicTemplates(false);
    }

    checkServerAndFetchPlans();
    loadPublicTemplates();
  }, []);

  useEffect(() => {
    if (publicTemplates.length > 0 && !publicTemplates.some((t) => t.id === previewTemplate)) {
      setPreviewTemplate(publicTemplates[0].id);
    }
  }, [publicTemplates, previewTemplate]);

  const categories = [
    { id: 'all', name: 'Tous les modèles' },
    { id: 'private', name: 'Privé & Célébrations' },
    { id: 'corporate', name: 'Professionnel & Gala' },
    { id: 'casual', name: 'Moderne & Cocktail' },
  ];

  const filteredTemplateGroups = buildLandingTemplateGroups(publicTemplates, selectedCategory);

  const activePreview = publicTemplates.find((t) => t.id === previewTemplate) || publicTemplates[0];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="w-full px-4 sm:px-6 max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <PartyPopper className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                EventMaster
              </span>
            </Link>
            
            {/* Indicateur de connexion API en temps réel */}
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
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

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <Link href="/contact" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Contact
            </Link>
            <Link href="/faq" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              FAQ
            </Link>
            <a href="#parcours" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Parcours
            </a>
            <a href="#mobile" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Mobile
            </a>
            <a href="#tarifs" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Tarifs
            </a>
            {user ? (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Connecté en tant que <span className="font-bold text-indigo-600">{user.name}</span> {tenant ? `(${tenant.name})` : ''}
                </span>
                <Link href="/dashboard" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20">
                  Tableau de Bord
                </Link>
                <button 
                  onClick={logout}
                  className="text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Connexion
                </Link>
                <Link href="/register" className="text-sm font-semibold bg-indigo-600 text-white px-4.5 py-2 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20">
                  Essai Gratuit
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-6 space-y-4 animate-fade-in shadow-xl dark:shadow-lg">
            <div className="flex flex-col gap-3">
              <Link 
                href="/contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-2 border-b border-slate-100 dark:border-slate-900"
              >
                Contact
              </Link>
              <Link 
                href="/faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-2 border-b border-slate-100 dark:border-slate-900"
              >
                FAQ
              </Link>
              <a 
                href="#parcours" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-2 border-b border-slate-100 dark:border-slate-900"
              >
                Parcours invité
              </a>
              <a 
                href="#mobile" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-2 border-b border-slate-100 dark:border-slate-900"
              >
                Application mobile
              </a>
              <a 
                href="#tarifs" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-2 border-b border-slate-100 dark:border-slate-900"
              >
                Tarifs
              </a>
              {user ? (
                <>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold py-1">
                    Connecté en tant que <span className="font-bold text-indigo-600">{user.name}</span> {tenant ? `(${tenant.name})` : ''}
                  </div>
                  <Link 
                    href="/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 text-center"
                  >
                    Tableau de Bord
                  </Link>
                  <button 
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 px-4 py-2.5 rounded-xl transition cursor-pointer text-center w-full"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-2 border-b border-slate-100 dark:border-slate-900 text-center"
                  >
                    Connexion
                  </Link>
                  <Link 
                    href="/register" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-semibold bg-indigo-600 text-white px-4.5 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 text-center"
                  >
                    Essai Gratuit
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28 bg-white dark:bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-80" />
        <div className="w-full px-4 sm:px-6 max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Left: Value Proposition */}
            <div className="space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Web + Mobile · Protocole QR · Livraison placement intelligente</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                L&apos;événementiel professionnel, de la salle au{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">scan invité</span>.
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                EventMaster unifie plans de salle 2D, RSVP multi-canal, protocole QR (web et app native),
                livraison automatique PDF + GPS après check-in, rôles granulaires et réseau commercial —
                le tout isolé par organisation.
              </p>
              <ul className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> App iOS & Android
                </li>
                <li className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full">
                  <ScanLine className="w-3.5 h-3.5 text-indigo-500" /> Protocole QR
                </li>
                <li className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Salles 2D
                </li>
                <li className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Rôles & permissions
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/25 transition group text-base">
                    Accéder à mon Tableau de Bord
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/25 transition group text-base">
                      Créer mon organisation
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                    </Link>
                    <Link href="/login" className="inline-flex items-center justify-center px-6 py-3.5 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-semibold rounded-xl bg-white dark:bg-slate-900 transition text-base shadow-sm">
                      Accéder à mon espace
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Hero Right: Live Interactive Presentation of Models */}
            <div className="bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative flex flex-col justify-between">
              <div className="absolute -top-3 -right-3 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow z-10 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-white" />
                Aperçu du designer
              </div>

              {loadingPlans || loadingPublicTemplates ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : activePreview ? (
                <>
                  {/* Selector within Preview Widget */}
                  <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
                    {publicTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setPreviewTemplate(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${previewTemplate === t.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                      >
                        {t.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  <LandingInvitationPreview template={activePreview} />
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

      <LandingRolesSection />

      <LandingWorkflowSection />

      <LandingMobileSection />

      {/* Nos Modèles Possibles (Invitation Models Showcase) */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="w-full px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Nos Modèles Possibles</h2>
            <p className="text-slate-600 dark:text-slate-400">
              {loadingPublicTemplates
                ? 'Chargement des modèles publics…'
                : publicTemplates.length === 0
                  ? 'Aucun modèle global pour le moment. Activez « Sur la landing page » sur un modèle global (sans organisation) depuis le concepteur visuel super admin.'
                  : `${publicTemplates.length} modèle${publicTemplates.length > 1 ? 's' : ''} global${publicTemplates.length > 1 ? 'aux' : ''} affiché${publicTemplates.length > 1 ? 's' : ''} sur la vitrine, répartis en trois univers — privé, professionnel et cocktail.`}
            </p>
            
            {/* Filter buttons */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${selectedCategory === c.id ? 'bg-indigo-600 text-white shadow-md dark:shadow-none' : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-16">
            {loadingPublicTemplates ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : publicTemplates.length === 0 ? (
              <div className="text-center py-12 px-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto">
                Aucun modèle n&apos;est affiché sur la vitrine pour l&apos;instant. Créez un modèle global dans le concepteur visuel et activez « Sur la landing page ».
              </div>
            ) : filteredTemplateGroups.every((g) => g.templates.length === 0) ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-medium">
                Aucun modèle disponible dans cette catégorie.
              </div>
            ) : (
              filteredTemplateGroups.map((group) => (
                <div key={group.id} className="space-y-8">
                  {selectedCategory === 'all' && group.title && (
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{group.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{group.subtitle}</p>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.templates.map((t) => (
                      <div key={t.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:shadow-md transition duration-300">
                        <div className="space-y-4">
                        <button
                          type="button"
                          onClick={() => setModalTemplate(t)}
                          className="w-full text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <LandingInvitationPreview template={t} compact />
                        </button>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {getCategoryLabel(t.category)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setModalTemplate(t)}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700 dark:hover:text-indigo-300 transition cursor-pointer"
                            >
                              Apercevoir
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">{t.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.description}</p>

                          <div className="flex flex-wrap gap-2">
                            <span className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-[10px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                              <Layout className="w-3.5 h-3.5 text-indigo-500" /> Personnalisable
                            </span>
                            <span className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-[10px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                              <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> Mobile Ready
                            </span>
                            <span className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-[10px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                              <Compass className="w-3.5 h-3.5 text-indigo-500" /> RSVP Inclus
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-4 mt-5 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <span className="truncate max-w-[150px]">{t.name}</span>
                          <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                            Utiliser ce modèle
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <LandingPricingSection dbPlans={dbPlans} />

      <FaqSection />

      {/* Section CTA (Call to Action) */}
      <section className="py-20 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/20 blur-[120px] pointer-events-none" />

        <div className="w-full px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Prêt à commencer ?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none max-w-3xl mx-auto">
            Donnez à vos événements l'élégance qu'ils méritent
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Rejoignez les organisateurs d&apos;événements privés et professionnels qui font confiance à EventMaster
            pour leurs invitations, plans de table, protocole jour J et parcours invité web + mobile.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {user ? (
              <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition group text-sm">
                Accéder à mon Tableau de Bord
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
            ) : (
              <>
                <Link href="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition group text-sm">
                  Créer mon organisation gratuitement
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center px-6 py-3 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white font-semibold rounded-xl bg-slate-900/50 hover:bg-slate-900 transition text-sm">
                  Parler à un conseiller
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <SiteFooter faqHref="/#faq" />

      {/* Modal de prévisualisation de modèle */}
      {modalTemplate && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="presentation"
          onClick={() => setModalTemplate(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-preview-title"
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
            
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {getCategoryLabel(modalTemplate.category)}
              </span>
              <button 
                onClick={() => setModalTemplate(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg transition cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 id="landing-preview-title" className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{modalTemplate.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{modalTemplate.description}</p>
            </div>

            <LandingInvitationPreview template={modalTemplate} />

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalTemplate(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Fermer
              </button>
              <Link
                href="/register"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs text-center transition shadow-md dark:shadow-none"
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
