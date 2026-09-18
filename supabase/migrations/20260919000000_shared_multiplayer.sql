-- Run after 20260918000000_catan_schema.sql. Existing tables/data are retained.
BEGIN;

ALTER TABLE public.catan_rooms ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0;
-- Bot IDs are strings, so a winning bot cannot be stored in a UUID column.
ALTER TABLE public.catan_rooms ALTER COLUMN winner_id TYPE TEXT USING winner_id::TEXT;
CREATE INDEX IF NOT EXISTS catan_room_players_player_idx ON public.catan_room_players(player_id);

-- All room access goes through the server API, which verifies a signed player
-- session and enforces membership/host/turn permissions. The public key must not
-- allow clients to bypass those checks or read private passwords/game state.
REVOKE ALL ON public.catan_rooms, public.catan_room_players, public.catan_game_states, public.catan_game_actions FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.catan_game_actions_id_seq FROM anon, authenticated;
GRANT ALL ON public.catan_rooms, public.catan_room_players, public.catan_game_states, public.catan_game_actions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.catan_game_actions_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.catan_commit_room(
  p_room JSONB,
  p_expected_revision BIGINT,
  p_passcode_hash TEXT DEFAULT NULL,
  p_action JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_id UUID := (p_room->>'id')::UUID;
  v_revision BIGINT;
  v_updated TIMESTAMPTZ := clock_timestamp();
  v_player JSONB;
BEGIN
  IF p_expected_revision IS NULL THEN
    INSERT INTO public.catan_rooms (id, room_code, name, host_id, is_private, pass_code, max_players, turn_timer_seconds, status, revision, created_at, updated_at)
    VALUES (v_id, p_room->>'code', p_room->>'name', (p_room->>'hostId')::UUID,
      (p_room->>'isPrivate')::BOOLEAN, p_passcode_hash, (p_room->>'maxPlayers')::INT,
      (p_room->>'turnTimerSeconds')::INT, p_room->>'status', 1, to_timestamp((p_room->>'createdAt')::DOUBLE PRECISION / 1000), v_updated);
    v_revision := 1;
  ELSE
    -- UPDATE takes the row lock and rechecks the version after concurrent commits.
    UPDATE public.catan_rooms SET
      host_id = (p_room->>'hostId')::UUID, status = p_room->>'status',
      winner_id = NULLIF(p_room->'gameState'->>'winnerPlayerId', ''),
      revision = revision + 1, updated_at = v_updated
    WHERE id = v_id AND revision = p_expected_revision
    RETURNING revision INTO v_revision;
    IF NOT FOUND THEN RAISE EXCEPTION 'Room revision conflict' USING ERRCODE = '40001'; END IF;
  END IF;

  -- Rebuild the small roster inside this transaction: no transient duplicate
  -- seat/color constraints when a player leaves and the seats shift.
  DELETE FROM public.catan_room_players WHERE room_id = v_id;
  FOR v_player IN SELECT value FROM jsonb_array_elements(p_room->'players') LOOP
    INSERT INTO public.catan_room_players (room_id, player_id, username, color, is_host, is_ready, is_bot, bot_difficulty, seat_index)
    VALUES (v_id, v_player->>'id', v_player->>'name', v_player->>'color',
      (v_player->>'isHost')::BOOLEAN, (v_player->>'isReady')::BOOLEAN,
      (v_player->>'isBot')::BOOLEAN, v_player->>'botDifficulty', (v_player->>'seatIndex')::INT);
  END LOOP;

  IF p_room->'gameState' IS NOT NULL AND p_room->'gameState' <> 'null'::JSONB THEN
    INSERT INTO public.catan_game_states (room_id, state_json, turn_number, active_player_index, updated_at)
    VALUES (v_id, p_room->'gameState', (p_room->'gameState'->>'turnNumber')::INT,
      (p_room->'gameState'->>'activePlayerIndex')::INT, v_updated)
    ON CONFLICT (room_id) DO UPDATE SET state_json = EXCLUDED.state_json,
      turn_number = EXCLUDED.turn_number, active_player_index = EXCLUDED.active_player_index, updated_at = EXCLUDED.updated_at;
  END IF;
  IF p_action IS NOT NULL AND p_action <> 'null'::JSONB THEN
    INSERT INTO public.catan_game_actions(room_id, action_type, payload)
    VALUES (v_id, p_action->>'type', p_action);
  END IF;
  RETURN jsonb_build_object('revision', v_revision, 'updated_at', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.catan_commit_room(JSONB, BIGINT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catan_commit_room(JSONB, BIGINT, TEXT, JSONB) TO service_role;

COMMIT;
