'use client';

import React from 'react';
import { GamePhase, Player } from '@/lib/catan/types';
import { canAfford, BUILDING_COSTS } from '@/lib/catan/engine';
import { Dices, Home, Castle, Route, Layers, ArrowLeftRight, ArrowRight, Hourglass, MapPin } from 'lucide-react';
import { PIECE_COLORS } from '../Board/island-scene';

interface Props {
  phase: GamePhase;
  player: Player;
  activePlayer: Player;
  isMyTurn: boolean;
  rolling: boolean;
  buildMode: 'road' | 'settlement' | 'city' | null;
  onSetBuildMode: (m: 'road' | 'settlement' | 'city' | null) => void;
  onRollDice: () => void;
  onBuyDevCard: () => void;
  onOpenTradeModal: () => void;
  onOpenDevCardModal: () => void;
  onEndTurn: () => void;
  freeRoadsRemaining: number;
  turnTimeRemainingSeconds?: number;
}

export function ActionBar({
  phase,
  player,
  activePlayer,
  isMyTurn,
  rolling,
  buildMode,
  onSetBuildMode,
  onRollDice,
  onOpenTradeModal,
  onOpenDevCardModal,
  onEndTurn,
  freeRoadsRemaining,
  turnTimeRemainingSeconds = 30,
}: Props) {
  const actions = phase === 'TURN_ACTIONS' && isMyTurn && !rolling;
  const setup = phase.startsWith('SETUP');
  const setupRoad = phase.endsWith('_ROAD');

  const costs = {
    road: '1 wood · 1 brick',
    settlement: '1 wood · 1 brick · 1 wheat · 1 sheep',
    city: '2 wheat · 3 ore',
  };

  // Turn status label
  const activeName = activePlayer.name.replace(' (Bot)', '');
  let turnStatus = '';
  if (setup) {
    turnStatus = !isMyTurn
      ? `${activeName} is Placing ${setupRoad ? 'Road' : 'Settlement'}`
      : `Placing ${setupRoad ? 'Road' : 'Settlement'}`;
  } else if (phase === 'TURN_ROLL') {
    turnStatus = !isMyTurn ? `${activeName} is Rolling Dice` : 'Roll the Dice';
  } else if (phase === 'TURN_ROBBER_MOVE') {
    turnStatus = !isMyTurn ? `${activeName} is Moving Robber` : 'Move the Robber';
  } else if (phase === 'TURN_ROBBER_STEAL') {
    turnStatus = !isMyTurn ? `${activeName} is Stealing` : 'Choose Player to Steal';
  } else if (phase === 'TURN_ROBBER_DISCARD') {
    turnStatus = 'Discarding Half Cards';
  } else if (phase === 'TURN_ACTIONS') {
    turnStatus = !isMyTurn ? `${activeName} is Trading & Building` : 'Trade & Build';
  } else if (phase === 'GAME_OVER') {
    turnStatus = 'Game Over';
  } else {
    turnStatus = `${activeName}'s Move`;
  }

  // Timer format (mm:ss)
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bottom-action-dock" role="region" aria-label="Game controls and turn status">
      {/* Turn Pill & Timer (Mirrored from Photo) */}
      <div className={`turn-pill ${isMyTurn ? 'turn-pill-active' : ''}`}>
        <div
          className="turn-pill-avatar"
          style={{ backgroundColor: PIECE_COLORS[activePlayer.color] }}
          aria-hidden="true"
        >
          {phase === 'TURN_ROLL' ? <Dices size={18} /> : activePlayer.isBot ? '🤖' : activePlayer.name[0]}
        </div>
        <div className="turn-pill-info">
          <span className="turn-pill-title">{turnStatus}</span>
          <span className="turn-pill-phase">
            {setup ? 'Setup Round' : isMyTurn ? 'Your Move' : `${activeName}'s Turn`}
          </span>
        </div>
        <div className="turn-pill-timer" aria-label="Turn time remaining">
          {formatTimer(turnTimeRemainingSeconds)}
        </div>
      </div>

      {/* Action Buttons Toolbar (Mirrored from Photo: Trade, Cards, Road, Settlement, City, Action) */}
      <div className="action-buttons-group">
        {/* Trade Button */}
        <button
          type="button"
          className="hud-action-btn"
          onClick={onOpenTradeModal}
          disabled={setup || rolling}
          title="Trade with players"
          aria-label="Trade with players"
        >
          <ArrowLeftRight size={22} />
          <span className="hud-action-label">Trade</span>
        </button>

        {/* Development Cards Button */}
        <button
          type="button"
          className="hud-action-btn"
          onClick={onOpenDevCardModal}
          disabled={rolling}
          title="Development cards (Play or Buy)"
          aria-label="Development cards"
        >
          <Layers size={22} />
          <span className="hud-action-label">Cards</span>
        </button>

        <div className="hud-action-separator" aria-hidden="true" />

        {/* Road Build Button */}
        {(() => {
          const supply = player.roadsLeft;
          const affordable = freeRoadsRemaining > 0 || canAfford(player, BUILDING_COSTS.road);
          const isSelected = buildMode === 'road';
          return (
            <button
              type="button"
              className={`hud-action-btn hud-build-btn ${isSelected ? 'hud-btn-selected' : ''}`}
              disabled={!actions || !affordable || supply <= 0}
              title={`Road (${costs.road})${!affordable ? ' — Needs resources' : ''}`}
              onClick={() => onSetBuildMode(isSelected ? null : 'road')}
              aria-label={`Build road (${supply} left)`}
            >
              <span className="hud-badge">{freeRoadsRemaining > 0 ? `${freeRoadsRemaining}*` : supply}</span>
              <Route size={22} />
              <span className="hud-action-label">Road</span>
            </button>
          );
        })()}

        {/* Settlement Build Button */}
        {(() => {
          const supply = player.settlementsLeft;
          const affordable = canAfford(player, BUILDING_COSTS.settlement);
          const isSelected = buildMode === 'settlement';
          return (
            <button
              type="button"
              className={`hud-action-btn hud-build-btn ${isSelected ? 'hud-btn-selected' : ''}`}
              disabled={!actions || !affordable || supply <= 0}
              title={`Settlement (${costs.settlement})${!affordable ? ' — Needs resources' : ''}`}
              onClick={() => onSetBuildMode(isSelected ? null : 'settlement')}
              aria-label={`Build settlement (${supply} left)`}
            >
              <span className="hud-badge">{supply}</span>
              <Home size={22} />
              <span className="hud-action-label">Settle</span>
            </button>
          );
        })()}

        {/* City Build Button */}
        {(() => {
          const supply = player.citiesLeft;
          const affordable = canAfford(player, BUILDING_COSTS.city);
          const isSelected = buildMode === 'city';
          return (
            <button
              type="button"
              className={`hud-action-btn hud-build-btn ${isSelected ? 'hud-btn-selected' : ''}`}
              disabled={!actions || !affordable || supply <= 0}
              title={`City (${costs.city})${!affordable ? ' — Needs resources' : ''}`}
              onClick={() => onSetBuildMode(isSelected ? null : 'city')}
              aria-label={`Build city (${supply} left)`}
            >
              <span className="hud-badge">{supply}</span>
              <Castle size={22} />
              <span className="hud-action-label">City</span>
            </button>
          );
        })()}

        {/* Primary Action Button (Roll / End Turn / Waiting Hourglass / Place) */}
        {phase === 'TURN_ROLL' && isMyTurn ? (
          <button
            type="button"
            className="hud-action-btn hud-primary-action"
            disabled={rolling}
            onClick={onRollDice}
            title="Roll the dice"
            aria-label="Roll dice"
          >
            <Dices size={22} className={rolling ? 'animate-spin' : ''} />
            <span className="hud-action-label">{rolling ? 'Rolling…' : 'Roll'}</span>
          </button>
        ) : actions ? (
          <button
            type="button"
            className="hud-action-btn hud-primary-action"
            onClick={() => {
              onSetBuildMode(null);
              onEndTurn();
            }}
            title="End your turn"
            aria-label="End turn"
          >
            <ArrowRight size={22} />
            <span className="hud-action-label">Pass</span>
          </button>
        ) : setup && isMyTurn ? (
          <button
            type="button"
            className="hud-action-btn hud-primary-action"
            title={`Click on a glowing spot on the island to place your ${setupRoad ? 'road' : 'settlement'}`}
            aria-label="Place on board"
          >
            <MapPin size={22} className="animate-bounce" />
            <span className="hud-action-label">Place</span>
          </button>
        ) : (
          <button
            type="button"
            className="hud-action-btn hud-waiting-btn"
            disabled
            title={rolling ? 'Rolling the dice…' : setup ? 'Setup in progress' : 'Waiting for player'}
            aria-label="Waiting"
          >
            <Hourglass size={20} className={isMyTurn ? 'animate-pulse' : ''} />
            <span className="hud-action-label">Wait</span>
          </button>
        )}
      </div>
    </div>
  );
}
