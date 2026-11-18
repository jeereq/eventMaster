import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Illustrations maison pour les états vides, la 404 et les erreurs.
 * Style : disque jaune pâle, objet vert à aplats, accent corail, détails encre,
 * étincelles et gribouillis autour. Couleurs pilotées par les variables `--ill-*`.
 */

const C = {
  disk: 'var(--ill-disk)',
  main: 'var(--ill-main)',
  deep: 'var(--ill-deep)',
  ink: 'var(--ill-ink)',
  coral: 'var(--ill-coral)',
  paper: 'var(--ill-paper)',
  line: 'var(--ill-line)',
  doodle: 'var(--ill-doodle, var(--ill-ink))',
};

function Sparkle({ x, y, r = 6, fill = C.coral }: { x: number; y: number; r?: number; fill?: string }) {
  const k = r * 0.22;
  return (
    <path
      d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r}Z`}
      fill={fill}
    />
  );
}

function Burst({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g stroke={C.doodle} strokeWidth={2.2} strokeLinecap="round">
      <line x1={x} y1={y + 6} x2={x + 6 * s} y2={y - 2} />
      <line x1={x + 8 * s} y1={y + 9} x2={x + 16 * s} y2={y + 3} />
      <line x1={x + 10 * s} y1={y + 16} x2={x + 17 * s} y2={y + 15} />
    </g>
  );
}

function Squiggle({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}
      d="M0 10 C4 -2 12 -4 13 3 C14 10 4 10 8 2 C11 -4 20 -2 24 6"
      fill="none"
      stroke={C.doodle}
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return <polygon points={pts.join(' ')} fill={fill} strokeLinejoin="round" />;
}

function Frame({ children, decor = 'a' }: { children: React.ReactNode; decor?: 'a' | 'b' }) {
  return (
    <>
      <circle cx={100} cy={84} r={56} fill={C.disk} />
      {decor === 'a' ? (
        <>
          <Sparkle x={50} y={42} r={6} />
          <Sparkle x={154} y={112} r={5} fill={C.main} />
          <circle cx={158} cy={52} r={3} fill={C.coral} />
          <Burst x={142} y={22} />
          <Squiggle x={30} y={108} />
        </>
      ) : (
        <>
          <Sparkle x={150} y={44} r={6} />
          <Sparkle x={48} y={110} r={5} fill={C.main} />
          <circle cx={44} cy={58} r={3} fill={C.coral} />
          <Burst x={58} y={22} flip />
          <Squiggle x={150} y={118} />
        </>
      )}
      {children}
    </>
  );
}

const INK = { stroke: C.ink, strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const ART = {
  invoices: (
    <Frame>
      <rect x={80} y={36} width={58} height={76} rx={6} fill={C.main} transform="rotate(8 109 74)" />
      <rect x={64} y={30} width={58} height={76} rx={6} fill={C.paper} {...INK} />
      <line x1={74} y1={44} x2={98} y2={44} stroke={C.coral} strokeWidth={4} strokeLinecap="round" />
      {[56, 66, 76].map((y) => (
        <line key={y} x1={74} y1={y} x2={112} y2={y} stroke={C.line} strokeWidth={4} strokeLinecap="round" />
      ))}
      <line x1={94} y1={92} x2={112} y2={92} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <circle cx={128} cy={106} r={16} fill={C.coral} {...INK} />
      <circle cx={128} cy={106} r={9} fill="none" stroke={C.paper} strokeWidth={2} />
    </Frame>
  ),
  inbox: (
    <Frame>
      <path d="M62 72 L100 46 L138 72 Z" fill={C.ink} />
      <rect x={72} y={34} width={56} height={56} rx={4} fill={C.paper} />
      <line x1={80} y1={46} x2={104} y2={46} stroke={C.coral} strokeWidth={4} strokeLinecap="round" />
      {[56, 64, 72].map((y) => (
        <line key={y} x1={80} y1={y} x2={120} y2={y} stroke={C.line} strokeWidth={4} strokeLinecap="round" />
      ))}
      <path d="M62 72 L100 98 L138 72 L138 116 Q138 120 134 120 L66 120 Q62 120 62 116 Z" fill={C.main} />
      <line x1={70} y1={118} x2={106} y2={94} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
    </Frame>
  ),
  notifications: (
    <Frame decor="b">
      <circle cx={100} cy={36} r={6} fill="none" stroke={C.ink} strokeWidth={3} />
      <path d="M70 98 Q70 84 74 68 Q80 42 100 42 Q120 42 126 68 Q130 84 130 98 Z" fill={C.main} />
      <path d="M90 104 A10 10 0 0 0 110 104 Z" fill={C.coral} />
      <rect x={62} y={96} width={76} height={9} rx={4.5} fill={C.ink} />
      <circle cx={114} cy={60} r={7} fill={C.paper} />
      <circle cx={115} cy={60} r={3} fill={C.ink} />
      <g stroke={C.ink} strokeWidth={2.5} strokeLinecap="round">
        <line x1={84} y1={118} x2={80} y2={124} />
        <line x1={116} y1={118} x2={120} y2={124} />
      </g>
    </Frame>
  ),
  search: (
    <Frame>
      <rect x={56} y={32} width={60} height={76} rx={5} fill={C.paper} stroke={C.line} strokeWidth={2} />
      <line x1={66} y1={46} x2={90} y2={46} stroke={C.coral} strokeWidth={4} strokeLinecap="round" />
      {[58, 68].map((y) => (
        <line key={y} x1={66} y1={y} x2={104} y2={y} stroke={C.line} strokeWidth={4} strokeLinecap="round" />
      ))}
      <line x1={128} y1={102} x2={146} y2={120} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
      <line x1={140} y1={114} x2={146} y2={120} stroke={C.coral} strokeWidth={9} strokeLinecap="round" />
      <circle cx={112} cy={84} r={22} fill={C.paper} stroke={C.main} strokeWidth={8} />
      <g stroke={C.ink} strokeWidth={4} strokeLinecap="round">
        <line x1={105} y1={77} x2={119} y2={91} />
        <line x1={119} y1={77} x2={105} y2={91} />
      </g>
    </Frame>
  ),
  notFound: (
    <Frame decor="b">
      <ellipse cx={100} cy={124} rx={34} ry={5} fill={C.deep} opacity={0.35} />
      <rect x={96} y={38} width={8} height={86} rx={3} fill={C.ink} />
      <path d="M64 44 L130 44 L141 55 L130 66 L64 66 Z" fill={C.main} />
      <text x={100} y={61} textAnchor="middle" fontSize={15} fontWeight={800} fill={C.paper} fontFamily="inherit">
        404
      </text>
      <path d="M136 74 L70 74 L59 85 L70 96 L136 96 Z" fill={C.coral} />
      <text x={100} y={91} textAnchor="middle" fontSize={15} fontWeight={800} fill={C.ink} fontFamily="inherit">
        ?
      </text>
    </Frame>
  ),
  error: (
    <Frame>
      <path d="M128 88 L146 108 L118 94 Z" fill={C.ink} />
      <circle cx={118} cy={68} r={28} fill={C.ink} />
      <path d="M70 108 L58 124 L82 114 Z" fill={C.coral} />
      <circle cx={90} cy={88} r={30} fill={C.coral} />
      <circle cx={80} cy={82} r={3.5} fill={C.ink} />
      <circle cx={100} cy={82} r={3.5} fill={C.ink} />
      <path d="M78 100 Q90 90 102 100" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <circle cx={132} cy={60} r={4} fill={C.main} />
    </Frame>
  ),
  offline: (
    <Frame decor="b">
      <path d="M50 86 Q32 86 28 104" fill="none" {...INK} strokeWidth={3} />
      <path d="M150 86 Q168 86 172 68" fill="none" {...INK} strokeWidth={3} />
      <rect x={50} y={70} width={38} height={32} rx={9} fill={C.main} />
      <rect x={88} y={77} width={12} height={5} rx={2} fill={C.ink} />
      <rect x={88} y={90} width={12} height={5} rx={2} fill={C.ink} />
      <rect x={114} y={70} width={36} height={32} rx={9} fill={C.coral} />
      <rect x={118} y={78} width={7} height={5} rx={2} fill={C.ink} />
      <rect x={118} y={90} width={7} height={5} rx={2} fill={C.ink} />
      <line x1={58} y1={96} x2={80} y2={76} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
      <g stroke={C.ink} strokeWidth={2.5} strokeLinecap="round">
        <line x1={107} y1={62} x2={107} y2={54} />
        <line x1={99} y1={64} x2={95} y2={58} />
        <line x1={115} y1={64} x2={119} y2={58} />
      </g>
    </Frame>
  ),
  events: (
    <Frame>
      <rect x={58} y={42} width={84} height={74} rx={8} fill={C.paper} {...INK} />
      <path d="M58 50 Q58 42 66 42 L134 42 Q142 42 142 50 L142 62 L58 62 Z" fill={C.main} {...INK} />
      <g stroke={C.ink} strokeWidth={5} strokeLinecap="round">
        <line x1={78} y1={34} x2={78} y2={48} />
        <line x1={122} y1={34} x2={122} y2={48} />
      </g>
      {[76, 90, 104].flatMap((y) =>
        [72, 86, 100, 114, 128].map((x) =>
          x === 114 && y === 90 ? null : <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill={C.line} />,
        ),
      )}
      <circle cx={114} cy={90} r={8} fill={C.coral} />
      <Sparkle x={114} y={90} r={4.5} fill={C.paper} />
    </Frame>
  ),
  guests: (
    <Frame decor="b">
      <circle cx={120} cy={60} r={14} fill={C.coral} />
      <path d="M96 118 Q96 82 120 82 Q144 82 144 118 Z" fill={C.coral} />
      <circle cx={86} cy={70} r={15} fill={C.ink} />
      <path d="M58 122 Q58 90 86 90 Q114 90 114 122 Z" fill={C.main} />
      <line x1={66} y1={120} x2={96} y2={98} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
      <circle cx={146} cy={46} r={11} fill={C.paper} {...INK} />
      <g stroke={C.ink} strokeWidth={2.5} strokeLinecap="round">
        <line x1={146} y1={41} x2={146} y2={51} />
        <line x1={141} y1={46} x2={151} y2={46} />
      </g>
    </Frame>
  ),
  tickets: (
    <Frame>
      <g transform="rotate(-10 100 82)">
        <path
          d="M56 58 L144 58 Q148 58 148 62 L148 74 A8 8 0 0 0 148 90 L148 102 Q148 106 144 106 L56 106 Q52 106 52 102 L52 90 A8 8 0 0 0 52 74 L52 62 Q52 58 56 58 Z"
          fill={C.main}
        />
        <line x1={122} y1={62} x2={122} y2={102} stroke={C.paper} strokeWidth={2.5} strokeDasharray="4 4" />
        <Star cx={88} cy={82} r={14} fill={C.coral} />
        <line x1={58} y1={102} x2={108} y2={70} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
        <circle cx={135} cy={82} r={4} fill={C.ink} />
      </g>
    </Frame>
  ),
  favorites: (
    <Frame decor="b">
      <path d="M74 34 L126 34 L126 122 L100 104 L74 122 Z" fill={C.main} />
      <circle cx={100} cy={66} r={19} fill={C.ink} />
      <Star cx={100} cy={67} r={12} fill={C.coral} />
      <line x1={80} y1={112} x2={120} y2={92} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
    </Frame>
  ),
  success: (
    <Frame>
      <path d="M60 128 L86 70 L118 102 Z" fill={C.main} />
      <ellipse cx={102} cy={86} rx={23} ry={8} transform="rotate(45 102 86)" fill={C.deep} />
      <g stroke={C.ink} strokeWidth={2.5} strokeLinecap="round">
        <line x1={73} y1={100} x2={92} y2={116} />
        <line x1={80} y1={84} x2={104} y2={108} />
      </g>
      <path d="M108 60 q5 -8 11 0 t11 0" fill="none" stroke={C.coral} strokeWidth={3} strokeLinecap="round" />
      <rect x={128} y={76} width={8} height={8} rx={1.5} fill={C.main} transform="rotate(20 132 80)" />
      <rect x={96} y={44} width={7} height={7} rx={1.5} fill={C.ink} transform="rotate(-15 99 47)" />
      <circle cx={124} cy={110} r={13} fill={C.coral} />
      <path d="M118 110 L122 114 L130 105" fill="none" stroke={C.paper} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  ),
  payments: (
    <Frame decor="b">
      <rect x={66} y={42} width={60} height={30} rx={4} fill={C.paper} stroke={C.line} strokeWidth={2} />
      <circle cx={96} cy={56} r={7} fill={C.coral} />
      <rect x={56} y={60} width={86} height={58} rx={10} fill={C.main} />
      <rect x={112} y={76} width={36} height={26} rx={7} fill={C.deep} />
      <circle cx={125} cy={89} r={4.5} fill={C.paper} />
      <line x1={64} y1={112} x2={104} y2={78} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />
      <circle cx={146} cy={116} r={12} fill={C.coral} {...INK} />
      <circle cx={146} cy={116} r={6} fill="none" stroke={C.paper} strokeWidth={2} />
    </Frame>
  ),
  rooms: (
    <Frame>
      <rect x={52} y={40} width={96} height={78} rx={6} fill={C.paper} {...INK} />
      <line x1={106} y1={40} x2={106} y2={74} {...INK} />
      {[
        [78, 64],
        [78, 96],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={10} fill={C.main} />
          {[
            [0, -15],
            [15, 0],
            [0, 15],
            [-15, 0],
          ].map(([dx, dy]) => (
            <circle key={`${dx}-${dy}`} cx={cx + dx} cy={cy + dy} r={3} fill={C.ink} />
          ))}
        </g>
      ))}
      <rect x={116} y={88} width={24} height={22} rx={3} fill={C.coral} />
      <path d="M120 40 A14 14 0 0 0 134 54" fill="none" stroke={C.line} strokeWidth={2} />
    </Frame>
  ),
  chat: (
    <Frame decor="b">
      <rect x={84} y={44} width={76} height={28} rx={14} fill={C.ink} />
      <line x1={98} y1={58} x2={114} y2={58} stroke={C.coral} strokeWidth={4} strokeLinecap="round" />
      <line x1={122} y1={58} x2={136} y2={58} stroke={C.paper} strokeWidth={4} strokeLinecap="round" />
      <circle cx={148} cy={58} r={4} fill={C.main} />
      <rect x={40} y={82} width={76} height={28} rx={14} fill={C.main} />
      <circle cx={54} cy={96} r={4} fill={C.coral} />
      <line x1={66} y1={96} x2={102} y2={96} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
    </Frame>
  ),
  media: (
    <Frame>
      <rect x={64} y={40} width={78} height={62} rx={6} fill={C.coral} transform="rotate(-8 103 71)" />
      <rect x={58} y={48} width={82} height={64} rx={6} fill={C.paper} {...INK} />
      <path d="M64 106 L86 80 L100 94 L111 83 L134 106 Z" fill={C.main} />
      <circle cx={118} cy={64} r={6} fill={C.coral} />
      <circle cx={142} cy={112} r={13} fill={C.ink} />
      <g stroke={C.paper} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1={142} y1={118} x2={142} y2={106} />
        <polyline points="137,111 142,106 147,111" />
      </g>
    </Frame>
  ),
  tasks: (
    <Frame decor="b">
      <rect x={64} y={40} width={72} height={84} rx={8} fill={C.main} />
      <rect x={72} y={50} width={56} height={66} rx={4} fill={C.paper} />
      <rect x={86} y={34} width={28} height={12} rx={4} fill={C.ink} />
      <circle cx={82} cy={66} r={5.5} fill={C.coral} />
      <path d="M79 66 L81.5 68.5 L85.5 63.5" fill="none" stroke={C.paper} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {[82, 98].map((y) => (
        <circle key={y} cx={82} cy={y} r={5} fill="none" stroke={C.line} strokeWidth={2} />
      ))}
      {[66, 82, 98].map((y) => (
        <line key={y} x1={93} y1={y} x2={120} y2={y} stroke={y === 66 ? C.ink : C.line} strokeWidth={4} strokeLinecap="round" />
      ))}
    </Frame>
  ),
} satisfies Record<string, React.ReactNode>;

export type IllustrationName = keyof typeof ART;

export const ILLUSTRATION_NAMES = Object.keys(ART) as IllustrationName[];

export interface IllustrationProps {
  name: IllustrationName;
  className?: string;
}

export default function Illustration({ name, className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 160" className={cn('w-40 h-auto', className)} aria-hidden="true" focusable="false">
      {ART[name]}
    </svg>
  );
}
