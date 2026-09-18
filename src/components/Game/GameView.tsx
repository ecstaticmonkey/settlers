'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameAction } from '@/lib/catan/types';
import { roomService } from '@/lib/multiplayer/room-service';
import { soundManager } from '@/lib/sound/audio';
import { CatanBoard } from '../Board/CatanBoard';
import { PlayerRoster } from '../HUD/PlayerRoster';
import { ResourceHand } from '../HUD/ResourceHand';
import { ActionBar } from '../HUD/ActionBar';
import { TradeModal } from '../HUD/TradeModal';
import { BankTradeModal } from '../HUD/BankTradeModal';
import { DevCardModal } from '../HUD/DevCardModal';
import { RobberModal } from '../HUD/RobberModal';
import { GameLog } from '../HUD/GameLog';
import { VictoryModal } from '../HUD/VictoryModal';
import { Volume2, VolumeX, LogOut, Home, BookOpen, Trophy, X } from 'lucide-react';

import dynamic from 'next/dynamic';
const DiceTray = dynamic(() => import('../HUD/DiceTray'), { ssr: false });

import { Brand } from '../UI/Brand';
import { Dialog } from '../UI/Dialog';

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
  const [journalOpen, setJournalOpen] = useState(false);
  // Modal open states
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isDevCardModalOpen, setIsDevCardModalOpen] = useState(false);

  // Subscribe to real-time game state updates
  useEffect(() => {
    const unsubscribe = roomService.subscribeToGameState(roomId, (newState) => {
      setGameState(newState);

      // Play audio cues based on phase transitions
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

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const me = gameState.players.find((p) => p.id === currentPlayerId) || gameState.players[0];
  const isMyTurn = activePlayer?.id === me.id;

  const handleRollDice = async () => {
    if (rollInFlight.current || isRolling || !isMyTurn || gameState.phase !== 'TURN_ROLL') return;
    rollInFlight.current = true;
    setRollPending(true);
    try { await handleDispatch({ type: 'ROLL_DICE' }); }
    finally { rollInFlight.current = false; setRollPending(false); }
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
      // Keep road build mode if free roads remaining
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

  const setup = gameState.phase.startsWith('SETUP');
  const placingRoad = gameState.phase.endsWith('_ROAD');
  const prompt = setup ? (placingRoad ? 'Connect your settlement' : 'Choose a place to call home') : gameState.phase === 'TURN_ROLL' ? 'A new turn. New possibilities.' : gameState.phase === 'TURN_ROBBER_MOVE' ? 'The robber is on the move' : gameState.phase === 'TURN_ROBBER_DISCARD' ? 'Make room in your hand' : buildMode ? `Build your ${buildMode}` : 'Make your next move';
  const detail = !isMyTurn ? `${activePlayer.name.replace(' (Bot)', '')} is ${setup ? 'placing their first pieces' : 'taking their turn'}.` : setup ? (placingRoad ? 'Choose a highlighted path next to your new settlement.' : 'Choose a glowing intersection. A mix of resources is a good start.') : gameState.phase === 'TURN_ROLL' ? 'Roll the dice to see what the island provides.' : gameState.phase === 'TURN_ROBBER_MOVE' ? 'Select a number token to choose a different hex.' : gameState.phase === 'TURN_ROBBER_DISCARD' ? 'Players with more than seven resources must discard half.' : buildMode ? 'Choose a highlighted location on the island.' : 'Build, trade, or play a card. End your turn when you’re ready.';
  return (
    <div className="game-shell">
      <header className="game-header"><Brand compact/><div className="game-header-meta"><span>THE MAIN ISLAND</span><span>Table <b>{roomCode}</b></span><span>Turn <b>{gameState.turnNumber}</b></span></div><div className="game-header-actions"><button className="icon-button mobile-journal-toggle" aria-label="Open island journal" onClick={()=>setJournalOpen(true)}><BookOpen size={16}/></button><button className="icon-button" onClick={toggleSound} aria-label={isMuted?'Unmute sound':'Mute sound'}>{isMuted?<VolumeX size={16}/>:<Volume2 size={16}/>}</button><button className="text-button" onClick={onLeaveGame}><LogOut size={15}/>Lobby</button></div></header>
      <main className="game-table">
        <div className="game-center">
          <div className={`board-stage ${!setup ? 'board-with-dice' : ''}`}><div className="board-heading"><span className="eyebrow">YOUR WORLD, TAKING SHAPE</span><h2>The main island</h2><p>{setup?'Every adventure starts somewhere.':'A little strategy goes a long way.'}</p></div><span className="board-edition">CATAN / 01</span>
            <CatanBoard board={gameState.board} phase={gameState.phase} activePlayer={activePlayer} currentPlayerId={me.id} buildMode={buildMode} lastPlacedVertexId={gameState.lastPlacedVertexId} onSelectVertex={handleSelectVertex} onSelectEdge={handleSelectEdge} onSelectHex={handleSelectHex}/>
            {!setup && <DiceTray dice={gameState.dice} turn={gameState.turnNumber} canRoll={isMyTurn && gameState.phase === 'TURN_ROLL' && !rollPending} playerName={activePlayer.name.replace(' (Bot)', '')} onRoll={handleRollDice} onRollingChange={setIsRolling}/> }
            {error&&<div className="notice notice-error game-error" role="alert">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}><X size={16}/></button></div>}
          </div>
          <div className={`turn-banner ${isMyTurn?'my-turn':''}`} role="status"><span className="turn-banner-icon"><Home size={18}/></span><div><h3>{isMyTurn?prompt:`${activePlayer.name.replace(' (Bot)','')}’s turn`}</h3><p>{detail}</p></div><small>{setup?'Founding the island':isMyTurn?'Your turn':'Around the table'}</small></div>
          {gameState.activeTradeOffer && gameState.activeTradeOffer.fromPlayerId!==me.id&&<button className="notice" onClick={()=>setIsTradeModalOpen(true)}>A settler has offered a trade. View offer →</button>}
          <ResourceHand resources={me.resources} onOpenBankTrade={()=>setIsBankModalOpen(true)} canTrade={isMyTurn&&!isRolling&&gameState.phase==='TURN_ACTIONS'}/>
        </div>
        <aside className="game-sidebar"><section><div className="sidebar-heading"><span className="eyebrow">AROUND THE TABLE</span><span>{gameState.players.length} settlers</span></div><PlayerRoster players={gameState.players} activePlayerIndex={gameState.activePlayerIndex} longestRoadOwnerId={gameState.longestRoadOwnerId} longestRoadLength={gameState.longestRoadLength} largestArmyOwnerId={gameState.largestArmyOwnerId} largestArmyCount={gameState.largestArmyCount} currentPlayerId={me.id}/><p className="achievement-note"><Trophy size={14}/> The first to 10 points takes the island.</p></section><GameLog logs={gameState.logs}/></aside>
      </main>
      <ActionBar phase={gameState.phase} player={me} isMyTurn={isMyTurn} rolling={isRolling || rollPending} buildMode={buildMode} onSetBuildMode={setBuildMode} onRollDice={handleRollDice} onBuyDevCard={()=>handleDispatch({type:'BUY_DEV_CARD'})} onOpenTradeModal={()=>setIsTradeModalOpen(true)} onOpenDevCardModal={()=>setIsDevCardModalOpen(true)} onEndTurn={()=>handleDispatch({type:'END_TURN'})} freeRoadsRemaining={gameState.freeRoadsRemaining}/>
      {journalOpen&&<Dialog title="Island journal" onClose={()=>setJournalOpen(false)}><div className="journal-dialog"><GameLog logs={gameState.logs}/></div></Dialog>}
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
    </div>
  );
};
