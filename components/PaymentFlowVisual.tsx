const NODES = [
  { id: "agent", x: 220, y: 70, label: "AI Agent" },
  { id: "merchant", x: 390, y: 220, label: "Merchant" },
  { id: "escrow", x: 220, y: 390, label: "Escrow" },
  { id: "wallet", x: 50, y: 220, label: "Wallet" },
] as const;

// Cycle edges bow inward (pinwheel), diagonals cross through the center.
const EDGES = [
  { id: "e-ne", d: "M220,70 Q271,175 390,220", dur: 4.6, tokens: 2 },
  { id: "e-es", d: "M390,220 Q271,271 220,390", dur: 5.1, tokens: 2 },
  { id: "e-sw", d: "M220,390 Q169,271 50,220", dur: 4.8, tokens: 2 },
  { id: "e-wn", d: "M50,220 Q169,175 220,70", dur: 5.4, tokens: 2 },
  { id: "e-ns", d: "M220,70 Q250,220 220,390", dur: 6.2, tokens: 1, bidirectional: true },
  { id: "e-we", d: "M50,220 Q220,190 390,220", dur: 6.6, tokens: 1, bidirectional: true },
];

function WalletGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 9}, ${y - 9}) scale(1.05)`}>
      <path
        d="M2 5a2 2 0 012-2h10a2 2 0 012 2v1H2V5zm0 3h14v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8zm9 2a1 1 0 100 2h1a1 1 0 100-2h-1z"
        fill="var(--c)"
      />
    </g>
  );
}

function Token({ edgeId, dur, begin, reverse }: { edgeId: string; dur: number; begin: number; reverse?: boolean }) {
  return (
    <circle r="7.5" fill="url(#tokenGrad)" filter="url(#tokenGlow)">
      <animateMotion
        dur={`${dur}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        keyPoints={reverse ? "1;0" : "0;1"}
        keyTimes="0;1"
        calcMode="linear"
      >
        <mpath href={`#${edgeId}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.06;0.94;1"
        dur={`${dur}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
      />
    </circle>
  );
}

export function PaymentFlowVisual() {
  return (
    <div className="flow-visual" aria-hidden="true">
      <svg viewBox="0 0 440 440" width="100%" height="100%" role="presentation">
        <defs>
          <linearGradient id="tokenGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--c-hover)" />
            <stop offset="100%" stopColor="var(--c)" />
          </linearGradient>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--c-glow)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="edgeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="tokenGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="220" cy="220" r="200" fill="url(#centerGlow)" />

        {/* edges */}
        <g fill="none">
          {EDGES.map((e) => (
            <path
              key={e.id}
              id={e.id}
              d={e.d}
              stroke="var(--c)"
              strokeWidth="2"
              filter="url(#edgeGlow)"
              opacity="0.7"
            />
          ))}
        </g>

        {/* tokens */}
        {EDGES.map((e) =>
          Array.from({ length: e.tokens }).map((_, i) => (
            <Token
              key={`${e.id}-${i}`}
              edgeId={e.id}
              dur={e.dur}
              begin={(e.dur / e.tokens) * i}
            />
          ))
        )}
        {EDGES.filter((e) => e.bidirectional).map((e) => (
          <Token key={`${e.id}-rev`} edgeId={e.id} dur={e.dur} begin={e.dur / 2} reverse />
        ))}

        {/* nodes */}
        {NODES.map((n, i) => (
          <g key={n.id}>
            <circle
              className="flow-node-pulse"
              cx={n.x}
              cy={n.y}
              r="20"
              fill="none"
              stroke="var(--c)"
              strokeWidth="1.5"
              style={{ animationDelay: `${i * 0.55}s` }}
            />
            <circle cx={n.x} cy={n.y} r="24" fill="var(--surface)" stroke="var(--c-border)" strokeWidth="1.5" filter="url(#nodeGlow)" />
            <WalletGlyph x={n.x} y={n.y} />
            <text
              x={n.x}
              y={n.y + 42}
              textAnchor="middle"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize="10"
              letterSpacing="0.08em"
              fill="var(--ink-3)"
            >
              {n.label.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
