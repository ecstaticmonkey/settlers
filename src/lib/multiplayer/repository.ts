import 'server-only';
import { createAdminClient } from '../supabase/admin';
import type { GameState, PlayerColor } from '../catan/types';
import { MultiplayerError, type Room } from './types';

interface RoomRow {
  id: string; room_code: string; name: string; host_id: string; is_private: boolean;
  pass_code: string | null; max_players: number; turn_timer_seconds: number;
  status: Room['status']; created_at: string; updated_at: string; revision: number;
  players: { player_id: string; username: string; color: PlayerColor; is_host: boolean; is_ready: boolean; is_bot: boolean; bot_difficulty: 'easy' | 'medium'; seat_index: number }[];
  game?: { state_json: GameState } | null;
}

function decode(row: RoomRow): Room {
  return {
    id: row.id, code: row.room_code, name: row.name, hostId: row.host_id, isPrivate: row.is_private,
    maxPlayers: row.max_players, turnTimerSeconds: row.turn_timer_seconds, status: row.status,
    createdAt: Date.parse(row.created_at), updatedAt: Date.parse(row.updated_at), revision: row.revision,
    players: row.players.map(p => ({ id: p.player_id, name: p.username, color: p.color, isHost: p.is_host, isReady: p.is_ready, isBot: p.is_bot, ...(p.bot_difficulty ? { botDifficulty: p.bot_difficulty } : {}), seatIndex: p.seat_index })).sort((a, b) => a.seatIndex - b.seatIndex),
    ...(row.game?.state_json ? { gameState: row.game.state_json } : {}),
  };
}

function databaseError(error: { code?: string; message: string }): never {
  console.error('Multiplayer database error:', error.code, error.message);
  if (['42P01', '42703', 'PGRST202', 'PGRST204', 'PGRST205', 'PGRST200'].includes(error.code || '')) {
    throw new MultiplayerError('The multiplayer database migration is missing. Apply the Supabase migrations listed in README.md.', 503);
  }
  throw new MultiplayerError('Could not reach the multiplayer database. Please try again.', 503);
}

export async function listRooms(actorId: string): Promise<Room[]> {
  const db = createAdminClient();
  // Fetch only public lobby metadata, plus private tables the caller belongs to.
  const { data: memberships, error: membershipError } = await db.from('catan_room_players').select('room_id').eq('player_id', actorId);
  if (membershipError) databaseError(membershipError);
  const ids = memberships.map(p => p.room_id);
  const { data, error } = await db.from('catan_rooms').select('id,room_code,name,host_id,is_private,max_players,turn_timer_seconds,status,created_at,updated_at,revision,players:catan_room_players(*)')
    .neq('status', 'finished').or(ids.length ? `is_private.eq.false,id.in.(${ids.join(',')})` : 'is_private.eq.false').order('created_at', { ascending: false }).limit(100);
  if (error) databaseError(error);
  return (data as unknown as RoomRow[]).map(decode);
}

export async function loadRoom(idOrCode: string): Promise<{ room: Room; passcodeHash: string | null } | null> {
  const isId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(idOrCode);
  // Embedded relations are read in the same Postgres statement/snapshot.
  const { data, error } = await createAdminClient().from('catan_rooms').select('*,players:catan_room_players(*),game:catan_game_states(state_json)')
    .eq(isId ? 'id' : 'room_code', isId ? idOrCode : idOrCode.trim().toUpperCase()).maybeSingle();
  if (error) databaseError(error);
  if (!data) return null;
  const row = data as unknown as RoomRow;
  return { room: decode(row), passcodeHash: row.pass_code };
}

export async function saveRoom(room: Room, expectedRevision: number | null, passcodeHash?: string | null, action?: unknown): Promise<Room> {
  const { data, error } = await createAdminClient().rpc('catan_commit_room', {
    p_room: room, p_expected_revision: expectedRevision, p_passcode_hash: passcodeHash ?? null, p_action: action ?? null,
  });
  if (error) {
    if (error.code === '40001') throw new MultiplayerError('The table changed. Your view has refreshed; please try your move again.', 409);
    if (error.code === '23505' && expectedRevision === null) throw new MultiplayerError('Room code collision. Please create the room again.', 409);
    databaseError(error);
  }
  return { ...room, revision: data.revision, updatedAt: Date.parse(data.updated_at) };
}
