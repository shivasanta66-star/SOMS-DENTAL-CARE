// Stand-in illustrations until the clinic supplies real photos.
// Inline SVG in the site's palette: no downloads, crisp at any size.
// To switch to a real photo, replace <ClinicIllustration kind="..."> in
// src/app/page.tsx with an <img> (WebP, lazy-loaded, same alt text).

const C = {
  medical: "#1A5F7A",
  deep: "#113B4C",
  mint: "#E8F4F5",
  tint: "#D2E8EC",
  tint2: "#B9DAE0",
  white: "#FFFFFF",
  steel: "#9FB4BA",
  steelDark: "#6F868D",
  skin: "#B97A56",
  hair: "#2B1D16",
  wood: "#D8B48A",
  leaf: "#5C9C78",
  leafDark: "#3F7A5B",
};

export type IllustrationKind = "doctor" | "chair" | "sterilisation" | "xray" | "waiting";

function Doctor() {
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="500" fill={C.mint} />
      {/* window and wall detail */}
      <rect x="236" y="48" width="120" height="150" rx="10" fill={C.white} />
      <rect x="236" y="48" width="120" height="150" rx="10" fill="none" stroke={C.tint2} strokeWidth="6" />
      <path d="M296 48v150M236 123h120" stroke={C.tint2} strokeWidth="6" />
      <circle cx="84" cy="96" r="30" fill={C.tint} />
      <path d="M72 96c0-8 5-14 12-14s12 6 12 14" fill="none" stroke={C.medical} strokeWidth="4" strokeLinecap="round" />
      {/* plant */}
      <rect x="48" y="360" width="46" height="60" rx="6" fill={C.wood} />
      <path d="M71 362c-18-30-30-52-22-78 14 16 22 40 22 78Zm0 0c12-34 26-54 46-62-2 28-18 48-46 62Zm0 0c-4-40 2-70 18-92 8 30 2 62-18 92Z" fill={C.leaf} />
      {/* body: white coat */}
      <path d="M100 500c0-96 44-150 100-150s100 54 100 150Z" fill={C.white} />
      <path d="M200 352v148" stroke={C.tint2} strokeWidth="4" />
      {/* scrubs under coat */}
      <path d="M172 356l28 48 28-48c-9-4-18-6-28-6s-19 2-28 6Z" fill={C.medical} />
      {/* lapels */}
      <path d="M170 357l30 60-22 8-22-54Zm60 0-30 60 22 8 22-54Z" fill={C.tint} />
      {/* stethoscope */}
      <path d="M176 372c-6 40 6 70 30 70s32-24 30-56" fill="none" stroke={C.deep} strokeWidth="5" strokeLinecap="round" />
      <circle cx="236" cy="384" r="9" fill={C.steelDark} />
      {/* pocket + pen */}
      <rect x="236" y="440" width="36" height="30" rx="4" fill={C.tint} />
      <rect x="244" y="428" width="5" height="22" rx="2" fill={C.medical} />
      {/* neck and head */}
      <rect x="186" y="312" width="28" height="44" rx="12" fill={C.skin} />
      <ellipse cx="200" cy="262" rx="58" ry="66" fill={C.skin} />
      <path d="M142 258c-6-58 26-92 64-92 40 0 66 30 58 90-10-26-30-42-58-46-26 4-46 20-64 48Z" fill={C.hair} />
      <ellipse cx="142" cy="268" rx="10" ry="16" fill={C.skin} />
      <ellipse cx="258" cy="268" rx="10" ry="16" fill={C.skin} />
      {/* simple, friendly features */}
      <path d="M176 262h12M212 262h12" stroke={C.hair} strokeWidth="5" strokeLinecap="round" />
      <path d="M182 296c10 10 26 10 36 0" fill="none" stroke={C.hair} strokeWidth="4" strokeLinecap="round" />
      {/* name badge */}
      <rect x="148" y="430" width="44" height="18" rx="4" fill={C.medical} />
      <rect x="154" y="437" width="32" height="4" rx="2" fill={C.white} />
    </svg>
  );
}

function Chair() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill={C.mint} />
      <rect y="232" width="400" height="68" fill={C.tint} />
      {/* overhead lamp */}
      <path d="M300 0v42" stroke={C.steelDark} strokeWidth="6" />
      <path d="M300 42 238 86" stroke={C.steelDark} strokeWidth="6" strokeLinecap="round" />
      <path d="M206 86h64l-8 18h-48Z" fill={C.deep} />
      <path d="M214 104h48l40 70H174Z" fill="#FFF7D6" opacity="0.55" />
      {/* chair base */}
      <rect x="150" y="214" width="70" height="22" rx="6" fill={C.steelDark} />
      <rect x="120" y="234" width="130" height="12" rx="6" fill={C.deep} />
      {/* seat, backrest, headrest, legrest */}
      <path d="M92 176c30-2 110-4 150 0 10 1 14 8 14 16v14H96c-10 0-16-6-14-14 1-8 4-15 10-16Z" fill={C.medical} />
      <path d="M78 186 44 118c-4-8 0-16 8-18l10-2c7-1 13 3 16 10l30 76Z" fill={C.medical} />
      <rect x="30" y="80" width="42" height="24" rx="12" fill={C.deep} transform="rotate(-24 51 92)" />
      <path d="M244 180c26 0 52 8 70 22l-8 16c-18-10-38-16-60-16Z" fill={C.medical} />
      {/* armrest */}
      <rect x="110" y="160" width="70" height="10" rx="5" fill={C.deep} />
      {/* instrument tray on arm */}
      <path d="M338 232V140" stroke={C.steelDark} strokeWidth="6" />
      <path d="M338 146h-40" stroke={C.steelDark} strokeWidth="6" strokeLinecap="round" />
      <rect x="276" y="128" width="84" height="14" rx="4" fill={C.white} stroke={C.steel} strokeWidth="2" />
      <path d="M288 124v-16M300 124v-20M312 124v-14M324 124v-18" stroke={C.steelDark} strokeWidth="3" strokeLinecap="round" />
      {/* cuspidor */}
      <rect x="18" y="178" width="14" height="56" fill={C.steel} />
      <ellipse cx="25" cy="176" rx="18" ry="7" fill={C.white} stroke={C.steel} strokeWidth="2" />
    </svg>
  );
}

function Sterilisation() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill={C.mint} />
      {/* counter */}
      <rect y="196" width="400" height="16" fill={C.deep} />
      <rect y="212" width="400" height="88" fill={C.tint} />
      <path d="M100 212v88M200 212v88M300 212v88" stroke={C.tint2} strokeWidth="3" />
      {/* wall cabinet */}
      <rect x="26" y="26" width="150" height="70" rx="6" fill={C.white} stroke={C.tint2} strokeWidth="3" />
      <path d="M101 26v70" stroke={C.tint2} strokeWidth="3" />
      <rect x="88" y="54" width="6" height="16" rx="3" fill={C.steelDark} />
      <rect x="108" y="54" width="6" height="16" rx="3" fill={C.steelDark} />
      {/* autoclave */}
      <rect x="40" y="110" width="150" height="86" rx="10" fill={C.white} stroke={C.steel} strokeWidth="3" />
      <circle cx="100" cy="153" r="30" fill={C.tint} stroke={C.steelDark} strokeWidth="4" />
      <circle cx="100" cy="153" r="18" fill={C.white} />
      <rect x="146" y="124" width="32" height="14" rx="3" fill={C.deep} />
      <text x="162" y="135" textAnchor="middle" fontSize="10" fontFamily="Inter, system-ui, sans-serif" fill="#7FE0B0">134°</text>
      <circle cx="154" cy="160" r="5" fill={C.medical} />
      <circle cx="170" cy="160" r="5" fill={C.leaf} />
      {/* instrument tray */}
      <rect x="214" y="170" width="150" height="26" rx="5" fill={C.steel} />
      <path d="M232 180h40M232 188h56M296 180h50M306 188h40" stroke={C.white} strokeWidth="3" strokeLinecap="round" />
      {/* sealed sterilisation pouches */}
      <g transform="rotate(-8 270 120)">
        <rect x="222" y="92" width="96" height="44" rx="4" fill={C.white} stroke={C.tint2} strokeWidth="2" />
        <rect x="222" y="92" width="14" height="44" fill={C.tint2} />
        <path d="M246 114h56" stroke={C.steelDark} strokeWidth="4" strokeLinecap="round" />
      </g>
      <g transform="rotate(6 318 132)">
        <rect x="276" y="116" width="96" height="44" rx="4" fill={C.white} stroke={C.tint2} strokeWidth="2" />
        <rect x="276" y="116" width="14" height="44" fill={C.medical} opacity="0.6" />
        <path d="M300 138h56" stroke={C.steelDark} strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* glove box */}
      <rect x="230" y="40" width="70" height="44" rx="4" fill={C.medical} />
      <path d="M248 40c0-10 34-10 34 0" fill={C.tint} />
      <rect x="310" y="40" width="70" height="44" rx="4" fill={C.deep} />
      <path d="M328 40c0-10 34-10 34 0" fill={C.tint} />
    </svg>
  );
}

function Xray() {
  const teeth = Array.from({ length: 8 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill={C.mint} />
      <rect y="240" width="400" height="60" fill={C.tint} />
      {/* wall-mounted X-ray arm */}
      <rect x="22" y="40" width="20" height="120" rx="6" fill={C.steel} />
      <path d="M40 70h60l40 36" fill="none" stroke={C.steelDark} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="126" y="98" width="46" height="34" rx="8" fill={C.white} stroke={C.steel} strokeWidth="3" />
      <rect x="164" y="104" width="30" height="22" rx="11" fill={C.medical} />
      {/* lightbox with a panoramic X-ray */}
      <rect x="208" y="36" width="176" height="124" rx="10" fill={C.deep} />
      <rect x="218" y="46" width="156" height="104" rx="6" fill="#0B2530" />
      <g fill="#DDEFF2" opacity="0.9">
        {teeth.map((i) => (
          <rect key={`u${i}`} x={228 + i * 17.5} y={62 + Math.abs(3.5 - i) * 3} width="13" height="30" rx="5" />
        ))}
        {teeth.map((i) => (
          <rect key={`l${i}`} x={228 + i * 17.5} y={100 - Math.abs(3.5 - i) * 3 + 6} width="13" height="30" rx="5" />
        ))}
      </g>
      <path d="M228 96c40 8 96 8 136 0" stroke="#5E8C99" strokeWidth="2" fill="none" />
      {/* lead apron on hook */}
      <path d="M60 176h40" stroke={C.steelDark} strokeWidth="5" strokeLinecap="round" />
      <path d="M58 180c-6 26-4 50 4 60h36c8-10 10-34 4-60Z" fill={C.medical} />
      <path d="M68 180v8M92 180v8" stroke={C.deep} strokeWidth="4" />
      {/* small cabinet */}
      <rect x="236" y="176" width="130" height="64" rx="6" fill={C.white} stroke={C.tint2} strokeWidth="3" />
      <path d="M301 176v64" stroke={C.tint2} strokeWidth="3" />
      <rect x="288" y="200" width="6" height="16" rx="3" fill={C.steelDark} />
      <rect x="308" y="200" width="6" height="16" rx="3" fill={C.steelDark} />
    </svg>
  );
}

function Waiting() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill={C.mint} />
      <rect y="226" width="400" height="74" fill={C.tint} />
      {/* clock */}
      <circle cx="330" cy="58" r="26" fill={C.white} stroke={C.deep} strokeWidth="4" />
      <path d="M330 58V42M330 58l11 7" stroke={C.deep} strokeWidth="4" strokeLinecap="round" />
      {/* framed sign */}
      <rect x="150" y="30" width="110" height="56" rx="6" fill={C.white} stroke={C.tint2} strokeWidth="3" />
      <path d="M186 58c0-8 5-12 10-12 3 0 5 1 9 1s6-1 9-1c5 0 10 4 10 12 0 7-3 10-4 15-1 5-2 13-5 13-3 0-3-7-10-7s-7 7-10 7c-3 0-4-8-5-13-1-5-4-8-4-15Z" fill="none" stroke={C.medical} strokeWidth="3" strokeLinejoin="round" />
      {/* reception desk */}
      <rect x="250" y="142" width="136" height="86" rx="6" fill={C.medical} />
      <rect x="244" y="132" width="148" height="14" rx="4" fill={C.deep} />
      <rect x="270" y="112" width="44" height="22" rx="3" fill={C.deep} />
      <rect x="274" y="116" width="36" height="14" rx="2" fill={C.tint2} />
      <path d="M262 170h112" stroke={C.tint2} strokeWidth="3" opacity="0.6" />
      {/* row of chairs */}
      {[24, 86, 148].map((x) => (
        <g key={x}>
          <rect x={x} y="150" width="54" height="44" rx="10" fill={C.white} stroke={C.tint2} strokeWidth="3" />
          <rect x={x - 2} y="186" width="58" height="16" rx="6" fill={C.white} stroke={C.tint2} strokeWidth="3" />
          <path d={`M${x + 6} 202v24M${x + 48} 202v24`} stroke={C.steelDark} strokeWidth="4" />
        </g>
      ))}
      {/* side table with magazines */}
      <rect x="210" y="192" width="34" height="8" rx="3" fill={C.wood} />
      <path d="M216 200v26M238 200v26" stroke={C.wood} strokeWidth="4" />
      <rect x="214" y="184" width="24" height="8" rx="2" fill={C.leaf} />
      {/* plant */}
      <rect x="112" y="92" width="28" height="30" rx="4" fill={C.wood} />
      <path d="M126 94c-12-18-18-34-12-50 10 12 14 28 12 50Zm0 0c8-22 18-34 30-38 0 18-12 32-30 38Z" fill={C.leaf} />
      <path d="M126 94c-2-26 2-44 12-58" stroke={C.leafDark} strokeWidth="3" fill="none" />
    </svg>
  );
}

const scenes: Record<IllustrationKind, () => React.JSX.Element> = {
  doctor: Doctor,
  chair: Chair,
  sterilisation: Sterilisation,
  xray: Xray,
  waiting: Waiting,
};

export function ClinicIllustration({ kind, label, portrait = false }: { kind: IllustrationKind; label: string; portrait?: boolean }) {
  const Scene = scenes[kind];
  return (
    <div className={`illustration${portrait ? " illustration--portrait" : ""}`} role="img" aria-label={label}>
      <Scene />
      <span className="illustration__tag" aria-hidden="true">Illustration</span>
    </div>
  );
}
