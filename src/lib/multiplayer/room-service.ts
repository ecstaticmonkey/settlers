import { GameState, GameAction, PlayerColor } from '../catan/types';
import { createInitialGameState, createInitialPlayer, processGameAction } from '../catan/engine';
import { getBotAction } from '../catan/bot';
import { DICE_ROLL_DURATION_MS } from '../catan/presentation';

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
  passCode?: string;
  maxPlayers: number;
  turnTimerSeconds: number;
  status: 'waiting' | 'in_progress' | 'finished';
  players: RoomPlayer[];
  createdAt: number;
  gameState?: GameState;
}

const AVAILABLE_COLORS: PlayerColor[] = ['red', 'blue', 'orange', 'white', 'green'];
const STORAGE_KEY = 'catan_rooms_data';

// Helper to get rooms from local storage cache
function getLocalRooms(): Record<string, Room> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRooms(rooms: Record<string, Room>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {}
}

export class RoomService {
  private static instance: RoomService;
  private broadcastChannels = new Map<string, BroadcastChannel>();
  private roomListeners = new Map<string, Set<(room: Room) => void>>();
  private stateListeners = new Map<string, Set<(state: GameState) => void>>();
  private botLoops = new Map<string, NodeJS.Timeout>();

  private constructor() {}

  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  // Generate 6-letter room code
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Get active rooms list
  public async getRooms(): Promise<Room[]> {
    const local = getLocalRooms();
    return Object.values(local).filter((r) => r.status !== 'finished');
  }

  // Get a single room by ID or Code
  public async getRoom(roomIdOrCode: string): Promise<Room | null> {
    const local = getLocalRooms();
    const found =
      local[roomIdOrCode] ||
      Object.values(local).find((r) => r.code.toUpperCase() === roomIdOrCode.toUpperCase());
    return found || null;
  }

  // Create a new room
  public async createRoom(
    name: string,
    hostPlayer: { id: string; name: string },
    options: {
      isPrivate?: boolean;
      passCode?: string;
      maxPlayers?: number;
      turnTimerSeconds?: number;
      color?: PlayerColor;
    } = {}
  ): Promise<Room> {
    const id = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const code = this.generateCode();
    const color = options.color || 'red';

    const player: RoomPlayer = {
      id: hostPlayer.id,
      name: hostPlayer.name,
      color,
      isHost: true,
      isReady: true,
      isBot: false,
      seatIndex: 0,
    };

    const room: Room = {
      id,
      code,
      name,
      hostId: hostPlayer.id,
      isPrivate: !!options.isPrivate,
      passCode: options.passCode,
      maxPlayers: options.maxPlayers || 4,
      turnTimerSeconds: options.turnTimerSeconds || 60,
      status: 'waiting',
      players: [player],
      createdAt: Date.now(),
    };

    const rooms = getLocalRooms();
    rooms[id] = room;
    saveLocalRooms(rooms);
    this.broadcastRoom(room);

    return room;
  }

  // Join existing room
  public async joinRoom(
    roomId: string,
    player: { id: string; name: string },
    color?: PlayerColor
  ): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const existingIndex = room.players.findIndex((p) => p.id === player.id);
    if (existingIndex !== -1) {
      // Restore a player's existing local table, including active games.
      if (room.status === 'in_progress') this.ensureBotTurnRunner(room.id);
      return room;
    }

    if (room.status !== 'waiting') throw new Error('Game already started');

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    // Pick first unused color
    const usedColors = new Set(room.players.map((p) => p.color));
    const assignedColor = color && !usedColors.has(color)
      ? color
      : AVAILABLE_COLORS.find((c) => !usedColors.has(c)) || 'orange';

    const newPlayer: RoomPlayer = {
      id: player.id,
      name: player.name,
      color: assignedColor,
      isHost: false,
      isReady: false,
      isBot: false,
      seatIndex: room.players.length,
    };

    room.players.push(newPlayer);
    const rooms = getLocalRooms();
    rooms[room.id] = room;
    saveLocalRooms(rooms);
    this.broadcastRoom(room);

    return room;
  }

  // Add Bot to room
  public async addBot(roomId: string, difficulty: 'easy' | 'medium' = 'medium'): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (room.players.length >= room.maxPlayers) throw new Error('Room is full');

    const usedColors = new Set(room.players.map((p) => p.color));
    const botColor = AVAILABLE_COLORS.find((c) => !usedColors.has(c)) || 'blue';
    const botIndex = room.players.filter((p) => p.isBot).length + 1;

    const botNames = ['RoboTrader', 'HexMaster', 'SettlerBot', 'IslandAI'];
    const botName = `${botNames[botIndex % botNames.length]} (Bot)`;

    const botPlayer: RoomPlayer = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: botName,
      color: botColor,
      isHost: false,
      isReady: true,
      isBot: true,
      botDifficulty: difficulty,
      seatIndex: room.players.length,
    };

    room.players.push(botPlayer);
    const rooms = getLocalRooms();
    rooms[room.id] = room;
    saveLocalRooms(rooms);
    this.broadcastRoom(room);

    return room;
  }

  // Remove player or bot from room
  public async removePlayer(roomId: string, playerId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    room.players = room.players.filter((p) => p.id !== playerId);
    // Re-index seats
    room.players.forEach((p, idx) => {
      p.seatIndex = idx;
    });

    const rooms = getLocalRooms();
    rooms[room.id] = room;
    saveLocalRooms(rooms);
    this.broadcastRoom(room);

    return room;
  }

  // Toggle ready status
  public async toggleReady(roomId: string, playerId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.isReady = !player.isReady;
      const rooms = getLocalRooms();
      rooms[room.id] = room;
      saveLocalRooms(rooms);
      this.broadcastRoom(room);
    }
    return room;
  }

  // Start the Game
  public async startGame(roomId: string): Promise<{ room: Room; gameState: GameState }> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (room.players.length < 2) throw new Error('Need at least 2 players to start');

    // Create Catan players from Room players
    const catanPlayers = room.players.map((rp) =>
      createInitialPlayer(rp.id, rp.name, rp.color, rp.isBot, rp.botDifficulty)
    );

    const gameState = createInitialGameState(room.id, catanPlayers, false);
    gameState.turnTimeLimitSeconds = room.turnTimerSeconds;
    gameState.turnTimeRemainingSeconds = room.turnTimerSeconds;

    room.status = 'in_progress';
    room.gameState = gameState;

    const rooms = getLocalRooms();
    rooms[room.id] = room;
    saveLocalRooms(rooms);

    this.broadcastRoom(room);
    this.broadcastGameState(room.id, gameState);

    // Start Host Bot Automation loop
    this.ensureBotTurnRunner(room.id);

    return { room, gameState };
  }

  // Dispatch game action
  public async dispatchAction(roomId: string, action: GameAction): Promise<GameState> {
    const room = await this.getRoom(roomId);
    if (!room || !room.gameState) throw new Error('Active game not found');

    const { state: nextState, error } = processGameAction(room.gameState, action);
    if (error) {
      throw new Error(error);
    }

    room.gameState = nextState;
    if (nextState.phase === 'GAME_OVER') {
      room.status = 'finished';
    }

    const rooms = getLocalRooms();
    rooms[room.id] = room;
    saveLocalRooms(rooms);

    this.broadcastGameState(room.id, nextState);
    this.ensureBotTurnRunner(room.id);

    return nextState;
  }

  // Bot Turn Automation runner
  private ensureBotTurnRunner(roomId: string) {
    if (this.botLoops.has(roomId)) return;

    const interval = setInterval(async () => {
      const room = await this.getRoom(roomId);
      if (!room || !room.gameState || room.status !== 'in_progress') {
        clearInterval(interval);
        this.botLoops.delete(roomId);
        return;
      }

      // Check if any bot action is pending
      const lastRoll = room.gameState.logs.findLast(log => log.type === 'dice');
      if (lastRoll && Date.now() - lastRoll.timestamp < DICE_ROLL_DURATION_MS + 250) return;
      const botAction = getBotAction(room.gameState);
      if (botAction) {
        try {
          await this.dispatchAction(roomId, botAction);
        } catch (err) {
          console.warn('Bot action error:', err);
        }
      }
    }, 1200);

    this.botLoops.set(roomId, interval);
  }

  // Channel Broadcasting (Realtime & Local)
  private getChannel(roomId: string): BroadcastChannel | null {
    if (typeof window === 'undefined') return null;
    if (!this.broadcastChannels.has(roomId)) {
      const ch = new BroadcastChannel(`catan_channel_${roomId}`);
      ch.onmessage = (event) => {
        if (event.data?.type === 'ROOM_UPDATE') {
          this.notifyRoomListeners(roomId, event.data.room);
        } else if (event.data?.type === 'STATE_UPDATE') {
          this.notifyStateListeners(roomId, event.data.gameState);
        }
      };
      this.broadcastChannels.set(roomId, ch);
    }
    return this.broadcastChannels.get(roomId)!;
  }

  private broadcastRoom(room: Room) {
    const ch = this.getChannel(room.id);
    ch?.postMessage({ type: 'ROOM_UPDATE', room });
    this.notifyRoomListeners(room.id, room);
  }

  private broadcastGameState(roomId: string, gameState: GameState) {
    const ch = this.getChannel(roomId);
    ch?.postMessage({ type: 'STATE_UPDATE', gameState });
    this.notifyStateListeners(roomId, gameState);
  }

  private notifyRoomListeners(roomId: string, room: Room) {
    this.roomListeners.get(roomId)?.forEach((cb) => cb(room));
  }

  private notifyStateListeners(roomId: string, state: GameState) {
    this.stateListeners.get(roomId)?.forEach((cb) => cb(state));
  }

  // Subscription methods for React hooks
  public subscribeToRoom(roomId: string, callback: (room: Room) => void): () => void {
    if (!this.roomListeners.has(roomId)) {
      this.roomListeners.set(roomId, new Set());
    }
    this.roomListeners.get(roomId)!.add(callback);
    this.getChannel(roomId); // Ensure channel active

    return () => {
      this.roomListeners.get(roomId)?.delete(callback);
    };
  }

  public subscribeToGameState(roomId: string, callback: (state: GameState) => void): () => void {
    if (!this.stateListeners.has(roomId)) {
      this.stateListeners.set(roomId, new Set());
    }
    this.stateListeners.get(roomId)!.add(callback);
    this.getChannel(roomId); // Ensure channel active

    return () => {
      this.stateListeners.get(roomId)?.delete(callback);
    };
  }
}

export const roomService = RoomService.getInstance();
