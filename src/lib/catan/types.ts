// Catan Core Types & Interfaces

export type Resource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore';

export type HexTerrain = 'forest' | 'hills' | 'fields' | 'pasture' | 'mountains' | 'desert';

export type PlayerColor = 'red' | 'blue' | 'orange' | 'white' | 'green';

export type BuildingType = 'settlement' | 'city' | 'road';

export type DevCardType = 'knight' | 'victory_point' | 'road_building' | 'year_of_plenty' | 'monopoly';

export type PortType = 'generic_3_1' | 'wood_2_1' | 'brick_2_1' | 'wheat_2_1' | 'sheep_2_1' | 'ore_2_1';

export type GamePhase =
  | 'WAITING'
  | 'SETUP_ROUND_1_SETTLEMENT'
  | 'SETUP_ROUND_1_ROAD'
  | 'SETUP_ROUND_2_SETTLEMENT'
  | 'SETUP_ROUND_2_ROAD'
  | 'TURN_ROLL'
  | 'TURN_ROBBER_DISCARD'
  | 'TURN_ROBBER_MOVE'
  | 'TURN_ROBBER_STEAL'
  | 'TURN_ACTIONS'
  | 'GAME_OVER';

export interface CubeCoord {
  q: number;
  r: number;
  s: number;
}

export interface Hex {
  id: number;
  coord: CubeCoord;
  terrain: HexTerrain;
  resource: Resource | null;
  numberToken: number | null;
  pips: number;
  hasRobber: boolean;
  vertexIds: number[];
  edgeIds: number[];
  pixelX: number;
  pixelY: number;
}

export interface Vertex {
  id: number;
  pixelX: number;
  pixelY: number;
  adjacentVertexIds: number[];
  adjacentEdgeIds: number[];
  adjacentHexIds: number[];
  building: {
    type: 'settlement' | 'city';
    playerId: string;
    playerColor: PlayerColor;
  } | null;
  port: PortType | null;
}

export interface Edge {
  id: number;
  v1: number;
  v2: number;
  pixelX1: number;
  pixelY1: number;
  pixelX2: number;
  pixelY2: number;
  adjacentEdgeIds: number[];
  adjacentHexIds: number[];
  road: {
    playerId: string;
    playerColor: PlayerColor;
  } | null;
}

export interface Port {
  id: number;
  type: PortType;
  vertexIds: [number, number];
  edgeId: number;
  ratio: number;
  resource: Resource | null;
  label: string;
  pixelX: number;
  pixelY: number;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium';
  resources: Record<Resource, number>;
  devCards: Record<DevCardType, number>;
  boughtDevCardsThisTurn: Record<DevCardType, number>;
  playedKnights: number;
  settlementsLeft: number;
  citiesLeft: number;
  roadsLeft: number;
  longestRoadLength: number;
  victoryPoints: number; // Public score
  secretVictoryPoints: number; // Including VP dev cards
  discardRequired: number;
  hasDiscarded: boolean;
  portsOwned: PortType[];
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  give: Partial<Record<Resource, number>>;
  want: Partial<Record<Resource, number>>;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  acceptedBy?: string;
  responses: Record<string, 'accept' | 'decline' | 'pending'>;
}

export interface GameLogEvent {
  id: string;
  timestamp: number;
  type: 'dice' | 'build' | 'trade' | 'robber' | 'dev_card' | 'longest_road' | 'largest_army' | 'victory' | 'info';
  message: string;
  playerId?: string;
  playerColor?: PlayerColor;
}

export interface GameBoard {
  hexes: Hex[];
  vertices: Vertex[];
  edges: Edge[];
  ports: Port[];
  robberHexId: number;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  turnNumber: number;
  activePlayerIndex: number;
  players: Player[];
  board: GameBoard;
  dice: [number, number] | null;
  diceRolled: boolean;
  devCardPlayedThisTurn: boolean;
  devCardDeck: DevCardType[];
  freeRoadsRemaining: number; // From Road Building card
  lastPlacedVertexId: number | null; // For setup road requirement
  activeTradeOffer: TradeOffer | null;
  longestRoadOwnerId: string | null;
  longestRoadLength: number;
  largestArmyOwnerId: string | null;
  largestArmyCount: number;
  winnerPlayerId: string | null;
  logs: GameLogEvent[];
  turnTimeLimitSeconds: number;
  turnTimeRemainingSeconds: number;
  eligibleStealTargetPlayerIds: string[];
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'ROLL_DICE' }
  | { type: 'PLACE_INITIAL_SETTLEMENT'; vertexId: number }
  | { type: 'PLACE_INITIAL_ROAD'; edgeId: number }
  | { type: 'BUILD_ROAD'; edgeId: number }
  | { type: 'BUILD_SETTLEMENT'; vertexId: number }
  | { type: 'BUILD_CITY'; vertexId: number }
  | { type: 'BUY_DEV_CARD' }
  | { type: 'PLAY_DEV_CARD'; card: DevCardType; params?: { targetResource?: Resource; targetResource2?: Resource; monopolyResource?: Resource } }
  | { type: 'MOVE_ROBBER'; hexId: number }
  | { type: 'STEAL_RESOURCE'; targetPlayerId: string }
  | { type: 'DISCARD_RESOURCES'; playerId: string; resources: Partial<Record<Resource, number>> }
  | { type: 'CREATE_TRADE_OFFER'; give: Partial<Record<Resource, number>>; want: Partial<Record<Resource, number>> }
  | { type: 'RESPOND_TRADE_OFFER'; accept: boolean; playerId: string }
  | { type: 'CONFIRM_TRADE_OFFER'; targetPlayerId: string }
  | { type: 'CANCEL_TRADE_OFFER' }
  | { type: 'BANK_TRADE'; giveResource: Resource; getResource: Resource; count: number }
  | { type: 'END_TURN' };
