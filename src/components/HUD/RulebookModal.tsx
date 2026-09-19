'use client';

import React from 'react';
import { Dialog } from '../UI/Dialog';
import { Trophy, Dices, Layers, Anchor } from 'lucide-react';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Dialog title="Settlers Rulebook" onClose={onClose}>
      <div className="rulebook-content">
        <section className="rulebook-section" aria-label="Resource legend">
          <h3><Layers size={16} /> Resource guide</h3>
          <dl className="resource-legend">
            <div><dt>Forest</dt><dd>Wood</dd></div>
            <div><dt>Hills</dt><dd>Brick</dd></div>
            <div><dt>Fields</dt><dd>Wheat</dd></div>
            <div><dt>Pasture</dt><dd>Sheep</dd></div>
            <div><dt>Mountains</dt><dd>Ore</dd></div>
          </dl>
          <p>The desert produces no resources. Hand counts show cards you own; bank counts show cards available. Player stats show resource cards held, development cards held, and unbuilt settlements (homes) and roads remaining.</p>
        </section>
        <section className="rulebook-section">
          <h3>
            <Trophy size={16} /> Objective
          </h3>
          <p>
            The first settler to reach <strong>10 Victory Points</strong> wins the island!
            Points come from settlements (1 VP), cities (2 VP), Longest Road (2 VP), Largest Army (2 VP),
            and Victory Point development cards.
          </p>
        </section>

        <section className="rulebook-section">
          <h3>
            <Dices size={16} /> Turn Sequence
          </h3>
          <ol>
            <li>
              <strong>1. Roll the Dice:</strong> Hexes matching the roll produce resources for all settlements (1 resource) and cities (2 resources) adjacent to that tile. Rolling a 7 activates the Robber!
            </li>
            <li>
              <strong>2. Trade:</strong> Trade resource cards freely with other players or with the bank / maritime harbors.
            </li>
            <li>
              <strong>3. Build & Buy:</strong> Spend resources to build roads, settlements, upgrade cities, or purchase Development Cards.
            </li>
          </ol>
        </section>

        <section className="rulebook-section">
          <h3>
            <Layers size={16} /> Building Costs
          </h3>
          <div className="rulebook-costs-grid">
            <div className="cost-card">
              <strong>Road</strong>
              <span>1 Wood · 1 Brick</span>
              <small>Expands your network along paths</small>
            </div>
            <div className="cost-card">
              <strong>Settlement</strong>
              <span>1 Wood · 1 Brick · 1 Wheat · 1 Sheep</span>
              <small>Worth 1 VP. Must be 2 paths away from others</small>
            </div>
            <div className="cost-card">
              <strong>City</strong>
              <span>2 Wheat · 3 Ore</span>
              <small>Upgrades a settlement. Worth 2 VP. Doubles yields</small>
            </div>
            <div className="cost-card">
              <strong>Dev Card</strong>
              <span>1 Wheat · 1 Sheep · 1 Ore</span>
              <small>Knights, Road Building, Plenty, Monopoly, or VP</small>
            </div>
          </div>
        </section>

        <section className="rulebook-section">
          <h3>
            <Anchor size={16} /> Maritime Harbors
          </h3>
          <p>
            Default bank trade rate is <strong>4:1</strong> of identical resources for 1 of your choice.
            Settling on a <strong>3:1 port</strong> reduces the cost to 3 identical resources.
            Settling on a <strong>2:1 resource harbor</strong> allows trading 2 of that specific resource for 1 of any kind.
          </p>
        </section>
      </div>
    </Dialog>
  );
};
