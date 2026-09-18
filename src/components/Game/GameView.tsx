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
import { BankTradeModal } from '../HUD/BankTradeModal';
import { DevCardModal } from '../HUD/DevCardModal';
import { RobberModal } from '../HUD/RobberModal';
import { VictoryModal } from '../HUD/VictoryModal';
import { RulebookModal } from '../HUD/RulebookModal';
import { SettingsModal } from '../HUD/SettingsModal';
import { Settings, BookOpen, Maximize2, Info, X } from 'lucide-react';

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

  // Modals state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isDevCardModalOpen, setIsDevCardModalOpen] = useState(false);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Turn timer countdown
  const [remainingSeconds, setRemainingSeconds] = useState(gameState.turnTimeRemainingSeconds || 30);

  useEffect(() => {
    setRemainingSeconds(gameState.turnTimeRemainingSeconds || 30);
  }, [gameState.turnTimeRemainingSeconds, gameState.turnNumber, gameState.phase]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
  const handleSelectVertex = (vertexId: number) => {
    if (!isMyTurn || isRolling) return;

    if (gameState.phase === 'SETUP_ROUND_1_SETTLEMENT' || gameState.phase === 'SETUP_ROUND_2_SETTLEMENT') {
      handleDispatch({ type: 'PLACE_INITIAL_SETTLEMENT', vertexId });
    } else if (gameState.phase === 'TURN_ACTIONS') {
      if (buildMode === 'settlement') {
        handleDispatch({ type: 'BUILD_SETTLEMENT', vertexId });
        setBuildMode(null);
      } else if (buildMode === 'city') {
        handleDispatch({ type: 'BUILD_CITY', vertexId });
        setBuildMode(null);
      }
    }
  };

  const handleSelectEdge = (edgeId: number) => {
    if (!isMyTurn || isRolling) return;

    if (gameState.phase === 'SETUP_ROUND_1_ROAD' || gameState.phase === 'SETUP_ROUND_2_ROAD') {
      handleDispatch({ type: 'PLACE_INITIAL_ROAD', edgeId });
    } else if (gameState.phase === 'TURN_ACTIONS' && buildMode === 'road') {
      handleDispatch({ type: 'BUILD_ROAD', edgeId });
      if (gameState.freeRoadsRemaining <= 1) {
        setBuildMode(null);
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
        />
      </div>

      {/* TOP-LEFT: Floating Utility Toolbar (Settings, Rules, Fullscreen, Info) */}
      <div className="hud-top-left-toolbar" role="toolbar" aria-label="Quick tools">
        <button
          type="button"
          className="hud-tool-btn"
          onClick={() => setIsSettingsOpen(true)}
          title="Game Settings & Audio"
          aria-label="Open settings"
        >
          <Settings size={18} />
        </button>
        <button
          type="button"
          className="hud-tool-btn"
          onClick={() => setIsRulebookOpen(true)}
          title="Rulebook & Guide"
          aria-label="Open rulebook"
        >
          <BookOpen size={18} />
        </button>
        <button
          type="button"
          className="hud-tool-btn"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          aria-label="Toggle fullscreen"
        >
          <Maximize2 size={18} />
        </button>
        <button
          type="button"
          className="hud-tool-btn"
          onClick={() => setIsSettingsOpen(true)}
          title={`Table ${roomCode} · Turn ${gameState.turnNumber}`}
          aria-label="Table info"
        >
          <Info size={18} />
        </button>
      </div>

      {/* TOP-CENTER: Floating Objective Ribbon Banner */}
      <div className="hud-top-ribbon-wrap" pointer-events="none">
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
          onOpenBankTrade={() => setIsBankModalOpen(true)}
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

      {/* BOTTOM DOCK: Resource Hand Tray (Left) + Turn Pill & Actions Group (Right) */}
      <div className="hud-bottom-dock">
        <ResourceHand
          resources={me.resources}
          onOpenBankTrade={() => setIsBankModalOpen(true)}
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
          onOpenTradeModal={() => setIsTradeModalOpen(true)}
          onOpenDevCardModal={() => setIsDevCardModalOpen(true)}
          onEndTurn={() => handleDispatch({ type: 'END_TURN' })}
          freeRoadsRemaining={gameState.freeRoadsRemaining}
          turnTimeRemainingSeconds={remainingSeconds}
        />
      </div>

      {/* 3D Dice Tray (Positioned neatly in top-left below utility tools) */}
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

      {/* Incoming Trade Offer Alert Banner */}
      {gameState.activeTradeOffer && gameState.activeTradeOffer.fromPlayerId !== me.id && (
        <button
          type="button"
          className="hud-trade-alert-pill"
          onClick={() => setIsTradeModalOpen(true)}
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
        canOffer={isMyTurn && gameState.phase === 'TURN_ACTIONS'}
        currentPlayer={me}
        players={gameState.players}
        activeOffer={gameState.activeTradeOffer}
        onCreateOffer={(give, want) => handleDispatch({ type: 'CREATE_TRADE_OFFER', give, want })}
        onRespondOffer={(accept) => handleDispatch({ type: 'RESPOND_TRADE_OFFER', accept, playerId: me.id })}
        onConfirmTrade={(targetPlayerId) => handleDispatch({ type: 'CONFIRM_TRADE_OFFER', targetPlayerId })}
        onCancelOffer={() => handleDispatch({ type: 'CANCEL_TRADE_OFFER' })}
      />

      <BankTradeModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        player={me}
        onExecuteTrade={(give, get, count) =>
          handleDispatch({ type: 'BANK_TRADE', giveResource: give, getResource: get, count })
        }
      />

      <DevCardModal
        isOpen={isDevCardModalOpen}
        onClose={() => setIsDevCardModalOpen(false)}
        canPlay={isMyTurn && gameState.phase === 'TURN_ACTIONS' && !gameState.devCardPlayedThisTurn}
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
