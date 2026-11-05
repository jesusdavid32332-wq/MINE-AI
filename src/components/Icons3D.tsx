import React from 'react';

interface Icon3DProps {
  className?: string;
  size?: number;
}

// 1. DASHBOARD 3D ICON: Isometric Crystal Financial / Analytics Prism with Gold Accents
export const DashboardIcon3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="dbBaseGrad" x1="8" y1="28" x2="40" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1e1b4b" />
        <stop offset="0.5" stopColor="#312e81" />
        <stop offset="1" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="dbBar1" x1="10" y1="20" x2="18" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" />
        <stop offset="1" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="dbBar2" x1="20" y1="12" x2="28" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#4338ca" />
      </linearGradient>
      <linearGradient id="dbBar3" x1="30" y1="6" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c084fc" />
        <stop offset="1" stopColor="#7e22ce" />
      </linearGradient>
      <radialGradient id="dbGlow" cx="24" cy="20" r="18" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60a5fa" stopOpacity="0.45" />
        <stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
      </radialGradient>
      <filter id="dbShadow" x="4" y="6" width="40" height="40" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
      </filter>
    </defs>
    <circle cx="24" cy="24" r="20" fill="url(#dbGlow)" />
    {/* Base Isometric Plinth */}
    <path
      d="M24 38L8 28.5L24 19L40 28.5L24 38Z"
      fill="url(#dbBaseGrad)"
      stroke="#4338ca"
      strokeWidth="1.2"
    />
    <path
      d="M8 28.5V34L24 43.5V38L8 28.5Z"
      fill="#0c1122"
      stroke="#312e81"
      strokeWidth="0.8"
    />
    <path
      d="M40 28.5V34L24 43.5V38L40 28.5Z"
      fill="#131b33"
      stroke="#3730a3"
      strokeWidth="0.8"
    />
    {/* Bar 1 */}
    <g filter="url(#dbShadow)">
      <path d="M11 26V32L17 35V29L11 26Z" fill="#1e3a8a" />
      <path d="M17 29L23 25.5V31.5L17 35V29Z" fill="#2563eb" />
      <path d="M11 26L17 22.5L23 25.5L17 29L11 26Z" fill="url(#dbBar1)" />
    </g>
    {/* Bar 2 */}
    <g filter="url(#dbShadow)">
      <path d="M19 18V28L25 31V21L19 18Z" fill="#312e81" />
      <path d="M25 21L31 17.5V27.5L25 31V21Z" fill="#4f46e5" />
      <path d="M19 18L25 14.5L31 17.5L25 21L19 18Z" fill="url(#dbBar2)" />
    </g>
    {/* Bar 3 */}
    <g filter="url(#dbShadow)">
      <path d="M27 10V24L33 27V13L27 10Z" fill="#581c87" />
      <path d="M33 13L39 9.5V23.5L33 27V13Z" fill="#9333ea" />
      <path d="M27 10L33 6.5L39 9.5L33 13L27 10Z" fill="url(#dbBar3)" />
    </g>
    {/* Floating Golden Coin / Gem Sparkle */}
    <circle cx="36" cy="7" r="3" fill="#facc15" stroke="#fef08a" strokeWidth="0.8" />
  </svg>
);

// 2. SCANNER 3D ICON: Cybernetic Camera Aperture with Laser Beams & Sapphire Lens
export const ScannerIcon3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="scRim" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" />
        <stop offset="0.5" stopColor="#0284c7" />
        <stop offset="1" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="scBody" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0f172a" />
        <stop offset="1" stopColor="#1e293b" />
      </linearGradient>
      <radialGradient id="scLens" cx="24" cy="24" r="14" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" />
        <stop offset="0.4" stopColor="#1d4ed8" />
        <stop offset="0.8" stopColor="#090d16" />
        <stop offset="1" stopColor="#0369a1" />
      </radialGradient>
      <linearGradient id="scLaser" x1="6" y1="24" x2="42" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f43f5e" stopOpacity="0" />
        <stop offset="0.2" stopColor="#f43f5e" stopOpacity="0.8" />
        <stop offset="0.5" stopColor="#fda4af" />
        <stop offset="0.8" stopColor="#f43f5e" stopOpacity="0.8" />
        <stop offset="1" stopColor="#f43f5e" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Outer Cyber Housing */}
    <rect x="6" y="8" width="36" height="32" rx="8" fill="url(#scBody)" stroke="url(#scRim)" strokeWidth="1.5" />
    {/* Camera Flash Top Bump */}
    <path d="M18 8L20 5H28L30 8H18Z" fill="#1e293b" stroke="#0284c7" strokeWidth="1" />
    <circle cx="34" cy="13" r="2.2" fill="#ef4444" stroke="#fca5a5" strokeWidth="0.6" />
    {/* Multi-Ring Lens */}
    <circle cx="24" cy="24" r="13" fill="#090d16" stroke="#38bdf8" strokeWidth="1.2" />
    <circle cx="24" cy="24" r="10.5" fill="url(#scLens)" />
    <circle cx="24" cy="24" r="7" stroke="#67e8f9" strokeWidth="0.8" strokeDasharray="3 2" />
    {/* Aperture Glint */}
    <ellipse cx="21" cy="20" rx="3.5" ry="2" transform="rotate(-30 21 20)" fill="#ffffff" fillOpacity="0.55" />
    {/* Horizontal Laser Scan Beam */}
    <line x1="6" y1="24" x2="42" y2="24" stroke="url(#scLaser)" strokeWidth="2" strokeLinecap="round" />
    {/* Corner Targeting Brackets */}
    <path d="M12 16H9V19" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M36 16H39V19" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 32H9V29" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M36 32H39V29" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 3. PROBABILITY 3D ICON: Sparkling Hypergeometric Crystal Prism / Mathematical Diamond
export const ProbabilityIcon3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <radialGradient id="prGlow" cx="24" cy="24" r="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#a855f7" stopOpacity="0.5" />
        <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="prTop" x1="14" y1="8" x2="34" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#e9d5ff" />
        <stop offset="1" stopColor="#c084fc" />
      </linearGradient>
      <linearGradient id="prCenter" x1="14" y1="20" x2="24" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#a855f7" />
        <stop offset="1" stopColor="#6b21a8" />
      </linearGradient>
      <linearGradient id="prRight" x1="24" y1="20" x2="34" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7e22ce" />
        <stop offset="1" stopColor="#3b0764" />
      </linearGradient>
      <linearGradient id="prLeft" x1="8" y1="20" x2="24" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#c084fc" />
        <stop offset="1" stopColor="#9333ea" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="22" fill="url(#prGlow)" />
    {/* Diamond Facets */}
    {/* Crown Facets */}
    <path d="M16 11L24 7L32 11L38 19H10L16 11Z" fill="url(#prTop)" stroke="#f3e8ff" strokeWidth="0.8" />
    <path d="M10 19L16 11L24 19H10Z" fill="#d8b4fe" />
    <path d="M38 19L32 11L24 19H38Z" fill="#c084fc" />
    {/* Pavilion Facets */}
    <path d="M10 19H24L24 41L10 19Z" fill="url(#prLeft)" stroke="#a855f7" strokeWidth="0.5" />
    <path d="M24 19H38L24 41L24 19Z" fill="url(#prRight)" stroke="#9333ea" strokeWidth="0.5" />
    <path d="M18 19L24 41L30 19H18Z" fill="url(#prCenter)" stroke="#f3e8ff" strokeWidth="0.6" />
    {/* Specular Sparkle Star */}
    <path
      d="M24 13L25.2 16.5L29 17.5L25.2 18.5L24 22L22.8 18.5L19 17.5L22.8 16.5L24 13Z"
      fill="#ffffff"
    />
    <circle cx="33" cy="25" r="1.5" fill="#fbcfe8" />
  </svg>
);

// 4. HEATMAP 3D ICON: Illuminated Thermal Matrix with Glowing Neon Nodes
export const HeatmapIcon3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="hmBack" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0f172a" />
        <stop offset="1" stopColor="#020617" />
      </linearGradient>
      <radialGradient id="hmGlowRed" cx="34" cy="34" r="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ef4444" stopOpacity="0.8" />
        <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="hmGlowAmber" cx="24" cy="24" r="10" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f59e0b" stopOpacity="0.75" />
        <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="hmGlowEmerald" cx="14" cy="14" r="10" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" stopOpacity="0.7" />
        <stop offset="1" stopColor="#10b981" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Matrix Frame */}
    <rect x="6" y="6" width="36" height="36" rx="8" fill="url(#hmBack)" stroke="#334155" strokeWidth="1.5" />
    {/* Grid Glow Cells */}
    <rect x="9" y="9" width="9" height="9" rx="2.5" fill="#065f46" stroke="#10b981" strokeWidth="1" />
    <rect x="20" y="9" width="8" height="9" rx="2.5" fill="#047857" stroke="#34d399" strokeWidth="1" />
    <rect x="30" y="9" width="9" height="9" rx="2.5" fill="#b45309" stroke="#f59e0b" strokeWidth="1" />

    <rect x="9" y="20" width="9" height="8" rx="2.5" fill="#047857" stroke="#34d399" strokeWidth="1" />
    <rect x="20" y="20" width="8" height="8" rx="2.5" fill="#d97706" stroke="#fbbf24" strokeWidth="1.2" />
    <rect x="30" y="20" width="9" height="8" rx="2.5" fill="#b91c1c" stroke="#f87171" strokeWidth="1" />

    <rect x="9" y="30" width="9" height="9" rx="2.5" fill="#d97706" stroke="#fbbf24" strokeWidth="1" />
    <rect x="20" y="30" width="8" height="9" rx="2.5" fill="#dc2626" stroke="#f87171" strokeWidth="1" />
    <rect x="30" y="30" width="9" height="9" rx="2.5" fill="#991b1b" stroke="#ef4444" strokeWidth="1.5" />

    {/* Thermal Contour Lines */}
    <path d="M12 36C22 34 26 22 36 12" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="2 2" />
    {/* Flame Aura overlay */}
    <circle cx="34" cy="34" r="5" fill="#fca5a5" />
    <circle cx="34" cy="34" r="2.5" fill="#ffffff" />
  </svg>
);

// 5. HISTORY 3D ICON: Titanium Cryptographic Archive Vault
export const HistoryIcon3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="hsBody" x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#334155" />
        <stop offset="0.5" stopColor="#1e293b" />
        <stop offset="1" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="hsGold" x1="16" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fde047" />
        <stop offset="0.6" stopColor="#eab308" />
        <stop offset="1" stopColor="#a16207" />
      </linearGradient>
      <radialGradient id="hsBlueGlow" cx="24" cy="24" r="14" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" stopOpacity="0.4" />
        <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Vault Outer Door */}
    <rect x="7" y="7" width="34" height="34" rx="9" fill="url(#hsBody)" stroke="#64748b" strokeWidth="1.5" />
    {/* Corner Heavy Bolts */}
    <circle cx="12" cy="12" r="2" fill="#94a3b8" />
    <circle cx="36" cy="12" r="2" fill="#94a3b8" />
    <circle cx="12" cy="36" r="2" fill="#94a3b8" />
    <circle cx="36" cy="36" r="2" fill="#94a3b8" />
    {/* Center Vault Wheel */}
    <circle cx="24" cy="24" r="12" fill="#090d16" stroke="url(#hsGold)" strokeWidth="1.8" />
    {/* Clock Hands / Vault Spokes */}
    <circle cx="24" cy="24" r="3.5" fill="url(#hsGold)" />
    <line x1="24" y1="24" x2="24" y2="15" stroke="url(#hsGold)" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="24" y1="24" x2="31" y2="24" stroke="url(#hsGold)" strokeWidth="2" strokeLinecap="round" />
    {/* Cybernetic Progress Arc */}
    <path
      d="M16 24C16 19.58 19.58 16 24 16C28.42 16 32 19.58 32 24"
      stroke="#38bdf8"
      strokeWidth="1.2"
      strokeDasharray="2 2"
    />
  </svg>
);

// 6. VALIDATION 3D ICON: Holographic Seal with Golden Laurel & Laser Target
export const ValidationIcon3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="vlMedal" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.4" stopColor="#eab308" />
        <stop offset="0.8" stopColor="#ca8a04" />
        <stop offset="1" stopColor="#854d0e" />
      </linearGradient>
      <linearGradient id="vlRibbon" x1="16" y1="4" x2="32" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#4338ca" />
      </linearGradient>
      <radialGradient id="vlGreen" cx="24" cy="24" r="10" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" />
        <stop offset="1" stopColor="#047857" />
      </radialGradient>
    </defs>
    {/* Rosette Ribbon */}
    <path d="M16 30L12 44L20 40L24 44L24 34L16 30Z" fill="url(#vlRibbon)" />
    <path d="M32 30L36 44L28 40L24 44L24 34L32 30Z" fill="#3730a3" />
    {/* Outer Starburst / Cog Seal */}
    <circle cx="24" cy="22" r="16" fill="url(#vlMedal)" stroke="#fef08a" strokeWidth="1" />
    <circle cx="24" cy="22" r="13" fill="#0f172a" stroke="#ca8a04" strokeWidth="1.2" />
    <circle cx="24" cy="22" r="10" fill="url(#vlGreen)" />
    {/* Golden 3D Checkmark */}
    <path
      d="M18.5 22L22.5 26L29.5 18"
      stroke="#ffffff"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 7. WIN10K AUDIT 3D ICON: Provably Fair HMAC Security Shield & Gold Lock Cube
export const Win10kAuditIcon3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="auShield" x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="0.5" stopColor="#1d4ed8" />
        <stop offset="1" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="auGold" x1="18" y1="18" x2="30" y2="34" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.5" stopColor="#eab308" />
        <stop offset="1" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="auShackle" x1="19" y1="12" x2="29" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#e2e8f0" />
        <stop offset="1" stopColor="#64748b" />
      </linearGradient>
    </defs>
    {/* Medieval/Cyber Shield */}
    <path
      d="M24 5L39 10.5V23C39 32.5 32.5 40.5 24 43.5C15.5 40.5 9 32.5 9 23V10.5L24 5Z"
      fill="url(#auShield)"
      stroke="#60a5fa"
      strokeWidth="1.8"
    />
    <path
      d="M24 8L36 12.5V23C36 30.5 30.8 37.5 24 40C17.2 37.5 12 30.5 12 23V12.5L24 8Z"
      fill="#090d16"
      stroke="#1e3a8a"
      strokeWidth="1"
    />
    {/* Padlock Shackle */}
    <path
      d="M19 22V17C19 14.24 21.24 12 24 12C26.76 12 29 14.24 29 17V22"
      stroke="url(#auShackle)"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    {/* Padlock Body */}
    <rect x="17" y="21" width="14" height="12" rx="3" fill="url(#auGold)" stroke="#fef08a" strokeWidth="0.8" />
    <circle cx="24" cy="26" r="1.8" fill="#713f12" />
    <path d="M24 27.5V30" stroke="#713f12" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// 8. SETTINGS 3D ICON: Precision Titanium Cogwheel with Gold Center Axle
export const SettingsIcon3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="stGear" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#94a3b8" />
        <stop offset="0.3" stopColor="#475569" />
        <stop offset="0.7" stopColor="#334155" />
        <stop offset="1" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="stAxle" x1="18" y1="18" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.6" stopColor="#eab308" />
        <stop offset="1" stopColor="#854d0e" />
      </linearGradient>
    </defs>
    {/* 8-Tooth Industrial Beveled Gear */}
    <path
      d="M21 5H27L28 10C29.5 10.5 30.8 11.2 32 12.1L36.8 9.5L40.8 13.5L38.2 18.3C39.1 19.5 39.8 20.8 40.3 22.3L45.3 23.3V29.3L40.3 30.3C39.8 31.8 39.1 33.1 38.2 34.3L40.8 39.1L36.8 43.1L32 40.5C30.8 41.4 29.5 42.1 28 42.6L27 47.6H21L20 42.6C18.5 42.1 17.2 41.4 16 40.5L11.2 43.1L7.2 39.1L9.8 34.3C8.9 33.1 8.2 31.8 7.7 30.3L2.7 29.3V23.3L7.7 22.3C8.2 20.8 8.9 19.5 9.8 18.3L7.2 13.5L11.2 9.5L16 12.1C17.2 11.2 18.5 10.5 20 10L21 5Z"
      fill="url(#stGear)"
      stroke="#cbd5e1"
      strokeWidth="1.2"
    />
    {/* Center Chamfer Ring */}
    <circle cx="24" cy="26" r="10" fill="#090d16" stroke="#64748b" strokeWidth="1.5" />
    <circle cx="24" cy="26" r="6.5" fill="url(#stAxle)" stroke="#fef08a" strokeWidth="1" />
    <circle cx="24" cy="26" r="2.5" fill="#0f172a" />
  </svg>
);

// 9. USER VIP CASINO CHIP 3D ICON: Obsidian & 24K Gold VIP Chip with Crown Crest
export const UserVipIcon3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="vipGold" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.3" stopColor="#eab308" />
        <stop offset="0.7" stopColor="#ca8a04" />
        <stop offset="1" stopColor="#713f12" />
      </linearGradient>
      <radialGradient id="vipCore" cx="24" cy="24" r="14" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1e293b" />
        <stop offset="1" stopColor="#020617" />
      </radialGradient>
    </defs>
    {/* Outer Gold Chip Rim */}
    <circle cx="24" cy="24" r="20" fill="url(#vipGold)" stroke="#fef08a" strokeWidth="1.5" />
    {/* Edge Grips / Striping */}
    <rect x="22" y="4" width="4" height="4" fill="#020617" rx="1" />
    <rect x="22" y="40" width="4" height="4" fill="#020617" rx="1" />
    <rect x="4" y="22" width="4" height="4" fill="#020617" rx="1" />
    <rect x="40" y="22" width="4" height="4" fill="#020617" rx="1" />
    {/* Inner Obsidian Inset */}
    <circle cx="24" cy="24" r="15" fill="url(#vipCore)" stroke="#eab308" strokeWidth="1.2" />
    {/* Gold VIP Crown */}
    <path
      d="M17 28L15 20L20 23L24 18L28 23L33 20L31 28H17Z"
      fill="url(#vipGold)"
      stroke="#fef08a"
      strokeWidth="0.8"
    />
    <circle cx="24" cy="18" r="1.2" fill="#ffffff" />
    <circle cx="15" cy="20" r="1" fill="#ffffff" />
    <circle cx="33" cy="20" r="1" fill="#ffffff" />
  </svg>
);

// 10. GEM 3D: Multi-Faceted Glowing Emerald/Diamond for Safe Mines Cells
export const Gem3D: React.FC<Icon3DProps> = ({ className = 'w-8 h-8', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <radialGradient id="gemAura" cx="32" cy="32" r="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" stopOpacity="0.7" />
        <stop offset="0.5" stopColor="#059669" stopOpacity="0.25" />
        <stop offset="1" stopColor="#047857" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="gemCrown" x1="16" y1="12" x2="48" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#a7f3d0" />
        <stop offset="0.5" stopColor="#34d399" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="gemPavilionL" x1="10" y1="26" x2="32" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" />
        <stop offset="1" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="gemPavilionC" x1="22" y1="26" x2="32" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#34d399" />
        <stop offset="1" stopColor="#065f46" />
      </linearGradient>
      <linearGradient id="gemPavilionR" x1="32" y1="26" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#059669" />
        <stop offset="1" stopColor="#022c22" />
      </linearGradient>
      <filter id="gemGleam" x="6" y="8" width="52" height="52" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#34d399" floodOpacity="0.8" />
      </filter>
    </defs>
    {/* Soft Aura */}
    <circle cx="32" cy="32" r="28" fill="url(#gemAura)" />
    {/* 3D Crystal Body */}
    <g filter="url(#gemGleam)">
      {/* Crown Table */}
      <polygon points="22,14 42,14 54,26 10,26" fill="url(#gemCrown)" stroke="#d1fae5" strokeWidth="1" />
      {/* Top Facet Triangles */}
      <polygon points="22,14 32,26 10,26" fill="#6ee7b7" stroke="#a7f3d0" strokeWidth="0.5" />
      <polygon points="42,14 32,26 54,26" fill="#059669" stroke="#6ee7b7" strokeWidth="0.5" />
      <polygon points="22,14 42,14 32,26" fill="#a7f3d0" stroke="#ecfdf5" strokeWidth="0.6" />
      {/* Pavilion Bottom Pyramids */}
      <polygon points="10,26 32,54 22,26" fill="url(#gemPavilionL)" stroke="#10b981" strokeWidth="0.5" />
      <polygon points="22,26 32,54 42,26" fill="url(#gemPavilionC)" stroke="#34d399" strokeWidth="0.6" />
      <polygon points="42,26 32,54 54,26" fill="url(#gemPavilionR)" stroke="#047857" strokeWidth="0.5" />
    </g>
    {/* Specular White Flare Star */}
    <path
      d="M24 18L26 22L30 23L26 24L24 28L22 24L18 23L22 22L24 18Z"
      fill="#ffffff"
    />
    <circle cx="44" cy="32" r="1.8" fill="#ffffff" fillOpacity="0.9" />
  </svg>
);

// 11. MINE 3D: Spiked Naval Bomb with Blackened Iron, Steel Studs and Glowing Red Sensor Core
export const Mine3D: React.FC<Icon3DProps> = ({ className = 'w-8 h-8', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <radialGradient id="mnAura" cx="32" cy="32" r="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ef4444" stopOpacity="0.6" />
        <stop offset="0.6" stopColor="#b91c1c" stopOpacity="0.2" />
        <stop offset="1" stopColor="#7f1d1d" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="mnSphere" cx="26" cy="26" r="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#475569" />
        <stop offset="0.3" stopColor="#1e293b" />
        <stop offset="0.75" stopColor="#0f172a" />
        <stop offset="1" stopColor="#020617" />
      </radialGradient>
      <linearGradient id="mnSpike" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#94a3b8" />
        <stop offset="1" stopColor="#1e293b" />
      </linearGradient>
      <radialGradient id="mnRedCore" cx="32" cy="32" r="8" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffedd5" />
        <stop offset="0.2" stopColor="#f87171" />
        <stop offset="0.7" stopColor="#ef4444" />
        <stop offset="1" stopColor="#7f1d1d" />
      </radialGradient>
    </defs>
    {/* Danger Blast Glow */}
    <circle cx="32" cy="32" r="28" fill="url(#mnAura)" />
    {/* Spikes Around Hull */}
    {/* Vertical Spikes */}
    <polygon points="30,8 34,8 32,2" fill="url(#mnSpike)" stroke="#cbd5e1" strokeWidth="0.6" />
    <polygon points="30,56 34,56 32,62" fill="url(#mnSpike)" stroke="#334155" strokeWidth="0.6" />
    {/* Horizontal Spikes */}
    <polygon points="8,30 8,34 2,32" fill="url(#mnSpike)" stroke="#64748b" strokeWidth="0.6" />
    <polygon points="56,30 56,34 62,32" fill="url(#mnSpike)" stroke="#334155" strokeWidth="0.6" />
    {/* Diagonal Spikes */}
    <polygon points="14,16 17,13 10,9" fill="url(#mnSpike)" stroke="#94a3b8" strokeWidth="0.6" />
    <polygon points="50,16 47,13 54,9" fill="url(#mnSpike)" stroke="#64748b" strokeWidth="0.6" />
    <polygon points="14,48 17,51 10,55" fill="url(#mnSpike)" stroke="#334155" strokeWidth="0.6" />
    <polygon points="50,48 47,51 54,55" fill="url(#mnSpike)" stroke="#1e293b" strokeWidth="0.6" />

    {/* Main Spherical Iron Body */}
    <circle cx="32" cy="32" r="20" fill="url(#mnSphere)" stroke="#64748b" strokeWidth="1.2" />

    {/* Steel Rivets / Studs */}
    <circle cx="24" cy="18" r="1.6" fill="#94a3b8" />
    <circle cx="40" cy="18" r="1.6" fill="#64748b" />
    <circle cx="20" cy="32" r="1.6" fill="#94a3b8" />
    <circle cx="44" cy="32" r="1.6" fill="#475569" />
    <circle cx="24" cy="46" r="1.6" fill="#475569" />
    <circle cx="40" cy="46" r="1.6" fill="#334155" />

    {/* Center Threat Beacon / Glowing Red Eye */}
    <circle cx="32" cy="32" r="7.5" fill="url(#mnRedCore)" stroke="#fca5a5" strokeWidth="1" />
    <circle cx="32" cy="32" r="3" fill="#ffffff" />
    {/* Top Hull Specular Crescent */}
    <path
      d="M20 20C24 15 32 15 38 18"
      stroke="#94a3b8"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeOpacity="0.6"
    />
  </svg>
);

// 12. CHEST 3D: Ornate Golden Treasure Chest with Glowing Light
export const Chest3D: React.FC<Icon3DProps> = ({ className = 'w-8 h-8', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <radialGradient id="chGlow" cx="32" cy="30" r="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f59e0b" stopOpacity="0.6" />
        <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="chGold" x1="12" y1="14" x2="52" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.3" stopColor="#fbbf24" />
        <stop offset="0.7" stopColor="#d97706" />
        <stop offset="1" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="chWood" x1="16" y1="24" x2="48" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#451a03" />
        <stop offset="1" stopColor="#1c0a00" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#chGlow)" />
    {/* Chest Lower Box */}
    <rect x="12" y="28" width="40" height="24" rx="4" fill="url(#chWood)" stroke="url(#chGold)" strokeWidth="1.5" />
    {/* Chest Arched Lid */}
    <path
      d="M12 28C12 18 20 14 32 14C44 14 52 18 52 28H12Z"
      fill="url(#chGold)"
      stroke="#fef08a"
      strokeWidth="1.2"
    />
    {/* Gold Vertical Straps with Rivets */}
    <rect x="18" y="15" width="5" height="37" fill="url(#chGold)" stroke="#fef08a" strokeWidth="0.6" />
    <rect x="41" y="15" width="5" height="37" fill="url(#chGold)" stroke="#fef08a" strokeWidth="0.6" />
    <circle cx="20.5" cy="22" r="1" fill="#451a03" />
    <circle cx="20.5" cy="36" r="1" fill="#451a03" />
    <circle cx="43.5" cy="22" r="1" fill="#451a03" />
    <circle cx="43.5" cy="36" r="1" fill="#451a03" />
    {/* Center Jeweled Clasp / Lock */}
    <rect x="28" y="25" width="8" height="9" rx="2" fill="url(#chGold)" stroke="#fef08a" strokeWidth="1" />
    <circle cx="32" cy="28.5" r="1.5" fill="#ef4444" />
    <path d="M32 30V32" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// 13. TILE CLOSED 3D: Tactile Unopened Casino Tile with Carbon Chamfer & Beveled Top
export const TileClosed3D: React.FC<Icon3DProps> = ({ className = 'w-7 h-7', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="tcTop" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1e293b" />
        <stop offset="0.5" stopColor="#141c2f" />
        <stop offset="1" stopColor="#0b1120" />
      </linearGradient>
      <linearGradient id="tcRim" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" stopOpacity="0.4" />
        <stop offset="0.5" stopColor="#1e293b" />
        <stop offset="1" stopColor="#020617" />
      </linearGradient>
    </defs>
    {/* Outer Raised Bevel */}
    <rect x="4" y="4" width="40" height="40" rx="10" fill="url(#tcRim)" stroke="#334155" strokeWidth="1" />
    {/* Inset Core Button */}
    <rect x="7" y="7" width="34" height="34" rx="8" fill="url(#tcTop)" stroke="#475569" strokeWidth="0.8" />
    {/* Subtle Tactile Diamond Emblem */}
    <polygon points="24,17 31,24 24,31 17,24" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
    <circle cx="24" cy="24" r="2" fill="#38bdf8" fillOpacity="0.6" />
    {/* Top Bevel Specular Line */}
    <line x1="12" y1="8" x2="36" y2="8" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.25" strokeLinecap="round" />
  </svg>
);

// 14. TILE UNKNOWN 3D: Frosted Glass Aperture with Glowing Target Question
export const TileUnknown3D: React.FC<Icon3DProps> = ({ className = 'w-7 h-7', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="tuRim" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f97316" />
        <stop offset="1" stopColor="#7c2d12" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#1c1917" stroke="url(#tuRim)" strokeWidth="1.5" strokeDasharray="4 2" />
    <circle cx="24" cy="24" r="12" stroke="#fdba74" strokeWidth="1" strokeOpacity="0.4" />
    <path
      d="M21 18C21 16.34 22.34 15 24 15C25.66 15 27 16.34 27 18C27 19.5 25.5 20.5 24 22V24"
      stroke="#fb923c"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="24" cy="29" r="1.5" fill="#fb923c" />
  </svg>
);

// 15. TROPHY GOLD 3D: Victory Award Cup
export const TrophyGold3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="tpGold" x1="12" y1="6" x2="36" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.3" stopColor="#facc15" />
        <stop offset="0.7" stopColor="#ca8a04" />
        <stop offset="1" stopColor="#854d0e" />
      </linearGradient>
    </defs>
    {/* Cup Body */}
    <path
      d="M14 8H34V20C34 26 29.5 30 24 30C18.5 30 14 26 14 20V8Z"
      fill="url(#tpGold)"
      stroke="#fef08a"
      strokeWidth="1.2"
    />
    {/* Handles */}
    <path d="M14 11H8C6.9 11 6 11.9 6 13V17C6 20.3 8.7 23 12 23H14" stroke="url(#tpGold)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M34 11H40C41.1 11 42 11.9 42 13V17C42 20.3 39.3 23 36 23H34" stroke="url(#tpGold)" strokeWidth="2.2" strokeLinecap="round" />
    {/* Stem & Pedestal */}
    <path d="M22 30V36H26V30" fill="url(#tpGold)" stroke="#ca8a04" strokeWidth="1" />
    <rect x="15" y="36" width="18" height="6" rx="2" fill="url(#tpGold)" stroke="#fef08a" strokeWidth="1" />
    <circle cx="24" cy="18" r="4" fill="#ffffff" fillOpacity="0.4" />
  </svg>
);

// 16. SOUND FX 3D TOGGLES
export const SoundOn3D: React.FC<Icon3DProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="sndGrad" x1="4" y1="8" x2="28" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" />
        <stop offset="1" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    <path
      d="M14 6L8 11H4C3.45 11 3 11.45 3 12V20C3 20.55 3.45 21 4 21H8L14 26V6Z"
      fill="url(#sndGrad)"
      stroke="#7dd3fc"
      strokeWidth="1"
    />
    <path d="M19 11C20.5 12.5 21.5 14.5 21.5 16C21.5 17.5 20.5 19.5 19 21" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    <path d="M23 7C25.5 9.5 27 12.8 27 16C27 19.2 25.5 22.5 23 25" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const SoundOff3D: React.FC<Icon3DProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path
      d="M14 6L8 11H4C3.45 11 3 11.45 3 12V20C3 20.55 3.45 21 4 21H8L14 26V6Z"
      fill="#475569"
      stroke="#64748b"
      strokeWidth="1"
    />
    <line x1="20" y1="12" x2="28" y2="20" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="28" y1="12" x2="20" y2="20" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
