'use client';

import React from 'react';
import { GameArtwork } from '../UI/GameArtwork';
import { Player } from '@/lib/catan/types';
import { PIECE_COLORS } from '../Board/island-scene';

interface Props {
  players: Player[];
  activePlayerIndex: number;
  longestRoadOwnerId: string | null;
  longestRoadLength: number;
  largestArmyOwnerId: string | null;
  largestArmyCount: number;
  currentPlayerId: string;
}

export function PlayerRoster({
  players,
  activePlayerIndex,
  longestRoadOwnerId,
  largestArmyOwnerId,
  currentPlayerId,
}: Props) {
  return (
    <div className="player-roster-column" role="region" aria-label="Settlers around the table">
      {players.map((p, i) => {
        const isActive = i === activePlayerIndex;
        const isCurrent = p.id === currentPlayerId;
        const points = isCurrent ? p.secretVictoryPoints : p.victoryPoints;
        const totalResources = Object.values(p.resources).reduce((a, b) => a + b, 0);
        const totalDevCards =
          Object.values(p.devCards).reduce((a, b) => a + b, 0) +
          Object.values(p.boughtDevCardsThisTurn).reduce((a, b) => a + b, 0);
        const playerColor = PIECE_COLORS[p.color] || '#881337';

        return (
          <div
            key={p.id}
            className={`roster-player-card ${isActive ? 'roster-player-active' : ''} ${isCurrent ? 'roster-player-self' : ''}`}
            style={{ '--player-accent': playerColor } as React.CSSProperties}
          >
            {/* Left: Avatar & Victory Points Ribbon */}
            <div className="roster-avatar-column">
              <div
                className="roster-avatar-circle"
                style={{ backgroundColor: playerColor, color: p.color === 'white' ? 'var(--paper)' : 'var(--ink)' }}
                aria-hidden="true"
              >
                <GameArtwork kind="pawn" />
              </div>
              <div className="roster-vp-ribbon" title={`${points} Victory Points`} aria-label={`${points} Victory Points`}>
                <span className="roster-vp-score">{points}</span>

                <span className="sr-only">victory points</span>
              </div>
            </div>

            {/* Player name, cards, knights played, and longest route. */}
            <div className="roster-player-details">
              <div className="roster-name-row">
                <span className="roster-player-name">{p.name.replace(' (Bot)', '')}</span>
                {isCurrent && <span className="roster-you-badge">YOU</span>}
                {isActive && <span className="roster-turn-dot" title="Active turn" />}
                {longestRoadOwnerId === p.id && (
                  <span className="roster-special-badge" title="Longest Road">
                    <GameArtwork kind="longest-road" />
                  </span>
                )}
                {largestArmyOwnerId === p.id && (
                  <span className="roster-special-badge" title="Largest Army">
                    <GameArtwork kind="army" />
                  </span>
                )}
              </div>

              <div className="roster-stats-grid">
                {/* Resource Cards Badge (blue card with ? in photo) */}
                <div
                  className="roster-stat-badge roster-badge-resources"
                  title={`${totalResources} resource cards in hand`}
                >
                  <GameArtwork kind="hidden-card" />
                  <span className="roster-badge-val">{totalResources}</span>
                  <span className="roster-stat-label sr-only">Hand</span>
                </div>

                {/* Dev Cards Badge */}
                <div
                  className="roster-stat-badge roster-badge-dev"
                  title={`${totalDevCards} development cards held`}
                >
                  <GameArtwork kind="development" />
                  <span className="roster-badge-val">{totalDevCards}</span>
                  <span className="roster-stat-label sr-only">Dev cards</span>
                </div>

                {/* Played knights count toward Largest Army. */}
                <div
                  className="roster-stat-badge roster-badge-army"
                  title={`${p.playedKnights} knights played`}
                >
                  <GameArtwork kind="army" />
                  <span className="roster-badge-val">{p.playedKnights}</span>
                  <span className="roster-stat-label sr-only">Knights played</span>
                </div>

                {/* Longest connected route, not remaining road stock. */}
                <div
                  className="roster-stat-badge roster-badge-roads"
                  title={`${p.longestRoadLength} roads in longest route`}
                >
                  <GameArtwork kind="longest-road" />
                  <span className="roster-badge-val">{p.longestRoadLength}</span>
                  <span className="roster-stat-label sr-only">Longest road</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
