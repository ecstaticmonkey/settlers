import {
  GameBoard,
  GameState,
  GameAction,
  GameLogEvent,
  Player,
  Resource,
  DevCardType,
  PlayerColor,
  PortType,
} from './types';
import { generateCatanBoard } from './board';

export const BUILDING_COSTS: Record<'road' | 'settlement' | 'city' | 'dev_card', Partial<Record<Resource, number>>> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city: { wheat: 2, ore: 3 },
  dev_card: { wheat: 1, sheep: 1, ore: 1 },
};

export const DEV_CARD_NAMES: Record<DevCardType, string> = {
  knight: 'Knight',
  victory_point: 'Victory Point',
  road_building: 'Road Building',
  year_of_plenty: 'Year of Plenty',
  monopoly: 'Monopoly',
};

// Generate standard 25 dev card deck
export function createDevCardDeck(): DevCardType[] {
  const deck: DevCardType[] = [
    // 14 Knights
    ...Array(14).fill('knight' as DevCardType),
    // 5 Victory Points
    ...Array(5).fill('victory_point' as DevCardType),
    // 2 Road Building
    ...Array(2).fill('road_building' as DevCardType),
    // 2 Year of Plenty
    ...Array(2).fill('year_of_plenty' as DevCardType),
    // 2 Monopoly
    ...Array(2).fill('monopoly' as DevCardType),
  ];

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createInitialPlayer(
  id: string,
  name: string,
  color: PlayerColor,
  isBot = false,
  botDifficulty: 'easy' | 'medium' = 'medium'
): Player {
  return {
    id,
    name,
    color,
    isBot,
    botDifficulty,
    resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
    devCards: { knight: 0, victory_point: 0, road_building: 0, year_of_plenty: 0, monopoly: 0 },
    boughtDevCardsThisTurn: { knight: 0, victory_point: 0, road_building: 0, year_of_plenty: 0, monopoly: 0 },
    playedKnights: 0,
    settlementsLeft: 5,
    citiesLeft: 4,
    roadsLeft: 15,
    longestRoadLength: 0,
    victoryPoints: 0,
    secretVictoryPoints: 0,
    discardRequired: 0,
    hasDiscarded: false,
    portsOwned: [],
  };
}

export function createInitialGameState(roomId: string, players: Player[], randomizeBoard = false): GameState {
  const board = generateCatanBoard(randomizeBoard);
  return {
    roomId,
    phase: 'SETUP_ROUND_1_SETTLEMENT',
    turnNumber: 1,
    activePlayerIndex: 0,
    players,
    board,
    dice: null,
    diceRolled: false,
    devCardPlayedThisTurn: false,
    devCardDeck: createDevCardDeck(),
    freeRoadsRemaining: 0,
    lastPlacedVertexId: null,
    activeTradeOffer: null,
    longestRoadOwnerId: null,
    longestRoadLength: 4, // Must reach 5 to claim
    largestArmyOwnerId: null,
    largestArmyCount: 2, // Must reach 3 to claim
    winnerPlayerId: null,
    logs: [
      {
        id: 'init-1',
        timestamp: Date.now(),
        type: 'info',
        message: 'Game started! Initial placement phase begins.',
      },
    ],
    turnTimeLimitSeconds: 60,
    turnTimeRemainingSeconds: 60,
    eligibleStealTargetPlayerIds: [],
  };
}

// Check if player has required resources
export function canAfford(player: Player, cost: Partial<Record<Resource, number>>): boolean {
  for (const [res, amt] of Object.entries(cost)) {
    if ((player.resources[res as Resource] || 0) < (amt || 0)) {
      return false;
    }
  }
  return true;
}

// Deduct cost from player
export function deductResources(player: Player, cost: Partial<Record<Resource, number>>) {
  for (const [res, amt] of Object.entries(cost)) {
    if (amt) {
      player.resources[res as Resource] = Math.max(0, player.resources[res as Resource] - amt);
    }
  }
}

// Add resources to player
export function addResources(player: Player, res: Partial<Record<Resource, number>>) {
  for (const [r, amt] of Object.entries(res)) {
    if (amt) {
      player.resources[r as Resource] = (player.resources[r as Resource] || 0) + amt;
    }
  }
}

export function getTotalResources(player: Player): number {
  return Object.values(player.resources).reduce((sum, count) => sum + count, 0);
}

// Distance rule: vertex cannot be adjacent to any existing building
export function isVertexDistanceRuleSatisfied(board: GameBoard, vertexId: number): boolean {
  const vertex = board.vertices[vertexId];
  if (!vertex || vertex.building) return false;

  for (const adjVId of vertex.adjacentVertexIds) {
    if (board.vertices[adjVId]?.building) {
      return false;
    }
  }
  return true;
}

// Check if vertex is connected to a player's road
export function isVertexConnectedToPlayerRoad(board: GameBoard, vertexId: number, playerId: string): boolean {
  const vertex = board.vertices[vertexId];
  if (!vertex) return false;
  return vertex.adjacentEdgeIds.some((edgeId) => board.edges[edgeId]?.road?.playerId === playerId);
}

// Check if edge is connected to player's existing network
export function isEdgeConnectedToPlayerNetwork(board: GameBoard, edgeId: number, playerId: string): boolean {
  const edge = board.edges[edgeId];
  if (!edge || edge.road) return false;

  // Check if either end has player's settlement/city
  if (board.vertices[edge.v1]?.building?.playerId === playerId) return true;
  if (board.vertices[edge.v2]?.building?.playerId === playerId) return true;

  // Check if either end has adjacent road of same player (unless blocked by opponent building)
  for (const adjEdgeId of edge.adjacentEdgeIds) {
    const adjEdge = board.edges[adjEdgeId];
    if (adjEdge?.road?.playerId === playerId) {
      // Find the shared vertex
      const sharedVertexId = edge.v1 === adjEdge.v1 || edge.v1 === adjEdge.v2 ? edge.v1 : edge.v2;
      const sharedVertex = board.vertices[sharedVertexId];
      // If shared vertex has opponent's building, the road connection is blocked!
      if (!sharedVertex?.building || sharedVertex.building.playerId === playerId) {
        return true;
      }
    }
  }
  return false;
}

// Calculate Longest Road for a player using DFS
export function calculateLongestRoadForPlayer(board: GameBoard, playerId: string): number {
  const playerRoadEdges = board.edges.filter((e) => e.road?.playerId === playerId);
  if (playerRoadEdges.length === 0) return 0;

  let maxLen = 0;

  const dfs = (currentVertexId: number, visitedEdges: Set<number>): number => {
    let longest = 0;
    const currentVertex = board.vertices[currentVertexId];

    // If vertex has an enemy building, paths cannot continue through it
    if (currentVertex.building && currentVertex.building.playerId !== playerId) {
      return 0;
    }

    for (const edgeId of currentVertex.adjacentEdgeIds) {
      if (visitedEdges.has(edgeId)) continue;
      const edge = board.edges[edgeId];
      if (edge.road?.playerId !== playerId) continue;

      const nextVertexId = edge.v1 === currentVertexId ? edge.v2 : edge.v1;
      visitedEdges.add(edgeId);
      const branchLen = 1 + dfs(nextVertexId, visitedEdges);
      visitedEdges.delete(edgeId);

      if (branchLen > longest) {
        longest = branchLen;
      }
    }
    return longest;
  };

  // Run DFS from all endpoints
  for (const edge of playerRoadEdges) {
    const visited = new Set<number>([edge.id]);
    const len1 = 1 + dfs(edge.v1, visited);
    const len2 = 1 + dfs(edge.v2, visited);
    maxLen = Math.max(maxLen, len1, len2);
  }

  return maxLen;
}

// Re-evaluate Victory Points, Longest Road, and Largest Army
export function updateGameAchievementsAndScores(state: GameState) {
  // 1. Calculate longest roads
  state.players.forEach((player) => {
    player.longestRoadLength = calculateLongestRoadForPlayer(state.board, player.id);
  });

  // Check Longest Road ownership (needs >= 5 and strictly > current record)
  const currentLeaderLen = state.longestRoadLength;
  let newLongestOwner = state.longestRoadOwnerId;
  let newLongestLen = currentLeaderLen;

  state.players.forEach((player) => {
    if (player.longestRoadLength > newLongestLen && player.longestRoadLength >= 5) {
      newLongestLen = player.longestRoadLength;
      newLongestOwner = player.id;
    }
  });

  if (newLongestOwner !== state.longestRoadOwnerId && newLongestOwner !== null) {
    const prevOwner = state.players.find((p) => p.id === state.longestRoadOwnerId);
    const newOwner = state.players.find((p) => p.id === newLongestOwner);
    state.longestRoadOwnerId = newLongestOwner;
    state.longestRoadLength = newLongestLen;

    state.logs.push({
      id: `lr-${Date.now()}`,
      timestamp: Date.now(),
      type: 'longest_road',
      message: `${newOwner?.name} claimed Longest Road with ${newLongestLen} segments!`,
      playerId: newOwner?.id,
      playerColor: newOwner?.color,
    });
  }

  // 2. Check Largest Army (needs >= 3 knights and strictly > current record)
  let newArmyOwner = state.largestArmyOwnerId;
  let newArmyCount = state.largestArmyCount;

  state.players.forEach((player) => {
    if (player.playedKnights > newArmyCount && player.playedKnights >= 3) {
      newArmyCount = player.playedKnights;
      newArmyOwner = player.id;
    }
  });

  if (newArmyOwner !== state.largestArmyOwnerId && newArmyOwner !== null) {
    const newOwner = state.players.find((p) => p.id === newArmyOwner);
    state.largestArmyOwnerId = newArmyOwner;
    state.largestArmyCount = newArmyCount;

    state.logs.push({
      id: `la-${Date.now()}`,
      timestamp: Date.now(),
      type: 'largest_army',
      message: `${newOwner?.name} claimed Largest Army with ${newArmyCount} Knights!`,
      playerId: newOwner?.id,
      playerColor: newOwner?.color,
    });
  }

  // 3. Compute final victory points
  state.players.forEach((player) => {
    let publicVP = 0;
    // Settlements (1 VP each)
    publicVP += 5 - player.settlementsLeft;
    // Cities (2 VP each)
    publicVP += (4 - player.citiesLeft) * 2;
    // Longest Road (2 VP)
    if (state.longestRoadOwnerId === player.id) {
      publicVP += 2;
    }
    // Largest Army (2 VP)
    if (state.largestArmyOwnerId === player.id) {
      publicVP += 2;
    }

    player.victoryPoints = publicVP;
    // Secret VP cards count towards victory condition
    player.secretVictoryPoints = publicVP + (player.devCards.victory_point || 0) + (player.boughtDevCardsThisTurn.victory_point || 0);

    // Win condition: 10 or more points on their turn
    if (player.secretVictoryPoints >= 10 && state.winnerPlayerId === null) {
      state.winnerPlayerId = player.id;
      state.phase = 'GAME_OVER';
      state.logs.push({
        id: `win-${Date.now()}`,
        timestamp: Date.now(),
        type: 'victory',
        message: `🎉 ${player.name} wins the game with ${player.secretVictoryPoints} Victory Points!`,
        playerId: player.id,
        playerColor: player.color,
      });
    }
  });
}

// Main Game Reducer: Pure State Machine
export function processGameAction(
  currentState: GameState,
  action: GameAction
): { state: GameState; error?: string } {
  // Deep clone state to ensure pure functional updates
  const state: GameState = JSON.parse(JSON.stringify(currentState));
  const activePlayer = state.players[state.activePlayerIndex];

  switch (action.type) {
    case 'PLACE_INITIAL_SETTLEMENT': {
      if (
        state.phase !== 'SETUP_ROUND_1_SETTLEMENT' &&
        state.phase !== 'SETUP_ROUND_2_SETTLEMENT'
      ) {
        return { state: currentState, error: 'Not in initial settlement setup phase' };
      }

      const vertex = state.board.vertices[action.vertexId];
      if (!vertex || vertex.building) {
        return { state: currentState, error: 'Vertex already occupied' };
      }

      if (!isVertexDistanceRuleSatisfied(state.board, action.vertexId)) {
        return { state: currentState, error: 'Cannot build within distance of another building' };
      }

      // Place settlement
      vertex.building = {
        type: 'settlement',
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      };
      activePlayer.settlementsLeft--;
      if (vertex.port && !activePlayer.portsOwned.includes(vertex.port)) {
        activePlayer.portsOwned.push(vertex.port);
      }
      state.lastPlacedVertexId = action.vertexId;

      // In Setup Round 2, immediately grant starting resources from neighboring hexes!
      if (state.phase === 'SETUP_ROUND_2_SETTLEMENT') {
        const received: Partial<Record<Resource, number>> = {};
        vertex.adjacentHexIds.forEach((hId) => {
          const hex = state.board.hexes[hId];
          if (hex && hex.resource) {
            activePlayer.resources[hex.resource] = (activePlayer.resources[hex.resource] || 0) + 1;
            received[hex.resource] = (received[hex.resource] || 0) + 1;
          }
        });

        const resStr = Object.entries(received)
          .map(([r, n]) => `${n} ${r}`)
          .join(', ');
        if (resStr) {
          state.logs.push({
            id: `setup-res-${Date.now()}`,
            timestamp: Date.now(),
            type: 'build',
            message: `${activePlayer.name} received starting resources: ${resStr}`,
            playerId: activePlayer.id,
            playerColor: activePlayer.color,
          });
        }
      }

      state.logs.push({
        id: `setup-s-${Date.now()}`,
        timestamp: Date.now(),
        type: 'build',
        message: `${activePlayer.name} placed initial settlement`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      // Transition to road placement for this player
      state.phase =
        state.phase === 'SETUP_ROUND_1_SETTLEMENT'
          ? 'SETUP_ROUND_1_ROAD'
          : 'SETUP_ROUND_2_ROAD';

      updateGameAchievementsAndScores(state);
      return { state };
    }

    case 'PLACE_INITIAL_ROAD': {
      if (
        state.phase !== 'SETUP_ROUND_1_ROAD' &&
        state.phase !== 'SETUP_ROUND_2_ROAD'
      ) {
        return { state: currentState, error: 'Not in initial road setup phase' };
      }

      const edge = state.board.edges[action.edgeId];
      if (!edge || edge.road) {
        return { state: currentState, error: 'Edge already occupied' };
      }

      // Initial road must attach to the settlement just placed!
      if (
        state.lastPlacedVertexId === null ||
        (edge.v1 !== state.lastPlacedVertexId && edge.v2 !== state.lastPlacedVertexId)
      ) {
        return { state: currentState, error: 'Initial road must connect to the settlement just placed' };
      }

      edge.road = {
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      };
      activePlayer.roadsLeft--;
      state.lastPlacedVertexId = null;

      state.logs.push({
        id: `setup-r-${Date.now()}`,
        timestamp: Date.now(),
        type: 'build',
        message: `${activePlayer.name} placed initial road`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      // Snake draft turn transitions:
      // Round 1: 0 -> 1 -> 2 -> 3
      // Round 2: 3 -> 2 -> 1 -> 0 -> Start main game at 0!
      if (state.phase === 'SETUP_ROUND_1_ROAD') {
        if (state.activePlayerIndex < state.players.length - 1) {
          state.activePlayerIndex++;
          state.phase = 'SETUP_ROUND_1_SETTLEMENT';
        } else {
          // Last player in Round 1 starts Round 2 immediately
          state.phase = 'SETUP_ROUND_2_SETTLEMENT';
        }
      } else if (state.phase === 'SETUP_ROUND_2_ROAD') {
        if (state.activePlayerIndex > 0) {
          state.activePlayerIndex--;
          state.phase = 'SETUP_ROUND_2_SETTLEMENT';
        } else {
          // Setup complete! Player 0 starts the main game
          state.phase = 'TURN_ROLL';
          state.turnNumber = 1;
          state.logs.push({
            id: `game-start-${Date.now()}`,
            timestamp: Date.now(),
            type: 'info',
            message: `Initial placement complete! Regular turns begin. ${state.players[0].name}'s turn.`,
          });
        }
      }

      updateGameAchievementsAndScores(state);
      return { state };
    }

    case 'ROLL_DICE': {
      if (state.phase !== 'TURN_ROLL') {
        return { state: currentState, error: 'Cannot roll dice in this phase' };
      }

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;
      state.dice = [d1, d2];
      state.diceRolled = true;

      state.logs.push({
        id: `roll-${Date.now()}`,
        timestamp: Date.now(),
        type: 'dice',
        message: `${activePlayer.name} rolled ${sum} (${d1} + ${d2})`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      if (sum === 7) {
        // Robber activated!
        let anyDiscards = false;
        state.players.forEach((p) => {
          const total = getTotalResources(p);
          if (total > 7) {
            p.discardRequired = Math.floor(total / 2);
            p.hasDiscarded = false;
            anyDiscards = true;
          } else {
            p.discardRequired = 0;
            p.hasDiscarded = true;
          }
        });

        if (anyDiscards) {
          state.phase = 'TURN_ROBBER_DISCARD';
          state.logs.push({
            id: `robber-disc-${Date.now()}`,
            timestamp: Date.now(),
            type: 'robber',
            message: `A 7 was rolled! Players with more than 7 cards must discard half.`,
          });
        } else {
          state.phase = 'TURN_ROBBER_MOVE';
          state.logs.push({
            id: `robber-move-${Date.now()}`,
            timestamp: Date.now(),
            type: 'robber',
            message: `${activePlayer.name} must move the Robber.`,
            playerId: activePlayer.id,
            playerColor: activePlayer.color,
          });
        }
      } else {
        // Resource distribution
        const payouts: Record<string, Partial<Record<Resource, number>>> = {};

        state.board.hexes.forEach((hex) => {
          if (hex.numberToken === sum && !hex.hasRobber && hex.resource) {
            hex.vertexIds.forEach((vId) => {
              const vertex = state.board.vertices[vId];
              if (vertex && vertex.building) {
                const count = vertex.building.type === 'city' ? 2 : 1;
                const owner = state.players.find((p) => p.id === vertex.building?.playerId);
                if (owner) {
                  owner.resources[hex.resource!] = (owner.resources[hex.resource!] || 0) + count;
                  if (!payouts[owner.name]) payouts[owner.name] = {};
                  payouts[owner.name][hex.resource!] = (payouts[owner.name][hex.resource!] || 0) + count;
                }
              }
            });
          }
        });

        const payoutEntries = Object.entries(payouts);
        if (payoutEntries.length > 0) {
          payoutEntries.forEach(([pName, res]) => {
            const summary = Object.entries(res)
              .map(([r, n]) => `+${n} ${r}`)
              .join(', ');
            state.logs.push({
              id: `res-${Date.now()}-${pName}`,
              timestamp: Date.now(),
              type: 'info',
              message: `${pName} collected: ${summary}`,
            });
          });
        }

        state.phase = 'TURN_ACTIONS';
      }

      updateGameAchievementsAndScores(state);
      return { state };
    }

    case 'DISCARD_RESOURCES': {
      if (state.phase !== 'TURN_ROBBER_DISCARD') {
        return { state: currentState, error: 'Not in discard phase' };
      }

      const player = state.players.find((p) => p.id === action.playerId);
      if (!player || player.hasDiscarded) {
        return { state: currentState, error: 'Player does not need to discard' };
      }

      const discardCount = Object.values(action.resources).reduce((sum, n) => sum + (n || 0), 0);
      if (discardCount !== player.discardRequired) {
        return { state: currentState, error: `Must discard exactly ${player.discardRequired} cards` };
      }

      // Validate player actually has these resources
      for (const [res, amt] of Object.entries(action.resources)) {
        if ((player.resources[res as Resource] || 0) < (amt || 0)) {
          return { state: currentState, error: `Not enough ${res} to discard` };
        }
      }

      deductResources(player, action.resources);
      player.hasDiscarded = true;
      player.discardRequired = 0;

      state.logs.push({
        id: `disc-${Date.now()}-${player.name}`,
        timestamp: Date.now(),
        type: 'robber',
        message: `${player.name} discarded ${discardCount} resources.`,
        playerId: player.id,
        playerColor: player.color,
      });

      // Check if all players have finished discarding
      const allDone = state.players.every((p) => p.hasDiscarded);
      if (allDone) {
        state.phase = 'TURN_ROBBER_MOVE';
        state.logs.push({
          id: `robber-all-disc-${Date.now()}`,
          timestamp: Date.now(),
          type: 'robber',
          message: `All discards complete. ${activePlayer.name} must move the Robber.`,
          playerId: activePlayer.id,
          playerColor: activePlayer.color,
        });
      }

      return { state };
    }

    case 'MOVE_ROBBER': {
      if (state.phase !== 'TURN_ROBBER_MOVE') {
        return { state: currentState, error: 'Not in robber movement phase' };
      }

      const targetHex = state.board.hexes[action.hexId];
      if (!targetHex) {
        return { state: currentState, error: 'Invalid hex' };
      }

      if (targetHex.hasRobber) {
        return { state: currentState, error: 'Robber must be moved to a different hex' };
      }

      // Move robber
      state.board.hexes.forEach((h) => (h.hasRobber = false));
      targetHex.hasRobber = true;
      state.board.robberHexId = targetHex.id;

      state.logs.push({
        id: `move-rob-${Date.now()}`,
        timestamp: Date.now(),
        type: 'robber',
        message: `${activePlayer.name} moved the Robber to ${targetHex.terrain} (${targetHex.numberToken ?? 'desert'})`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      // Find players with buildings adjacent to the new hex (excluding active player) who have cards to steal
      const stealablePlayerIds = new Set<string>();
      targetHex.vertexIds.forEach((vId) => {
        const building = state.board.vertices[vId]?.building;
        if (building && building.playerId !== activePlayer.id) {
          const victim = state.players.find((p) => p.id === building.playerId);
          if (victim && getTotalResources(victim) > 0) {
            stealablePlayerIds.add(victim.id);
          }
        }
      });

      state.eligibleStealTargetPlayerIds = Array.from(stealablePlayerIds);

      if (state.eligibleStealTargetPlayerIds.length > 0) {
        state.phase = 'TURN_ROBBER_STEAL';
      } else {
        state.phase = 'TURN_ACTIONS';
      }

      return { state };
    }

    case 'STEAL_RESOURCE': {
      if (state.phase !== 'TURN_ROBBER_STEAL') {
        return { state: currentState, error: 'Not in robber stealing phase' };
      }

      if (!state.eligibleStealTargetPlayerIds.includes(action.targetPlayerId)) {
        return { state: currentState, error: 'Cannot steal from this player' };
      }

      const victim = state.players.find((p) => p.id === action.targetPlayerId);
      if (!victim) {
        return { state: currentState, error: 'Target player not found' };
      }

      // Pick a random card from victim's hand
      const cards: Resource[] = [];
      (Object.keys(victim.resources) as Resource[]).forEach((res) => {
        for (let i = 0; i < victim.resources[res]; i++) {
          cards.push(res);
        }
      });

      if (cards.length > 0) {
        const stolenRes = cards[Math.floor(Math.random() * cards.length)];
        victim.resources[stolenRes]--;
        activePlayer.resources[stolenRes]++;

        state.logs.push({
          id: `steal-${Date.now()}`,
          timestamp: Date.now(),
          type: 'robber',
          message: `${activePlayer.name} stole a resource from ${victim.name}`,
          playerId: activePlayer.id,
          playerColor: activePlayer.color,
        });
      }

      state.eligibleStealTargetPlayerIds = [];
      state.phase = 'TURN_ACTIONS';
      return { state };
    }

    case 'BUILD_ROAD': {
      if (state.phase !== 'TURN_ACTIONS') {
        return { state: currentState, error: 'Cannot build during this phase' };
      }

      if (activePlayer.roadsLeft <= 0) {
        return { state: currentState, error: 'No roads remaining in supply' };
      }

      const isFree = state.freeRoadsRemaining > 0;
      if (!isFree && !canAfford(activePlayer, BUILDING_COSTS.road)) {
        return { state: currentState, error: 'Insufficient resources for a road' };
      }

      const edge = state.board.edges[action.edgeId];
      if (!edge || edge.road) {
        return { state: currentState, error: 'Edge already occupied' };
      }

      if (!isEdgeConnectedToPlayerNetwork(state.board, action.edgeId, activePlayer.id)) {
        return { state: currentState, error: 'Road must connect to your existing network' };
      }

      if (isFree) {
        state.freeRoadsRemaining--;
      } else {
        deductResources(activePlayer, BUILDING_COSTS.road);
      }

      edge.road = {
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      };
      activePlayer.roadsLeft--;

      state.logs.push({
        id: `build-r-${Date.now()}`,
        timestamp: Date.now(),
        type: 'build',
        message: `${activePlayer.name} built a Road`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      updateGameAchievementsAndScores(state);
      return { state };
    }

    case 'BUILD_SETTLEMENT': {
      if (state.phase !== 'TURN_ACTIONS') {
        return { state: currentState, error: 'Cannot build during this phase' };
      }

      if (activePlayer.settlementsLeft <= 0) {
        return { state: currentState, error: 'No settlements remaining in supply' };
      }

      if (!canAfford(activePlayer, BUILDING_COSTS.settlement)) {
        return { state: currentState, error: 'Insufficient resources for a settlement' };
      }

      const vertex = state.board.vertices[action.vertexId];
      if (!vertex || vertex.building) {
        return { state: currentState, error: 'Vertex already occupied' };
      }

      if (!isVertexDistanceRuleSatisfied(state.board, action.vertexId)) {
        return { state: currentState, error: 'Cannot build within distance 2 of another building' };
      }

      if (!isVertexConnectedToPlayerRoad(state.board, action.vertexId, activePlayer.id)) {
        return { state: currentState, error: 'Settlement must connect to your existing road' };
      }

      deductResources(activePlayer, BUILDING_COSTS.settlement);
      vertex.building = {
        type: 'settlement',
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      };
      activePlayer.settlementsLeft--;

      if (vertex.port && !activePlayer.portsOwned.includes(vertex.port)) {
        activePlayer.portsOwned.push(vertex.port);
      }

      state.logs.push({
        id: `build-s-${Date.now()}`,
        timestamp: Date.now(),
        type: 'build',
        message: `${activePlayer.name} built a Settlement`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      updateGameAchievementsAndScores(state);
      return { state };
    }

    case 'BUILD_CITY': {
      if (state.phase !== 'TURN_ACTIONS') {
        return { state: currentState, error: 'Cannot build during this phase' };
      }

      if (activePlayer.citiesLeft <= 0) {
        return { state: currentState, error: 'No cities remaining in supply' };
      }

      if (!canAfford(activePlayer, BUILDING_COSTS.city)) {
        return { state: currentState, error: 'Insufficient resources for a city' };
      }

      const vertex = state.board.vertices[action.vertexId];
      if (
        !vertex ||
        !vertex.building ||
        vertex.building.type !== 'settlement' ||
        vertex.building.playerId !== activePlayer.id
      ) {
        return { state: currentState, error: 'Must upgrade one of your own settlements' };
      }

      deductResources(activePlayer, BUILDING_COSTS.city);
      vertex.building.type = 'city';
      activePlayer.citiesLeft--;
      activePlayer.settlementsLeft++; // Reclaim settlement to supply

      state.logs.push({
        id: `build-c-${Date.now()}`,
        timestamp: Date.now(),
        type: 'build',
        message: `${activePlayer.name} upgraded a settlement to a City`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      updateGameAchievementsAndScores(state);
      return { state };
    }

    case 'BUY_DEV_CARD': {
      if (state.phase !== 'TURN_ACTIONS') {
        return { state: currentState, error: 'Cannot buy dev cards right now' };
      }

      if (state.devCardDeck.length === 0) {
        return { state: currentState, error: 'No dev cards remaining in deck' };
      }

      if (!canAfford(activePlayer, BUILDING_COSTS.dev_card)) {
        return { state: currentState, error: 'Insufficient resources for dev card' };
      }

      deductResources(activePlayer, BUILDING_COSTS.dev_card);
      const drawnCard = state.devCardDeck.pop()!;
      activePlayer.boughtDevCardsThisTurn[drawnCard] = (activePlayer.boughtDevCardsThisTurn[drawnCard] || 0) + 1;

      state.logs.push({
        id: `buy-dc-${Date.now()}`,
        timestamp: Date.now(),
        type: 'dev_card',
        message: `${activePlayer.name} bought a Development Card`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      updateGameAchievementsAndScores(state);
      return { state };
    }

    case 'PLAY_DEV_CARD': {
      if (state.phase !== 'TURN_ACTIONS') {
        return { state: currentState, error: 'Can only play dev cards during your turn action phase' };
      }

      if (state.devCardPlayedThisTurn) {
        return { state: currentState, error: 'Already played a development card this turn' };
      }

      if ((activePlayer.devCards[action.card] || 0) <= 0) {
        return { state: currentState, error: 'You do not own this playable card' };
      }

      // Deduct card
      activePlayer.devCards[action.card]--;
      state.devCardPlayedThisTurn = true;

      switch (action.card) {
        case 'knight': {
          activePlayer.playedKnights++;
          state.phase = 'TURN_ROBBER_MOVE';
          state.logs.push({
            id: `play-knight-${Date.now()}`,
            timestamp: Date.now(),
            type: 'dev_card',
            message: `${activePlayer.name} played a Knight card!`,
            playerId: activePlayer.id,
            playerColor: activePlayer.color,
          });
          break;
        }

        case 'road_building': {
          state.freeRoadsRemaining = Math.min(2, activePlayer.roadsLeft);
          state.logs.push({
            id: `play-rb-${Date.now()}`,
            timestamp: Date.now(),
            type: 'dev_card',
            message: `${activePlayer.name} played Road Building (2 free roads)!`,
            playerId: activePlayer.id,
            playerColor: activePlayer.color,
          });
          break;
        }

        case 'year_of_plenty': {
          const r1 = action.params?.targetResource;
          const r2 = action.params?.targetResource2;
          if (r1) activePlayer.resources[r1] = (activePlayer.resources[r1] || 0) + 1;
          if (r2) activePlayer.resources[r2] = (activePlayer.resources[r2] || 0) + 1;
          state.logs.push({
            id: `play-yop-${Date.now()}`,
            timestamp: Date.now(),
            type: 'dev_card',
            message: `${activePlayer.name} played Year of Plenty (+1 ${r1}, +1 ${r2})!`,
            playerId: activePlayer.id,
            playerColor: activePlayer.color,
          });
          break;
        }

        case 'monopoly': {
          const target = action.params?.monopolyResource;
          if (!target) return { state: currentState, error: 'Must select a resource for Monopoly' };

          let totalStolen = 0;
          state.players.forEach((p) => {
            if (p.id !== activePlayer.id) {
              const stolen = p.resources[target] || 0;
              totalStolen += stolen;
              p.resources[target] = 0;
            }
          });
          activePlayer.resources[target] = (activePlayer.resources[target] || 0) + totalStolen;

          state.logs.push({
            id: `play-mono-${Date.now()}`,
            timestamp: Date.now(),
            type: 'dev_card',
            message: `${activePlayer.name} played Monopoly on ${target}, taking all ${totalStolen} cards!`,
            playerId: activePlayer.id,
            playerColor: activePlayer.color,
          });
          break;
        }

        case 'victory_point': {
          // VP cards apply automatically
          break;
        }
      }

      updateGameAchievementsAndScores(state);
      return { state };
    }

    case 'BANK_TRADE': {
      if (state.phase !== 'TURN_ACTIONS') {
        return { state: currentState, error: 'Cannot trade in this phase' };
      }

      const { giveResource, getResource, count } = action;
      if (giveResource === getResource) {
        return { state: currentState, error: 'Cannot trade same resource' };
      }

      // Determine trade ratio based on owned ports
      let ratio = 4; // Default maritime trade
      if (activePlayer.portsOwned.includes('generic_3_1')) {
        ratio = 3;
      }
      const specificPortType = `${giveResource}_2_1` as PortType;
      if (activePlayer.portsOwned.includes(specificPortType)) {
        ratio = 2;
      }

      const requiredGive = ratio * count;
      if ((activePlayer.resources[giveResource] || 0) < requiredGive) {
        return { state: currentState, error: `Need ${requiredGive} ${giveResource} for bank trade` };
      }

      activePlayer.resources[giveResource] -= requiredGive;
      activePlayer.resources[getResource] = (activePlayer.resources[getResource] || 0) + count;

      state.logs.push({
        id: `bank-trade-${Date.now()}`,
        timestamp: Date.now(),
        type: 'trade',
        message: `${activePlayer.name} maritime traded ${requiredGive} ${giveResource} for ${count} ${getResource} (${ratio}:1)`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      return { state };
    }

    case 'CREATE_TRADE_OFFER': {
      if (state.phase !== 'TURN_ACTIONS') {
        return { state: currentState, error: 'Cannot trade in this phase' };
      }

      // Verify active player has the offered resources
      if (!canAfford(activePlayer, action.give)) {
        return { state: currentState, error: 'You do not have the offered resources' };
      }

      state.activeTradeOffer = {
        id: `trade-${Date.now()}`,
        fromPlayerId: activePlayer.id,
        give: action.give,
        want: action.want,
        status: 'pending',
        responses: {},
      };

      state.logs.push({
        id: `offer-trade-${Date.now()}`,
        timestamp: Date.now(),
        type: 'trade',
        message: `${activePlayer.name} offered a trade`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      return { state };
    }

    case 'RESPOND_TRADE_OFFER': {
      if (!state.activeTradeOffer || state.activeTradeOffer.status !== 'pending') {
        return { state: currentState, error: 'No active trade offer' };
      }

      state.activeTradeOffer.responses[action.playerId] = action.accept ? 'accept' : 'decline';
      return { state };
    }

    case 'CONFIRM_TRADE_OFFER': {
      if (!state.activeTradeOffer || state.activeTradeOffer.status !== 'pending') {
        return { state: currentState, error: 'No active trade offer' };
      }

      const otherPlayer = state.players.find((p) => p.id === action.targetPlayerId);
      if (!otherPlayer) return { state: currentState, error: 'Target player not found' };

      // Validate both players still have the required resources
      if (!canAfford(activePlayer, state.activeTradeOffer.give)) {
        return { state: currentState, error: 'You no longer have the offered resources' };
      }
      if (!canAfford(otherPlayer, state.activeTradeOffer.want)) {
        return { state: currentState, error: `${otherPlayer.name} no longer has the requested resources` };
      }

      // Execute trade
      deductResources(activePlayer, state.activeTradeOffer.give);
      addResources(activePlayer, state.activeTradeOffer.want);

      deductResources(otherPlayer, state.activeTradeOffer.want);
      addResources(otherPlayer, state.activeTradeOffer.give);

      state.logs.push({
        id: `exec-trade-${Date.now()}`,
        timestamp: Date.now(),
        type: 'trade',
        message: `${activePlayer.name} traded with ${otherPlayer.name}`,
        playerId: activePlayer.id,
        playerColor: activePlayer.color,
      });

      state.activeTradeOffer = null;
      return { state };
    }

    case 'CANCEL_TRADE_OFFER': {
      state.activeTradeOffer = null;
      return { state };
    }

    case 'END_TURN': {
      if (state.phase !== 'TURN_ACTIONS') {
        return { state: currentState, error: 'Cannot end turn until roll/robber is resolved' };
      }

      // Move newly bought dev cards to playable inventory
      (Object.keys(activePlayer.boughtDevCardsThisTurn) as DevCardType[]).forEach((card) => {
        const count = activePlayer.boughtDevCardsThisTurn[card] || 0;
        if (count > 0) {
          activePlayer.devCards[card] = (activePlayer.devCards[card] || 0) + count;
          activePlayer.boughtDevCardsThisTurn[card] = 0;
        }
      });

      state.devCardPlayedThisTurn = false;
      state.freeRoadsRemaining = 0;
      state.activeTradeOffer = null;
      state.diceRolled = false;
      state.dice = null;

      // Advance turn
      state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
      state.turnNumber++;
      state.phase = 'TURN_ROLL';
      state.turnTimeRemainingSeconds = state.turnTimeLimitSeconds;

      const nextPlayer = state.players[state.activePlayerIndex];
      state.logs.push({
        id: `turn-start-${Date.now()}`,
        timestamp: Date.now(),
        type: 'info',
        message: `Turn ${state.turnNumber}: ${nextPlayer.name}'s turn.`,
        playerId: nextPlayer.id,
        playerColor: nextPlayer.color,
      });

      return { state };
    }

    default:
      return { state: currentState };
  }
}
