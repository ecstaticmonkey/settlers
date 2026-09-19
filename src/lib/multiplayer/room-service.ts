import type { GameState, GameAction } from '../catan/types';
import { MultiplayerError, type Room, type CreateRoomOptions } from './types';
export type { Room, RoomPlayer } from './types';

type Watch = {
  rooms: Set<(room: Room) => void>;
  states: Set<(state: GameState) => void>;
  errors: Set<(error: string | null) => void>;
  pings: Set<(pingMs: number) => void>;
  timer?: ReturnType<typeof setTimeout>;
  triggerFastPoll: (delayMs?: number) => void;
  stop: () => void;
};

// Room data always comes from the shared backend. Local storage is used only by
// the UI for display preferences and the last visited room ID.
export class RoomService {
  private session: Promise<{ id: string }> | null = null;
  private cache = new Map<string, Room>();
  private watches = new Map<string, Watch>();
  private currentPing = 35;

  private recordPing(pingMs: number) {
    this.currentPing = pingMs;
    this.watches.forEach(w => w.pings.forEach(cb => cb(pingMs)));
  }

  public getPing(): number {
    return this.currentPing;
  }

  private async request<T>(path = '', body?: unknown): Promise<T> {
    const start = performance.now();
    const response = await fetch(`/api/multiplayer${path}`, {
      method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin', keepalive: true,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(6000),
    });
    const duration = Math.round(performance.now() - start);
    this.recordPing(Math.max(8, duration));
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new MultiplayerError(result.error || 'Could not connect to the table. Please try again.', response.status);
    return result as T;
  }

  public getSession(): Promise<{ id: string }> {
    if (!this.session) this.session = this.request<{ id: string }>('?session=1').catch(error => { this.session = null; throw error; });
    return this.session;
  }

  private accept(room: Room): Room {
    const current = this.cache.get(room.id);
    if (current && current.revision >= room.revision) return current;
    this.cache.set(room.id, room);
    const watch = this.watches.get(room.id);
    watch?.rooms.forEach(cb => cb(room));
    if (room.gameState) watch?.states.forEach(cb => cb(room.gameState!));
    return room;
  }

  private async mutate(operation: string, body: Record<string, unknown>): Promise<Room> {
    await this.getSession();
    try {
      const { room } = await this.request<{ room: Room }>('', { ...body, operation });
      return this.accept(room);
    } catch (error) {
      if (error instanceof MultiplayerError && error.status === 409 && typeof body.roomId === 'string') {
        await this.getRoom(body.roomId).catch(() => null);
      }
      throw error;
    }
  }

  public async getRooms(): Promise<Room[]> {
    await this.getSession();
    // Lobby summaries omit game snapshots; never put them in the room cache.
    return (await this.request<{ rooms: Room[] }>()).rooms;
  }

  public async getRoom(roomId: string, since?: number): Promise<Room | null> {
    await this.getSession();
    const query = since !== undefined ? `?room=${encodeURIComponent(roomId)}&since=${since}` : `?room=${encodeURIComponent(roomId)}`;
    try {
      const res = await this.request<{ room?: Room; unmodified?: boolean; revision?: number }>(query);
      if (res.unmodified) {
        return this.cache.get(roomId) ?? null;
      }
      if (!res.room) return null;
      return this.accept(res.room);
    } catch (error) {
      if (error instanceof MultiplayerError && error.status === 404) return null;
      throw error;
    }
  }

  public createRoom(name: string, player: { id: string; name: string }, options: CreateRoomOptions = {}) {
    return this.mutate('create', { name, playerName: player.name, options });
  }
  public joinRoom(roomId: string, player: { id: string; name: string }, passCode?: string) {
    return this.mutate('join', { roomId: roomId.trim(), playerName: player.name, passCode });
  }
  public addBot(roomId: string, difficulty: 'easy' | 'medium' = 'medium') { return this.mutate('addBot', { roomId, difficulty }); }
  public removePlayer(roomId: string, playerId: string) { return this.mutate('removePlayer', { roomId, playerId }); }
  public toggleReady(roomId: string) { return this.mutate('ready', { roomId }); }
  public async startGame(roomId: string) {
    const room = await this.mutate('start', { roomId });
    return { room, gameState: room.gameState! };
  }

  public async dispatchAction(roomId: string, action: GameAction): Promise<GameState> {
    const current = this.cache.get(roomId) ?? await this.getRoom(roomId);
    if (!current) throw new Error('Room not found');
    const room = await this.mutate('action', { roomId, action, revision: current.revision });
    const nextState = room.gameState!;

    // Snappy responsiveness: If the next active player is a bot, trigger immediate tick!
    const activePlayer = nextState.players[nextState.activePlayerIndex];
    if (activePlayer?.isBot && room.status === 'in_progress') {
      const watch = this.watches.get(roomId);
      watch?.triggerFastPoll(180);
    }

    return nextState;
  }

  private watch(roomId: string): Watch {
    const existing = this.watches.get(roomId);
    if (existing) return existing;
    let active = true, pending = false;
    const watch: Watch = {
      rooms: new Set(),
      states: new Set(),
      errors: new Set(),
      pings: new Set(),
      triggerFastPoll: () => {},
      stop: () => {},
    };
    this.watches.set(roomId, watch);

    const poll = async () => {
      if (!active || pending) return;
      if (watch.timer) clearTimeout(watch.timer);
      pending = true;
      let nextInterval = 850;

      try {
        const cachedRev = this.cache.get(roomId)?.revision;
        const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
        const room = await this.getRoom(roomId, cachedRev);
        if (!room) throw new Error('This table no longer exists. Return to the lobby.');
        if (!active) return;
        watch.errors.forEach(cb => cb(null));

        if (isHidden) {
          nextInterval = 4000;
        } else if (room.status === 'in_progress') {
          const activePlayer = room.gameState?.players[room.gameState.activePlayerIndex];
          const hasBots = room.players.some(p => p.isBot);
          const botNeedsAction =
            hasBots &&
            (activePlayer?.isBot ||
              (room.gameState?.phase === 'TURN_ROBBER_DISCARD' &&
                room.gameState.players.some(p => p.isBot && p.discardRequired > 0 && !p.hasDiscarded)));

          if (botNeedsAction) {
            nextInterval = 450;
            const session = await this.getSession().catch(() => null);
            const isHost = session ? room.hostId === session.id : true;
            if (isHost || Date.now() - room.updatedAt > 3000) {
              await this.mutate('tick', { roomId, revision: room.revision }).catch(error => {
                if (!(error instanceof MultiplayerError) || error.status !== 409) throw error;
              });
            }
          } else if (room.gameState?.phase === 'TURN_ROBBER_DISCARD') {
            nextInterval = 500;
          } else {
            // Normal human turn: 800ms for smooth multiplayer sync
            nextInterval = 800;
          }
        } else if (room.status === 'waiting') {
          nextInterval = 1000;
        } else {
          nextInterval = 2000;
        }
      } catch (error) {
        if (active) watch.errors.forEach(cb => cb(error instanceof Error ? error.message : 'Connection lost. Reconnecting…'));
        nextInterval = 1500;
      } finally {
        pending = false;
        if (active) watch.timer = setTimeout(() => void poll(), nextInterval);
      }
    };

    watch.triggerFastPoll = (delayMs = 150) => {
      if (!active) return;
      if (watch.timer) clearTimeout(watch.timer);
      watch.timer = setTimeout(() => void poll(), delayMs);
    };

    const wake = () => { if (document.visibilityState === 'visible') void poll(); };
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
    watch.stop = () => {
      active = false;
      clearTimeout(watch.timer);
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
    };
    void poll();
    return watch;
  }

  private release(roomId: string) {
    const watch = this.watches.get(roomId);
    if (watch && !watch.rooms.size && !watch.states.size && !watch.errors.size && !watch.pings.size) {
      watch.stop(); this.watches.delete(roomId); this.cache.delete(roomId);
    }
  }
  public subscribeToRoom(roomId: string, callback: (room: Room) => void): () => void {
    this.watch(roomId).rooms.add(callback);
    return () => { this.watches.get(roomId)?.rooms.delete(callback); this.release(roomId); };
  }
  public subscribeToGameState(roomId: string, callback: (state: GameState) => void): () => void {
    this.watch(roomId).states.add(callback);
    const cached = this.cache.get(roomId)?.gameState;
    if (cached) callback(cached);
    return () => { this.watches.get(roomId)?.states.delete(callback); this.release(roomId); };
  }
  public subscribeToConnection(roomId: string, callback: (error: string | null) => void): () => void {
    this.watch(roomId).errors.add(callback);
    return () => { this.watches.get(roomId)?.errors.delete(callback); this.release(roomId); };
  }
  public subscribeToPing(roomId: string, callback: (pingMs: number) => void): () => void {
    const w = this.watch(roomId);
    w.pings.add(callback);
    callback(this.currentPing);
    return () => { this.watches.get(roomId)?.pings.delete(callback); this.release(roomId); };
  }
}

export const roomService = new RoomService();
