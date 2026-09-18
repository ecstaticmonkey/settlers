'use client';

import React, { useState, useEffect } from 'react';
import { Room, roomService } from '@/lib/multiplayer/room-service';
import { GameState } from '@/lib/catan/types';
import { LobbyView } from '@/components/Lobby/LobbyView';
import { WaitingRoom } from '@/components/Lobby/WaitingRoom';
import { CreateRoomModal } from '@/components/Lobby/CreateRoomModal';
import { AuthModal } from '@/components/Auth/AuthModal';
import { GameView } from '@/components/Game/GameView';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string }>({
    id: 'guest-1',
    name: 'Settler101',
  });
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);

  // Initialize user from localStorage or generate random guest
  useEffect(() => {
    try {
      const stored = localStorage.getItem('catan_user');
      if (stored) {
        queueMicrotask(() => setCurrentUser(JSON.parse(stored)));
      } else {
        const rand = Math.floor(Math.random() * 900) + 100;
        const initial = { id: `user-${Date.now()}`, name: `Settler${rand}` };
        queueMicrotask(() => setCurrentUser(initial));
        localStorage.setItem('catan_user', JSON.stringify(initial));
      }
    } catch {}
  }, []);

  const activeRoomId = currentRoom?.id;

  // Subscribe to active room updates
  useEffect(() => {
    if (!activeRoomId) return;

    const unsubscribe = roomService.subscribeToRoom(activeRoomId, (updatedRoom) => {
      setCurrentRoom(updatedRoom);
      if (updatedRoom.gameState) {
        setGameState(updatedRoom.gameState);
      }
    });

    return () => unsubscribe();
  }, [activeRoomId]);

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
    setCurrentRoom(room);
  };

  // Join room handler
  const handleJoinRoom = async (roomIdOrCode: string) => {
    const found = await roomService.getRoom(roomIdOrCode);
    if (!found) throw new Error('Room not found');

    const updated = await roomService.joinRoom(found.id, currentUser);
    setCurrentRoom(updated);
    if (updated.gameState) {
      setGameState(updated.gameState);
    }
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
    setCurrentRoom(startedRoom);
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
      } catch {}
    }
    setCurrentRoom(null);
    setGameState(null);
  };

  // VIEW 1: Active In-Game View
  if (currentRoom && gameState && currentRoom.status === 'in_progress') {
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
        <WaitingRoom
          room={currentRoom}
          currentPlayerId={currentUser.id}
          onAddBot={() => roomService.addBot(currentRoom.id)}
          onRemovePlayer={(pId) => roomService.removePlayer(currentRoom.id, pId)}
          onToggleReady={() => roomService.toggleReady(currentRoom.id, currentUser.id)}
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
