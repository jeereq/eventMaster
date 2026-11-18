import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { describeEditorUpsell, minimumEditorLevel, textOfNode } from './roomEditorUpsell.ts';

describe('minimumEditorLevel', () => {
  it('trouve le premier niveau offrant la fonction', () => {
    assert.equal(minimumEditorLevel({ feature: 'canDuplicate' }), 'standard');
    assert.equal(minimumEditorLevel({ feature: 'canZones' }), 'advanced');
    assert.equal(minimumEditorLevel({ feature: 'canCustomImages' }), 'complete');
    assert.equal(minimumEditorLevel({ fixture: 'stairs' }), 'advanced');
    assert.equal(minimumEditorLevel({ fixture: 'door' }), 'standard');
    assert.equal(minimumEditorLevel({ shape: 'arc' }), 'standard');
  });
});

describe('describeEditorUpsell', () => {
  it('indique le forfait requis quand il est supérieur', () => {
    const upsell = describeEditorUpsell('Zones', { feature: 'canZones' }, 'standard');
    assert.equal(upsell.planLabel, 'Premium');
    assert.match(upsell.message, /Premium/);
  });

  it('parle de l’option du forfait quand le niveau suffit déjà', () => {
    const upsell = describeEditorUpsell('Escalier', { fixture: 'stairs' }, 'advanced');
    assert.equal(upsell.planLabel, null);
    assert.match(upsell.message, /option/);
  });
});

describe('textOfNode', () => {
  it('concatène le texte imbriqué', () => {
    assert.equal(textOfNode({ props: { children: ['Rangée ', { props: { children: 'VIP' } }] } }), 'Rangée VIP');
    assert.equal(textOfNode(null), '');
  });
});
