import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/multiplayer/route';
import type { Room } from '../src/lib/multiplayer/types';
import type { GameAction } from '../src/lib/catan/types';
import { getBotAction } from '../src/lib/catan/bot';
import { parseAction } from '../src/lib/multiplayer/validation';
import { testDatabase } from './helpers/database';
import { readFile } from 'node:fs/promises';

let database: Awaited<ReturnType<typeof testDatabase>>;
const originalFetch = globalThis.fetch;
before(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.test';
  process.env.SUPABASE_SECRET_KEY = 'test-server-key';
  database = await testDatabase();
  globalThis.fetch = database.fetchDatabase;
});
after(async () => { globalThis.fetch = originalFetch; await database.db.close(); });

class Browser {
  cookie = '';
  id = '';
  async request(body?: Record<string, unknown>, query = '') {
    const request = new NextRequest(`https://game.test/api/multiplayer${query}`, {
      method: body ? 'POST' : 'GET',
      headers: { host: 'game.test', origin: 'https://game.test', cookie: this.cookie, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const response = await (body ? POST(request) : GET(request));
    const cookie = response.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0];
    return { status: response.status, data: await response.json(), response };
  }
  async session() {
    const result = await this.request(undefined, '?session=1');
    assert.equal(result.status, 200, JSON.stringify(result.data));
    this.id = result.data.id;
    return this;
  }
  async mutate(operation: string, body: Record<string, unknown>, status = 200): Promise<Room> {
    const result = await this.request({ operation, ...body });
    assert.equal(result.status, status, JSON.stringify(result.data));
    return result.data.room;
  }
  async room(id: string): Promise<Room> {
    const result = await this.request(undefined, `?room=${id}`);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    return result.data.room;
  }
  async move(room: Room, action: GameAction, status = 200) {
    return this.mutate('action', { roomId: room.id, revision: room.revision, action }, status);
  }
}
async function twoPlayers() {
  const host = await new Browser().session(), guest = await new Browser().session();
  let room = await host.mutate('create', { name: 'Integration table', playerName: 'Host', options: { maxPlayers: 2 } });
  room = await guest.mutate('join', { roomId: ` ${room.code.toLowerCase()} `, playerName: 'Guest' });
  return { host, guest, room };
}
function chooseMove(room: Room) {
  const planningState = structuredClone(room.gameState!);
  planningState.players.forEach(p => { p.isBot = true; });
  const action = getBotAction(planningState);
  assert.ok(action);
  return action;
}

test('independent browsers create, join by normalized code, ready and start the same persisted game', async () => {
  const { host, guest, room: joined } = await twoPlayers();
  assert.notEqual(host.id, guest.id);
  assert.equal(joined.players.length, 2);
  assert.notEqual(joined.players[0].color, joined.players[1].color);
  assert.deepEqual(await host.room(joined.id), await guest.room(joined.id));
  await guest.mutate('start', { roomId: joined.id }, 403);
  await host.mutate('start', { roomId: joined.id }, 400);
  await guest.mutate('ready', { roomId: joined.id });
  const started = await host.mutate('start', { roomId: joined.id });
  assert.equal(started.gameState?.phase, 'SETUP_ROUND_1_SETTLEMENT');
  assert.deepEqual(await guest.room(joined.id), started);
  await guest.move(started, chooseMove(started), 403);

  // Two identical requests from separate tabs must commit only once.
  const action = chooseMove(started);
  const results = await Promise.all([host.request({ operation: 'action', roomId: started.id, revision: started.revision, action }), host.request({ operation: 'action', roomId: started.id, revision: started.revision, action })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  let current = await host.room(started.id);
  assert.equal(current.revision, started.revision + 1);
  assert.deepEqual(current.gameState?.phase, 'SETUP_ROUND_1_ROAD');

  while (current.gameState!.phase.startsWith('SETUP')) {
    const actor = current.gameState!.players[current.gameState!.activePlayerIndex].id === host.id ? host : guest;
    current = await actor.move(current, chooseMove(current));
    assert.deepEqual(await host.room(current.id), await guest.room(current.id));
  }
  current = await host.move(current, { type: 'ROLL_DICE' });
  assert.ok(current.gameState!.dice);
  while ((current.gameState!.phase as string) !== 'TURN_ACTIONS') {
    const action = chooseMove(current);
    const actorId = 'playerId' in action ? action.playerId : current.gameState!.players[current.gameState!.activePlayerIndex].id;
    current = await (actorId === host.id ? host : guest).move(current, action);
  }
  current = await host.move(current, { type: 'END_TURN' });
  assert.equal(current.gameState!.players[current.gameState!.activePlayerIndex].id, guest.id);
  assert.deepEqual(await host.room(current.id), await guest.room(current.id));
  const refresh = new Browser(); refresh.cookie = guest.cookie;
  await refresh.session();
  assert.equal(refresh.id, guest.id);
  assert.deepEqual(await refresh.room(current.id), current);
  await guest.mutate('removePlayer', { roomId: current.id, playerId: guest.id });
  const rejoined = await guest.mutate('join', { roomId: current.code, playerName: 'Guest' });
  assert.equal(rejoined.gameState!.players.length, 2);
  assert.deepEqual(rejoined.gameState, current.gameState);
});

test('private rooms require a passcode, do not leak hashes and reject nonmembers', async () => {
  const host = await new Browser().session(), guest = await new Browser().session();
  const room = await host.mutate('create', { name: 'Private table', playerName: 'Host', options: { isPrivate: true, passCode: 'secret-pass' } });
  assert.ok(!JSON.stringify(room).includes('secret-pass'));
  assert.ok(!('passCode' in room));
  const { rows } = await database.db.query<{ pass_code: string }>('SELECT pass_code FROM public.catan_rooms WHERE id=$1', [room.id]);
  assert.match(rows[0].pass_code, /^scrypt:/);
  assert.ok(!(await guest.request()).data.rooms.some((r: Room) => r.id === room.id));
  assert.equal((await guest.request(undefined, `?room=${room.id}`)).status, 403);
  await guest.mutate('join', { roomId: room.code, playerName: 'Guest', passCode: 'wrong' }, 403);
  await guest.mutate('join', { roomId: room.code, playerName: 'Guest', passCode: 'secret-pass' });
  assert.ok((await guest.request()).data.rooms.some((r: Room) => r.id === room.id));
  await guest.mutate('addBot', { roomId: room.id, difficulty: 'medium' }, 403);
  await guest.mutate('removePlayer', { roomId: room.id, playerId: host.id }, 403);
});

test('concurrent joins cannot overfill a room, and the host transfers on leaving', async () => {
  const host = await new Browser().session(), a = await new Browser().session(), b = await new Browser().session();
  const room = await host.mutate('create', { name: 'Last seat', playerName: 'Host', options: { maxPlayers: 2 } });
  const results = await Promise.all([a.request({ operation: 'join', roomId: room.code, playerName: 'A' }), b.request({ operation: 'join', roomId: room.code, playerName: 'B' })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
  const joined = await host.room(room.id);
  assert.equal(joined.players.length, 2);
  const remaining = await host.mutate('removePlayer', { roomId: room.id, playerId: host.id });
  assert.equal(remaining.hostId, joined.players[1].id);
  assert.equal(remaining.players[0].isHost, true);
  assert.equal(remaining.players[0].seatIndex, 0);
});

test('bot ticks are server selected and deduplicated; bot winners persist', async () => {
  const host = await new Browser().session();
  let room = await host.mutate('create', { name: 'Bots', playerName: 'Host' });
  room = await host.mutate('addBot', { roomId: room.id, difficulty: 'medium' });
  room = await host.mutate('start', { roomId: room.id });
  room = await host.move(room, chooseMove(room));
  room = await host.move(room, chooseMove(room));
  assert.equal(room.gameState!.activePlayerIndex, 1);
  await database.db.query("UPDATE public.catan_rooms SET updated_at=now()-interval '10 seconds' WHERE id=$1", [room.id]);
  const results = await Promise.all([host.request({ operation: 'tick', roomId: room.id, revision: room.revision }), host.request({ operation: 'tick', roomId: room.id, revision: room.revision })]);
  assert.ok(results.every(r => [200, 409].includes(r.status)));
  const afterTick = await host.room(room.id);
  assert.equal(afterTick.revision, room.revision + 1);
  assert.equal(afterTick.gameState!.phase, 'SETUP_ROUND_1_ROAD');
  afterTick.gameState!.phase = 'GAME_OVER';
  afterTick.gameState!.winnerPlayerId = afterTick.players[1].id;
  afterTick.status = 'finished';
  await database.db.query('SELECT public.catan_commit_room($1::jsonb,$2)', [JSON.stringify(afterTick), afterTick.revision]);
  assert.equal((await host.room(room.id)).gameState!.winnerPlayerId, afterTick.players[1].id);
});

test('trade responses and discards are bound to the caller, including off-turn actions', async () => {
  const { host, guest, room } = await twoPlayers();
  await guest.mutate('ready', { roomId: room.id });
  let current = await host.mutate('start', { roomId: room.id });
  current.gameState!.phase = 'TURN_ACTIONS';
  current.gameState!.players[0].resources.wood = 10;
  current.gameState!.players[1].resources.brick = 10;
  await database.db.query('SELECT public.catan_commit_room($1::jsonb,$2)', [JSON.stringify(current), current.revision]);
  current = await host.room(room.id);
  current = await host.move(current, { type: 'CREATE_TRADE_OFFER', give: { wood: 1 }, want: { brick: 1 } });
  await host.move(current, { type: 'CONFIRM_TRADE_OFFER', targetPlayerId: guest.id }, 400);
  await host.move(current, { type: 'RESPOND_TRADE_OFFER', playerId: guest.id, accept: true }, 403);
  current = await guest.move(current, { type: 'RESPOND_TRADE_OFFER', playerId: guest.id, accept: true });
  current = await host.move(current, { type: 'CONFIRM_TRADE_OFFER', targetPlayerId: guest.id });
  assert.equal(current.gameState!.players[1].resources.wood, 1);
  assert.equal(current.gameState!.players[0].resources.brick, 1);
  current.gameState!.phase = 'TURN_ROBBER_DISCARD';
  current.gameState!.players[0].hasDiscarded = true;
  current.gameState!.players[1].hasDiscarded = false;
  current.gameState!.players[1].discardRequired = 5;
  await database.db.query('SELECT public.catan_commit_room($1::jsonb,$2)', [JSON.stringify(current), current.revision]);
  current = await host.room(room.id);
  await host.move(current, { type: 'DISCARD_RESOURCES', playerId: guest.id, resources: { brick: 5 } }, 403);
  current = await guest.move(current, { type: 'DISCARD_RESOURCES', playerId: guest.id, resources: { brick: 5 } });
  assert.equal(current.gameState!.phase, 'TURN_ROBBER_MOVE');
});

test('malformed actions and forged sessions are rejected', async () => {
  for (const action of [
    { type: 'BANK_TRADE', giveResource: 'wood', getResource: 'ore', count: -1 },
    { type: 'BUILD_ROAD', edgeId: -1 }, { type: 'MOVE_ROBBER', hexId: 999 },
    { type: 'CREATE_TRADE_OFFER', give: { wood: -3 }, want: { ore: 1 } },
    { type: 'DISCARD_RESOURCES', playerId: 'x', resources: { gold: 1 } },
    { type: 'PLAY_DEV_CARD', card: 'year_of_plenty', params: { targetResource: 'gold' } },
    { type: 'START_GAME' },
  ]) assert.throws(() => parseAction(action));
  const browser = await new Browser().session();
  browser.cookie = browser.cookie.replace(/.$/, 'x');
  assert.equal((await browser.request()).status, 401);
});

test('SQL changes roll back atomically, deny public writes/reads, and migration is repeatable', async () => {
  const host = await new Browser().session();
  const room = await host.mutate('create', { name: 'Rollback', playerName: 'Host' });
  const invalid = structuredClone(room);
  invalid.players[0].seatIndex = 9;
  await assert.rejects(database.db.query('SELECT public.catan_commit_room($1::jsonb,$2)', [JSON.stringify(invalid), room.revision]));
  assert.deepEqual(await host.room(room.id), room);
  await database.db.exec('SET ROLE anon');
  await assert.rejects(database.db.query('SELECT * FROM public.catan_rooms'), /permission denied/);
  await assert.rejects(database.db.query('SELECT public.catan_commit_room($1::jsonb,$2)', [JSON.stringify(room), room.revision]), /permission denied/);
  await database.db.exec('RESET ROLE');
  await database.db.exec(await readFile('supabase/migrations/20260919000000_shared_multiplayer.sql', 'utf8'));
  assert.deepEqual(await host.room(room.id), room);
});
