'use client';

import React, { useState, useEffect } from 'react';
import { Room, roomService } from '@/lib/multiplayer/room-service';
import { GameState } from '@/lib/catan/types';
import { LobbyView } from '@/components/Lobby/LobbyView';
import { WaitingRoom } from '@/components/Lobby/WaitingRoom';
import { CreateRoomModal } from '@/components/Lobby/CreateRoomModal';
import { AuthModal } from '@/components/Auth/AuthModal';
import { GameView } from '@/components/Game/GameView';
import { MultiplayerError } from '@/lib/multiplayer/types';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string }>({
    id: '',
    name: 'Settler101',
  });
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);

  // Identity is verified by an HTTP-only server cookie. Only the display name
  // and last room ID are browser preferences; room/game data lives in Supabase.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await roomService.getSession();
        let name = `Settler${Math.floor(Math.random() * 900) + 100}`;
        let roomId: string | null = null;
        try {
          const stored = JSON.parse(localStorage.getItem('catan_user') || 'null');
          if (typeof stored?.name === 'string' && stored.name.trim()) name = stored.name.trim().slice(0, 20);
          roomId = localStorage.getItem('catan_active_room');
          localStorage.setItem('catan_user', JSON.stringify({ id: session.id, name }));
        } catch {}
        if (!active) return;
        setCurrentUser({ id: session.id, name });
        if (roomId) {
          try {
            const room = await roomService.getRoom(roomId);
            if (active && room) { setCurrentRoom(room); setGameState(room.gameState ?? null); }
          } catch (error) {
            if (active) setConnectionError(error instanceof Error ? error.message : 'Could not restore your table.');
          }
        }
        if (active) setInitialized(true);
      } catch (error) {
        if (active) setConnectionError(error instanceof Error ? error.message : 'Could not connect. Please reload.');
      }
    })();
    return () => { active = false; };
  }, []);

  const activeRoomId = currentRoom?.id;

  // Subscribe to active room updates
  useEffect(() => {
    if (!activeRoomId) return;

    const unsubscribe = roomService.subscribeToRoom(activeRoomId, (updatedRoom) => {
      setCurrentRoom(updatedRoom);
      setGameState(updatedRoom.gameState ?? null);
    });
    const disconnect = roomService.subscribeToConnection(activeRoomId, setConnectionError);

    return () => { unsubscribe(); disconnect(); };
  }, [activeRoomId]);

  const enterRoom = (room: Room) => {
    setConnectionError(null);
    setCurrentRoom(room);
    setGameState(room.gameState ?? null);
    try { localStorage.setItem('catan_active_room', room.id); } catch {}
  };

  const handleUpdateUser = (name: string) => {
    const updated = { ...currentUser, name };
    setCurrentUser(updated);
    try {
      localStorage.setItem('catan_user', JSON.stringify(updated));
    } catch {}
  };

  // Create room handler
  const handleCreateRoom = async (options: {
    name: string;
    maxPlayers: number;
    turnTimerSeconds: number;
    isPrivate: boolean;
    passCode?: string;
    color: import('@/lib/catan/types').PlayerColor;
  }) => {
    const room = await roomService.createRoom(options.name, currentUser, options);
    enterRoom(room);
  };

  // Join room handler
  const handleJoinRoom = async (roomIdOrCode: string, passCode?: string) => {
    enterRoom(await roomService.joinRoom(roomIdOrCode, currentUser, passCode));
  };

  // Quick Play vs Bots
  const handleQuickPlayBots = async () => {
    // 1. Create Room
    const room = await roomService.createRoom('Solo vs Bots', currentUser, {
      maxPlayers: 4,
      turnTimerSeconds: 60,
      color: 'red',
    });

    // 2. Add 3 Bots
    await roomService.addBot(room.id, 'medium');
    await roomService.addBot(room.id, 'medium');
    await roomService.addBot(room.id, 'medium');

    // 3. Start Game immediately
    const { room: startedRoom, gameState: initialGame } = await roomService.startGame(room.id);
    enterRoom(startedRoom);
    setGameState(initialGame);
  };

  // Host starts the game from waiting room
  const handleStartGame = async () => {
    if (!currentRoom) return;
    const { room: startedRoom, gameState: initialGame } = await roomService.startGame(currentRoom.id);
    setCurrentRoom(startedRoom);
    setGameState(initialGame);
  };

  // Leave room or game
  const handleLeave = async () => {
    if (currentRoom) {
      try {
        await roomService.removePlayer(currentRoom.id, currentUser.id);
      } catch (error) {
        if (!(error instanceof MultiplayerError) || ![403, 404].includes(error.status)) throw error;
      }
    }
    setCurrentRoom(null);
    setGameState(null);
    setConnectionError(null);
    try { localStorage.removeItem('catan_active_room'); } catch {}
  };

  if (!initialized) return <main className="waiting-page"><div role="status">{connectionError || 'Connecting to your tables…'}{connectionError && <button className="button" onClick={() => window.location.reload()}>Retry connection</button>}</div></main>;

  // VIEW 1: Active In-Game View
  if (currentRoom && gameState && (currentRoom.status === 'in_progress' || currentRoom.status === 'finished')) {
    return (
      <GameView
        roomId={currentRoom.id}
        roomCode={currentRoom.code}
        currentPlayerId={currentUser.id}
        initialState={gameState}
        onLeaveGame={handleLeave}
      />
    );
  }

  // VIEW 2: Waiting Room Lobby
  if (currentRoom && currentRoom.status === 'waiting') {
    return (
      <div className="waiting-page">
        {connectionError && <p className="notice notice-error" role="alert">{connectionError}</p>}
        <WaitingRoom
          room={currentRoom}
          currentPlayerId={currentUser.id}
          onAddBot={() => roomService.addBot(currentRoom.id)}
          onRemovePlayer={(pId) => roomService.removePlayer(currentRoom.id, pId)}
          onToggleReady={() => roomService.toggleReady(currentRoom.id)}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeave}
        />
      </div>
    );
  }

  // VIEW 3: Main Lobby View
  return (
    <div className="home-page">
      <main className="home-main">
        <LobbyView
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenCreateRoom={() => setIsCreateRoomOpen(true)}
          onJoinRoom={handleJoinRoom}
          onQuickPlayBots={handleQuickPlayBots}
        />
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginAsGuest={handleUpdateUser}
      />

      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onCreateRoom={handleCreateRoom}
      />
    </div>
  );
}
