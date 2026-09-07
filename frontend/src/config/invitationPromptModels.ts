export type PromptCategory = 'coutumier' | 'clone' | 'wedding' | 'gala' | 'birthday' | 'rdc-langues';

export interface PromptModel {
  id: string;
  title: string;
  category: PromptCategory;
  badge: string;
  summary: string;
  /** Brief envoyé au modèle — anglais narratif (recommandations Nano Banana). */
  prompt: string;
  isClone?: boolean;
}

export const PROMPT_CATEGORIES: Array<{ id: PromptCategory; label: string; iconName?: string }> = [
  { id: 'coutumier', label: '4 Tribus — mariages coutumiers' },
  { id: 'clone', label: 'Copier une invitation' },
  { id: 'wedding', label: 'Mariages & Dots' },
  { id: 'gala', label: 'Galas & Entreprises' },
  { id: 'birthday', label: 'Anniversaires & Soirées' },
  { id: 'rdc-langues', label: '4 Langues nationales RDC' },
];

export const INVITATION_PROMPT_MODELS: PromptModel[] = [
  // --- 4 grandes tribus : mariages coutumiers (Kongo, Luba, Mongo, Lunda) ---
  {
    id: 'coutumier-kongo-makwela',
    title: 'Mariage coutumier Kongo (Bakongo)',
    category: 'coutumier',
    badge: 'Kongo',
    summary: 'Makwela, raphia noble, vert forêt et or. Préremplit le brief en un clic.',
    prompt:
      'Compose a customary Bakongo wedding invitation (makwela). [Subject] A distinguished Black Congolese couple from the Kongo nation in royal Kongo textiles, raffia prestige cloth and ceremonial gold. [Action] Announcing the family palaver and customary union with Kikongo header "Mbila ya Nkinsi ya Makwela : Kwizeno beto sepela kintwadi na dikwela yayi". Card text in Kikongo: "Kilumbu : {{date}}", "Kisika : {{location}}", "Tula kimbangi ya kukwiza kwaku". Show kola, palm-wine calabash and folded pagnes as discreet ceremonial still-life in the lower margin — not caricature. [Location/context] Kongo Central / Bandundu customary wedding honoring Bakongo lineage. [Composition] Tall 9:16 prestige card, forest-green field, raffia and ancestral geometric border, generous lower lettering band. [Style] Burnished gold, ivory cotton paper, warm natural light, 100% natural melanin fidelity, photoreal stationery photography.',
  },
  {
    id: 'coutumier-luba-dibaka',
    title: 'Mariage coutumier Luba (Baluba)',
    category: 'coutumier',
    badge: 'Luba',
    summary: 'Tshibilu tshia dibaka, velours du Kasaï, ocre et or royal.',
    prompt:
      'Compose a customary Baluba wedding invitation (dibaka). [Subject] A noble Black Congolese couple from the Luba nation adorned in authentic Kasai velvet (madiba), refined Kuba raffia geometry and royal beaded accents. [Action] Inviting the families to the tshibilu with Tshiluba title "Dibikila dia Tshibilu tshia Dibaka : Luayi tusankidile pamue dibaka dia bana betu". Text in Tshiluba: "Dituku : {{date}}", "Muaba : {{location}}", "Jadika dikalapu diebe ku tshibilu". [Location/context] Grand Kasaï customary celebration — Mbuji-Mayi or Kananga — honoring Luba dignity. [Composition] Tall 9:16, Kuba/Kasai geometric frame, spacious lower band for ceremonial lettering. [Style] Warm ochre, copper and royal gold, unblemished natural skin texture, photoreal luxury print finish.',
  },
  {
    id: 'coutumier-mongo-bonkoko',
    title: 'Mariage coutumier Mongo',
    category: 'coutumier',
    badge: 'Mongo',
    summary: 'Bonkoko et libota, fleuve Congo, forêt équatoriale, terracotta.',
    prompt:
      'Compose a customary Mongo wedding invitation (bonkoko). [Subject] A Black Congolese couple of the Mongo nation in ceremonial wax and raffia, standing as honored children of the libota. [Action] Calling the extended family with Lingala ceremonial header "Eyenga ya Kobala ya Bonkoko : Libyangi na baboti, libota mpe baninga". Details in Lingala: "Mokolo : {{date}}", "Esika : {{location}}", "Eyenga ya libota". Suggest river-Congo and equatorial-forest atmosphere through warm terracotta, deep leaf green and discreet raffia weave — no jungle cliché. [Location/context] Équateur / Cuvette customary union around Mbandaka and the river. [Composition] Tall 9:16, terracotta and forest-green ornamental frame, centered ceremonial typography. [Style] Soft river-evening light, copper accents, authentic 35mm skin texture, photoreal cotton-paper grain.',
  },
  {
    id: 'coutumier-lunda-mwadi',
    title: 'Mariage coutumier Lunda',
    category: 'coutumier',
    badge: 'Lunda',
    summary: 'Alliance Lunda du Katanga, cuivre, ivoire et or ciselé.',
    prompt:
      'Compose a customary Lunda wedding invitation. [Subject] A distinguished Black Congolese couple of the Lunda nation in ivory-and-copper ceremonial dress with refined Lunda–Chokwe textile geometry — geometric cloth and copper prestige only, no ritual masks. [Action] Announcing the family alliance with a solemn bilingual header: French "Mariage coutumier Lunda" and ceremonial line "Twakundama mwadi na mwana : luayi kusangana na disanka". Details: "Date : {{date}}", "Lieu : {{location}}", "Les familles vous attendent". Subtle Katanga copper-cross motif as a discreet foil corner mark. [Location/context] Lubumbashi / Lualaba customary celebration honoring Lunda lineage. [Composition] Tall 9:16, copper-red and ivory fillet frame, generous margins for lettering. [Style] Burnished copper, ivory paper, chiseled gold, authentic melanin fidelity, photoreal editorial stationery.',
  },

  // --- Catégorie : Copie & Clonage d'invitation ---
  {
    id: 'clone-exact',
    title: 'Copier fidèlement cette invitation',
    category: 'clone',
    badge: 'Clonage exact',
    summary: 'Reproduit la mise en page, les bordures ornementales dorées et le style typographique de l’image fournie.',
    prompt:
      'Clone faithfully the attached invitation card. [Subject] A vertical prestige stationery piece matching the reference. [Action] Reproduce the exact layout, ornamental gold borders, paper texture, visual hierarchy and typographic style of the reference card. [Location/context] Print-ready invitation for a Central African celebration. [Composition] Tall 9:16 frame, centered ceremonial focus, generous margins. [Style] Ultra-sharp prestige print look, cotton paper grain, gold foil accents, photoreal stationery photography.',
    isClone: true,
  },
  {
    id: 'clone-faces',
    title: 'Cloner le design & intégrer mes photos réelles',
    category: 'clone',
    badge: 'Clonage + Visages',
    summary: 'Duplique le cadre et le décor de l’invitation en intégrant vos photos telles quelles, sans embellir les visages.',
    prompt:
      'Clone the composition and ornaments of the reference invitation while integrating the people from my photos exactly as photographed. [Subject] Luxury invitation card with the real hosts from the attached portraits. [Action] Place those exact individuals inside the cloned gold frame without beautifying faces. [Location/context] Prestige printed card for a Kinshasa / RDC event. [Composition] 9:16 portrait, hosts centered in the ornamental frame, décor around them. [Style] 35mm photoreal print, natural skin texture and hair matching the photos, soft gold foil blend — faces remain completely unchanged.',
    isClone: true,
  },
  {
    id: 'clone-modernize',
    title: 'Moderniser une invitation existante',
    category: 'clone',
    badge: 'Modernisation',
    summary: 'Conserve la disposition et les informations, en modernisant les bordures avec un or brossé contemporain.',
    prompt:
      'Modernize this invitation while keeping its structure and spirit. [Subject] A refined contemporary invitation card. [Action] Refresh the borders into clean brushed-gold lines, keep the information hierarchy readable. [Location/context] High-end stationery for a Central African celebration. [Composition] Tall 9:16, balanced margins, discreet florals. [Style] Ivory textured paper, contemporary refined typography, soft luxury lighting, photoreal print finish.',
    isClone: true,
  },

  // --- Catégorie : Mariages & Dots ---
  {
    id: 'wedding-kinshasa-royal',
    title: 'Mariage princier à Kinshasa',
    category: 'wedding',
    badge: 'Ultra-réaliste',
    summary: 'Photo ultra-réaliste des mariés, éclairage chaud naturel, ivoire, or et pagne wax royal brodé.',
    prompt:
      'Compose a princely Kinshasa wedding invitation. [Subject] A Black African bride and groom with rich natural melanin. [Action] Standing together in ceremonial elegance beneath a white-and-gold floral arch. [Location/context] Prestige celebration in Kinshasa. [Composition] Vertical 9:16 medium-full shot, couple centered, generous lower margin for lettering. [Style] Warm cinematic daylight, ivory and gold palette, royal embroidered wax pagne, authentic 35mm skin texture — no airbrush.',
  },
  {
    id: 'wedding-dot-kuba',
    title: 'Dot coutumière & moderne',
    category: 'wedding',
    badge: 'Tradition & Luxe',
    summary: 'Motifs géométriques Kuba raffinés, teintes chaudes ocre, cuivre et or, visages fidèles à 100%.',
    prompt:
      'Design a traditional-meets-modern Dot invitation. [Subject] Black African hosts in Kasai velvet ceremonial attire. [Action] Presented within a refined Kuba geometric frame as honored couple of the Dot. [Location/context] Congolese customary celebration with contemporary luxury. [Composition] Tall 9:16, ornamental border focus, soft atmospheric depth. [Style] Warm ochre, copper and gold accents, authentic faces at 100% fidelity, hushed intimate lighting, photoreal print.',
  },
  {
    id: 'wedding-romantic-floral',
    title: 'Mariage romantique & floral féerique',
    category: 'wedding',
    badge: 'Romantique',
    summary: 'Lumière naturelle dorée, arche de roses blanches et eucalyptus, reflets dorés délicats.',
    prompt:
      'Compose a romantic floral wedding invitation. [Subject] A Black African couple with natural melanin complexions. [Action] Standing gently beneath an arch of white roses and eucalyptus. [Location/context] Fairy-tale garden ceremony mood. [Composition] Soft 9:16 portrait, couple mid-frame, floral arch framing the edges. [Style] Late-afternoon golden light, delicate gold reflections, pure photographic finish without artificial smoothing.',
  },

  // --- Catégorie : Galas & Entreprises ---
  {
    id: 'gala-gombe-prestige',
    title: 'Gala prestige Gombe (Noir & Champagne)',
    category: 'gala',
    badge: 'Business VIP',
    summary: 'Noir satiné profond, typographie serif élégante, accents champagne pétillant, minimaliste.',
    prompt:
      'Design a prestige Gombe gala invitation. [Subject] Black African hosts and guests in evening formalwear. [Action] Arriving into a champagne-accent VIP evening atmosphere. [Location/context] Upscale business gala in Gombe, Kinshasa. [Composition] Minimal tall 9:16 layout, deep negative space, centered ceremonial focus. [Style] Deep satin black, elegant serif hierarchy, sparkling champagne accents, luxurious minimal print photography.',
  },
  {
    id: 'gala-diplomatic',
    title: 'Cocktail officiel & remise de prix',
    category: 'gala',
    badge: 'Institutionnel',
    summary: 'Bleu nuit impérial, double filet d’or brossé, texture papier coton et typographie majestueuse.',
    prompt:
      'Compose an official awards cocktail invitation. [Subject] A vertical institutional stationery card. [Action] Presenting a formal ceremony mood with balanced ceremonial hierarchy. [Location/context] Diplomatic cocktail and prize evening. [Composition] Tall 9:16, double brushed-gold fillet frame, generous centered margins. [Style] Imperial midnight blue, luxurious cotton-paper texture, majestic classical typography, photoreal print finish.',
  },

  // --- Catégorie : Anniversaires & Soirées ---
  {
    id: 'birthday-vip-cocktail',
    title: 'Anniversaire VIP & cocktail champagne',
    category: 'birthday',
    badge: 'Festif VIP',
    summary: 'Portrait photo éclatant et réaliste de l’hôte, ambiance cocktail avec lumières bokeh scintillantes.',
    prompt:
      'Compose a VIP birthday cocktail invitation. [Subject] A Black African host or hostess with natural melanin complexion. [Action] Celebrating under sparkling champagne bokeh lights. [Location/context] Chic evening cocktail party. [Composition] Tall 9:16 portrait focus, soft bokeh background, lower third clear for type. [Style] Rose-gold and deep black palette, ultra-real photographic portrait, festive prestige lighting — no plastic beauty filter.',
  },
  {
    id: 'birthday-royal-jubilee',
    title: 'Jubilé royal & grande fête',
    category: 'birthday',
    badge: 'Grandeur',
    summary: 'Fond vert émeraude riche, volutes dorées baroques ciselées, arche florale tropicale somptueuse.',
    prompt:
      'Design a royal jubilee celebration invitation. [Subject] A sumptuous vertical stationery card. [Action] Opening onto a grand festive tropical floral arch. [Location/context] Prestigious jubilee party atmosphere. [Composition] Tall 9:16, ornate baroque gold scrollwork framing a rich emerald field. [Style] Deep emerald, chiseled gold volutes, tropical floral abundance, warm prestigious print photography.',
  },

  // --- Catégorie : 4 Langues nationales de la RDC (Lingala, Swahili, Kikongo, Tshiluba) ---
  // 1. LINGALA (Kinshasa, Équateur, Fleuve Congo)
  {
    id: 'lingala-libala-royal',
    title: 'Libala ya Lokumu (Mariage en Lingala)',
    category: 'rdc-langues',
    badge: 'Lingala',
    summary: 'Invitation de mariage en Lingala (« Libyangi ya Libala : Boya tosepela elongo »), ivoire, or chaud et pagne wax royal brodé.',
    prompt:
      'Compose a royal Kinshasa wedding invitation in authentic Lingala. [Subject] A Black African Congolese bride and groom in prestigious embroidered ivory wax attire. [Action] Presenting a joyous wedding invitation card titled "Libyangi ya Libala : Boya tosepela elongo na libala ya bana na biso". The card text elements must be in authentic Lingala: "Mokolo : {{date}}", "Esika : {{location}}", "Kondima kozala elongo na biso". [Location/context] Kinshasa festive celebration with warm hospitality and Rumba elegance. [Composition] Tall 9:16 portrait card, ornate gold filigree and ivory border, centered ceremonial typography. [Style] Warm volumetric daylight, authentic 35mm skin tones, gold foil reflections, luxury cotton paper grain finish.',
  },
  {
    id: 'lingala-dot-bonkoko',
    title: 'Kobala ya Bonkoko (Dot coutumière en Lingala)',
    category: 'rdc-langues',
    badge: 'Lingala (Dot)',
    summary: 'Invitation de dot traditionnelle en Lingala (« Eyenga ya Kobala »), teintes chaudes ocre, cuivre et dorures ciselées.',
    prompt:
      'Design a traditional Congolese dowry (Dot) invitation in Lingala. [Subject] Black African Congolese hosts in customary ceremonial attire with natural melanin skin. [Action] Announcing the customary union with header "Eyenga ya Kobala ya Bonkoko : Libyangi na baboti mpe baninga". Details in Lingala: "Mokolo : {{date}}", "Esika : {{location}}", "Eyenga ya libota". [Location/context] Kinshasa customary wedding with prestigious traditional ornaments. [Composition] Tall 9:16 vertical stationery frame, refined Kuba border details, centered text layout. [Style] Warm terracotta, copper and gold palette, authentic facial features at 100% fidelity, photoreal editorial print look.',
  },

  // 2. SWAHILI (Grand Kivu, Grand Katanga, Maniema, Kisangani)
  {
    id: 'swahili-harusi-kifahari',
    title: 'Harusi ya Kifahari (Mariage en Swahili)',
    category: 'rdc-langues',
    badge: 'Kiswahili',
    summary: 'Invitation d’honneur en Swahili (« Mwaliko wa Harusi : Karibuni sana tusherehekee »), pourpre royal, or brossé et fleurs tropicales.',
    prompt:
      'Compose a luxurious wedding invitation card in authentic Swahili (Kiswahili). [Subject] An elegant Black African Congolese couple from Eastern RDC / Katanga in bespoke formal attire. [Action] Welcoming guests with the Swahili title "Mwaliko wa Harusi ya Kifahari : Karibuni sana tusherehekee pamoja muungano huu mtakatifu". Text blocks in Swahili: "Tarehe : {{date}}", "Mahali : {{location}}", "Thibitisha uwepo wako kwa furaha". [Location/context] Grand celebration in Goma / Lubumbashi. [Composition] 9:16 vertical card with royal purple and brushed gold fillet borders, centered ceremonial typography. [Style] Rich atmospheric lighting, deep copper and gold accents, photoreal skin texture, tactile fine-art paper grain.',
  },
  {
    id: 'swahili-sikukuu-sherehe',
    title: 'Sikukuu ya Ushindi (Gala & Fête en Swahili)',
    category: 'rdc-langues',
    badge: 'Kiswahili (Fête)',
    summary: 'Invitation officielle et solennelle en Swahili (« Mwaliko Rasmi : Sikukuu ya Furaha »), bleu nuit et dorures fines.',
    prompt:
      'Design an official ceremonial gala invitation in Swahili. [Subject] A prestigious vertical invitation card for an honored celebration. [Action] Presenting the event with official Swahili lettering: "Mwaliko Rasmi wa Sherehe : Karibuni kwenye Sikukuu ya heshima na furaha". Details in Swahili: "Tarehe : {{date}}", "Ukumbi : {{location}}", "Kujumuika kwa heshima". [Location/context] High-level Congolese reception in Lubumbashi or Goma. [Composition] Elegant 9:16 layout, midnight blue and champagne gold geometric framing, clear typographic hierarchy. [Style] Luxury stationery finish, gold foil stamping reflections, sharp print photography.',
  },

  // 3. KIKONGO (Kongo Central, Bandundu, Kwilu, Kwango)
  {
    id: 'kikongo-makwela-lukumu',
    title: 'Nkinsi ya Makwela (Mariage en Kikongo)',
    category: 'rdc-langues',
    badge: 'Kikongo',
    summary: 'Invitation solennelle en Kikongo (« Mbila ya Nkinsi ya Makwela : Kwizeno beto sepela »), raphia noble du Royaume Kongo, vert forêt et or.',
    prompt:
      'Compose an authentic customary wedding invitation in Kikongo (Kituba). [Subject] A distinguished Congolese couple in royal Kongo textile patterns and ceremonial gold accessories. [Action] Presenting a solemn wedding invitation titled "Mbila ya Nkinsi ya Makwela : Kwizeno beto sepela kintwadi na dikwela yayi". Card text in Kikongo: "Kilumbu : {{date}}", "Kisika : {{location}}", "Tula kimbangi ya kukwiza kwaku". [Location/context] Kongo Central celebration inspired by noble ancestral heritage. [Composition] Tall 9:16 format with forest green and burnished gold scrollwork, centered ceremonial layout. [Style] Warm natural lighting, 100% natural melanin fidelity, fine embossed paper grain, photoreal luxury print look.',
  },
  {
    id: 'kikongo-nkinsi-kiese',
    title: 'Nkinsi ya Kiese (Célébration en Kikongo)',
    category: 'rdc-langues',
    badge: 'Kikongo (Jubilé)',
    summary: 'Invitation de fête et d’action de grâce en Kikongo (« Nkinsi ya Lukumu mpe Kiese »), ivoire pur, or poli et motifs ancestraux.',
    prompt:
      'Design an honored celebration invitation in Kikongo. [Subject] A vertical luxury invitation for a landmark milestone or jubilee. [Action] Inviting relatives and friends with authentic Kikongo phrasing: "Mbila ya Nkinsi ya Lukumu : Kwisa kusangana na kiese ya libota na beto". Details in Kikongo: "Kilumbu : {{date}}", "Kisika : {{location}}", "Beto ke vingila beno na kiese". [Location/context] Elegant traditional-meets-modern event in Kongo Central or Bandundu. [Composition] Tall 9:16, delicate gold border inspired by Congolese geometric art, clear margins. [Style] Pure ivory, polished gold, natural warm shadows, photoreal stationery finish.',
  },

  // 4. TSHILUBA (Grand Kasaï : Mbuji-Mayi, Kananga, Tshikapa)
  {
    id: 'tshiluba-dibaka-kanemu',
    title: 'Tshibilu tshia Dibaka (Mariage en Tshiluba)',
    category: 'rdc-langues',
    badge: 'Tshiluba',
    summary: 'Invitation princière en Tshiluba (« Dibikila dia Dibaka : Luayi tusankidile pamue »), velours du Kasaï (Madiba), ocre chaud et or royal.',
    prompt:
      'Design a princely wedding invitation in authentic Tshiluba (Ciluba). [Subject] A noble Black African Congolese couple adorned in authentic Kasai velvet (Madiba) and royal beaded accents. [Action] Inviting guests with traditional Kasai dignity: "Dibikila dia Kanemu ku Tshibilu tshia Dibaka : Luayi tusankidile pamue dibaka dia bana betu". Text elements in Tshiluba: "Dituku : {{date}}", "Muaba : {{location}}", "Jadika dikalapu diebe ku tshibilu". [Location/context] Prestige Kasai celebration honoring cultural royalty and contemporary elegance. [Composition] Tall 9:16 format, framed with refined Kuba/Kasai geometric borders, spacious lower area for lettering. [Style] Warm ochre, copper and royal gold, unblemished natural skin texture, photoreal luxury stationery finish.',
  },
  {
    id: 'tshiluba-tshibilu-banjelu',
    title: 'Tshibilu tshia Butumbi (Fête d’honneur en Tshiluba)',
    category: 'rdc-langues',
    badge: 'Tshiluba (Honneur)',
    summary: 'Invitation de fête d’honneur en Tshiluba (« Tshibilu tshia Butumbi ne Disanka »), rouge bordeaux, or ciselé et perles royales.',
    prompt:
      'Compose a high-prestige celebration invitation in Tshiluba. [Subject] An honored Congolese host or couple celebrated by their community. [Action] Announcing a grand reception with customary Tshiluba title: "Dibikila dia Butumbi : Luayi tuakidile tshibilu tshia disanka ne bunene". Details in Tshiluba: "Dituku : {{date}}", "Muaba : {{location}}", "Kudisangisha mu disanka". [Location/context] Grand Kasai banquet in Mbuji-Mayi or Kananga. [Composition] 9:16 vertical card with burgundy and chiseled gold fillet borders, centered hierarchy. [Style] Rich burgundy velvet texture, warm gold foil reflections, authentic African melanin portrait fidelity, photoreal editorial print look.',
  },
];
