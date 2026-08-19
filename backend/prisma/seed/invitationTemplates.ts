type TemplateElement = Record<string, unknown>;

export const GLOBAL_CATALOG_TEMPLATES: Array<{
  name: string;
  showOnLanding: boolean;
  global: Record<string, unknown>;
  elements: TemplateElement[];
}> = [
  {
    name: 'Mariage Élégant — Or & Ivoire',
    showOnLanding: true,
    global: { bgColor: '#fdf8f3', floralColor: '#c5a059', landingCategory: 'wedding', landingDescription: 'Cérémonie et réception, ton or et ivoire.' },
    elements: [
      { id: 'g1', type: 'text', text: 'NOUS VOUS INVITONS', color: '#c5a059', fontSize: '11px', align: 'center', letterSpacing: '0.2em' },
      { id: 'g2', type: 'text', text: 'Célébration de notre union', color: '#78350f', fontSize: '30px', align: 'center', fontFamily: 'Cormorant Garamond' },
      { id: 'g3', type: 'divider', dividerStyle: 'ornament-flower', color: '#c5a059', align: 'center' },
      { id: 'g4', type: 'text', text: 'Rejoignez-nous pour une soirée inoubliable entourés de nos proches.', color: '#57534e', fontSize: '14px', align: 'center' },
      { id: 'g5', type: 'rsvp-block', text: 'Confirmer ma présence', color: '#c5a059', fontSize: '15px', align: 'center', rsvpPlacement: 'outside' },
    ],
  },
  {
    name: 'Mariage Kuba — Rouge & Or',
    showOnLanding: true,
    global: { bgColor: '#1c0a0a', bgType: 'color', floralColor: '#d4a017', landingCategory: 'wedding', landingDescription: 'Inspiration textile kuba, rouge profond.' },
    elements: [
      { id: 'g1', type: 'text', text: 'LOANGO YA LIBALA', color: '#d4a017', fontSize: '11px', align: 'center', letterSpacing: '0.18em' },
      { id: 'g2', type: 'text', text: 'Notre mariage', color: '#fef3c7', fontSize: '32px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Kinshasa · Tenue traditionnelle souhaitée', color: '#fca5a5', fontSize: '13px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Confirmer ma présence', color: '#d4a017', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Mariage Jardin — Vert Nil',
    showOnLanding: true,
    global: { bgColor: '#f0fdf4', floralColor: '#15803d', landingCategory: 'wedding', landingDescription: 'Cérémonie en extérieur, tons botaniques.' },
    elements: [
      { id: 'g1', type: 'text', text: 'SAVE THE DATE', color: '#15803d', fontSize: '11px', align: 'center', letterSpacing: '0.2em' },
      { id: 'g2', type: 'text', text: 'Union sous les palmiers', color: '#14532d', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Cérémonie civile puis cocktail dans les jardins.', color: '#3f6212', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Répondre', color: '#15803d', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Baptême Famille — Ciel',
    showOnLanding: true,
    global: { bgColor: '#f0f9ff', floralColor: '#0284c7', landingCategory: 'baptism', landingDescription: 'Baptême et bénédiction, pastel.' },
    elements: [
      { id: 'g1', type: 'text', text: 'BAPTÊME', color: '#0284c7', fontSize: '12px', align: 'center', letterSpacing: '0.22em' },
      { id: 'g2', type: 'text', text: 'Une nouvelle lumière', color: '#0c4a6e', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Messe suivie d’un goûter en famille.', color: '#075985', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Confirmer', color: '#0284c7', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Anniversaire Festif — Pop',
    showOnLanding: true,
    global: { bgColor: '#fff7ed', bgPattern: 'watercolor', floralColor: '#ea580c', landingCategory: 'birthday', landingDescription: 'Anniversaire coloré, buffet et musique.' },
    elements: [
      { id: 'g1', type: 'text', text: "C'EST LA FÊTE !", color: '#ea580c', fontSize: '12px', align: 'center', bold: true },
      { id: 'g2', type: 'text', text: 'Venez célébrer avec nous', color: '#9a3412', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Musique, buffet et surprises vous attendent.', color: '#7c2d12', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'button', text: 'Je serai là !', color: '#ea580c', fontSize: '14px', align: 'center', buttonStyle: 'pill', buttonLink: '#rsvp-section' },
      { id: 'g5', type: 'rsvp-block', text: 'Confirmer', color: '#ea580c', fontSize: '15px', align: 'center', rsvpPlacement: 'outside' },
    ],
  },
  {
    name: 'Anniversaire 50 ans — Bordeaux',
    showOnLanding: true,
    global: { bgColor: '#3b0d16', bgType: 'color', floralColor: '#f43f5e', landingCategory: 'birthday', landingDescription: 'Cinquantenaire, dîner assis.' },
    elements: [
      { id: 'g1', type: 'text', text: '50 ANS', color: '#fda4af', fontSize: '12px', align: 'center', letterSpacing: '0.3em' },
      { id: 'g2', type: 'text', text: 'Une vie à célébrer', color: '#fff1f2', fontSize: '30px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Dîner, toasts et piste de danse.', color: '#fecdd3', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Répondre à l’invitation', color: '#e11d48', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Cérémonie religieuse — Ivoire',
    showOnLanding: true,
    global: { bgColor: '#fffbeb', floralColor: '#b45309', landingCategory: 'religious', landingDescription: 'Messe, consécration ou action de grâce.' },
    elements: [
      { id: 'g1', type: 'text', text: 'INVITATION', color: '#b45309', fontSize: '11px', align: 'center', letterSpacing: '0.2em' },
      { id: 'g2', type: 'text', text: 'Cérémonie d’action de grâce', color: '#78350f', fontSize: '26px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Vous êtes les bienvenus à l’église puis au repas.', color: '#92400e', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Confirmer ma présence', color: '#b45309', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Dot & fiançailles — Ocre',
    showOnLanding: true,
    global: { bgColor: '#fff7ed', floralColor: '#c2410c', landingCategory: 'wedding', landingDescription: 'Cérémonie de dot et fiançailles.' },
    elements: [
      { id: 'g1', type: 'text', text: 'CÉRÉMONIE DE DOT', color: '#c2410c', fontSize: '11px', align: 'center', letterSpacing: '0.16em' },
      { id: 'g2', type: 'text', text: 'Deux familles, une union', color: '#7c2d12', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Tenue traditionnelle · Kinshasa', color: '#9a3412', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Confirmer', color: '#c2410c', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Gala Corporate — Bleu Nuit',
    showOnLanding: true,
    global: { bgColor: '#0f172a', bgType: 'color', frameType: 'none', landingCategory: 'gala', landingDescription: 'Gala d’entreprise, tenue de soirée.' },
    elements: [
      { id: 'g1', type: 'text', text: 'SOIRÉE D\'ENTREPRISE', color: '#93c5fd', fontSize: '11px', align: 'center', letterSpacing: '0.15em' },
      { id: 'g2', type: 'text', text: 'Gala Annuel 2026', color: '#f8fafc', fontSize: '32px', align: 'center', bold: true },
      { id: 'g3', type: 'text', text: 'Tenue de soirée souhaitée · Cocktail & dîner assis', color: '#94a3b8', fontSize: '13px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Répondre à l\'invitation', color: '#3b82f6', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Gala Prestige — Champagne',
    showOnLanding: true,
    global: { bgColor: '#1a1208', bgType: 'color', floralColor: '#eab308', landingCategory: 'gala', landingDescription: 'Black tie, dîner de charité.' },
    elements: [
      { id: 'g1', type: 'text', text: 'BLACK TIE', color: '#eab308', fontSize: '11px', align: 'center', letterSpacing: '0.28em' },
      { id: 'g2', type: 'text', text: 'Gala de charité', color: '#fefce8', fontSize: '30px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Hôtel · Gombe · 19 h 30', color: '#fde68a', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Réserver ma place', color: '#ca8a04', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Conférence Pro — Minimal',
    showOnLanding: true,
    global: { bgColor: '#ffffff', frameType: 'double-border', landingCategory: 'conference', landingDescription: 'Conférence et networking.' },
    elements: [
      { id: 'g1', type: 'text', text: 'CONFÉRENCE & NETWORKING', color: '#4f46e5', fontSize: '11px', align: 'center' },
      { id: 'g2', type: 'text', text: 'Rencontre des professionnels', color: '#1e293b', fontSize: '26px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Inscription obligatoire · Places limitées', color: '#475569', fontSize: '13px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Inscription', color: '#4f46e5', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Séminaire Leadership — Ardoise',
    showOnLanding: true,
    global: { bgColor: '#f8fafc', floralColor: '#334155', landingCategory: 'seminar', landingDescription: 'Journée séminaire et ateliers.' },
    elements: [
      { id: 'g1', type: 'text', text: 'SÉMINAIRE', color: '#334155', fontSize: '11px', align: 'center', letterSpacing: '0.2em' },
      { id: 'g2', type: 'text', text: 'Leadership & croissance', color: '#0f172a', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Ateliers, déjeuner et clôture plénière.', color: '#475569', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'S’inscrire', color: '#1e293b', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Lancement produit — Néon',
    showOnLanding: true,
    global: { bgColor: '#0b1020', bgType: 'color', floralColor: '#22d3ee', landingCategory: 'launch', landingDescription: 'Soirée de lancement de marque.' },
    elements: [
      { id: 'g1', type: 'text', text: 'LAUNCH NIGHT', color: '#22d3ee', fontSize: '11px', align: 'center', letterSpacing: '0.22em' },
      { id: 'g2', type: 'text', text: 'Première mondiale', color: '#f8fafc', fontSize: '30px', align: 'center', bold: true },
      { id: 'g3', type: 'text', text: 'Démo, cocktail et photos presse.', color: '#67e8f9', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Je participe', color: '#06b6d4', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Forum emploi — Vert',
    showOnLanding: true,
    global: { bgColor: '#ecfdf5', floralColor: '#047857', landingCategory: 'corporate', landingDescription: 'Forum et stands recruteurs.' },
    elements: [
      { id: 'g1', type: 'text', text: 'FORUM DE L’EMPLOI', color: '#047857', fontSize: '11px', align: 'center', letterSpacing: '0.14em' },
      { id: 'g2', type: 'text', text: 'Rencontrez les recruteurs', color: '#064e3b', fontSize: '26px', align: 'center' },
      { id: 'g3', type: 'text', text: 'CV imprimé conseillé · Entrée libre sur inscription', color: '#065f46', fontSize: '13px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'S’inscrire', color: '#047857', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Cocktail networking — Ambre',
    showOnLanding: true,
    global: { bgColor: '#fffbeb', floralColor: '#d97706', landingCategory: 'cocktail', landingDescription: 'Afterwork et échanges informels.' },
    elements: [
      { id: 'g1', type: 'text', text: 'AFTERWORK', color: '#d97706', fontSize: '12px', align: 'center', letterSpacing: '0.24em' },
      { id: 'g2', type: 'text', text: 'Cocktail & rencontres', color: '#78350f', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: '18 h 30 · Rooftop · Tenue smart casual', color: '#92400e', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Je viens', color: '#d97706', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Garden party — Menthe',
    showOnLanding: true,
    global: { bgColor: '#f7fee7', floralColor: '#65a30d', landingCategory: 'party', landingDescription: 'Réception en jardin, buffet.' },
    elements: [
      { id: 'g1', type: 'text', text: 'GARDEN PARTY', color: '#65a30d', fontSize: '11px', align: 'center', letterSpacing: '0.2em' },
      { id: 'g2', type: 'text', text: 'Après-midi au jardin', color: '#365314', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Buffet, jeux et musique live.', color: '#4d7c0f', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Confirmer', color: '#65a30d', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Soirée DJ — Magenta',
    showOnLanding: true,
    global: { bgColor: '#2e0614', bgType: 'color', floralColor: '#e879f9', landingCategory: 'club', landingDescription: 'Club night, set DJ.' },
    elements: [
      { id: 'g1', type: 'text', text: 'CLUB NIGHT', color: '#e879f9', fontSize: '12px', align: 'center', letterSpacing: '0.28em' },
      { id: 'g2', type: 'text', text: 'Dansons jusqu’au matin', color: '#fdf4ff', fontSize: '28px', align: 'center', bold: true },
      { id: 'g3', type: 'text', text: 'Set live · Guest list jusqu’à 23 h', color: '#f0abfc', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Sur la liste', color: '#c026d3', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Concert live — Indigo',
    showOnLanding: true,
    global: { bgColor: '#1e1b4b', bgType: 'color', floralColor: '#818cf8', landingCategory: 'concert', landingDescription: 'Concert et showcase.' },
    elements: [
      { id: 'g1', type: 'text', text: 'LIVE ON STAGE', color: '#a5b4fc', fontSize: '11px', align: 'center', letterSpacing: '0.22em' },
      { id: 'g2', type: 'text', text: 'Concert exceptionnel', color: '#eef2ff', fontSize: '30px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Ouverture des portes 20 h · Badge QR à l’entrée', color: '#c7d2fe', fontSize: '13px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Réserver', color: '#6366f1', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Open mic — Cuivre',
    showOnLanding: true,
    global: { bgColor: '#1c1917', bgType: 'color', floralColor: '#f97316', landingCategory: 'concert', landingDescription: 'Scène ouverte et spoken word.' },
    elements: [
      { id: 'g1', type: 'text', text: 'OPEN MIC', color: '#fb923c', fontSize: '12px', align: 'center', letterSpacing: '0.24em' },
      { id: 'g2', type: 'text', text: 'Scène ouverte', color: '#fff7ed', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Poésie, rap et acoustique · Inscription artistes sur place', color: '#fdba74', fontSize: '13px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Je viens', color: '#ea580c', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Brunch networking — Crème',
    showOnLanding: true,
    global: { bgColor: '#fff1f2', floralColor: '#be123c', landingCategory: 'cocktail', landingDescription: 'Brunch d’affaires le dimanche.' },
    elements: [
      { id: 'g1', type: 'text', text: 'SUNDAY BRUNCH', color: '#be123c', fontSize: '11px', align: 'center', letterSpacing: '0.18em' },
      { id: 'g2', type: 'text', text: 'Brunch & business', color: '#881337', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: '11 h · Terrasse · Places limitées', color: '#9f1239', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Réserver', color: '#e11d48', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Défilé de mode — Noir',
    showOnLanding: false,
    global: { bgColor: '#0a0a0a', bgType: 'color', floralColor: '#f5f5f4', landingCategory: 'party', landingDescription: 'Fashion show et sape.' },
    elements: [
      { id: 'g1', type: 'text', text: 'FASHION SHOW', color: '#a8a29e', fontSize: '11px', align: 'center', letterSpacing: '0.3em' },
      { id: 'g2', type: 'text', text: 'La Sape à l’honneur', color: '#fafaf9', fontSize: '30px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Front row sur invitation · Afterparty', color: '#d6d3d1', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Confirmer', color: '#e7e5e4', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Salon du mariage — Rose',
    showOnLanding: false,
    global: { bgColor: '#fff1f2', floralColor: '#db2777', landingCategory: 'wedding', landingDescription: 'Salon exposants mariage.' },
    elements: [
      { id: 'g1', type: 'text', text: 'SALON DU MARIAGE', color: '#db2777', fontSize: '11px', align: 'center', letterSpacing: '0.16em' },
      { id: 'g2', type: 'text', text: 'Trouvez vos prestataires', color: '#9d174d', fontSize: '26px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Salles, traiteurs, robes et photo · Entrée sur inscription', color: '#be185d', fontSize: '13px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'S’inscrire', color: '#db2777', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Masterclass — Cobalt',
    showOnLanding: false,
    global: { bgColor: '#eff6ff', floralColor: '#1d4ed8', landingCategory: 'seminar', landingDescription: 'Atelier expert, places limitées.' },
    elements: [
      { id: 'g1', type: 'text', text: 'MASTERCLASS', color: '#1d4ed8', fontSize: '11px', align: 'center', letterSpacing: '0.2em' },
      { id: 'g2', type: 'text', text: 'Atelier d’experts', color: '#1e3a8a', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: '3 heures · Support remis aux participants', color: '#1e40af', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Réserver ma place', color: '#2563eb', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Soirée dansante — Tropique',
    showOnLanding: false,
    global: { bgColor: '#042f2e', bgType: 'color', floralColor: '#2dd4bf', landingCategory: 'party', landingDescription: 'Bal et rumba congolaise.' },
    elements: [
      { id: 'g1', type: 'text', text: 'RUMBA NIGHT', color: '#5eead4', fontSize: '11px', align: 'center', letterSpacing: '0.22em' },
      { id: 'g2', type: 'text', text: 'Soirée dansante', color: '#ccfbf1', fontSize: '30px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Orchestre live · Tenue élégante', color: '#99f6e4', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Je danse', color: '#14b8a6', fontSize: '15px', align: 'center' },
    ],
  },
];
