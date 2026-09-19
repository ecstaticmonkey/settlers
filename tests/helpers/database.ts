import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

// A real embedded Postgres runs the production migrations/transactions. This
// narrow PostgREST transport adapter lets the production API and Supabase SDK be
// exercised without test credentials or writes to a live Supabase project.
export async function testDatabase() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY);
    GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;`);
  for (const file of ['20260918000000_catan_schema.sql', '20260919000000_shared_multiplayer.sql', '20260919000001_fix_revision_conflict.sql']) {
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  }
  const fetchDatabase: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.host !== 'database.test') throw new Error(`Unexpected test network request: ${url.host}`);
    const table = url.pathname.split('/').at(-1);
    try {
      if (request.method === 'POST' && table === 'catan_commit_room') {
        const p = await request.json();
        const { rows } = await db.query<{ result: unknown }>('SELECT public.catan_commit_room($1::jsonb, $2::bigint, $3::text, $4::jsonb) AS result', [JSON.stringify(p.p_room), p.p_expected_revision, p.p_passcode_hash, JSON.stringify(p.p_action)]);
        return Response.json(rows[0].result);
      }
      if (table === 'catan_room_players') {
        const id = url.searchParams.get('player_id')?.slice(3);
        return Response.json((await db.query('SELECT room_id FROM public.catan_room_players WHERE player_id = $1', [id])).rows);
      }
      if (table === 'catan_rooms') {
        const values: unknown[] = [];
        let where = 'true';
        const id = url.searchParams.get('id'), code = url.searchParams.get('room_code');
        if (id || code) {
          values.push((id || code)!.slice(3));
          where = `${id ? 'r.id' : 'r.room_code'} = $1`;
        } else {
          const ownIds = (url.searchParams.get('or')?.match(/id\.in\.\(([^)]+)\)/)?.[1] || '').split(',').filter(Boolean);
          values.push(ownIds);
          where = "r.status <> 'finished' AND (NOT r.is_private OR r.id = ANY($1::uuid[]))";
        }
        const { rows } = await db.query(`SELECT r.*,
          COALESCE((SELECT jsonb_agg(p) FROM public.catan_room_players p WHERE p.room_id=r.id), '[]') AS players,
          (SELECT jsonb_build_object('state_json', g.state_json) FROM public.catan_game_states g WHERE g.room_id=r.id) AS game
          FROM public.catan_rooms r WHERE ${where} ORDER BY r.created_at DESC LIMIT 100`, values);
        return Response.json(rows);
      }
      throw new Error(`Unsupported database request: ${request.method} ${url.pathname}`);
    } catch (error) {
      const e = error as Error & { code?: string };
      return Response.json({ code: e.code, message: e.message, details: null, hint: null }, { status: 400 });
    }
  };
  return { db, fetchDatabase };
}
