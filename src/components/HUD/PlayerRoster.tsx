'use client';

import React from 'react';
import { Bot, Layers, Shield, Trophy, Home, Route } from 'lucide-react';
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
        const playerColor = PIECE_COLORS[p.color] || '#cb5a34';

        return (
          <div
            key={p.id}
            className={`roster-player-card ${isActive ? 'roster-player-active' : ''}`}
            style={{ '--player-accent': playerColor } as React.CSSProperties}
          >
            {/* Left: Avatar & Victory Points Ribbon */}
            <div className="roster-avatar-column">
              <div
                className="roster-avatar-circle"
                style={{ backgroundColor: playerColor }}
                aria-hidden="true"
              >
                {p.isBot ? <Bot size={18} /> : p.name[0]}
              </div>
              <div className="roster-vp-ribbon" title={`${points} Victory Points`}>
                <span className="roster-vp-score">{points}</span>
                <Trophy size={10} className="roster-vp-trophy" />
              </div>
            </div>

            {/* Right: Player Name & Inventory Stats Badges (Cards, Dev, Settlements, Roads) */}
            <div className="roster-player-details">
              <div className="roster-name-row">
                <span className="roster-player-name">{p.name.replace(' (Bot)', '')}</span>
                {isCurrent && <span className="roster-you-badge">YOU</span>}
                {isActive && <span className="roster-turn-dot" title="Active turn" />}
                {longestRoadOwnerId === p.id && (
                  <span className="roster-special-badge" title="Longest Road">
                    🛣️
                  </span>
                )}
                {largestArmyOwnerId === p.id && (
                  <span className="roster-special-badge" title="Largest Army">
                    🛡️
                  </span>
                )}
              </div>

              <div className="roster-stats-grid">
                {/* Resource Cards Badge (blue card with ? in photo) */}
                <div
                  className="roster-stat-badge roster-badge-resources"
                  title={`${totalResources} resource cards in hand`}
                >
                  <span className="roster-badge-icon" style={{ fontWeight: 800, fontSize: '11px' }}>?</span>
                  <span className="roster-badge-val">{totalResources}</span>
                </div>

                {/* Dev Cards Badge */}
                <div
                  className="roster-stat-badge roster-badge-dev"
                  title={`${totalDevCards} development cards held`}
                >
                  <Layers size={13} className="roster-badge-icon" />
                  <span className="roster-badge-val">{totalDevCards}</span>
                </div>

                {/* Settlements Remaining Badge */}
                <div
                  className="roster-stat-badge roster-badge-settlements"
                  title={`${p.settlementsLeft} settlements remaining in stock`}
                >
                  <Home size={13} className="roster-badge-icon" />
                  <span className="roster-badge-val">{p.settlementsLeft}</span>
                </div>

                {/* Roads Remaining Badge */}
                <div
                  className="roster-stat-badge roster-badge-roads"
                  title={`${p.roadsLeft} roads remaining in stock`}
                >
                  <Route size={13} className="roster-badge-icon" />
                  <span className="roster-badge-val">{p.roadsLeft}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
