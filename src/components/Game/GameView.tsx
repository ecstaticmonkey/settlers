'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameAction, Resource } from '@/lib/catan/types';
import { roomService } from '@/lib/multiplayer/room-service';
import { soundManager } from '@/lib/sound/audio';
import { CatanBoard } from '../Board/CatanBoard';
import { PlayerRoster } from '../HUD/PlayerRoster';
import { ResourceHand } from '../HUD/ResourceHand';
import { ActionBar } from '../HUD/ActionBar';
import { BankDeckBar } from '../HUD/BankDeckBar';
import { GameLog } from '../HUD/GameLog';
import { TradeModal } from '../HUD/TradeModal';
import { DevCardModal } from '../HUD/DevCardModal';
import { RobberModal } from '../HUD/RobberModal';
import { VictoryModal } from '../HUD/VictoryModal';
import { RulebookModal } from '../HUD/RulebookModal';
import { SettingsModal } from '../HUD/SettingsModal';
import { Settings, BookOpen, Maximize2, Info, X, Layers, Box } from 'lucide-react';

import dynamic from 'next/dynamic';
const DiceTray = dynamic(() => import('../HUD/DiceTray'), { ssr: false });

interface GameViewProps {
  roomCode: string;
  roomId: string;
  currentPlayerId: string;
  initialState: GameState;
  onLeaveGame: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  roomId,
  roomCode,
  currentPlayerId,
  initialState,
  onLeaveGame,
}) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | null>(null);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const [error, setError] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [rollPending, setRollPending] = useState(false);
  const rollInFlight = useRef(false);
  const buildInFlight = useRef(false);

  // Modals state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeModalTab, setTradeModalTab] = useState<'player' | 'bank'>('player');
  const [isDevCardModalOpen, setIsDevCardModalOpen] = useState(false);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('catan_view_mode');
      if (saved === '2d' || saved === '3d') setViewMode(saved);
    } catch {}
  }, []);

  const handleToggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === '3d' ? '2d' : '3d';
      try { localStorage.setItem('catan_view_mode', next); } catch {}
      return next;
    });
  };

  const [pingMs, setPingMs] = useState(roomService.getPing());
  const lastRobberHexId = useRef(initialState.board.robberHexId);

  useEffect(() => {
    const unsub = roomService.subscribeToPing(roomId, setPingMs);
    return () => unsub();
  }, [roomId]);

  // Check if robber moves and play fire burn sound
  useEffect(() => {
    if (gameState.board.robberHexId !== lastRobberHexId.current) {
      lastRobberHexId.current = gameState.board.robberHexId;
      soundManager.playRobber();
      soundManager.playFireBurn();
    }
  }, [gameState.board.robberHexId]);

  // Turn timer countdown
  const turnKey = `${gameState.turnNumber}-${gameState.phase}-${gameState.activePlayerIndex}`;
  const [timerSnapshot, setTimerSnapshot] = useState({
    key: turnKey,
    seconds: gameState.turnTimeRemainingSeconds || 60,
  });

  const remainingSeconds =
    timerSnapshot.key === turnKey
      ? timerSnapshot.seconds
      : gameState.turnTimeRemainingSeconds || 60;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimerSnapshot((prev) => {
        const currentSeconds =
          prev.key === turnKey
            ? prev.seconds
            : gameState.turnTimeRemainingSeconds || 60;
        return {
          key: turnKey,
          seconds: Math.max(0, currentSeconds - 1),
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [turnKey, gameState.turnTimeRemainingSeconds]);

  // Subscribe to real-time game state updates
  useEffect(() => {
    const unsubscribe = roomService.subscribeToGameState(roomId, (newState) => {
      setGameState(newState);

      if (newState.phase === 'GAME_OVER') {
        soundManager.playVictory();
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  // Dispatch action wrapper
  const handleDispatch = useCallback(
    async (action: GameAction) => {
      try {
        setError('');
        const nextState = await roomService.dispatchAction(roomId, action);
        setGameState(nextState);

        // Sound effects
        if (action.type === 'ROLL_DICE') {
          soundManager.playDiceRoll();
        } else if (
          action.type === 'BUILD_ROAD' ||
          action.type === 'BUILD_SETTLEMENT' ||
          action.type === 'BUILD_CITY' ||
          action.type === 'PLACE_INITIAL_SETTLEMENT' ||
          action.type === 'PLACE_INITIAL_ROAD'
        ) {
          soundManager.playBuild();
        } else if (action.type === 'MOVE_ROBBER') {
          soundManager.playRobber();
          soundManager.playFireBurn();
        } else if (action.type === 'CREATE_TRADE_OFFER' || action.type === 'CONFIRM_TRADE_OFFER') {
          soundManager.playTradeNotification();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'That move could not be completed. Try again.');
      }
    },
    [roomId]
  );

  const activePlayer = gameState.players[gameState.activePlayerIndex] || gameState.players[0];
  const me = gameState.players.find((p) => p.id === currentPlayerId) || gameState.players[0];
  const isMyTurn = activePlayer?.id === me.id;
  const setup = gameState.phase.startsWith('SETUP');

  // Compute bank resource counts (19 of each in standard Catan)
  const bankResources: Record<Resource, number> = {
    wood: Math.max(0, 19 - gameState.players.reduce((sum, p) => sum + (p.resources.wood || 0), 0)),
    brick: Math.max(0, 19 - gameState.players.reduce((sum, p) => sum + (p.resources.brick || 0), 0)),
    sheep: Math.max(0, 19 - gameState.players.reduce((sum, p) => sum + (p.resources.sheep || 0), 0)),
    wheat: Math.max(0, 19 - gameState.players.reduce((sum, p) => sum + (p.resources.wheat || 0), 0)),
    ore: Math.max(0, 19 - gameState.players.reduce((sum, p) => sum + (p.resources.ore || 0), 0)),
  };

  const handleRollDice = async () => {
    if (rollInFlight.current || isRolling || !isMyTurn || gameState.phase !== 'TURN_ROLL') return;
    rollInFlight.current = true;
    setRollPending(true);
    try {
      await handleDispatch({ type: 'ROLL_DICE' });
    } finally {
      rollInFlight.current = false;
      setRollPending(false);
    }
  };

  // Board selection handlers
  const handleSelectVertex = async (vertexId: number) => {
    if (!isMyTurn || isRolling || buildInFlight.current) return;

    if (gameState.phase === 'SETUP_ROUND_1_SETTLEMENT' || gameState.phase === 'SETUP_ROUND_2_SETTLEMENT') {
      buildInFlight.current = true;
      try {
        await handleDispatch({ type: 'PLACE_INITIAL_SETTLEMENT', vertexId });
      } finally {
        buildInFlight.current = false;
      }
    } else if (gameState.phase === 'TURN_ACTIONS') {
      if (buildMode === 'settlement') {
        buildInFlight.current = true;
        try {
          await handleDispatch({ type: 'BUILD_SETTLEMENT', vertexId });
          setBuildMode(null);
        } finally {
          buildInFlight.current = false;
        }
      } else if (buildMode === 'city') {
        buildInFlight.current = true;
        try {
          await handleDispatch({ type: 'BUILD_CITY', vertexId });
          setBuildMode(null);
        } finally {
          buildInFlight.current = false;
        }
      }
    }
  };

  const handleSelectEdge = async (edgeId: number) => {
    if (!isMyTurn || isRolling || buildInFlight.current) return;

    if (gameState.phase === 'SETUP_ROUND_1_ROAD' || gameState.phase === 'SETUP_ROUND_2_ROAD') {
      buildInFlight.current = true;
      try {
        await handleDispatch({ type: 'PLACE_INITIAL_ROAD', edgeId });
      } finally {
        buildInFlight.current = false;
      }
    } else if (gameState.phase === 'TURN_ACTIONS' && buildMode === 'road') {
      buildInFlight.current = true;
      try {
        await handleDispatch({ type: 'BUILD_ROAD', edgeId });
        if (gameState.freeRoadsRemaining <= 1) {
          setBuildMode(null);
        }
      } finally {
        buildInFlight.current = false;
      }
    }
  };

  const handleSelectHex = (hexId: number) => {
    if (!isMyTurn || isRolling || gameState.phase !== 'TURN_ROBBER_MOVE') return;
    handleDispatch({ type: 'MOVE_ROBBER', hexId });
  };

  const toggleSound = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="catan-viewport-root">
      {/* Full-bleed board canvas area */}
      <div className="catan-board-viewport">
        <CatanBoard
          board={gameState.board}
          phase={gameState.phase}
          activePlayer={activePlayer}
          currentPlayerId={me.id}
          buildMode={buildMode}
          lastPlacedVertexId={gameState.lastPlacedVertexId}
          onSelectVertex={handleSelectVertex}
          onSelectEdge={handleSelectEdge}
          onSelectHex={handleSelectHex}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
        />
      </div>

      {/* TOP-LEFT: Floating Utility Toolbar (Settings, Rules, Fullscreen, Info, Ping) */}
      <div className="hud-top-left-toolbar" role="toolbar" aria-label="Quick tools">
        <button
          type="button"
          className={`hud-tool-btn ${viewMode === '2d' ? 'hud-tool-btn-active' : ''}`}
          onClick={handleToggleViewMode}
          title={viewMode === '3d' ? 'Switch to 2D Top-Down View (Colonist-style)' : 'Switch to 3D Island View'}
          aria-label="Toggle 2D / 3D board view"
        >
          {viewMode === '3d' ? <Layers size={17} /> : <Box size={17} />}
        </button>
        <button
          type="button"
          className="hud-tool-btn"
          onClick={() => setIsSettingsOpen(true)}
          title="Game Settings & Audio"
          aria-label="Open settings"
        >
          <Settings size={17} />
        </button>
        <button
          type="button"
          className="hud-tool-btn"
          onClick={() => setIsRulebookOpen(true)}
          title="Rulebook & Guide"
          aria-label="Open rulebook"
        >
          <BookOpen size={17} />
        </button>
        <button
          type="button"
          className="hud-tool-btn"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          aria-label="Toggle fullscreen"
        >
          <Maximize2 size={17} />
        </button>
        <button
          type="button"
          className="hud-tool-btn"
          onClick={() => setIsSettingsOpen(true)}
          title={`Table ${roomCode} · Turn ${gameState.turnNumber}`}
          aria-label="Table info"
        >
          <Info size={17} />
        </button>
        <div className="hud-conn-badge" title={`Live server latency: ${pingMs}ms · Synced`}>
          <span className={`hud-conn-dot ${pingMs < 80 ? 'hud-conn-dot-fast' : 'hud-conn-dot-lag'}`} />
          <span>{pingMs < 80 ? 'Fast' : 'Online'}</span>
          <span className="hud-conn-ping">{pingMs}ms</span>
        </div>
      </div>

      {/* TOP-CENTER: Floating Objective Ribbon Banner */}
      <div className="hud-top-ribbon-wrap" style={{ pointerEvents: 'none' }}>
        <div className="hud-ribbon-banner">
          <span>To win the game, reach 10 points</span>
          <span className="hud-ribbon-trophy" aria-hidden="true">
            🏆
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Chat Log -> Bank Supply Deck -> Player Roster */}
      <div className="hud-right-column">
        <GameLog logs={gameState.logs} onOpenRulebook={() => setIsRulebookOpen(true)} />

        <BankDeckBar
          bankResources={bankResources}
          devCardsRemaining={gameState.devCardDeck?.length ?? 25}
          canTrade={isMyTurn && !isRolling && gameState.phase === 'TURN_ACTIONS'}
          onOpenBankTrade={() => {
            setTradeModalTab('bank');
            setIsTradeModalOpen(true);
          }}
        />

        <PlayerRoster
          players={gameState.players}
          activePlayerIndex={gameState.activePlayerIndex}
          longestRoadOwnerId={gameState.longestRoadOwnerId}
          longestRoadLength={gameState.longestRoadLength}
          largestArmyOwnerId={gameState.largestArmyOwnerId}
          largestArmyCount={gameState.largestArmyCount}
          currentPlayerId={me.id}
        />
      </div>

      {/* BOTTOM DOCK: Resource Hand Tray (Left) + Turn Pill & Actions Group (Center) + Dice Tray (Right) */}
      <div className="hud-bottom-dock">
        <ResourceHand
          resources={me.resources}
          onOpenGuide={() => setIsRulebookOpen(true)}
          onOpenBankTrade={() => {
            setTradeModalTab('bank');
            setIsTradeModalOpen(true);
          }}
          canTrade={isMyTurn && !isRolling && gameState.phase === 'TURN_ACTIONS'}
        />

        <ActionBar
          phase={gameState.phase}
          player={me}
          activePlayer={activePlayer}
          isMyTurn={isMyTurn}
          rolling={isRolling || rollPending}
          buildMode={buildMode}
          onSetBuildMode={setBuildMode}
          onRollDice={handleRollDice}
          onBuyDevCard={() => handleDispatch({ type: 'BUY_DEV_CARD' })}
          onOpenTradeModal={() => {
            setTradeModalTab('player');
            setIsTradeModalOpen(true);
          }}
          onOpenDevCardModal={() => setIsDevCardModalOpen(true)}
          onEndTurn={() => handleDispatch({ type: 'END_TURN' })}
          freeRoadsRemaining={gameState.freeRoadsRemaining}
          turnTimeRemainingSeconds={remainingSeconds}
        />

        {/* 3D Dice Tray (Positioned neatly in the bottom dock on the right) */}
        {!setup && (
          <div className="hud-dice-tray-host">
            <DiceTray
              dice={gameState.dice}
              turn={gameState.turnNumber}
              canRoll={isMyTurn && gameState.phase === 'TURN_ROLL' && !rollPending}
              playerName={activePlayer.name.replace(' (Bot)', '')}
              onRoll={handleRollDice}
              onRollingChange={setIsRolling}
            />
          </div>
        )}
      </div>

      {/* Incoming Trade Offer Alert Banner */}
      {gameState.activeTradeOffer && gameState.activeTradeOffer.fromPlayerId !== me.id && (
        <button
          type="button"
          className="hud-trade-alert-pill"
          onClick={() => {
            setTradeModalTab('player');
            setIsTradeModalOpen(true);
          }}
        >
          A settler has offered a trade. View offer →
        </button>
      )}

      {/* Error Banner */}
      {error && (
        <div className="notice notice-error game-error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modals */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        initialTab={tradeModalTab}
        currentPlayer={me}
        players={gameState.players}
        activeOffer={gameState.activeTradeOffer}
        onCreateOffer={(give, want) => handleDispatch({ type: 'CREATE_TRADE_OFFER', give, want })}
        onRespondOffer={(accept) => handleDispatch({ type: 'RESPOND_TRADE_OFFER', accept, playerId: me.id })}
        onConfirmTrade={(targetPlayerId) => handleDispatch({ type: 'CONFIRM_TRADE_OFFER', targetPlayerId })}
        onCancelOffer={() => handleDispatch({ type: 'CANCEL_TRADE_OFFER' })}
        onExecuteBankTrade={(give, get, count) =>
          handleDispatch({ type: 'BANK_TRADE', giveResource: give, getResource: get, count })
        }
        canOffer={isMyTurn && !isRolling && gameState.phase === 'TURN_ACTIONS'}
        canTrade={isMyTurn && !isRolling && gameState.phase === 'TURN_ACTIONS'}
      />

      <DevCardModal
        isOpen={isDevCardModalOpen}
        onClose={() => setIsDevCardModalOpen(false)}
        player={me}
        onPlayCard={(card, params) => handleDispatch({ type: 'PLAY_DEV_CARD', card, params })}
      />

      <RobberModal
        mode={
          !isRolling && gameState.phase === 'TURN_ROBBER_DISCARD' && me.discardRequired > 0 && !me.hasDiscarded
            ? 'discard'
            : !isRolling && isMyTurn && gameState.phase === 'TURN_ROBBER_STEAL'
            ? 'steal'
            : null
        }
        player={me}
        players={gameState.players}
        eligibleTargetIds={gameState.eligibleStealTargetPlayerIds}
        onDiscard={(resources) =>
          handleDispatch({ type: 'DISCARD_RESOURCES', playerId: me.id, resources })
        }
        onSteal={(targetPlayerId) => handleDispatch({ type: 'STEAL_RESOURCE', targetPlayerId })}
      />

      <VictoryModal
        winnerPlayerId={gameState.winnerPlayerId}
        players={gameState.players}
        onPlayAgain={() => onLeaveGame()}
        onReturnToLobby={() => onLeaveGame()}
      />

      <RulebookModal isOpen={isRulebookOpen} onClose={() => setIsRulebookOpen(false)} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isMuted={isMuted}
        onToggleSound={toggleSound}
        roomCode={roomCode}
        turnNumber={gameState.turnNumber}
        onLeaveGame={onLeaveGame}
      />
    </div>
  );
};
