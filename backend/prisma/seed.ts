import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Début du peuplement de la base de données (seeding)...');

  // Nettoyage de la base de données existante (dans l'ordre pour respecter les contraintes de clés étrangères)
  console.log('Nettoyage des données existantes...');
  await prisma.invitation.deleteMany({});
  await prisma.guest.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.template.deleteMany({});
  
  // Pour éviter les erreurs de clés circulaires entre Tenant et User, on met d'abord managerId à null
  await prisma.tenant.updateMany({ data: { managerId: null } });
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('Création des mots de passe hachés...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Création du Super Administrateur (sans Tenant)
  console.log('Création du Super Admin...');
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@eventmaster.cd',
      name: 'Super Admin EventMaster',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  // 2. Création des Tenants (Organisations)
  console.log('Création des Organisations (Tenants)...');
  
  // Tenant 1 : Agence Prestige (Premium)
  const tenantPrestige = await prisma.tenant.create({
    data: {
      name: 'Agence Prestige',
      plan: 'PREMIUM',
      stripeCustId: 'cus_prestige123',
    },
  });

  // Tenant 2 : Club des Entrepreneurs (Standard)
  const tenantEntrepreneurs = await prisma.tenant.create({
    data: {
      name: 'Club des Entrepreneurs',
      plan: 'STANDARD' as any,
      stripeCustId: 'cus_entrepreneurs123',
    },
  });

  // Tenant 3 : Mariage Rêvé (Free)
  const tenantMariage = await prisma.tenant.create({
    data: {
      name: 'Mariage Rêvé',
      plan: 'FREE',
    },
  });

  // Tenant 4 : Global Corp Events (Enterprise)
  const tenantGlobalCorp = await prisma.tenant.create({
    data: {
      name: 'Global Corp Events',
      plan: 'ENTERPRISE',
      stripeCustId: 'cus_globalcorp123',
    },
  });

  // 3. Création des Utilisateurs associés aux Tenants
  console.log('Création des utilisateurs...');
  
  const userPrestige = await prisma.user.create({
    data: {
      email: 'admin@prestige.cd',
      name: 'Jean-Marc Kabeya',
      passwordHash,
      role: 'USER',
      tenantId: tenantPrestige.id,
    },
  });

  const userEntrepreneurs = await prisma.user.create({
    data: {
      email: 'contact@entrepreneurs.cd',
      name: 'Sarah Mwamba',
      passwordHash,
      role: 'USER',
      tenantId: tenantEntrepreneurs.id,
    },
  });

  const userMariage = await prisma.user.create({
    data: {
      email: 'claire@mariagereve.cd',
      name: 'Claire Mpunga',
      passwordHash,
      role: 'USER',
      tenantId: tenantMariage.id,
    },
  });

  const userGlobalCorp = await prisma.user.create({
    data: {
      email: 'event@globalcorp.cd',
      name: 'Patrick Kalonji',
      passwordHash,
      role: 'USER',
      tenantId: tenantGlobalCorp.id,
    },
  });

  // Mise à jour des managers des Tenants
  console.log('Association des managers aux organisations...');
  await prisma.tenant.update({
    where: { id: tenantPrestige.id },
    data: { managerId: userPrestige.id },
  });
  await prisma.tenant.update({
    where: { id: tenantEntrepreneurs.id },
    data: { managerId: userEntrepreneurs.id },
  });
  await prisma.tenant.update({
    where: { id: tenantMariage.id },
    data: { managerId: userMariage.id },
  });
  await prisma.tenant.update({
    where: { id: tenantGlobalCorp.id },
    data: { managerId: userGlobalCorp.id },
  });

  // 4. Création des Modèles d'Invitations (Templates)
  console.log('Création des modèles d\'invitations...');

  // Template Prestige - Gala
  const templatePrestige = await prisma.template.create({
    data: {
      tenantId: tenantPrestige.id,
      name: 'Modèle Gala d\'Excellence',
      content: {
        elements: [
          { id: '1', type: 'text', text: 'SOIRÉE ANNUELLE DE BIENFAISANCE', color: '#f59e0b', fontSize: '12px', align: 'center' },
          { id: '2', type: 'text', text: 'Gala d\'Excellence 2026', color: '#1e1b4b', fontSize: '32px', align: 'center' },
          { id: '3', type: 'text', text: 'Une soirée prestigieuse dédiée à l\'innovation et à la solidarité internationale. Tenue de soirée exigée.', color: '#475569', fontSize: '14px', align: 'center' },
          { id: '4', type: 'rsvp-block', text: 'Confirmer ma présence', color: '#4f46e5', fontSize: '16px', align: 'center' }
        ]
      }
    }
  });

  // Template Entrepreneurs - Cocktail
  const templateEntrepreneurs = await prisma.template.create({
    data: {
      tenantId: tenantEntrepreneurs.id,
      name: 'Modèle Networking Pro',
      content: {
        elements: [
          { id: '1', type: 'text', text: 'NETWORKING & COCKTAIL', color: '#4f46e5', fontSize: '12px', align: 'center' },
          { id: '2', type: 'text', text: 'Cocktail d\'Inauguration', color: '#0f172a', fontSize: '28px', align: 'center' },
          { id: '3', type: 'text', text: 'Rencontrez l\'écosystème local et découvrez nos nouveaux locaux autour d\'une sélection de mets raffinés.', color: '#334155', fontSize: '14px', align: 'center' },
          { id: '4', type: 'rsvp-block', text: 'S\'inscrire à la Soirée', color: '#0f172a', fontSize: '16px', align: 'center' }
        ]
      }
    }
  });

  // Template Mariage
  const templateMariage = await prisma.template.create({
    data: {
      tenantId: tenantMariage.id,
      name: 'Modèle Mariage Champêtre',
      content: {
        elements: [
          { id: '1', type: 'text', text: 'CÉLÉBRATION DE NOTRE UNION', color: '#b45309', fontSize: '12px', align: 'center' },
          { id: '2', type: 'text', text: 'Claire & Alexandre', color: '#78350f', fontSize: '36px', align: 'center' },
          { id: '3', type: 'text', text: 'Nous sommes impatients de célébrer ce moment entourés de nos proches. Rejoignez-nous pour notre mariage suivi d\'une réception privée.', color: '#451a03', fontSize: '14px', align: 'center' },
          { id: '4', type: 'rsvp-block', text: 'Confirmer ma Présence', color: '#b45309', fontSize: '16px', align: 'center' }
        ]
      }
    }
  });

  // Template Global Corp
  const templateGlobalCorp = await prisma.template.create({
    data: {
      tenantId: tenantGlobalCorp.id,
      name: 'Modèle Séminaire Corporatif',
      content: {
        elements: [
          { id: '1', type: 'text', text: 'CONFÉRENCE EXCLUSIVE', color: '#2563eb', fontSize: '12px', align: 'center' },
          { id: '2', type: 'text', text: 'Séminaire Dirigeants 2026', color: '#1e293b', fontSize: '30px', align: 'center' },
          { id: '3', type: 'text', text: 'Une journée de réflexion stratégique sur les enjeux de l\'année fiscale, réservée aux membres du conseil d\'administration.', color: '#475569', fontSize: '14px', align: 'center' },
          { id: '4', type: 'rsvp-block', text: 'Confirmer ma présence', color: '#2563eb', fontSize: '16px', align: 'center' }
        ]
      }
    }
  });

  // 5. Création des Événements
  console.log('Création des événements...');

  // Événements Agence Prestige
  const eventGala = await prisma.event.create({
    data: {
      tenantId: tenantPrestige.id,
      title: 'Gala de Charité d\'Élite',
      description: 'Collecte de fonds annuelle pour les orphelinats de Kinshasa.',
      date: new Date('2026-09-25T19:00:00Z'),
      location: 'Hôtel Fleuve Congo, Gombe, Kinshasa',
    },
  });

  const eventVIP = await prisma.event.create({
    data: {
      tenantId: tenantPrestige.id,
      title: 'Cocktail d\'Inauguration VIP',
      description: 'Lancement officiel de la nouvelle collection d\'art contemporain.',
      date: new Date('2026-07-30T18:30:00Z'),
      location: 'Galerie d\'Art de la Gombe, Kinshasa',
    },
  });

  // Événement Club des Entrepreneurs
  const eventNetworking = await prisma.event.create({
    data: {
      tenantId: tenantEntrepreneurs.id,
      title: 'Soirée Networking & Pitch',
      description: 'Rencontre mensuelle des entrepreneurs et investisseurs de la RDC.',
      date: new Date('2026-07-15T18:00:00Z'),
      location: 'Silikin Village, Limete, Kinshasa',
    },
  });

  // Événement Mariage Rêvé
  const eventMariage = await prisma.event.create({
    data: {
      tenantId: tenantMariage.id,
      title: 'Mariage de Claire & Alexandre',
      description: 'Cérémonie religieuse suivie d\'un dîner dansant.',
      date: new Date('2026-12-19T14:00:00Z'),
      location: 'Espace Texas, Binza Pigeon, Kinshasa',
    },
  });

  // Événement Global Corp Events
  const eventSeminar = await prisma.event.create({
    data: {
      tenantId: tenantGlobalCorp.id,
      title: 'Séminaire Annuel des Dirigeants',
      description: 'Planification stratégique et revue des performances annuelles.',
      date: new Date('2026-10-10T09:00:00Z'),
      location: 'Pullman Grand Hôtel, Gombe, Kinshasa',
    },
  });

  // 6. Création des Invitations (liaison Événement <-> Modèle)
  console.log('Création des invitations...');

  await prisma.invitation.create({
    data: {
      eventId: eventGala.id,
      templateId: templatePrestige.id,
      subject: 'Invitation officielle : Gala de Charité d\'Élite 2026',
      body: 'Cher(e) {{firstName}} {{lastName}},\n\nNous avons l\'immense honneur de vous inviter au Gala de Charité d\'Élite.\n\nCliquez sur le lien ci-dessous pour confirmer votre présence et choisir vos préférences.\n\n{{rsvpLink}}',
      channel: 'EMAIL',
    }
  });

  await prisma.invitation.create({
    data: {
      eventId: eventNetworking.id,
      templateId: templateEntrepreneurs.id,
      subject: 'Votre invitation : Soirée Networking & Pitch',
      body: 'Bonjour {{firstName}},\n\nRejoignez-nous pour la soirée de réseautage de ce mois.\n\nRéservez votre place ici : {{rsvpLink}}',
      channel: 'EMAIL',
    }
  });

  await prisma.invitation.create({
    data: {
      eventId: eventMariage.id,
      templateId: templateMariage.id,
      subject: 'Mariage de Claire & Alexandre - Invitation',
      body: 'Chers {{firstName}} et {{lastName}},\n\nC\'est avec une grande joie que nous vous invitons à notre mariage.\n\nMerci de confirmer votre présence avant le 30 novembre sur ce lien : {{rsvpLink}}',
      channel: 'EMAIL',
    }
  });

  await prisma.invitation.create({
    data: {
      eventId: eventSeminar.id,
      templateId: templateGlobalCorp.id,
      subject: 'Séminaire Annuel des Dirigeants 2026 - Convocation',
      body: 'Cher(e) {{firstName}} {{lastName}},\n\nVous êtes convié(e) au séminaire annuel de planification.\n\nMerci de confirmer votre présence et d\'indiquer vos contraintes alimentaires : {{rsvpLink}}',
      channel: 'EMAIL',
    }
  });

  // 7. Création des Invités (Guests) avec différents statuts RSVP
  console.log('Création des invités...');

  // Invités pour le Gala de Charité d'Élite (Prestige)
  const guestsGala = [
    { firstName: 'Dieudonné', lastName: 'Kabila', email: 'dieudonne.kabila@gmail.com', category: 'VIP', rsvp: 'ACCEPTED', preferences: { diet: 'Aucun', allergies: 'Aucune', plusOne: true } },
    { firstName: 'Marie-Thérèse', lastName: 'Nzuzi', email: 'mt.nzuzi@yahoo.fr', category: 'VIP', rsvp: 'ACCEPTED', preferences: { diet: 'Poisson uniquement', allergies: 'Gluten', plusOne: false } },
    { firstName: 'Christian', lastName: 'Lwamba', email: 'c.lwamba@outlook.com', category: 'Donateur', rsvp: 'PENDING', preferences: undefined },
    { firstName: 'Fanny', lastName: 'Kapinga', email: 'fanny.kapinga@gmail.com', category: 'Donateur', rsvp: 'DECLINED', preferences: undefined },
    { firstName: 'Jonathan', lastName: 'Tshilombo', email: 'j.tshilombo@gmail.com', category: 'Presse', rsvp: 'ACCEPTED', preferences: { diet: 'Végétarien', allergies: 'Arachides', plusOne: false } },
    { firstName: 'Arlette', lastName: 'Mbuyi', email: 'arlette.mbuyi@prestige.cd', category: 'Staff', rsvp: 'ACCEPTED', preferences: { diet: 'Aucun', allergies: 'Aucune', plusOne: false } },
  ];

  for (const guest of guestsGala) {
    await prisma.guest.create({
      data: {
        eventId: eventGala.id,
        ...guest,
      },
    });
  }

  // Invités pour le Cocktail VIP (Prestige)
  const guestsVIP = [
    { firstName: 'Marc', lastName: 'Ilunga', email: 'marc.ilunga@gmail.com', category: 'VIP', rsvp: 'ACCEPTED', preferences: { diet: 'Aucun', allergies: 'Aucune', plusOne: true } },
    { firstName: 'Sandrine', lastName: 'Kanku', email: 'sandrine.kanku@gmail.com', category: 'Artiste', rsvp: 'PENDING', preferences: undefined },
    { firstName: 'Olivier', lastName: 'Mukinayi', email: 'o.mukinayi@gmail.com', category: 'Presse', rsvp: 'DECLINED', preferences: undefined },
  ];

  for (const guest of guestsVIP) {
    await prisma.guest.create({
      data: {
        eventId: eventVIP.id,
        ...guest,
      },
    });
  }

  // Invités pour la Soirée Networking (Club des Entrepreneurs)
  const guestsNetworking = [
    { firstName: 'Alain', lastName: 'Mukendi', email: 'alain@mukendi-consulting.cd', category: 'Membre', rsvp: 'ACCEPTED', preferences: { diet: 'Halal', allergies: 'Aucune', plusOne: false } },
    { firstName: 'Patricia', lastName: 'Ngalula', email: 'patricia@techstart.cd', category: 'Pitcher', rsvp: 'ACCEPTED', preferences: { diet: 'Végétarien', allergies: 'Lactose', plusOne: false } },
    { firstName: 'Didier', lastName: 'Tshisekedi', email: 'didier.t@invest-rdc.com', category: 'Investisseur', rsvp: 'PENDING', preferences: undefined },
    { firstName: 'Nathalie', lastName: 'Banza', email: 'nathalie.banza@gmail.com', category: 'Visiteur', rsvp: 'ACCEPTED', preferences: { diet: 'Aucun', allergies: 'Fruits de mer', plusOne: false } },
    { firstName: 'Eric', lastName: 'Kabasele', email: 'eric.kabasele@gmail.com', category: 'Visiteur', rsvp: 'DECLINED', preferences: undefined },
  ];

  for (const guest of guestsNetworking) {
    await prisma.guest.create({
      data: {
        eventId: eventNetworking.id,
        ...guest,
      },
    });
  }

  // Invités pour le Mariage (Claire & Alexandre)
  const guestsMariage = [
    { firstName: 'Alexandre', lastName: 'Nguya', email: 'alexandre.nguya@gmail.com', category: 'Famille Époux', rsvp: 'ACCEPTED', preferences: { diet: 'Aucun', allergies: 'Aucune', plusOne: false } },
    { firstName: 'Maman', lastName: 'Jeanne', email: 'maman.jeanne@gmail.com', category: 'Famille Épouse', rsvp: 'ACCEPTED', preferences: { diet: 'Aucun', allergies: 'Aucune', plusOne: false } },
    { firstName: 'Tonton', lastName: 'Michel', email: 'michel.mpunga@yahoo.fr', category: 'Famille Épouse', rsvp: 'ACCEPTED', preferences: { diet: 'Sans porc', allergies: 'Aucune', plusOne: true } },
    { firstName: 'Gauthier', lastName: 'Kalonji', email: 'gauthier.k@gmail.com', category: 'Ami', rsvp: 'PENDING', preferences: undefined },
    { firstName: 'Rachel', lastName: 'Mbuyi', email: 'rachel.mbuyi@gmail.com', category: 'Ami', rsvp: 'ACCEPTED', preferences: { diet: 'Végétarien', allergies: 'Aucune', plusOne: true } },
    { firstName: 'Bob', lastName: 'Kabongo', email: 'bob.kabongo@gmail.com', category: 'Collègue', rsvp: 'DECLINED', preferences: undefined },
  ];

  for (const guest of guestsMariage) {
    await prisma.guest.create({
      data: {
        eventId: eventMariage.id,
        ...guest,
      },
    });
  }

  // Invités pour le Séminaire (Global Corp)
  const guestsSeminar = [
    { firstName: 'Jean-Pierre', lastName: 'Bemba', email: 'jp.bemba@globalcorp.cd', category: 'C-Level', rsvp: 'ACCEPTED', preferences: { diet: 'Aucun', allergies: 'Aucune' } },
    { firstName: 'Solange', lastName: 'Liyolo', email: 'solange.liyolo@globalcorp.cd', category: 'C-Level', rsvp: 'ACCEPTED', preferences: { diet: 'Poisson', allergies: 'Aucune' } },
    { firstName: 'Arthur', lastName: 'Mavinga', email: 'arthur.mavinga@globalcorp.cd', category: 'Directeur', rsvp: 'PENDING', preferences: undefined },
    { firstName: 'Carine', lastName: 'Kanza', email: 'carine.kanza@globalcorp.cd', category: 'Directeur', rsvp: 'ACCEPTED', preferences: { diet: 'Végétalien', allergies: 'Soja' } },
  ];

  for (const guest of guestsSeminar) {
    await prisma.guest.create({
      data: {
        eventId: eventSeminar.id,
        ...guest,
      },
    });
  }

  console.log('Base de données peuplée avec succès ! 🎉');
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
