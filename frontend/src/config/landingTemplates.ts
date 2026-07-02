export interface LandingTemplate {
  id: string;
  name: string;
  category: 'private' | 'corporate' | 'casual';
  group: 'private' | 'corporate' | 'casual';
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

export const LANDING_TEMPLATE_GROUPS = [
  {
    id: 'private' as const,
    title: 'Célébrations privées',
    subtitle: 'Mariages, baptêmes et anniversaires avec une touche personnelle.',
  },
  {
    id: 'corporate' as const,
    title: 'Événements professionnels',
    subtitle: 'Galas, séminaires et lancements pour marquer les esprits.',
  },
  {
    id: 'casual' as const,
    title: 'Cocktails & soirées',
    subtitle: 'Formats dynamiques pour networking et moments conviviaux.',
  },
];

export const LANDING_TEMPLATES: LandingTemplate[] = [
  // ——— Groupe 1 : Privé ———
  {
    id: 'wedding-elegant',
    name: 'Mariage Élégant & Romantique',
    category: 'private',
    group: 'private',
    description: 'Tons pastel et typographie serif pour un grand jour raffiné et intemporel.',
    style: {
      bg: 'bg-stone-50',
      border: 'border-amber-100',
      textTitle: 'text-stone-800 font-serif',
      textBody: 'text-stone-600',
      btnBg: 'bg-stone-800 hover:bg-stone-700',
      btnText: 'text-white font-serif',
    },
    elements: [
      { type: 'text', content: 'CÉLÉBRATION DE NOTRE UNION', color: '#9a3412', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: 'Claire & Alexandre', color: '#1c1917', fontSize: 'text-3xl sm:text-4xl font-extrabold' },
      { type: 'text', content: 'Rejoignez-nous pour notre mariage suivi d\'une réception privée entourés de nos proches.', color: '#44403c', fontSize: 'text-sm' },
      { type: 'button', content: 'Confirmer ma présence' },
    ],
  },
  {
    id: 'baptism-family',
    name: 'Baptême & Fête de Famille',
    category: 'private',
    group: 'private',
    description: 'Ambiance douce bleu ciel et crème, idéale pour les cérémonies familiales.',
    style: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      textTitle: 'text-sky-900 font-serif',
      textBody: 'text-sky-700/80',
      btnBg: 'bg-sky-600 hover:bg-sky-700',
      btnText: 'text-white',
    },
    elements: [
      { type: 'text', content: 'CÉRÉMONIE DE BAPTÊME', color: '#0369a1', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: 'Bienvenue, Petit Gabriel', color: '#0c4a6e', fontSize: 'text-3xl font-extrabold' },
      { type: 'text', content: 'La famille Dupont a le plaisir de vous convier à la célébration suivie d\'un déjà dans le jardin.', color: '#334155', fontSize: 'text-sm' },
      { type: 'button', content: 'Répondre à l\'invitation' },
    ],
  },
  {
    id: 'birthday-milestone',
    name: 'Anniversaire Milestone',
    category: 'private',
    group: 'private',
    description: 'Palette festive violet et or pour célébrer les grandes étapes de la vie.',
    style: {
      bg: 'bg-gradient-to-br from-violet-950 to-purple-900',
      border: 'border-amber-400/30',
      textTitle: 'text-amber-300 font-sans',
      textBody: 'text-violet-200/90',
      btnBg: 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500',
      btnText: 'text-violet-950 font-black',
    },
    elements: [
      { type: 'text', content: 'SOIRÉE SURPRISE — 50 ANS', color: '#fcd34d', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: 'Les 50 ans de Marie', color: '#ffffff', fontSize: 'text-3xl font-black' },
      { type: 'text', content: 'Une soirée mémorable vous attend : dîner, musique live et retrouvailles entre amis de toujours.', color: '#ddd6fe', fontSize: 'text-sm' },
      { type: 'button', content: 'Je serai présent(e)' },
    ],
  },

  // ——— Groupe 2 : Professionnel ———
  {
    id: 'gala-prestige',
    name: 'Gala Prestige & Entreprise',
    category: 'corporate',
    group: 'corporate',
    description: 'Fond sombre premium et liserés dorés pour dîners caritatifs et remises de prix.',
    style: {
      bg: 'bg-slate-950',
      border: 'border-amber-500/20',
      textTitle: 'text-amber-400 font-sans',
      textBody: 'text-slate-400',
      btnBg: 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600',
      btnText: 'text-slate-950 font-black',
    },
    elements: [
      { type: 'text', content: 'SOIRÉE ANNUELLE DE BIENFAISANCE', color: '#f59e0b', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: 'Gala d\'Excellence 2026', color: '#ffffff', fontSize: 'text-3xl font-black' },
      { type: 'text', content: 'Une soirée prestigieuse dédiée à l\'innovation et à la solidarité. Tenue de soirée exigée.', color: '#94a3b8', fontSize: 'text-sm' },
      { type: 'button', content: 'Réserver mon billet' },
    ],
  },
  {
    id: 'corporate-seminar',
    name: 'Séminaire Corporatif',
    category: 'corporate',
    group: 'corporate',
    description: 'Design épuré bleu ardoise pour conférences et journées stratégiques.',
    style: {
      bg: 'bg-white',
      border: 'border-slate-200',
      textTitle: 'text-slate-900 font-sans',
      textBody: 'text-slate-600',
      btnBg: 'bg-blue-600 hover:bg-blue-700',
      btnText: 'text-white font-semibold',
    },
    elements: [
      { type: 'text', content: 'CONFÉRENCE EXCLUSIVE', color: '#2563eb', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: 'Séminaire Dirigeants 2026', color: '#0f172a', fontSize: 'text-3xl font-extrabold' },
      { type: 'text', content: 'Une journée de réflexion stratégique réservée aux membres du conseil et aux partenaires clés.', color: '#475569', fontSize: 'text-sm' },
      { type: 'button', content: 'Confirmer ma participation' },
    ],
  },
  {
    id: 'product-launch',
    name: 'Lancement Produit',
    category: 'corporate',
    group: 'corporate',
    description: 'Esthétique tech moderne avec dégradé indigo pour vos présentations officielles.',
    style: {
      bg: 'bg-gradient-to-br from-indigo-600 to-violet-700',
      border: 'border-indigo-400/30',
      textTitle: 'text-white font-sans',
      textBody: 'text-indigo-100',
      btnBg: 'bg-white hover:bg-indigo-50',
      btnText: 'text-indigo-700 font-bold',
    },
    elements: [
      { type: 'text', content: 'NOUVEAUTÉ — INVITATION VIP', color: '#c7d2fe', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: 'Lancement EventMaster Pro', color: '#ffffff', fontSize: 'text-3xl font-black' },
      { type: 'text', content: 'Découvrez en avant-première notre nouvelle plateforme lors d\'une démonstration exclusive.', color: '#e0e7ff', fontSize: 'text-sm' },
      { type: 'button', content: 'Obtenir mon accès VIP' },
    ],
  },

  // ——— Groupe 3 : Cocktail ———
  {
    id: 'cocktail-networking',
    name: 'Cocktail & Networking',
    category: 'casual',
    group: 'casual',
    description: 'Mise en page dynamique pour cocktails dînatoires et événements décontractés.',
    style: {
      bg: 'bg-indigo-950',
      border: 'border-indigo-800/30',
      textTitle: 'text-indigo-300 font-sans',
      textBody: 'text-indigo-200/80',
      btnBg: 'bg-indigo-600 hover:bg-indigo-500',
      btnText: 'text-white',
    },
    elements: [
      { type: 'text', content: 'NETWORKING & COCKTAIL', color: '#a5b4fc', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: 'Cocktail d\'Inauguration', color: '#ffffff', fontSize: 'text-3xl font-black' },
      { type: 'text', content: 'Rencontrez l\'écosystème local autour d\'une sélection de mets raffinés et de rencontres inspirantes.', color: '#cbd5e1', fontSize: 'text-sm' },
      { type: 'button', content: 'S\'inscrire à la soirée' },
    ],
  },
  {
    id: 'garden-party',
    name: 'Garden Party Estivale',
    category: 'casual',
    group: 'casual',
    description: 'Inspiré nature avec verts botaniques pour fêtes en plein air et brunchs champêtres.',
    style: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      textTitle: 'text-emerald-900 font-serif',
      textBody: 'text-emerald-800/80',
      btnBg: 'bg-emerald-700 hover:bg-emerald-800',
      btnText: 'text-white',
    },
    elements: [
      { type: 'text', content: 'FÊTE EN PLEIN AIR', color: '#047857', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: 'Garden Party d\'Été', color: '#064e3b', fontSize: 'text-3xl font-extrabold' },
      { type: 'text', content: 'Musique acoustique, bar à mocktails et pique-nique chic dans un cadre verdoyant.', color: '#334155', fontSize: 'text-sm' },
      { type: 'button', content: 'Confirmer ma venue' },
    ],
  },
  {
    id: 'dj-club-night',
    name: 'Soirée DJ & Club',
    category: 'casual',
    group: 'casual',
    description: 'Ambiance nocturne néon pour afterworks électrisants et soirées dansantes.',
    style: {
      bg: 'bg-black',
      border: 'border-fuchsia-500/40',
      textTitle: 'text-fuchsia-400 font-sans',
      textBody: 'text-slate-400',
      btnBg: 'bg-fuchsia-600 hover:bg-fuchsia-500',
      btnText: 'text-white font-bold',
    },
    elements: [
      { type: 'text', content: 'AFTERWORK — DJ SET LIVE', color: '#e879f9', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: 'Night Session Vol. 3', color: '#ffffff', fontSize: 'text-3xl font-black' },
      { type: 'text', content: 'Une nuit immersive avec DJ invité, lumières LED et accès privé au rooftop lounge.', color: '#94a3b8', fontSize: 'text-sm' },
      { type: 'button', content: 'Réserver ma place' },
    ],
  },
];

export function getLandingTemplatesByCategory(category: string): LandingTemplate[] {
  if (category === 'all') return LANDING_TEMPLATES;
  return LANDING_TEMPLATES.filter((t) => t.category === category);
}

export function getLandingTemplateGroups(category: string) {
  if (category === 'all') {
    return LANDING_TEMPLATE_GROUPS.map((group) => ({
      ...group,
      templates: LANDING_TEMPLATES.filter((t) => t.group === group.id),
    }));
  }
  const templates = getLandingTemplatesByCategory(category);
  return [{ id: category, title: '', subtitle: '', templates }];
}
