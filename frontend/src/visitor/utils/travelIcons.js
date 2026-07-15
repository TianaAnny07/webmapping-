// Petites illustrations SVG multicolores pour l'icône de déplacement

export function travelIconSvg(mode) {
  switch (mode) {
    case 'walking':
      return `
        <svg viewBox="0 0 36 36" width="30" height="30">
          <circle cx="18" cy="8" r="3.6" fill="#f2b482"/>
          <path d="M18 12 L18 21" stroke="#2563eb" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M18 21 L12 30" stroke="#1e3a8a" stroke-width="3.6" stroke-linecap="round"/>
          <path d="M18 21 L24 28" stroke="#1e3a8a" stroke-width="3.6" stroke-linecap="round"/>
          <path d="M18 15 L11 18" stroke="#2563eb" stroke-width="3.6" stroke-linecap="round"/>
          <path d="M18 15 L26 12" stroke="#2563eb" stroke-width="3.6" stroke-linecap="round"/>
        </svg>`;

    case 'cycling': // "Moto" dans l'interface
      return `
        <svg viewBox="0 0 40 30" width="34" height="26">
          <circle cx="8" cy="23" r="5.4" fill="#111827"/>
          <circle cx="8" cy="23" r="2.2" fill="#6b7280"/>
          <circle cx="32" cy="23" r="5.4" fill="#111827"/>
          <circle cx="32" cy="23" r="2.2" fill="#6b7280"/>
          <path d="M8 23 L14 14 H24 L26 19 H32" stroke="#111827" stroke-width="2" fill="none"/>
          <path d="M15 14 C20 9, 26 9, 27 14 L24 19 H15 Z" fill="#dc2626"/>
          <rect x="22" y="10" width="7" height="4" rx="1.5" fill="#374151"/>
          <circle cx="30" cy="16" r="1.6" fill="#fbbf24"/>
        </svg>`;

    case 'driving':
      return `
        <svg viewBox="0 0 40 26" width="34" height="22">
          <rect x="4" y="12" width="32" height="9" rx="3.5" fill="#2563eb"/>
          <path d="M10 12 L14 5 H26 L30 12 Z" fill="#93c5fd"/>
          <circle cx="11" cy="22" r="4" fill="#111827"/>
          <circle cx="29" cy="22" r="4" fill="#111827"/>
          <circle cx="11" cy="22" r="1.6" fill="#9ca3af"/>
          <circle cx="29" cy="22" r="1.6" fill="#9ca3af"/>
        </svg>`;

    default:
      return '';
  }
}