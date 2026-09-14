import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitBuyerName,
  companionTicketEmail,
  checkoutQuantityCap,
  buyerTicketsLimitMessage,
  parseTicketsPerBuyerLimit,
  FALLBACK_TICKETS_PER_CHECKOUT,
} from '../utils/ticketOrderUtils.ts';
import { resolvePhoneFields, formatPhoneE164 } from '../utils/phone.ts';
import { normalizeGuestPreferences } from '../utils/rsvpPreferences.ts';

describe('ticketRsvpPresence & guest identity update', () => {
  it('extrait correctement le prénom et le nom de l’acheteur', () => {
    assert.deepEqual(splitBuyerName('Jean Dupont'), { firstName: 'Jean', lastName: 'Dupont' });
    assert.deepEqual(splitBuyerName('Jean-Claude Van Damme'), { firstName: 'Jean-Claude', lastName: 'Van Damme' });
    assert.deepEqual(splitBuyerName('Marie'), { firstName: 'Marie', lastName: 'Billet' });
    assert.deepEqual(splitBuyerName(''), { firstName: 'Invité', lastName: 'Billet' });
  });

  it('génère des emails de substitution uniques pour les billets accompagnateurs', () => {
    const email1 = companionTicketEmail('jean.dupont@example.com', 2, 'order-12345678-abcd');
    assert.match(email1, /^jean\.dupont\+billet2-order-12@example\.com$/);

    const emailFallback = companionTicketEmail('invalid-email', 2, 'order-12345678-abcd');
    assert.match(emailFallback, /^billet-order-12-2@tickets\.eventmaster\.local$/);
  });

  it('normalise les numéros de téléphone et WhatsApp pour les invités', () => {
    const res = resolvePhoneFields({ phone: '0812345678', phoneCountryCode: '+243' });
    assert.equal(res.phone, '+243812345678');
    assert.equal(res.phoneCountryCode, '+243');

    const formatted = formatPhoneE164('0820000000');
    assert.equal(formatted, '+243820000000');
  });

  it('conserve et fusionne les préférences alimentaires et notes lors de la modification', () => {
    const prefs = normalizeGuestPreferences({
      allergies: 'Arachides, Fruits de mer',
      specialMeal: 'vegetarian',
      notes: 'Je viendrai avec ma compagne',
    });
    assert.equal(prefs.allergies, 'Arachides, Fruits de mer');
    assert.equal(prefs.specialMeal, 'vegetarian');
    assert.equal(prefs.notes, 'Je viendrai avec ma compagne');
  });

  it('parse la limite de billets par acheteur définie par l’organisateur', () => {
    assert.equal(parseTicketsPerBuyerLimit(''), null);
    assert.equal(parseTicketsPerBuyerLimit(undefined), null);
    assert.equal(parseTicketsPerBuyerLimit(4), 4);
    assert.equal(parseTicketsPerBuyerLimit('3'), 3);
    assert.equal(parseTicketsPerBuyerLimit(0), null);
  });

  it('calcule le plafond d’une commande selon la limite organisateur et les places restantes', () => {
    assert.equal(
      checkoutQuantityCap({ ticketsPerBuyerLimit: 5, alreadyBought: 2, ticketsRemaining: 10 }),
      3,
    );
    assert.equal(
      checkoutQuantityCap({ ticketsPerBuyerLimit: 5, alreadyBought: 5, ticketsRemaining: 10 }),
      0,
    );
    assert.equal(
      checkoutQuantityCap({ ticketsPerBuyerLimit: null, alreadyBought: 12, ticketsRemaining: null }),
      FALLBACK_TICKETS_PER_CHECKOUT,
    );
    assert.equal(
      checkoutQuantityCap({ ticketsPerBuyerLimit: 8, alreadyBought: 0, ticketsRemaining: 2 }),
      2,
    );
  });

  it('explique clairement le refus quand la limite par personne est atteinte', () => {
    assert.match(buyerTicketsLimitMessage(3, 3), /atteint la limite de 3/);
    assert.match(buyerTicketsLimitMessage(4, 1), /reste 3 places/);
  });
});
