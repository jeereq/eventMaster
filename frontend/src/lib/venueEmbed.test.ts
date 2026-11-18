import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmbedPath, buildEmbedSnippet } from './venueEmbed.ts';

describe('buildEmbedPath', () => {
  it('encode le slug dans le chemin', () => {
    assert.equal(buildEmbedPath('salle-des-fetes'), '/embed/salles/salle-des-fetes');
    assert.equal(buildEmbedPath('salle é/x'), '/embed/salles/salle%20%C3%A9%2Fx');
  });
});

describe('buildEmbedSnippet', () => {
  it('produit une iframe pointant vers la route d’intégration', () => {
    const html = buildEmbedSnippet('https://eventmaster.test/', 'grand-salon', 'Grand salon');
    assert.match(html, /src="https:\/\/eventmaster\.test\/embed\/salles\/grand-salon"/);
    assert.match(html, /title="Grand salon"/);
    assert.match(html, /allow="fullscreen"/);
  });

  it('échappe le titre pour ne pas casser l’attribut', () => {
    const html = buildEmbedSnippet('https://x.test', 's', 'Salle "VIP" <b>');
    assert.match(html, /title="Salle &quot;VIP&quot; &lt;b&gt;"/);
    assert.doesNotMatch(html, /title="Salle "/);
  });

  it('retombe sur un titre par défaut', () => {
    assert.match(buildEmbedSnippet('https://x.test', 's', '  '), /title="Visite 3D de la salle"/);
  });
});
