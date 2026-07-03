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
    return { backgroundColor: color || '#faf8f5' };
  }
  return { backgroundColor: color || '#faf8f5' };
}
