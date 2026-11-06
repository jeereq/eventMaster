import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildMessagingChannels, joinFr } from './messagingChannels.ts';

describe('joinFr', () => {
  it('compose les listes françaises', () => {
    assert.equal(joinFr([]), '');
    assert.equal(joinFr(['a']), 'a');
    assert.equal(joinFr(['a', 'b'], 'ou'), 'a ou b');
    assert.equal(joinFr(['a', 'b', 'c']), 'a, b et c');
  });
});

describe('buildMessagingChannels', () => {
  it('liste tous les canaux activés', () => {
    const ch = buildMessagingChannels(['EMAIL', 'WHATSAPP', 'SMS', 'PUSH']);
    assert.equal(ch.via(), 'par WhatsApp, SMS ou e-mail');
    assert.equal(ch.list({ conj: 'et' }), 'WhatsApp, SMS et e-mail');
  });

  it('retire WhatsApp quand il est désactivé', () => {
    const ch = buildMessagingChannels(['EMAIL', 'SMS', 'PUSH']);
    assert.equal(ch.whatsapp, false);
    assert.equal(ch.via(), 'par SMS ou e-mail');
    assert.equal(ch.phoneList(), 'SMS');
  });

  it('reste correct avec un seul canal ou aucun', () => {
    assert.equal(buildMessagingChannels(['EMAIL']).via(), 'par e-mail');
    const none = buildMessagingChannels(['PUSH']);
    assert.equal(none.any, false);
    assert.equal(none.via(), 'par lien personnel');
    assert.equal(none.list(), '');
  });
});

describe('adaptChannelLists', () => {
  const noWa = buildMessagingChannels(['EMAIL', 'SMS', 'PUSH']);
  it('recompose les énumérations sans WhatsApp', () => {
    assert.equal(noWa.adapt('Invitations par e-mail ou WhatsApp, suivi en direct.'), 'Invitations par e-mail, suivi en direct.');
    assert.equal(noWa.adapt('Invitez par WhatsApp, SMS ou e-mail, placez.'), 'Invitez par SMS ou e-mail, placez.');
    assert.equal(noWa.adapt('Invitations WhatsApp, SMS et e-mail'), 'Invitations SMS et e-mail');
    assert.equal(noWa.adapt('Canaux e-mail / WhatsApp / push :'), 'Canaux e-mail / push :');
    assert.equal(noWa.adapt('E-mail & WhatsApp'), 'E-mail');
    assert.equal(noWa.adapt('WhatsApp et e-mail.'), 'E-mail.');
    assert.equal(noWa.adapt('Textes WhatsApp / e-mail invités'), 'Textes e-mail invités');
    assert.equal(noWa.adapt('par e-mail, WhatsApp ou SMS selon'), 'par e-mail ou SMS selon');
  });
  it('ne touche à rien quand tout est actif', () => {
    const all = buildMessagingChannels(['EMAIL', 'WHATSAPP', 'SMS']);
    assert.equal(all.adapt('e-mail ou WhatsApp'), 'e-mail ou WhatsApp');
  });
});

describe('adaptSingleChannelMentions', () => {
  const noWa = buildMessagingChannels(['EMAIL', 'SMS', 'PUSH']);
  it('reformule les mentions isolées de WhatsApp', () => {
    assert.equal(noWa.adapt('Invitations WhatsApp, plan de table 3D.'), 'Invitations par SMS ou e-mail, plan de table 3D.');
    assert.equal(noWa.adapt('Relancez les autres sur WhatsApp en un clic.'), 'Relancez les autres par SMS ou e-mail en un clic.');
    assert.equal(noWa.adapt('Cartes 9:16 WhatsApp et réponse'), 'Cartes 9:16 mobile et réponse');
    assert.equal(noWa.adapt('Format WhatsApp 9:16'), 'Format 9:16');
    assert.equal(noWa.adapt('Partage WhatsApp en 1 clic'), 'Partage du lien en 1 clic');
    assert.equal(noWa.adapt('Le format 9:16 est pensé pour le partage sur WhatsApp, sans recadrage.'), 'Le format 9:16 est pensé pour le partage, sans recadrage.');
    assert.equal(noWa.adapt('Faire-part WhatsApp avec réponse en ligne'), 'Faire-part par SMS ou e-mail avec réponse en ligne');
  });
});

describe('adaptSingleChannelMentions (adjectifs)', () => {
  const noWa = buildMessagingChannels(['EMAIL', 'SMS', 'PUSH']);
  it('place le complément après l’adjectif', () => {
    assert.equal(
      noWa.adapt('envoyez des faire-part WhatsApp personnalisés et suivez'),
      'envoyez des faire-part personnalisés par SMS ou e-mail et suivez',
    );
    assert.equal(noWa.adapt('Inviter sur WhatsApp'), 'Inviter par SMS ou e-mail');
  });
});

describe('adaptSingleChannelMentions (titres)', () => {
  const noWa = buildMessagingChannels(['EMAIL', 'SMS', 'PUSH']);
  it('retire le canal d’un titre composé', () => {
    assert.equal(noWa.adapt('Repérage WhatsApp & Accueil QR'), 'Repérage & Accueil QR');
    assert.equal(noWa.adapt('Partage direct en format WhatsApp 9:16 avec lien'), 'Partage direct en format 9:16 avec lien');
  });
});

describe('libellé réduit au canal', () => {
  it('remplace un badge « WhatsApp » par les canaux restants', () => {
    assert.equal(buildMessagingChannels(['EMAIL', 'SMS']).adapt('WhatsApp'), 'SMS & e-mail');
    assert.equal(buildMessagingChannels(['PUSH']).adapt('WhatsApp'), 'En ligne');
    assert.equal(buildMessagingChannels(['EMAIL', 'WHATSAPP']).adapt('WhatsApp'), 'WhatsApp');
  });
});

describe('titres légaux', () => {
  it('retire « & Canal WhatsApp »', () => {
    assert.equal(
      buildMessagingChannels(['EMAIL', 'SMS']).adapt('7. Invitations Multilingues, Langues Nationales Congolaises & Canal WhatsApp'),
      '7. Invitations Multilingues, Langues Nationales Congolaises',
    );
  });
});
