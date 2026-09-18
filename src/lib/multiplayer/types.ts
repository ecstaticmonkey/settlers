import type { GameState, PlayerColor } from '../catan/types';

export interface RoomPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium';
  seatIndex: number;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  isPrivate: boolean;
  maxPlayers: number;
  turnTimerSeconds: number;
  status: 'waiting' | 'in_progress' | 'finished';
  players: RoomPlayer[];
  createdAt: number;
  revision: number;
  updatedAt: number;
  gameState?: GameState;
}

export interface CreateRoomOptions {
  isPrivate?: boolean;
  passCode?: string;
  maxPlayers?: number;
  turnTimerSeconds?: number;
  color?: PlayerColor;
}

export class MultiplayerError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
