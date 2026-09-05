export type RoomPlanPromptCategory = 'wedding' | 'banquet' | 'pro' | 'cocktail';

export type RoomPlanPromptModel = {
  id: string;
  title: string;
  category: RoomPlanPromptCategory;
  badge: string;
  summary: string;
  prompt: string;
  roomType: 'BANQUET' | 'CONFERENCE' | 'AMPHITHEATER' | 'TENT';
};

export const ROOM_PLAN_PROMPT_CATEGORIES: Array<{ id: RoomPlanPromptCategory; label: string }> = [
  { id: 'wedding', label: 'Mariages' },
  { id: 'banquet', label: 'Banquets' },
  { id: 'pro', label: 'Conférences' },
  { id: 'cocktail', label: 'Cocktails' },
];

export const ROOM_PLAN_PROMPT_MODELS: RoomPlanPromptModel[] = [
  {
    id: 'wedding-honor',
    title: 'Mariage — table d’honneur',
    category: 'wedding',
    badge: 'Allée',
    summary: 'Tables rondes en quinconce, allée et honneur.',
    prompt:
      'Mariage 120 convives dans une salle rectangle. Porte d’entrée principale au milieu du petit côté sud, issue service à l’ouest près du buffet. Allée ivoire botanique depuis la porte jusqu’à la table d’honneur ovale (12 places, nappe ivoire, centre floral) collée au fond nord, face à l’entrée — pas collée au mur. 12 tables rondes de 10 en quinconce (nid d’abeille), jamais alignées en file, écart service 1,4 m. Arche florale au seuil, jardinières aux virages de l’allée, deux colonnes de fleurs encadrant l’honneur. Lustres cristal : un au-dessus de l’honneur, un au-dessus du premier tiers de l’allée, trois au-dessus des grappes de tables. Parquet chêne clair #d4c4a8, murs plâtre crème #f3efe6, nappes ivoire #f7f1e6, rideaux champagne #e8d5b5, chaises Chiavari bois.',
    roomType: 'BANQUET',
  },
  {
    id: 'wedding-garden',
    title: 'Cérémonie jardin',
    category: 'wedding',
    badge: 'Rangées',
    summary: 'Rangées, allée nuptiale, autel et fleurs.',
    prompt:
      'Cérémonie en jardin : entrée par une arche florale au sud. Allée gazon un peu décentrée vers un podium demi-lune (couple / officiant) au nord, pas une ligne au milieu. 8 rangées de 10 chaises en deux blocs, allée 2,2 m, extrémités légèrement ouvertes en éventail. Deux colonnes de fleurs à l’autel, jardinières aux têtes de rangées, lanternes aux bords de l’allée. Pas de tables. Pelouse #6b8f4e, arche hortensia blanc et eucalyptus, ciel ouvert. Un lustre lanterne seulement sous un dais discret derrière le podium.',
    roomType: 'BANQUET',
  },
  {
    id: 'banquet-gala',
    title: 'Gala — scène et piste',
    category: 'banquet',
    badge: 'Gala',
    summary: 'Rondes décalées, scène, piste, DJ, lustres.',
    prompt:
      'Gala 80 personnes. Entrée est, dégagée. Scène rectangulaire au fond ouest, podium orateur légèrement décalé à cour. Piste de danse comme un ovale entre la scène et les tables, pas un carré vide. 10 tables rondes de 8 en deux grappes décalées (gauche / droite), jamais une seule file. Régie DJ collée à la scène, côté jardin. Buffet le long du mur nord, hors circulation. Lustres cristal au-dessus de la piste et au centre de chaque grappe. Parquet noyer #5c4033, nappes lin or pâle #e6d5a8, murs tadelakt chaud #c4b09a, rideaux bordeaux profond #6b2d3c, chaises Napoléon velours.',
    roomType: 'BANQUET',
  },
  {
    id: 'banquet-ushape',
    title: 'Banquet en U',
    category: 'banquet',
    badge: 'U',
    summary: 'U ouvert vers la scène, buffet et podium.',
    prompt:
      'Banquet 40 personnes en U ouvert vers le sud : trois tables rectangulaires formant le U, ouverture face à une petite scène + podium. Porte d’entrée au sud-est, jamais dans le U. Buffet le long du mur ouest, derrière le bras du U. Deux compositions florales aux angles intérieurs du U, centres de table sur chaque bras. Un lustre moderne au-dessus du vide central du U. Parquet #c4a574, nappes blanches, murs plâtre #eee8df, chaises Napoléon.',
    roomType: 'BANQUET',
  },
  {
    id: 'conference-rows',
    title: 'Conférence théâtre',
    category: 'pro',
    badge: 'Rangées',
    summary: 'Rangées, allées, scène, écran, podium.',
    prompt:
      'Conférence 80 places. Portes : entrée publique au fond (sud), issue de secours à l’ouest. Scène + écran au nord, podium orateur décalé à cour (pas collé au centre de l’écran). 8 rangées de 10 en deux blocs, allée centrale 1,8 m et deux allées latérales 1,2 m — les rangées reculent légèrement en éventail, pas un rectangle parfait. Moquette grise #6d7178, murs béton clair #d8d4ce, écran noir, spots recessed au plafond (pas de lustre cristal). Aucune fleur sauf deux jardinières discrètes à l’entrée.',
    roomType: 'CONFERENCE',
  },
  {
    id: 'conference-board',
    title: 'Salle de conseil',
    category: 'pro',
    badge: 'VIP',
    summary: 'Table unique, écran, buffet, entrée claire.',
    prompt:
      'Salle de conseil : porte unique à l’est. Une table ovale / rectangulaire de 16 au centre, axe long vers l’écran à l’ouest. Fauteuils lounge, pas de rangées. Buffet discret contre le mur nord, hors de l’axe écran. Un lustre moderne au-dessus de la table, spots recessed ailleurs. Parquet noyer #4a3728, murs bois #8b7355, plateau marbre #e8e4dc. Pas de fleurs en file — un seul arrangement bas au centre de table.',
    roomType: 'CONFERENCE',
  },
  {
    id: 'cocktail-dance',
    title: 'Cocktail mange-debout',
    category: 'cocktail',
    badge: 'Piste',
    summary: 'Îlots cocktail, piste, DJ, guirlandes.',
    prompt:
      'Cocktail 60 personnes. Entrée sud. 12 mange-debout (highTop) en trois îlots de 4, décalés, jamais alignés sur une droite. Piste au nord-ouest près du DJ (scène basse + régie), buffet en L contre le mur est. Guirlandes Edison en trois travées au-dessus des îlots, un lustre industriel au-dessus de la piste. Parquet #b8956a, plateaux noyer, murs brique #8a5a44. Deux jardinières à l’entrée seulement.',
    roomType: 'BANQUET',
  },
  {
    id: 'cocktail-tent',
    title: 'Réception sous tente',
    category: 'cocktail',
    badge: 'Tente',
    summary: 'Tente drapée, rondes, fontaine, arche.',
    prompt:
      'Réception sous tente : roofStyle tentSwag, entrée par arche florale au sud. 8 tables rondes de 8 en quinconce autour d’une fontaine centrale (pas un cercle parfait : légèrement ovalisé). Allée depuis l’arche qui contourne la fontaine vers une petite table d’honneur au nord. Lustres lanternes au-dessus de la fontaine et de l’honneur, guirlandes en périphérie. Herbe autour #5f7d3e, drapés ivoire #f4efe6, nappes lin, parquet clair sous la tente. Issue latérale ouest vers le service.',
    roomType: 'TENT',
  },
];
