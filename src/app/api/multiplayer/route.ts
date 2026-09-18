import { NextRequest, NextResponse } from 'next/server';
import { listRooms, loadRoom, saveRoom } from '@/lib/multiplayer/repository';
import { hashPasscode, newSession, readSession, requirePlayer, SESSION_COOKIE, SESSION_SECONDS, verifyPasscode } from '@/lib/multiplayer/session';
import { MultiplayerError, type CreateRoomOptions } from '@/lib/multiplayer/types';
import { integer, object, parseAction, text } from '@/lib/multiplayer/validation';
import * as rules from '@/lib/multiplayer/rules';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } });
function failure(error: unknown) {
  if (error instanceof MultiplayerError) return json({ error: error.message }, error.status);
  console.error('Multiplayer request failed:', error);
  return json({ error: 'The multiplayer request failed. Please try again.' }, 500);
}

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get('session') === '1') {
      const existing = readSession(request.cookies.get(SESSION_COOKIE)?.value);
      if (existing) return json({ id: existing });
      const session = newSession();
      const response = json({ id: session.id });
      response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS });
      return response;
    }
    const actorId = requirePlayer(request);
    const key = request.nextUrl.searchParams.get('room');
    if (!key) return json({ rooms: await listRooms(actorId) });
    const loaded = await loadRoom(text(key, 'room code'));
    if (!loaded) throw new MultiplayerError('Room not found', 404);
    rules.member(loaded.room, actorId);
    return json({ room: loaded.room });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if ((origin && new URL(origin).host !== request.headers.get('host')) || request.headers.get('sec-fetch-site') === 'cross-site') throw new MultiplayerError('Cross-site requests are not allowed', 403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new MultiplayerError('Expected a JSON request', 415);
    const actorId = requirePlayer(request);
    const raw = await request.text();
    if (raw.length > 16000) throw new MultiplayerError('Request too large', 413);
    let body: Record<string, unknown>;
    try { body = object(JSON.parse(raw)); } catch { throw new MultiplayerError('Invalid JSON request'); }
    const operation = text(body.operation, 'operation');
    if (operation === 'create') {
      const options = object(body.options ?? {});
      if (options.color !== undefined && !rules.COLORS.includes(options.color as never)) throw new MultiplayerError('Invalid player color');
      if (options.isPrivate !== undefined && typeof options.isPrivate !== 'boolean') throw new MultiplayerError('Invalid room privacy');
      const passcode = options.isPrivate ? text(options.passCode, 'room passcode', 128) : null;
      const settings: CreateRoomOptions = { maxPlayers: integer(options.maxPlayers ?? 4, 2, 4), turnTimerSeconds: integer(options.turnTimerSeconds ?? 60, 30, 120), color: options.color as CreateRoomOptions['color'], isPrivate: !!options.isPrivate };
      const room = rules.newRoom(text(body.name, 'room name', 30), actorId, text(body.playerName, 'player name', 20), settings);
      return json({ room: await saveRoom(room, null, passcode ? hashPasscode(passcode) : null) });
    }
    const key = text(body.roomId, 'room code');
    // Lobby mutations may safely retry against the latest roster. Game moves never
    // replay on another revision (which could represent another player's turn).
    for (let attempt = 0; attempt < 4; attempt++) {
      const loaded = await loadRoom(key);
      if (!loaded) throw new MultiplayerError('Room not found', 404);
      const { room, passcodeHash } = loaded;
      const revision = room.revision;
      let action: unknown;
      switch (operation) {
        case 'join':
          if (!room.players.some(p => p.id === actorId) && room.isPrivate && (!passcodeHash || !verifyPasscode(typeof body.passCode === 'string' ? body.passCode.slice(0, 128) : '', passcodeHash))) throw new MultiplayerError('This room requires the correct passcode', 403);
          rules.join(room, actorId, text(body.playerName, 'player name', 20));
          break;
        case 'addBot':
          if (body.difficulty !== 'easy' && body.difficulty !== 'medium') throw new MultiplayerError('Invalid bot difficulty');
          rules.addBot(room, actorId, body.difficulty); break;
        case 'removePlayer': rules.removePlayer(room, actorId, text(body.playerId, 'player')); break;
        case 'ready': rules.toggleReady(room, actorId); break;
        case 'start': rules.startGame(room, actorId); break;
        case 'action':
          rules.member(room, actorId);
          if (integer(body.revision, 0, Number.MAX_SAFE_INTEGER) !== revision) throw new MultiplayerError('The table changed. Your view has refreshed; please try your move again.', 409);
          action = parseAction(body.action);
          rules.applyAction(room, actorId, action as ReturnType<typeof parseAction>); break;
        case 'tick':
          rules.member(room, actorId);
          if (body.revision !== revision) return json({ room });
          action = rules.tickBot(room, actorId);
          if (!action) return json({ room });
          break;
        default: throw new MultiplayerError('Unknown room operation');
      }
      try { return json({ room: await saveRoom(room, revision, undefined, action) }); }
      catch (error) {
        if (!(error instanceof MultiplayerError) || error.status !== 409 || operation === 'action' || operation === 'tick' || attempt === 3) throw error;
      }
    }
    throw new MultiplayerError('The table is busy. Please try again.', 409);
  } catch (error) { return failure(error); }
}
