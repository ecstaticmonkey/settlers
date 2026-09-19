import { HexTerrain, PlayerColor, Resource } from './types';

export interface TerrainToken {
  id: HexTerrain;
  label: string;
  resource: Resource | null;
  /** Primary 3D hex terrain surface color */
  color3D: string;
  /** 2D top-down flat hex fill color */
  fill2D: string;
  /** 2D bevel shade color */
  shade2D: string;
  /** 2D illustration outline & accent color */
  ink2D: string;
  /** CIELAB L* lightness */
  lightness: number;
}

export interface ResourceToken {
  id: Resource;
  label: string;
  terrain: HexTerrain;
  /** Primary accent color */
  color: string;
  /** Hand card border accent */
  cardBorder: string;
  /** Hand card badge background */
  cardBadgeBg: string;
  /** Hand card badge text color */
  cardBadgeText: string;
  /** Bank card supply chip background */
  bankBg: string;
  /** Representative emoji */
  emoji: string;
}

export interface PlayerToken {
  color: PlayerColor;
  fill: string;
  stroke: string;
}

/**
 * Authoritative single source of truth for all CATAN terrain colors.
 * Calibrated for vibrant, sunny Catan brightness while remaining slightly deeper
 * than raw defaults so wheat and sheep stay clearly distinguishable.
 */
export const TERRAIN_TOKENS: Record<HexTerrain, TerrainToken> = {
  forest: {
    id: 'forest',
    label: 'Forest (Lumber)',
    resource: 'wood',
    color3D: '#15803d',
    fill2D: '#16a34a',
    shade2D: '#15803d',
    ink2D: '#14532d',
    lightness: 46.9,
  },
  pasture: {
    id: 'pasture',
    label: 'Pasture (Wool)',
    resource: 'sheep',
    color3D: '#65a30d',
    fill2D: '#70b314',
    shade2D: '#4d7c0f',
    ink2D: '#284206',
    lightness: 60.8,
  },
  fields: {
    id: 'fields',
    label: 'Fields (Grain)',
    resource: 'wheat',
    color3D: '#f59e0b',
    fill2D: '#fbbf24',
    shade2D: '#d97706',
    ink2D: '#78350f',
    lightness: 72.2,
  },
  hills: {
    id: 'hills',
    label: 'Hills (Brick)',
    resource: 'brick',
    color3D: '#ea580c',
    fill2D: '#f97316',
    shade2D: '#c2410c',
    ink2D: '#7c2d12',
    lightness: 56.6,
  },
  mountains: {
    id: 'mountains',
    label: 'Mountains (Ore)',
    resource: 'ore',
    color3D: '#64748b',
    fill2D: '#78889b',
    shade2D: '#475569',
    ink2D: '#1e293b',
    lightness: 48.3,
  },
  desert: {
    id: 'desert',
    label: 'Desert',
    resource: null,
    color3D: '#fde68a',
    fill2D: '#fef08a',
    shade2D: '#fcd34d',
    ink2D: '#854d0e',
    lightness: 91.4,
  },
};

/**
 * Authoritative single source of truth for resource card and UI colors.
 */
export const RESOURCE_TOKENS: Record<Resource, ResourceToken> = {
  wood: {
    id: 'wood',
    label: 'Wood',
    terrain: 'forest',
    color: '#15803d',
    cardBorder: '#16a34a',
    cardBadgeBg: '#14532d',
    cardBadgeText: '#f0fdf4',
    bankBg: '#15803d',
    emoji: '🌲',
  },
  brick: {
    id: 'brick',
    label: 'Brick',
    terrain: 'hills',
    color: '#ea580c',
    cardBorder: '#f97316',
    cardBadgeBg: '#7c2d12',
    cardBadgeText: '#fff7ed',
    bankBg: '#ea580c',
    emoji: '🧱',
  },
  sheep: {
    id: 'sheep',
    label: 'Sheep',
    terrain: 'pasture',
    color: '#65a30d',
    cardBorder: '#84cc16',
    cardBadgeBg: '#365314',
    cardBadgeText: '#f7fee7',
    bankBg: '#65a30d',
    emoji: '🐑',
  },
  wheat: {
    id: 'wheat',
    label: 'Wheat',
    terrain: 'fields',
    color: '#f59e0b',
    cardBorder: '#fbbf24',
    cardBadgeBg: '#78350f',
    cardBadgeText: '#fffbeb',
    bankBg: '#f59e0b',
    emoji: '🌾',
  },
  ore: {
    id: 'ore',
    label: 'Ore',
    terrain: 'mountains',
    color: '#64748b',
    cardBorder: '#94a3b8',
    cardBadgeBg: '#1e293b',
    cardBadgeText: '#f8fafc',
    bankBg: '#64748b',
    emoji: '🪨',
  },
};

/**
 * Authoritative single source of truth for player piece colors.
 */
export const PLAYER_TOKENS: Record<PlayerColor, PlayerToken> = {
  red: { color: 'red', fill: '#dc2626', stroke: '#991b1b' },
  blue: { color: 'blue', fill: '#2563eb', stroke: '#1d4ed8' },
  orange: { color: 'orange', fill: '#ea580c', stroke: '#c2410c' },
  white: { color: 'white', fill: '#f8fafc', stroke: '#64748b' },
  green: { color: 'green', fill: '#16a34a', stroke: '#15803d' },
};
