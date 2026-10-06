export function JourneyGraphic() {
  return (
    <div className="journey-graphic" aria-hidden="true">
      <svg className="orbit-svg" viewBox="0 0 520 470" fill="none">
        <defs>
          <linearGradient
            id="orbit-gradient"
            x1="90"
            y1="75"
            x2="440"
            y2="430"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#a7b9ce" />
            <stop offset="1" stopColor="#d7e2e8" />
          </linearGradient>
          <pattern
            id="dot-grid"
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".75" fill="#9dabbc" opacity=".3" />
          </pattern>
        </defs>
        <rect width="520" height="470" fill="url(#dot-grid)" />
        <g stroke="url(#orbit-gradient)" strokeWidth="1">
          <ellipse
            cx="267"
            cy="232"
            rx="198"
            ry="126"
            transform="rotate(-28 267 232)"
          />
          <ellipse
            cx="267"
            cy="232"
            rx="198"
            ry="126"
            transform="rotate(28 267 232)"
          />
          <ellipse
            cx="267"
            cy="232"
            rx="163"
            ry="175"
            transform="rotate(22 267 232)"
          />
          <circle cx="267" cy="232" r="113" strokeDasharray="3 6" />
          <circle cx="267" cy="232" r="55" />
          <path
            d="M116 135L267 232L406 127M267 232L434 303M267 232L267 410M267 232L85 298"
            opacity=".5"
          />
        </g>
        <g fill="#073c48">
          <circle cx="117" cy="136" r="4" />
          <circle cx="409" cy="125" r="4" />
          <circle cx="433" cy="303" r="4" />
          <circle cx="85" cy="298" r="4" />
          <circle cx="265" cy="407" r="4" />
        </g>
        <circle cx="267" cy="232" r="31" fill="#102a43" />
        <path
          d="M255 232L263 222L278 226L280 240L265 247L255 232Z"
          stroke="#f8fbff"
          strokeWidth="1.5"
        />
        <path
          d="M263 222L265 247M278 226L255 232M280 240L263 222"
          stroke="#8cabbf"
          strokeWidth="1"
        />
        <g fill="#f8fbff">
          <circle cx="255" cy="232" r="2.3" />
          <circle cx="263" cy="222" r="2.3" />
          <circle cx="278" cy="226" r="2.3" />
          <circle cx="280" cy="240" r="2.3" />
          <circle cx="265" cy="247" r="2.3" />
        </g>
      </svg>
      <div className="orbit-label orbit-label-foundations">
        <span className="orbit-dot" />
        <span>
          Strong foundations<small>STATISTICS + COMPUTING</small>
        </span>
      </div>
      <div className="orbit-label orbit-label-ai">
        <span className="orbit-dot" />
        <span>
          Modern AI<small>MODELS + METHODS</small>
        </span>
      </div>
      <div className="orbit-label orbit-label-impact">
        <span className="orbit-dot" />
        <span>
          Real-world impact<small>DOMAIN + DECISIONS</small>
        </span>
      </div>
      <span className="orbit-note">THE CONNECTIONS MAKE THE DIFFERENCE</span>
    </div>
  );
}
