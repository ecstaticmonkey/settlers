import {
  GameState,
  GameAction,
  Resource,
  Player,
} from './types';
import {
  isVertexDistanceRuleSatisfied,
  isVertexConnectedToPlayerRoad,
  isEdgeConnectedToPlayerNetwork,
  canAfford,
  BUILDING_COSTS,
  getTotalResources,
} from './engine';

export function getBotAction(state: GameState): GameAction | null {
  const activePlayer = state.players[state.activePlayerIndex];

  // Discard phase check (even if not active player, bot needs to discard!)
  if (state.phase === 'TURN_ROBBER_DISCARD') {
    const discardingBot = state.players.find((p) => p.isBot && p.discardRequired > 0 && !p.hasDiscarded);
    if (discardingBot) {
      const discards: Partial<Record<Resource, number>> = {};
      let remaining = discardingBot.discardRequired;

      // Prioritize discarding resources they have excess of
      const resourceOrder: Resource[] = ['sheep', 'wood', 'brick', 'wheat', 'ore'];
      const currentRes = { ...discardingBot.resources };

      while (remaining > 0) {
        // Find resource with highest count
        let bestRes: Resource = 'wood';
        let maxCount = -1;
        for (const res of resourceOrder) {
          if ((currentRes[res] || 0) > maxCount) {
            maxCount = currentRes[res] || 0;
            bestRes = res;
          }
        }

        if (maxCount <= 0) break;
        discards[bestRes] = (discards[bestRes] || 0) + 1;
        currentRes[bestRes]--;
        remaining--;
      }

      return {
        type: 'DISCARD_RESOURCES',
        playerId: discardingBot.id,
        resources: discards,
      };
    }
    return null;
  }

  // If active player is not a bot, do nothing
  if (!activePlayer.isBot) {
    return null;
  }

  // 1. Initial Settlement Placement
  if (
    state.phase === 'SETUP_ROUND_1_SETTLEMENT' ||
    state.phase === 'SETUP_ROUND_2_SETTLEMENT'
  ) {
    const validVertices: { id: number; score: number }[] = [];

    state.board.vertices.forEach((v) => {
      if (isVertexDistanceRuleSatisfied(state.board, v.id)) {
        let pipSum = 0;
        const resourceSet = new Set<Resource>();

        v.adjacentHexIds.forEach((hId) => {
          const hex = state.board.hexes[hId];
          if (hex && hex.resource) {
            pipSum += hex.pips;
            resourceSet.add(hex.resource);
          }
        });

        // Diversity bonus + port bonus
        const score = pipSum * 2 + resourceSet.size * 3 + (v.port ? 2 : 0);
        validVertices.push({ id: v.id, score });
      }
    });

    validVertices.sort((a, b) => b.score - a.score);
    if (validVertices.length > 0) {
      return { type: 'PLACE_INITIAL_SETTLEMENT', vertexId: validVertices[0].id };
    }
  }

  // 2. Initial Road Placement
  if (
    state.phase === 'SETUP_ROUND_1_ROAD' ||
    state.phase === 'SETUP_ROUND_2_ROAD'
  ) {
    if (state.lastPlacedVertexId !== null) {
      const startV = state.board.vertices[state.lastPlacedVertexId];
      if (startV) {
        const availableEdges = startV.adjacentEdgeIds.filter((eId) => !state.board.edges[eId]?.road);
        if (availableEdges.length > 0) {
          // Choose edge that leads toward best unoccupied vertex
          let bestEdgeId = availableEdges[0];
          let bestScore = -1;

          availableEdges.forEach((eId) => {
            const edge = state.board.edges[eId];
            const otherVId = edge.v1 === startV.id ? edge.v2 : edge.v1;
            const otherV = state.board.vertices[otherVId];

            let score = 0;
            otherV.adjacentHexIds.forEach((hId) => {
              score += state.board.hexes[hId]?.pips || 0;
            });
            if (otherV.port) score += 2;

            if (score > bestScore) {
              bestScore = score;
              bestEdgeId = eId;
            }
          });

          return { type: 'PLACE_INITIAL_ROAD', edgeId: bestEdgeId };
        }
      }
    }
  }

  // 3. Roll Dice
  if (state.phase === 'TURN_ROLL') {
    return { type: 'ROLL_DICE' };
  }

  // 4. Robber Move
  if (state.phase === 'TURN_ROBBER_MOVE') {
    // Find hex with highest opponent pips that does not contain bot's own buildings
    let bestHexId = -1;
    let maxOpponentScore = -1;

    state.board.hexes.forEach((hex) => {
      if (hex.id === state.board.robberHexId || hex.terrain === 'desert') return;

      let hasMyBuilding = false;
      let opponentPips = 0;

      hex.vertexIds.forEach((vId) => {
        const building = state.board.vertices[vId]?.building;
        if (building) {
          if (building.playerId === activePlayer.id) {
            hasMyBuilding = true;
          } else {
            opponentPips += hex.pips * (building.type === 'city' ? 2 : 1);
          }
        }
      });

      if (!hasMyBuilding && opponentPips > maxOpponentScore) {
        maxOpponentScore = opponentPips;
        bestHexId = hex.id;
      }
    });

    if (bestHexId === -1) {
      // Pick any non-desert hex without own buildings
      const validHexes = state.board.hexes.filter(
        (h) => h.id !== state.board.robberHexId && h.terrain !== 'desert'
      );
      bestHexId = validHexes[0]?.id || 0;
    }

    return { type: 'MOVE_ROBBER', hexId: bestHexId };
  }

  // 5. Robber Steal
  if (state.phase === 'TURN_ROBBER_STEAL') {
    if (state.eligibleStealTargetPlayerIds.length > 0) {
      // Pick opponent with highest victory points
      const targets = state.players.filter((p) => state.eligibleStealTargetPlayerIds.includes(p.id));
      targets.sort((a, b) => b.victoryPoints - a.victoryPoints);
      return { type: 'STEAL_RESOURCE', targetPlayerId: targets[0].id };
    }
  }

  // 6. Turn Actions Phase
  if (state.phase === 'TURN_ACTIONS') {
    // Play Knight dev card if owned and robber is blocking own high-producing hex
    if (
      !state.devCardPlayedThisTurn &&
      (activePlayer.devCards.knight || 0) > 0
    ) {
      const currentRobberHex = state.board.hexes[state.board.robberHexId];
      const robberBlocksMe = currentRobberHex?.vertexIds.some(
        (vId) => state.board.vertices[vId]?.building?.playerId === activePlayer.id
      );
      if (robberBlocksMe) {
        return { type: 'PLAY_DEV_CARD', card: 'knight' };
      }
    }

    // A. Upgrade to City if affordable
    if (activePlayer.citiesLeft > 0 && canAfford(activePlayer, BUILDING_COSTS.city)) {
      const upgradable = state.board.vertices.find(
        (v) => v.building && v.building.type === 'settlement' && v.building.playerId === activePlayer.id
      );
      if (upgradable) {
        return { type: 'BUILD_CITY', vertexId: upgradable.id };
      }
    }

    // B. Build Settlement if affordable
    if (activePlayer.settlementsLeft > 0 && canAfford(activePlayer, BUILDING_COSTS.settlement)) {
      const buildable = state.board.vertices.find(
        (v) =>
          !v.building &&
          isVertexDistanceRuleSatisfied(state.board, v.id) &&
          isVertexConnectedToPlayerRoad(state.board, v.id, activePlayer.id)
      );
      if (buildable) {
        return { type: 'BUILD_SETTLEMENT', vertexId: buildable.id };
      }
    }

    // C. Build Road if affordable
    if (activePlayer.roadsLeft > 0 && (state.freeRoadsRemaining > 0 || canAfford(activePlayer, BUILDING_COSTS.road))) {
      const buildableEdge = state.board.edges.find(
        (e) => !e.road && isEdgeConnectedToPlayerNetwork(state.board, e.id, activePlayer.id)
      );
      if (buildableEdge) {
        return { type: 'BUILD_ROAD', edgeId: buildableEdge.id };
      }
    }

    // D. Buy Dev Card if affordable
    if (
      state.devCardDeck.length > 0 &&
      canAfford(activePlayer, BUILDING_COSTS.dev_card) &&
      Math.random() > 0.3
    ) {
      return { type: 'BUY_DEV_CARD' };
    }

    // E. Bank trade if one resource away from settlement/city
    const resTypes: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
    for (const res of resTypes) {
      let ratio = 4;
      if (activePlayer.portsOwned.includes('generic_3_1')) ratio = 3;
      if (activePlayer.portsOwned.includes(`${res}_2_1`)) ratio = 2;

      if ((activePlayer.resources[res] || 0) >= ratio) {
        // Find missing resource
        const needed = resTypes.find((r) => r !== res && (activePlayer.resources[r] || 0) === 0);
        if (needed) {
          return {
            type: 'BANK_TRADE',
            giveResource: res,
            getResource: needed,
            count: 1,
          };
        }
      }
    }

    // If nothing else to do, end turn
    return { type: 'END_TURN' };
  }

  return null;
}
