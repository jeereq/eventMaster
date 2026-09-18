import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyInvitationIdentityToContent,
  formatInvitationIdentityDate,
  resolveInvitationIdentity,
} from './invitationIdentity.ts';

describe('resolveInvitationIdentity', () => {
  it('prend les hôtes pour {{title}} et formate la date', () => {
    const resolved = resolveInvitationIdentity({
      title: 'Mariage princier',
      honorees: 'Amina & Jean-Marc',
      date: '2026-10-24',
    });
    assert.equal(resolved.title, 'Mariage princier');
    assert.equal(resolved.honorees, 'Amina & Jean-Marc');
    assert.match(resolved.date, /octobre 2026/i);
  });
});

describe('applyInvitationIdentityToContent', () => {
  it('écrit le couple sur le plus grand texte si {{title}} est absent', () => {
    const next = applyInvitationIdentityToContent({
      elements: [
        { id: '1', type: 'text', text: 'CÉLÉBRATION UNIQUE', fontSize: '12px', letterSpacing: '0.2em' },
        { id: '2', type: 'text', text: 'Hassan & Ayesha', fontSize: '32px' },
        { id: '3', type: 'text', text: 'Le dimanche 15 juin', fontSize: '14px' },
      ],
    }, {
      title: 'Mariage princier',
      honorees: 'Amina & Jean-Marc',
      date: '2026-10-24',
      applyTitleToCard: true,
    });
    const texts = (next.elements as Array<{ text: string }>).map((el) => el.text);
    assert.equal(texts[0], 'Mariage princier');
    assert.equal(texts[1], 'Amina & Jean-Marc');
    assert.match(texts[2], /octobre 2026/i);
  });

  it('remplace les variables titre et date sur les calques', () => {
    const next = applyInvitationIdentityToContent({
      global: { bgType: 'color' },
      elements: [
        { id: '1', type: 'text', text: 'Mariage de {{title}}', fontSize: '28px' },
        { id: '2', type: 'text', text: 'Le {{date}}', fontSize: '14px' },
      ],
    }, {
      title: 'Mariage princier',
      honorees: 'Amina & Jean-Marc',
      date: '2026-10-24',
    });

    const texts = (next.elements as Array<{ text: string }>).map((el) => el.text);
    assert.equal(texts[0], 'Mariage de Amina & Jean-Marc');
    assert.match(texts[1], /octobre 2026/i);
    assert.equal((next.global as { identity?: { honorees?: string } }).identity?.honorees, 'Amina & Jean-Marc');
    assert.equal((next.global as { identity?: { title?: string } }).identity?.title, 'Mariage princier');
  });

  it('remplace le lieu et la description sur les calques', () => {
    const nextWithTag = applyInvitationIdentityToContent({
      global: { bgType: 'color' },
      elements: [
        { id: '1', type: 'text', text: 'Mariage de {{title}}', fontSize: '28px' },
        { id: '2', type: 'text', text: 'Le {{date}}', fontSize: '14px' },
        { id: '3', type: 'text', text: 'À {{location}}', fontSize: '14px' },
      ],
    }, {
      title: 'Mariage princier',
      honorees: 'Amina & Jean-Marc',
      date: '2026-10-24',
      description: 'Hôtel Memling, Salle Capitole',
    });

    const textsWithTag = (nextWithTag.elements as Array<{ text: string }>).map((el) => el.text);
    assert.equal(textsWithTag[0], 'Mariage de Amina & Jean-Marc');
    assert.equal(textsWithTag[2], 'À Hôtel Memling, Salle Capitole');

    const nextStatic = applyInvitationIdentityToContent({
      global: { bgType: 'color' },
      elements: [
        { id: '1', type: 'text', text: 'Mariage de {{title}}', fontSize: '28px' },
        { id: '2', type: 'text', text: 'Le {{date}}', fontSize: '14px' },
        { id: '3', type: 'text', text: 'Grand Hôtel de Kinshasa · Salle Congo', fontSize: '12px' },
      ],
    }, {
      title: 'Mariage princier',
      honorees: 'Amina & Jean-Marc',
      date: '2026-10-24',
      description: 'Hôtel Memling, Salle Capitole',
    });

    const textsStatic = (nextStatic.elements as Array<{ text: string }>).map((el) => el.text);
    assert.equal(textsStatic[2], 'Hôtel Memling, Salle Capitole');
  });
});

describe('formatInvitationIdentityDate', () => {
  it('laisse une date déjà lisible intacte', () => {
    assert.equal(formatInvitationIdentityDate('Samedi 24 octobre'), 'Samedi 24 octobre');
  });
});
