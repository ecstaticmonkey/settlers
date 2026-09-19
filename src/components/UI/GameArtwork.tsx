import React from 'react';
import { Resource } from '@/lib/catan/types';
import { RESOURCE_TOKENS } from '@/lib/catan/tokens';
import { TerrainIllustration } from '../Board/FlatBoardArt';

export type GameArtworkKind = 'trade' | 'development' | 'road' | 'settlement' | 'city' | 'hourglass' | 'dice' | 'pawn' | 'army' | 'longest-road' | 'bank' | 'hidden-card';

function Pawn() {
  return <g stroke="#284554" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M24 36Q18 42 20 55Q32 60 44 55Q46 42 40 36Z" fill="#fffbed" />
    <ellipse cx="32" cy="29" rx="10" ry="12" fill="#fffbed" />
    <path d="M15 24Q14 20 23 20Q25 5 32 6Q39 5 41 20Q50 20 49 24Q32 29 15 24Z" fill="#284554" />
    <path d="M25 40Q23 46 24 51" fill="none" stroke="#d7e1da" />
  </g>;
}

function DevelopmentCard() {
  return <g strokeLinejoin="round">
    <rect x="12" y="5" width="40" height="54" rx="2" fill="#7854a8" stroke="#243e57" strokeWidth="2" />
    <rect x="15" y="8" width="34" height="48" rx="1" fill="#956cc4" stroke="#d3b9eb" />
    <path d="M16 9H48V29L16 51Z" fill="#ffffff" opacity=".12" />
    <circle cx="32" cy="33" r="15" fill="#6eb779" stroke="#edf1d2" strokeWidth="1.5" />
    <path d="M19 29Q30 16 43 27L21 42Z" fill="#83c8d3" />
    <path d="M23 43L39 25" stroke="#805e35" strokeWidth="5" />
    <path d="M34 21L40 17L48 24L43 29L39 25L35 29L31 25Z" fill="#dae1d9" stroke="#5d7a85" strokeWidth="1.3" />
  </g>;
}

/** Illustrated game pieces match the reference silhouettes at any display size. */
export function GameArtwork({ kind, className = '' }: { kind: GameArtworkKind; className?: string }) {
  let art: React.ReactNode;
  switch (kind) {
    case 'pawn': art = <Pawn />; break;
    case 'development': art = <DevelopmentCard />; break;
    case 'hidden-card': art = <>
      <rect x="12" y="5" width="40" height="54" rx="2" fill="#1684b8" stroke="#243e57" strokeWidth="2" />
      <rect x="15" y="8" width="34" height="48" rx="1" fill="#249fc4" stroke="#b2e2ea" />
      <path d="M16 9H48V25L16 51Z" fill="#fff" opacity=".13" />
      <path d="M24 24C24 13 44 14 43 25C43 31 33 31 33 39" fill="none" stroke="#164f6c" strokeWidth="8" strokeLinecap="round" />
      <path d="M23 23C23 12 43 13 42 24C42 30 32 30 32 38" fill="none" stroke="#bce9f1" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="47" r="3.5" fill="#bce9f1" stroke="#164f6c" />
    </>; break;
    case 'road': art = <g stroke="#315876" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M25 9L33 5L40 10V54L32 59L25 54Z" fill="#579cd1" />
      <path d="M25 9L32 14V59L25 54Z" fill="#76bce8" />
      <path d="M32 14L40 10V54L32 59Z" fill="#3c7eaf" />
      <path d="M27 10L33 7L38 10L32 13Z" fill="#b2dbed" stroke="none" />
    </g>; break;
    case 'settlement': art = <g stroke="#315876" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M9 30L28 9L46 19L55 41L51 53L33 58L25 53L14 56L8 49Z" fill="#67aadb" />
      <path d="M28 9L46 19L55 41L33 32Z" fill="#86bde2" />
      <path d="M28 9L33 32L9 49L9 30Z" fill="#9acbea" />
      <path d="M33 32L55 41L51 53L33 58Z" fill="#4b8cbf" />
      <path d="M27 55V45Q30 40 34 44V57" fill="#315876" />
      <path d="M12 48L31 34" fill="none" stroke="#b7ddee" />
    </g>; break;
    case 'city': art = <g stroke="#315876" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6 28L20 10L35 17L40 32L52 31L60 40L57 55L36 59L24 54L12 56L7 47Z" fill="#67aadb" />
      <path d="M20 10L35 17L40 32L25 28Z" fill="#8ec4e6" />
      <path d="M6 28L20 10L25 28L9 42Z" fill="#a0d0ea" />
      <path d="M25 28L40 32V44L36 59L24 54Z" fill="#4484b5" />
      <path d="M29 43L40 32L52 31L60 40L48 45Z" fill="#9acbe5" />
      <path d="M29 43L48 45L57 41V55L36 59Z" fill="#74acd0" />
      <path d="M14 53V44Q17 40 20 44V54" fill="#315876" />
      <path d="M40 51L44 52V56M49 49L53 49V54" fill="none" />
    </g>; break;
    case 'hourglass': art = <g stroke="#315876" strokeWidth="2" strokeLinejoin="round">
      <path d="M19 12H45V19Q45 27 36 32Q45 38 45 45V52H19V45Q19 38 28 32Q19 27 19 19Z" fill="#b8dce0" />
      <path d="M23 18H41Q41 25 32 29Q23 25 23 18ZM23 48Q25 41 32 37Q39 41 41 48Z" fill="#e6d4a0" stroke="none" />
      <path d="M32 30V38" stroke="#dfc287" />
      <rect x="15" y="7" width="34" height="7" rx="2" fill="#568caa" />
      <rect x="15" y="51" width="34" height="7" rx="2" fill="#568caa" />
    </g>; break;
    case 'trade': art = <>
      <g transform="translate(-1,-3) scale(.64)"><ResourceCardArt resource="wheat" embedded /></g>
      <g transform="translate(24,25) scale(.64)"><ResourceCardArt resource="brick" embedded /></g>
      <path d="M37 10L47 4V11Q62 18 54 33L49 29Q53 20 44 18V24Z" fill="#b6deeb" stroke="#477995" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M26 53L16 60V53Q1 46 9 31L14 35Q10 44 19 46V40Z" fill="#b6deeb" stroke="#477995" strokeWidth="1.5" strokeLinejoin="round" />
    </>; break;
    case 'bank': art = <g fill="#d5b784" stroke="#7f6846" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M5 22L32 6L59 22Z" fill="#e8d4ad" />
      <path d="M8 24H56V29H8ZM7 52H57V57H7ZM3 57H61V61H3Z" />
      {[12, 27, 42].map(x => <g key={x}><path d={`M${x} 29H${x + 9}V51H${x}Z`} /><path d={`M${x + 3} 31V49`} stroke="#f2dfb8" /></g>)}
      <circle cx="32" cy="17" r="5" fill="#fbefcf" />
      <path d="M34 14Q27 12 28 18Q29 22 34 19" fill="none" />
    </g>; break;
    case 'army': art = <g>
      <g transform="translate(-5,5) scale(.72)"><Pawn /></g>
      <g transform="translate(24,5) scale(.72)"><Pawn /></g>
      <g transform="translate(8,12) scale(.75)"><Pawn /></g>
    </g>; break;
    case 'longest-road': art = <g stroke="#41677d" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M4 44L18 20H46L60 44L53 48L42 28H22L11 48Z" fill="#aac4cd" />
      <path d="M8 40L15 44M12 33L19 37M16 26L23 30M28 21V27M36 21V27M43 28L49 25M47 35L53 32M51 42L57 39" fill="none" />
    </g>; break;
    case 'dice': art = <g stroke="#315876" strokeWidth="1.5">
      <rect x="3" y="6" width="31" height="33" rx="5" fill="#f5eedc" />
      <rect x="29" y="27" width="31" height="33" rx="5" fill="#d8e5e5" />
      {[[11,14],[26,14],[11,31],[26,31],[37,35],[45,44],[53,52]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="#315876" />)}
    </g>; break;
  }
  return <svg className={`game-artwork ${className}`} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">{art}</svg>;
}

export function ResourceCardArt({ resource, embedded = false }: { resource: Resource; embedded?: boolean }) {
  const token = RESOURCE_TOKENS[resource];
  const art = <>
    <rect x="11" y="3" width="42" height="56" rx="2" fill={token.cardBorder} stroke="#294653" strokeWidth="1.5" />
    <path d="M13 6H51M13 9H51" stroke="#f7e7b1" strokeWidth="1.2" />
    <rect x="14" y="12" width="36" height="44" rx="1" fill={token.color} stroke="#fff3ce" strokeOpacity=".6" />
    <path d="M15 13H49V29L15 54Z" fill="#fff" opacity=".12" />
    <g transform="translate(32,35) scale(.66)"><TerrainIllustration terrain={token.terrain} /></g>
  </>;
  return embedded ? <g>{art}</g> : <svg className="game-artwork resource-card-artwork" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">{art}</svg>;
}
