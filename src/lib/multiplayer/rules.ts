import { randomInt, randomUUID } from 'node:crypto';
import type { GameAction, PlayerColor } from '../catan/types';
import { createInitialGameState, createInitialPlayer, processGameAction } from '../catan/engine';
import { getBotAction } from '../catan/bot';
import { DICE_ROLL_DURATION_MS } from '../catan/presentation';
import { MultiplayerError, type Room, type RoomPlayer, type CreateRoomOptions } from './types';

export const COLORS: PlayerColor[] = ['red', 'blue', 'orange', 'white', 'green'];
export function newRoom(name: string, actorId: string, playerName: string, options: CreateRoomOptions): Room {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return {
    id: randomUUID(), code: Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''),
    name, hostId: actorId, isPrivate: !!options.isPrivate, maxPlayers: options.maxPlayers ?? 4,
    turnTimerSeconds: options.turnTimerSeconds ?? 60, status: 'waiting', createdAt: Date.now(), updatedAt: Date.now(), revision: 0,
    players: [{ id: actorId, name: playerName, color: options.color ?? 'red', isHost: true, isReady: true, isBot: false, seatIndex: 0 }],
  };
}

export function member(room: Room, actorId: string): RoomPlayer {
  const player = room.players.find(p => p.id === actorId && !p.isBot);
  if (!player) throw new MultiplayerError('You are no longer in this room. Join it again from the lobby.', 403);
  return player;
}

function host(room: Room, actorId: string) {
  member(room, actorId);
  if (room.hostId !== actorId) throw new MultiplayerError('Only the host can do that', 403);
}

function waiting(room: Room) {
  if (room.status !== 'waiting') throw new MultiplayerError('Game already started');
}

function addPlayer(room: Room, player: Omit<RoomPlayer, 'color' | 'seatIndex'>, color?: PlayerColor) {
  waiting(room);
  if (room.players.length >= room.maxPlayers) throw new MultiplayerError('Room is full');
  const available = COLORS.filter(c => !room.players.some(p => p.color === c));
  room.players.push({ ...player, color: color && available.includes(color) ? color : available[0], seatIndex: room.players.length });
}

export function join(room: Room, actorId: string, name: string, color?: PlayerColor) {
  if (room.players.some(p => p.id === actorId && !p.isBot)) return;
  addPlayer(room, { id: actorId, name, isHost: false, isReady: false, isBot: false }, color);
}

export function addBot(room: Room, actorId: string, difficulty: 'easy' | 'medium') {
  host(room, actorId);
  const names = ['RoboTrader', 'HexMaster', 'SettlerBot', 'IslandAI'];
  addPlayer(room, { id: `bot-${randomUUID()}`, name: `${names[room.players.filter(p => p.isBot).length % names.length]} (Bot)`, isHost: false, isReady: true, isBot: true, botDifficulty: difficulty });
}

export function removePlayer(room: Room, actorId: string, playerId: string) {
  member(room, actorId);
  if (actorId !== playerId) { host(room, actorId); waiting(room); }
  // Leaving a running game only disconnects this browser; retain the seat for rejoin.
  if (room.status !== 'waiting') return;
  room.players = room.players.filter(p => p.id !== playerId);
  room.players.forEach((p, i) => { p.seatIndex = i; });
  const humans = room.players.filter(p => !p.isBot);
  if (!humans.length) room.status = 'finished';
  else if (room.hostId === playerId) {
    room.hostId = humans[0].id;
    room.players.forEach(p => { p.isHost = p.id === room.hostId; });
    humans[0].isReady = true;
  }
}

export function toggleReady(room: Room, actorId: string) {
  waiting(room);
  const player = member(room, actorId);
  if (!player.isHost) player.isReady = !player.isReady;
}

export function startGame(room: Room, actorId: string) {
  host(room, actorId); waiting(room);
  if (room.players.length < 2) throw new MultiplayerError('Need at least 2 players to start');
  if (room.players.some(p => !p.isReady && !p.isHost)) throw new MultiplayerError('All players must be ready');
  room.gameState = createInitialGameState(room.id, room.players.map(p => createInitialPlayer(p.id, p.name, p.color, p.isBot, p.botDifficulty)), false);
  room.gameState.turnTimeLimitSeconds = room.turnTimerSeconds;
  room.gameState.turnTimeRemainingSeconds = room.turnTimerSeconds;
  room.status = 'in_progress';
}

export function applyAction(room: Room, actorId: string, action: GameAction, bot = false) {
  if (!bot) member(room, actorId);
  const state = room.gameState;
  if (!state || room.status !== 'in_progress') throw new MultiplayerError('Active game not found');
  if (action.type === 'DISCARD_RESOURCES' || action.type === 'RESPOND_TRADE_OFFER') {
    if (action.playerId !== actorId) throw new MultiplayerError('You can only act for your own player', 403);
    if (action.type === 'RESPOND_TRADE_OFFER' && state.activeTradeOffer?.fromPlayerId === actorId) throw new MultiplayerError('You cannot respond to your own trade');
  } else if (state.players[state.activePlayerIndex].id !== actorId) {
    throw new MultiplayerError('It is not your turn', 403);
  }
  if (action.type === 'CONFIRM_TRADE_OFFER' && state.activeTradeOffer?.responses[action.targetPlayerId] !== 'accept') throw new MultiplayerError('That player has not accepted the trade');
  const result = processGameAction(state, action);
  if (result.error) throw new MultiplayerError(result.error);
  room.gameState = result.state;
  if (result.state.phase === 'GAME_OVER') room.status = 'finished';
}

// Any connected member may request a tick. Only the server selects the bot action.
// The database revision check makes concurrent requests commit at most one move.
export function tickBot(room: Room, actorId: string): GameAction | null {
  member(room, actorId);
  if (!room.gameState || room.status !== 'in_progress') return null;
  if (Date.now() - room.updatedAt < 1000) return null;
  const lastRoll = room.gameState.logs.findLast(log => log.type === 'dice');
  if (lastRoll && Date.now() - lastRoll.timestamp < DICE_ROLL_DURATION_MS + 250) return null;
  const action = getBotAction(room.gameState);
  if (!action) return null;
  const botId = 'playerId' in action ? action.playerId : room.gameState.players[room.gameState.activePlayerIndex].id;
  if (!room.gameState.players.some(p => p.id === botId && p.isBot)) throw new MultiplayerError('Invalid bot action');
  applyAction(room, botId, action, true);
  return action;
}
