import { useState } from 'react';
import mainLogoImg from '../assets/images/dionaea_strike_crest_logo_1795699672014.jpg';
import type { PetId, SpeciesId } from '../game/types';

export function VitalityLeafSocket({ state }: { state: 'full' | 'damaged' | 'empty' }) {
  if (state === 'empty') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <path
          d="M12 21s-7-4.4-8.8-9.2C1.7 7.8 4.4 4 8.2 4c2 0 3.3 1 3.8 2 .5-1 1.8-2 3.8-2 3.8 0 6.5 3.8 5 7.8C19 16.6 12 21 12 21z"
          fill="#111827"
          stroke="#475569"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
      <path
        d="M12 21s-7-4.4-8.8-9.2C1.7 7.8 4.4 4 8.2 4c2 0 3.3 1 3.8 2 .5-1 1.8-2 3.8-2 3.8 0 6.5 3.8 5 7.8C19 16.6 12 21 12 21z"
        fill={state === 'damaged' ? '#F59E0B' : '#E11D48'}
        stroke="#111827"
        strokeWidth="2"
      />
      <path
        d="M6.5 8.5c.8-1.5 2.2-2.2 3.5-2"
        fill="none"
        stroke="#FFE4E6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {state === 'damaged' && (
        <path
          d="M12 7l-1.5 4 2.5 2.5-1.5 4"
          fill="none"
          stroke="#111827"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function SpeciesEmblem({
  speciesId,
  color,
  unlocked,
  size = 20,
}: {
  speciesId: SpeciesId;
  color: string;
  unlocked: boolean;
  size?: number;
}) {
  const fill = unlocked ? color : '#334155';
  const stroke = unlocked ? '#111827' : '#475569';
  const highlight = unlocked ? '#FFFFFF' : '#64748B';

  if (speciesId === 'dionaea') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path
          d="M4 15C4 9 8 5 12 5s8 4 8 10l-8 5-8-5z"
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
        />
        <path d="M6 12l2-4 2 3 2-4 2 4 2-3 2 4" fill="none" stroke={highlight} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (speciesId === 'drosera') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path d="M12 20V11M12 14L6 8M12 14l6-6M12 11L9 5M12 11l3-6" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="6" cy="7.5" r="2.5" fill={fill} stroke={stroke} strokeWidth="1.6" />
        <circle cx="18" cy="7.5" r="2.5" fill={fill} stroke={stroke} strokeWidth="1.6" />
        <circle cx="9" cy="4.5" r="2.2" fill={fill} stroke={stroke} strokeWidth="1.6" />
        <circle cx="15" cy="4.5" r="2.2" fill={fill} stroke={stroke} strokeWidth="1.6" />
      </svg>
    );
  }

  if (speciesId === 'nepenthes') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path
          d="M8 6h8l-1 11c-.2 2.2-1.4 3.5-3 3.5s-2.8-1.3-3-3.5L8 6z"
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
        />
        <ellipse cx="12" cy="6" rx="4.5" ry="1.8" fill={highlight} stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }

  if (speciesId === 'sarracenia') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path
          d="M6 19L9 7c.5-2 4-3 6-1.5L18 9l-5 10H6z"
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M9 5c2.5-2 6-1.5 8 1.5" fill="none" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (speciesId === 'pinguicula') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <polygon
          points="12,3 20,12 12,21 4,12"
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <polygon points="12,7 16,12 12,17 8,12" fill={highlight} opacity="0.7" />
      </svg>
    );
  }

  if (speciesId === 'heliamphora') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path
          d="M12 4l4 6-4 10-4-10 4-6z"
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="9" r="2.2" fill={highlight} stroke={stroke} strokeWidth="1.4" />
      </svg>
    );
  }

  if (speciesId === 'cephalotus') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <ellipse cx="12" cy="14" rx="7" ry="6" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M7 9l2-3 3 2 3-2 2 3" fill="none" stroke={highlight} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill={fill} stroke={stroke} strokeWidth="2" />
      <path d="M8.5 12a3.5 3.5 0 0 1 7 0" fill="none" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" fill={highlight} />
    </svg>
  );
}

export function TitleLogoLockup({ title }: { title: string }) {
  const [logoImgFailed, setLogoImgFailed] = useState(false);
  const words = title.trim().split(/\s+/);
  const firstWord = words[0] ?? 'DIONAEA';
  const restWords = words.slice(1).join(' ') || 'STRIKE';

  return (
    <div
      className="flex items-center gap-3 sm:gap-4 [@media(max-height:480px)]:gap-2.5 max-w-full"
      data-testid="main-menu-logo"
    >
      {/* Reworked Sculpted Squadron Emblem Crest */}
      <div className="relative shrink-0 w-16 h-16 sm:w-24 sm:h-24 [@media(max-height:480px)]:w-14 [@media(max-height:480px)]:h-14 rounded-full p-[3px] bg-gradient-to-b from-[#FEF08A] via-[#F59E0B] to-[#92400E] shadow-[0_6px_0_#050810,0_10px_24px_rgba(245,158,11,0.28)]">
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#050810] bg-[#08101C]">
          {!logoImgFailed ? (
            <img
              src={mainLogoImg}
              alt="Emblema oficial de Dionaea Strike"
              referrerPolicy="no-referrer"
              onError={() => setLogoImgFailed(true)}
              className="w-full h-full object-cover scale-[1.12]"
            />
          ) : (
            <svg viewBox="0 0 64 64" className="w-full h-full p-2" aria-hidden="true">
              <circle cx="32" cy="32" r="27" fill="#0F2942" stroke="#38BDF8" strokeWidth="3" />
              <path d="M12 42 C10 18, 36 8, 54 22 L40 44 Z" fill="#22C55E" stroke="#090D16" strokeWidth="3" />
              <path d="M20 38 C20 24, 36 18, 48 26 L38 42 Z" fill="#E11D48" stroke="#090D16" strokeWidth="2.5" />
            </svg>
          )}
        </div>
      </div>

      {/* Reworked Cel-Shaded Arcade Wordmark */}
      <div className="flex flex-col leading-none min-w-0">
        <div className="flex items-center gap-2 mb-1 [@media(max-height:480px)]:mb-0.5">
          <span className="h-1.5 w-6 sm:w-9 rounded-full bg-[#38BDF8] border border-[#050810]" />
          <span className="h-1.5 w-3.5 sm:w-5 rounded-full bg-[#F8FAFC] border border-[#050810]" />
          <span className="h-1.5 w-6 sm:w-9 rounded-full bg-[#38BDF8] border border-[#050810]" />
          <span className="text-[10px] sm:text-[11px] font-mono font-extrabold uppercase tracking-[0.2em] text-amber-300 truncate">
            ESCUADRÓN PAMPA
          </span>
        </div>

        <h1 className="font-display font-black uppercase tracking-tight text-[1.65rem] sm:text-4xl lg:text-[2.95rem] [@media(max-height:480px)]:text-2xl leading-[0.95] drop-shadow-[0_4px_0_#050810] flex flex-wrap items-baseline gap-x-2">
          <span className="text-white anime-stroke">{firstWord}</span>
          <span className="bg-gradient-to-b from-[#BEF264] via-[#4ADE80] to-[#16A34A] bg-clip-text text-transparent drop-shadow-[0_3px_0_#050810]">
            {restWords}
          </span>
        </h1>

        <div className="mt-1.5 [@media(max-height:480px)]:hidden h-[3px] w-44 sm:w-64 rounded-full bg-gradient-to-r from-[#FACC15] via-[#4ADE80] to-transparent" />
      </div>
    </div>
  );
}

export function PetEmblem({ petId, size = 18 }: { petId: PetId; size?: number }) {
  if (petId === 'roy') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <polygon points="4,10 5,3 10,7" fill="#F8FAFC" stroke="#0E1722" strokeWidth="1.7" strokeLinejoin="round" />
        <polygon points="20,10 19,3 14,7" fill="#F8FAFC" stroke="#0E1722" strokeWidth="1.7" strokeLinejoin="round" />
        <polygon points="5.8,8.5 6.3,4.8 9,7.2" fill="#F472B6" />
        <polygon points="18.2,8.5 17.7,4.8 15,7.2" fill="#F472B6" />
        <ellipse cx="12" cy="13.5" rx="8" ry="7" fill="#F8FAFC" stroke="#0E1722" strokeWidth="1.8" />
        <circle cx="8.8" cy="12.5" r="2.2" fill="#38BDF8" stroke="#0E1722" strokeWidth="1" />
        <circle cx="15.2" cy="12.5" r="2.2" fill="#22C55E" stroke="#0E1722" strokeWidth="1" />
        <ellipse cx="8.8" cy="12.5" rx="0.7" ry="1.5" fill="#0E1722" />
        <ellipse cx="15.2" cy="12.5" rx="0.7" ry="1.5" fill="#0E1722" />
        <polygon points="11,15 13,15 12,16.4" fill="#FB7185" />
        <ellipse cx="12" cy="18" rx="2.1" ry="1.3" fill="#FB7185" stroke="#0E1722" strokeWidth="1.1" />
      </svg>
    );
  }

  if (petId === 'sicario') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <polygon points="4.5,11 5.5,5.5 9.5,8.5" fill="#94A3B8" stroke="#0E1722" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="19.5,11 18.5,5.5 14.5,8.5" fill="#94A3B8" stroke="#0E1722" strokeWidth="1.5" strokeLinejoin="round" />
        <ellipse cx="12" cy="14.2" rx="7.6" ry="6.5" fill="#94A3B8" stroke="#0E1722" strokeWidth="1.8" />
        <path d="M9.5 10.2 L10.7 11.8 L12 10.2 L13.3 11.8 L14.5 10.2" fill="none" stroke="#334155" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.2 14.2h2.4M5.6 16.2h2.1M18.8 14.2h-2.4M18.4 16.2h-2.1" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="12" cy="7.6" rx="9.2" ry="1.8" fill="#1E293B" stroke="#0E1722" strokeWidth="1.4" />
        <path d="M7 7.4 L8.4 3.4 L15.6 3.4 L17 7.4 Z" fill="#1E293B" stroke="#0E1722" strokeWidth="1.4" strokeLinejoin="round" />
        <line x1="7.7" y1="6.3" x2="16.3" y2="6.3" stroke="#22C55E" strokeWidth="1.6" />
        <circle cx="8.9" cy="13.8" r="2.1" fill="#22C55E" stroke="#0E1722" strokeWidth="1" />
        <circle cx="15.1" cy="13.8" r="2.1" fill="#22C55E" stroke="#0E1722" strokeWidth="1" />
        <ellipse cx="8.9" cy="13.8" rx="0.6" ry="1.5" fill="#0E1722" />
        <ellipse cx="15.1" cy="13.8" rx="0.6" ry="1.5" fill="#0E1722" />
        <polygon points="11.1,16.1 12.9,16.1 12,17.2" fill="#475569" />
        <path d="M9.8 18.2c1.2.8 3.2.8 4.6-.3" fill="none" stroke="#0E1722" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  if (petId === 'palito') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <polygon points="4,10.5 5.2,3.4 10,7.5" fill="#FACC15" stroke="#0E1722" strokeWidth="1.6" strokeLinejoin="round" />
        <polygon points="20,10.5 18.8,3.4 14,7.5" fill="#FACC15" stroke="#0E1722" strokeWidth="1.6" strokeLinejoin="round" />
        <polygon points="5.8,8.8 6.4,5.2 8.9,7.5" fill="#FDBA74" />
        <polygon points="18.2,8.8 17.6,5.2 15.1,7.5" fill="#FDBA74" />
        <ellipse cx="12" cy="13.6" rx="7.9" ry="6.8" fill="#FACC15" stroke="#0E1722" strokeWidth="1.8" />
        <path d="M9.4 8.2 L10.7 10 L12 8.2 L13.3 10 L14.6 8.2" fill="none" stroke="#B45309" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.8 13.6h2.3M5.3 15.6h2M19.2 13.6h-2.3M18.7 15.6h-2" stroke="#B45309" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="8.8" cy="12.9" r="2.1" fill="#FEF08A" stroke="#0E1722" strokeWidth="1" />
        <circle cx="15.2" cy="12.9" r="2.1" fill="#FEF08A" stroke="#0E1722" strokeWidth="1" />
        <circle cx="8.9" cy="12.9" r="1.05" fill="#0E1722" />
        <circle cx="15.3" cy="12.9" r="1.05" fill="#0E1722" />
        <circle cx="8.4" cy="12.3" r="0.45" fill="#FFFFFF" />
        <circle cx="14.8" cy="12.3" r="0.45" fill="#FFFFFF" />
        <polygon points="11,15.3 13,15.3 12,16.5" fill="#FB7185" />
        <path d="M9.6 17.4c.9.9 1.9.8 2.4.1c.5.7 1.5.8 2.4-.1" fill="none" stroke="#0E1722" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M19.5 21.8s-3.1-1.9-3.1-3.8c0-1.1.9-1.9 1.9-1.9.6 0 1 .3 1.2.7.2-.4.6-.7 1.2-.7 1 0 1.9.8 1.9 1.9 0 1.9-3.1 3.8-3.1 3.8z" fill="#EC4899" stroke="#0E1722" strokeWidth="1.1" />
      </svg>
    );
  }

  if (petId === 'carpincho') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <circle cx="6.2" cy="10.5" r="2" fill="#78350F" stroke="#0E1722" strokeWidth="1.4" />
        <circle cx="17.8" cy="10.5" r="2" fill="#78350F" stroke="#0E1722" strokeWidth="1.4" />
        <rect x="4.5" y="9.2" width="15" height="11.4" rx="5.2" fill="#92400E" stroke="#0E1722" strokeWidth="1.7" />
        <rect x="7" y="13.8" width="10" height="6.2" rx="3" fill="#B45309" stroke="#0E1722" strokeWidth="1.2" />
        <ellipse cx="12" cy="8.4" rx="10.2" ry="2.2" fill="#451A03" stroke="#0E1722" strokeWidth="1.5" />
        <path d="M6.8 8.2 L8 3.5 Q12 2.4 16 3.5 L17.2 8.2 Z" fill="#5C2D0C" stroke="#0E1722" strokeWidth="1.4" strokeLinejoin="round" />
        <line x1="7.4" y1="6.8" x2="16.6" y2="6.8" stroke="#38BDF8" strokeWidth="1.8" />
        <line x1="9.8" y1="6.8" x2="14.2" y2="6.8" stroke="#F8FAFC" strokeWidth="1.4" />
        <line x1="7.4" y1="12.4" x2="10" y2="12.4" stroke="#0E1722" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="14" y1="12.4" x2="16.6" y2="12.4" stroke="#0E1722" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="10.2" cy="16.1" r="0.85" fill="#1C1917" />
        <circle cx="13.8" cy="16.1" r="0.85" fill="#1C1917" />
        <path d="M10.8 18.2c.7.6 1.7.6 2.4 0" fill="none" stroke="#1C1917" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="19.6" cy="19.2" r="2.7" fill="#15803D" stroke="#0E1722" strokeWidth="1.2" />
        <line x1="20.4" y1="17.2" x2="22.4" y2="14.4" stroke="#E2E8F0" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  // Sapo Batricio: chunky spotted olive toad with brow ridges & amber eyes
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <ellipse cx="7.8" cy="7.8" rx="3.4" ry="3.1" fill="#65A30D" stroke="#0E1722" strokeWidth="1.7" />
      <ellipse cx="16.2" cy="7.8" rx="3.4" ry="3.1" fill="#65A30D" stroke="#0E1722" strokeWidth="1.7" />
      <ellipse cx="12" cy="14.2" rx="9" ry="6.4" fill="#65A30D" stroke="#0E1722" strokeWidth="1.8" />
      <ellipse cx="12" cy="17.2" rx="6.2" ry="2.6" fill="#E7E5B4" />
      <circle cx="6.2" cy="13.4" r="1.2" fill="#3F6212" />
      <circle cx="17.8" cy="13.2" r="1.3" fill="#3F6212" />
      <circle cx="12" cy="11.2" r="1.1" fill="#3F6212" />
      <circle cx="7.8" cy="7.9" r="1.7" fill="#F59E0B" stroke="#0E1722" strokeWidth="0.9" />
      <circle cx="16.2" cy="7.9" r="1.7" fill="#F59E0B" stroke="#0E1722" strokeWidth="0.9" />
      <rect x="6.8" y="7.4" width="2" height="1" rx="0.5" fill="#0E1722" />
      <rect x="15.2" y="7.4" width="2" height="1" rx="0.5" fill="#0E1722" />
      <path d="M6.8 14.8c2.6 1.7 7.8 1.7 10.4 0" fill="none" stroke="#0E1722" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FrogEmblem({ size = 18 }: { size?: number }) {
  return <PetEmblem petId="batricio" size={size} />;
}


