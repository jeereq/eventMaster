export type RoomPlanPromptCategory = 'coutumier' | 'wedding' | 'banquet' | 'pro' | 'cocktail';

export type RoomPlanPromptModel = {
  id: string;
  title: string;
  category: RoomPlanPromptCategory;
  badge: string;
  summary: string;
  /** Brief envoyé au modèle — anglais narratif (recommandations Gemini). */
  prompt: string;
  roomType: 'BANQUET' | 'CONFERENCE' | 'AMPHITHEATER' | 'TENT';
};

export const ROOM_PLAN_PROMPT_CATEGORIES: Array<{ id: RoomPlanPromptCategory; label: string }> = [
  { id: 'coutumier', label: 'Coutumiers' },
  { id: 'wedding', label: 'Mariages' },
  { id: 'banquet', label: 'Banquets' },
  { id: 'pro', label: 'Conférences' },
  { id: 'cocktail', label: 'Cocktails' },
];

export const ROOM_PLAN_PROMPT_MODELS: RoomPlanPromptModel[] = [
  {
    id: 'coutumier-kongo',
    title: 'Makwela Kongo',
    category: 'coutumier',
    badge: 'Kongo',
    summary: 'Palabre des familles, allée raphia, honneur.',
    prompt:
      'Compose a customary Bakongo wedding reception for 180 guests. [Subject] Banquet hall with family palaver zone, raffia aisle and honor table. [Action] South public entrance; a west family-seating cluster for the two lineages facing a low palaver table; run a raffia-green aisle to a north oval honor table (12 seats); 16 round tables of 10 in a honeycomb stagger. [Location/context] Kongo Central customary makwela. [Composition] Floral/raffia arch at the door, planters at aisle bends; no dance floor in the palaver third. [Style] Light parquet, forest-green drapes, ivory linens, gold Chiavari chairs.',
    roomType: 'BANQUET',
  },
  {
    id: 'coutumier-luba',
    title: 'Tshibilu Luba',
    category: 'coutumier',
    badge: 'Luba',
    summary: 'Velours Kasaï, allée d’honneur, rondes.',
    prompt:
      'Lay out a customary Baluba tshibilu banquet for 200 guests. [Subject] Kasai prestige hall with honor table and staggered rounds. [Action] Entrance mid-south; ivory-and-ochre aisle to a north honor table of 14; 18 rounds of 10 with 1.4 m service gaps; buffet along the east wall behind circulation. [Location/context] Grand Kasaï customary dibaka. [Composition] Twin flower columns framing honor, Kuba-inspired planter accents at aisle heads. [Style] Warm ochre walls, copper drapes, madiba-inspired linen, wood chairs.',
    roomType: 'BANQUET',
  },
  {
    id: 'coutumier-mongo',
    title: 'Bonkoko Mongo',
    category: 'coutumier',
    badge: 'Mongo',
    summary: 'Libota, allée fleuve, tables en quinconce.',
    prompt:
      'Compose a customary Mongo bonkoko reception for 160 guests. [Subject] Equatorial banquet with libota family wings and river-aisle. [Action] South entrance; two family wings left/right of a terracotta aisle leading to a north honor oval (12); 14 rounds of 10 in a gentle stagger; service exit west. [Location/context] Équateur / Cuvette customary union. [Composition] Leafy planters at aisle bends, lanterns over honor and first third. [Style] Terracotta and forest-green drapes, raffia accents, ivory cloths, light oak parquet.',
    roomType: 'BANQUET',
  },
  {
    id: 'coutumier-lunda',
    title: 'Alliance Lunda',
    category: 'coutumier',
    badge: 'Lunda',
    summary: 'Prestige cuivre, honneur, rondes Katanga.',
    prompt:
      'Design a customary Lunda alliance banquet for 170 guests. [Subject] Katanga prestige hall with copper-ivory honor and honeycomb rounds. [Action] South-east entrance; copper-toned aisle to a north honor table of 12; 15 rounds of 10 staggered; discreet west service. [Location/context] Lubumbashi / Lualaba customary celebration. [Composition] Copper-foil planter accents, one chandelier over honor and two over table clusters. [Style] Ivory walls, copper drapes, champagne linens, dark wood chairs.',
    roomType: 'BANQUET',
  },
  {
    id: 'wedding-honor',
    title: 'Mariage — table d’honneur',
    category: 'wedding',
    badge: 'Allée',
    summary: 'Tables rondes en quinconce, allée et honneur.',
    prompt:
      'Compose a wedding reception floor plan for 120 guests. [Subject] Rectangle banquet hall with honor table and staggered rounds. [Action] Place the main entrance mid-south short wall and a west service exit near the buffet; run a botanical ivory aisle from the door to an oval honor table (12 seats, ivory cloth, floral center) at the north end facing the entrance with clearance from the wall; arrange 12 round tables of 10 in a honeycomb stagger with 1.4 m service gaps. [Location/context] Prestige Kinshasa wedding banquet. [Composition] Floral arch at the threshold, planters at aisle bends, twin flower columns framing honor; crystal chandeliers above honor, first aisle third, and table clusters. [Style] Light oak parquet #d4c4a8, cream plaster walls #f3efe6, ivory linens #f7f1e6, champagne curtains #e8d5b5, Chiavari wood chairs.',
    roomType: 'BANQUET',
  },
  {
    id: 'wedding-garden',
    title: 'Cérémonie jardin',
    category: 'wedding',
    badge: 'Rangées',
    summary: 'Rangées, allée nuptiale, autel et fleurs.',
    prompt:
      'Lay out a garden ceremony seating plan. [Subject] Outdoor ceremony with aisle, chair rows and couple podium. [Action] Enter through a floral arch at the south; guide a slightly off-center lawn aisle to a north semi-circle couple/officiant podium; seat 8 rows of 10 in two blocks with a 2.2 m aisle and gently fanned outer ends. [Location/context] Open-sky garden ceremony. [Composition] Twin flower columns at the altar, planters at row heads, lanterns along the aisle edges; no dining tables. [Style] Lawn #6b8f4e, white hydrangea and eucalyptus arch, one lantern fixture under a discreet canopy behind the podium.',
    roomType: 'BANQUET',
  },
  {
    id: 'banquet-gala',
    title: 'Gala — scène et piste',
    category: 'banquet',
    badge: 'Gala',
    summary: 'Rondes décalées, scène, piste, DJ, lustres.',
    prompt:
      'Design a gala floor plan for 80 guests. [Subject] Banquet with stage, dance floor and clustered rounds. [Action] Keep the east entrance clear; set a rectangular stage at the west end with a speaker podium slightly stage-left; shape an oval dance floor between stage and seating; place 10 round tables of 8 in two staggered left/right clusters. [Location/context] Evening prestige gala. [Composition] DJ booth anchored to the stage garden side; buffet along the north wall outside circulation; crystal chandeliers above the dance floor and each table cluster. [Style] Walnut parquet #5c4033, pale gold linen #e6d5a8, warm tadelakt walls #c4b09a, deep burgundy curtains #6b2d3c, Napoleon velvet chairs.',
    roomType: 'BANQUET',
  },
  {
    id: 'banquet-ushape',
    title: 'Banquet en U',
    category: 'banquet',
    badge: 'U',
    summary: 'U ouvert vers la scène, buffet et podium.',
    prompt:
      'Compose a 40-guest U-shaped banquet. [Subject] Three rectangular tables forming a U open toward a small stage. [Action] Open the U toward the south facing a compact stage and podium; place the entrance at the south-east, outside the U; run the buffet along the west wall behind one U arm. [Location/context] Formal seated banquet. [Composition] Two floral accents at the inner U corners and centerpieces on each arm; one modern chandelier above the U void. [Style] Parquet #c4a574, white linens, plaster walls #eee8df, Napoleon chairs.',
    roomType: 'BANQUET',
  },
  {
    id: 'conference-rows',
    title: 'Conférence théâtre',
    category: 'pro',
    badge: 'Rangées',
    summary: 'Rangées, allées, scène, écran, podium.',
    prompt:
      'Lay out an 80-seat theater conference. [Subject] Professional hall with stage, screen and fanned rows. [Action] Public entrance at the south rear, emergency exit west; stage and screen at the north with speaker podium offset stage-left of the screen; seat 8 rows of 10 in two blocks with 1.8 m center aisle and 1.2 m side aisles, rows gently fanning rearward. [Location/context] Corporate conference venue. [Composition] Recessed ceiling spots, two discreet entrance planters only. [Style] Grey carpet #6d7178, light concrete walls #d8d4ce, black screen — no crystal chandelier.',
    roomType: 'CONFERENCE',
  },
  {
    id: 'conference-board',
    title: 'Salle de conseil',
    category: 'pro',
    badge: 'VIP',
    summary: 'Table unique, écran, buffet, entrée claire.',
    prompt:
      'Design a boardroom plan. [Subject] Single central conference table facing a screen. [Action] One east entrance; place a 16-seat oval/rectangular table centered with its long axis toward a west screen; lounge armchairs only, no theater rows. [Location/context] Executive council room. [Composition] Discreet north-wall buffet off the screen axis; one modern chandelier above the table, recessed spots elsewhere; a single low centerpiece. [Style] Walnut parquet #4a3728, wood walls #8b7355, marble top #e8e4dc.',
    roomType: 'CONFERENCE',
  },
  {
    id: 'cocktail-dance',
    title: 'Cocktail mange-debout',
    category: 'cocktail',
    badge: 'Piste',
    summary: 'Îlots cocktail, piste, DJ, guirlandes.',
    prompt:
      'Compose a standing cocktail for 60 guests. [Subject] High-top islands with dance floor and DJ. [Action] South entrance; arrange 12 highTops in three staggered islands of 4; dance floor northwest beside a low stage and DJ booth; L-shaped buffet on the east wall. [Location/context] Evening cocktail reception. [Composition] Edison string lights in three bays over the islands, one industrial chandelier over the dance floor; two entrance planters only. [Style] Parquet #b8956a, walnut tops, brick walls #8a5a44.',
    roomType: 'BANQUET',
  },
  {
    id: 'cocktail-tent',
    title: 'Réception sous tente',
    category: 'cocktail',
    badge: 'Tente',
    summary: 'Tente drapée, rondes, fontaine, arche.',
    prompt:
      'Design a draped tent reception. [Subject] TentSwag roof with honeycomb rounds around a fountain. [Action] Enter through a south floral arch; place 8 round tables of 8 in a soft oval honeycomb around a central fountain; aisle from the arch around the fountain to a small north honor table. [Location/context] Outdoor tent hospitality. [Composition] Lantern chandeliers above fountain and honor, string lights on the perimeter; west service exit. [Style] Surrounding grass #5f7d3e, ivory drapes #f4efe6, linen cloths, light parquet under the tent.',
    roomType: 'TENT',
  },
];
