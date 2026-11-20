/** Home illustration: a game-show buzzer between a spinning record and flying song cards. Decoration only. */
export function HeroArt() {
  return <svg className="kg-hero-art" aria-hidden="true" viewBox="0 0 320 160" focusable="false">
    <g className="ha-beams">
      <polygon className="ha-beam" points="40,0 58,0 214,150 96,150" />
      <polygon className="ha-beam ha-beam--b" points="262,0 280,0 224,150 106,150" />
    </g>
    <g className="ha-record">
      <circle cx="62" cy="98" r="44" className="ha-navy" />
      <circle cx="62" cy="98" r="36" className="ha-groove" />
      <circle cx="62" cy="98" r="28" className="ha-groove" />
      <circle cx="62" cy="98" r="14" className="ha-pink" />
      <path d="M62 84a14 14 0 0 1 14 14h-6a8 8 0 0 0-8-8z" className="ha-shine" />
      <circle cx="62" cy="98" r="3" className="ha-navy" />
    </g>
    <g className="ha-rings">
      <circle cx="160" cy="84" r="38" className="ha-ring" />
      <circle cx="160" cy="84" r="38" className="ha-ring ha-ring--b" />
    </g>
    <rect x="112" y="116" width="96" height="32" rx="10" className="ha-navy" />
    <rect x="124" y="104" width="72" height="16" rx="6" className="ha-pink ha-stroke" />
    <g className="ha-dome">
      <path d="M126 106a34 34 0 0 1 68 0z" className="ha-yellow ha-stroke" />
      <ellipse cx="146" cy="88" rx="8" ry="5" className="ha-white" transform="rotate(-30 146 88)" />
    </g>
    <g className="ha-card">
      <g transform="rotate(12 265 82)">
        <rect x="236" y="62" width="58" height="40" rx="7" className="ha-white ha-stroke" />
        <path d="M240 66l25 18 25-18" className="ha-flap" />
        <circle cx="265" cy="88" r="7" className="ha-pink ha-stroke" />
      </g>
    </g>
    <g className="ha-card ha-card--b">
      <g transform="rotate(-10 250 108)">
        <rect x="226" y="92" width="48" height="32" rx="6" className="ha-yellow ha-stroke" />
        <path d="M229 95l21 14 21-14" className="ha-flap" />
      </g>
    </g>
    <path className="ha-note" d="M118 18v26.5a7 7 0 1 0 4 6.3V27h12v-9z" />
    <path className="ha-note ha-note--b" d="M206 30v20.5a6 6 0 1 0 3.5 5.4V36l14-3v14.5a6 6 0 1 0 3.5 5.4V26z" />
    <path className="ha-spark" d="M24 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
    <path className="ha-spark ha-spark--b" d="M300 20l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" />
  </svg>;
}
