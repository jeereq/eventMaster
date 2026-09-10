import type { CSSProperties } from 'react';

export function getTemplateBackgroundStyle(
  type: string | undefined,
  color: string,
  url: string | undefined,
  pattern: string | undefined,
): CSSProperties {
  if (type === 'color') return { backgroundColor: color || '#ffffff' };
  if (type === 'image' && url) {
    return {
      backgroundColor: color || '#faf8f5',
      backgroundImage: `url("${url.replace(/"/g, '\\"')}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  if (type === 'pattern') {
    if (pattern === 'paper') {
      return {
        backgroundColor: color || '#faf8f5',
        backgroundImage:
          'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0), radial-gradient(rgba(0,0,0,0.02) 1px, transparent 0)',
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 4px 4px',
      };
    }
    if (pattern === 'watercolor') {
      return {
        background: `radial-gradient(circle at 10% 10%, rgba(243, 224, 217, 0.6) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(225, 212, 198, 0.6) 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${color || '#fdfbf7'} 0%, 100%)`,
      };
    }
    if (pattern === 'boho') {
      return { backgroundColor: color || '#faf6f0' };
    }
    if (pattern === 'linen') {
      return {
        backgroundColor: color || '#f4f1ea',
        backgroundImage: `
          linear-gradient(90deg, rgba(180,170,150,0.08) 1px, transparent 1px),
          linear-gradient(rgba(180,170,150,0.08) 1px, transparent 1px)
        `,
        backgroundSize: '4px 4px',
      };
    }
    if (pattern === 'marble') {
      return {
        backgroundColor: color || '#f5f5f5',
        backgroundImage: `
          radial-gradient(circle at 30% 20%, rgba(197,160,89,0.04) 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(197,160,89,0.04) 0%, transparent 40%),
          linear-gradient(135deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.01) 10%, transparent 10%, transparent 50%, rgba(0,0,0,0.01) 50%, rgba(0,0,0,0.01) 60%, transparent 60%, transparent 100%)
        `,
        backgroundSize: '100% 100%, 100% 100%, 40px 40px',
      };
    }
    if (pattern === 'gold-dust') {
      return {
        backgroundColor: color || '#1e1b18',
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(197,160,89,0.2) 1px, transparent 1px),
          radial-gradient(circle at 75% 40%, rgba(197,160,89,0.2) 2px, transparent 2px),
          radial-gradient(circle at 50% 80%, rgba(197,160,89,0.15) 1.5px, transparent 1.5px),
          radial-gradient(circle at 10% 75%, rgba(197,160,89,0.12) 2.5px, transparent 2.5px),
          radial-gradient(circle at 90% 15%, rgba(197,160,89,0.2) 1px, transparent 1px)
        `,
        backgroundSize: '120px 120px, 150px 150px, 100px 100px, 180px 180px, 140px 140px',
      };
    }
    if (pattern === 'parchment') {
      return {
        background: `radial-gradient(circle, ${color || '#f1e6d2'} 0%, #e4d3b2 100%)`,
        boxShadow: 'inset 0 0 40px rgba(139,90,43,0.15)',
      };
    }
    if (pattern === 'velvet') {
      return {
        background: `radial-gradient(circle at 50% 30%, ${color || '#4a0e17'} 0%, #1a0307 100%)`,
      };
    }
    if (pattern === 'vellum') {
      return {
        backgroundColor: color || '#fcfbf9',
        backgroundImage: `
          linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 50%, rgba(245,240,232,0.6) 100%),
          radial-gradient(circle at 20% 20%, rgba(197,160,89,0.06) 0%, transparent 40%)
        `,
        backdropFilter: 'blur(12px)',
        boxShadow: 'inset 0 0 45px rgba(255,255,255,0.6), inset 0 0 10px rgba(0,0,0,0.03)',
      };
    }
    if (pattern === 'art-deco-geom') {
      return {
        backgroundColor: color || '#141414',
        backgroundImage: `
          linear-gradient(135deg, rgba(212,175,55,0.08) 25%, transparent 25%),
          linear-gradient(225deg, rgba(212,175,55,0.08) 25%, transparent 25%),
          linear-gradient(45deg, rgba(212,175,55,0.08) 25%, transparent 25%),
          linear-gradient(315deg, rgba(212,175,55,0.08) 25%, transparent 25%)
        `,
        backgroundPosition: '16px 0, 16px 0, 0 0, 0 0',
        backgroundSize: '32px 32px',
        backgroundRepeat: 'repeat',
      };
    }
    if (pattern === 'kuba-weave') {
      return {
        backgroundColor: color || '#24140e',
        backgroundImage: `
          linear-gradient(45deg, rgba(217,119,6,0.12) 25%, transparent 25%, transparent 75%, rgba(217,119,6,0.12) 75%),
          linear-gradient(45deg, rgba(217,119,6,0.12) 25%, transparent 25%, transparent 75%, rgba(217,119,6,0.12) 75%),
          radial-gradient(circle at 50% 50%, rgba(180,83,9,0.15) 0%, transparent 80%)
        `,
        backgroundSize: '24px 24px, 24px 24px, 100% 100%',
        backgroundPosition: '0 0, 12px 12px, 0 0',
      };
    }
    if (pattern === 'deckled-cotton') {
      return {
        backgroundColor: color || '#fbf8f2',
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(120,100,70,0.04) 1px, transparent 1px),
          radial-gradient(circle at 10% 10%, rgba(255,255,255,0.8) 0%, transparent 60%),
          linear-gradient(0deg, rgba(0,0,0,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '12px 12px, 100% 100%, 100% 3px',
        boxShadow: 'inset 0 0 35px rgba(180,160,130,0.15)',
      };
    }
    if (pattern === 'celestial') {
      return {
        backgroundColor: color || '#090a15',
        backgroundImage: `
          radial-gradient(1px 1px at 25px 35px, #ffffff, rgba(0,0,0,0)),
          radial-gradient(1.5px 1.5px at 60px 120px, #a5b4fc, rgba(0,0,0,0)),
          radial-gradient(2px 2px at 150px 80px, #fef08a, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 220px 190px, #e0e7ff, rgba(0,0,0,0)),
          radial-gradient(circle at 80% 20%, rgba(99,102,241,0.18) 0%, transparent 50%),
          radial-gradient(circle at 20% 80%, rgba(236,72,153,0.12) 0%, transparent 50%)
        `,
        backgroundSize: '260px 260px, 320px 320px, 280px 280px, 340px 340px, 100% 100%, 100% 100%',
      };
    }
    return { backgroundColor: color || '#faf8f5' };
  }
  return { backgroundColor: color || '#faf8f5' };
}
