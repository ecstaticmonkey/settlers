-- Catan (Colonist.io Clone) Database Schema
-- Standalone schema ready for any Supabase project

-- 1. Profiles / Users (works alongside auth.users or guest sessions)
CREATE TABLE IF NOT EXISTS public.catan_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  is_guest BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Game Rooms
CREATE TABLE IF NOT EXISTS public.catan_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(8) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  host_id UUID NOT NULL,
  is_private BOOLEAN DEFAULT false,
  pass_code TEXT,
  max_players INT DEFAULT 4 CHECK (max_players >= 2 AND max_players <= 4),
  turn_timer_seconds INT DEFAULT 60,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
  winner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Room Players
CREATE TABLE IF NOT EXISTS public.catan_room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.catan_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL, -- User UUID or Guest ID or Bot ID
  username TEXT NOT NULL,
  color VARCHAR(20) NOT NULL CHECK (color IN ('red', 'blue', 'orange', 'white', 'green')),
  is_host BOOLEAN DEFAULT false,
  is_ready BOOLEAN DEFAULT false,
  is_bot BOOLEAN DEFAULT false,
  bot_difficulty VARCHAR(20) DEFAULT 'medium',
  seat_index INT NOT NULL CHECK (seat_index >= 0 AND seat_index < 4),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, seat_index),
  UNIQUE(room_id, color)
);

-- 4. Active Game State (persisted snapshots)
CREATE TABLE IF NOT EXISTS public.catan_game_states (
  room_id UUID PRIMARY KEY REFERENCES public.catan_rooms(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL,
  turn_number INT DEFAULT 1,
  active_player_index INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Game Actions / Event Log (for history & replays)
CREATE TABLE IF NOT EXISTS public.catan_game_actions (
  id BIGSERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.catan_rooms(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.catan_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catan_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catan_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catan_game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catan_game_actions ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for game lobbies and state
CREATE POLICY "Allow public read catan_profiles" ON public.catan_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert catan_profiles" ON public.catan_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update catan_profiles" ON public.catan_profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public read catan_rooms" ON public.catan_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert catan_rooms" ON public.catan_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update catan_rooms" ON public.catan_rooms FOR UPDATE USING (true);

CREATE POLICY "Allow public read catan_room_players" ON public.catan_room_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert catan_room_players" ON public.catan_room_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update catan_room_players" ON public.catan_room_players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete catan_room_players" ON public.catan_room_players FOR DELETE USING (true);

CREATE POLICY "Allow public read catan_game_states" ON public.catan_game_states FOR SELECT USING (true);
CREATE POLICY "Allow public insert catan_game_states" ON public.catan_game_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update catan_game_states" ON public.catan_game_states FOR UPDATE USING (true);

CREATE POLICY "Allow public read catan_game_actions" ON public.catan_game_actions FOR SELECT USING (true);
CREATE POLICY "Allow public insert catan_game_actions" ON public.catan_game_actions FOR INSERT WITH CHECK (true);
