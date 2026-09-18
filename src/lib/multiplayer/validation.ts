import type { GameAction, Resource } from '../catan/types';
import { MultiplayerError } from './types';

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MultiplayerError('Invalid request');
  return value as Record<string, unknown>;
}

export function text(value: unknown, label: string, max = 80): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new MultiplayerError(`Invalid ${label}`);
  return value.trim();
}

export function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new MultiplayerError('Invalid numeric value');
  return value;
}

const resources: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
function resource(value: unknown): Resource {
  if (!resources.includes(value as Resource)) throw new MultiplayerError('Invalid resource');
  return value as Resource;
}

function amounts(value: unknown): Partial<Record<Resource, number>> {
  return Object.fromEntries(Object.entries(object(value)).map(([key, count]) => [resource(key), integer(count, 0, 1000)]));
}

// Parse every action at the network boundary; TypeScript types do not validate JSON.
export function parseAction(value: unknown): GameAction {
  const a = object(value);
  switch (a.type) {
    case 'ROLL_DICE': case 'BUY_DEV_CARD': case 'END_TURN': case 'CANCEL_TRADE_OFFER':
      return { type: a.type };
    case 'PLACE_INITIAL_SETTLEMENT': case 'BUILD_SETTLEMENT': case 'BUILD_CITY':
      return { type: a.type, vertexId: integer(a.vertexId, 0, 53) };
    case 'PLACE_INITIAL_ROAD': case 'BUILD_ROAD':
      return { type: a.type, edgeId: integer(a.edgeId, 0, 71) };
    case 'MOVE_ROBBER': return { type: a.type, hexId: integer(a.hexId, 0, 18) };
    case 'STEAL_RESOURCE': case 'CONFIRM_TRADE_OFFER':
      return { type: a.type, targetPlayerId: text(a.targetPlayerId, 'target player') };
    case 'DISCARD_RESOURCES':
      return { type: a.type, playerId: text(a.playerId, 'player'), resources: amounts(a.resources) };
    case 'RESPOND_TRADE_OFFER':
      if (typeof a.accept !== 'boolean') throw new MultiplayerError('Invalid trade response');
      return { type: a.type, playerId: text(a.playerId, 'player'), accept: a.accept };
    case 'CREATE_TRADE_OFFER': {
      const give = amounts(a.give), want = amounts(a.want);
      if (!Object.values(give).some(n => n > 0) || !Object.values(want).some(n => n > 0)) throw new MultiplayerError('Offer and request at least one resource');
      return { type: a.type, give, want };
    }
    case 'BANK_TRADE':
      return { type: a.type, giveResource: resource(a.giveResource), getResource: resource(a.getResource), count: integer(a.count, 1, 1000) };
    case 'PLAY_DEV_CARD': {
      if (!['knight', 'road_building', 'year_of_plenty', 'monopoly'].includes(String(a.card))) throw new MultiplayerError('Invalid development card');
      const card = a.card as 'knight' | 'road_building' | 'year_of_plenty' | 'monopoly';
      const params = a.params === undefined ? {} : object(a.params);
      if (card === 'year_of_plenty') return { type: a.type, card, params: { targetResource: resource(params.targetResource), targetResource2: resource(params.targetResource2) } };
      if (card === 'monopoly') return { type: a.type, card, params: { monopolyResource: resource(params.monopolyResource) } };
      return { type: a.type, card };
    }
    default: throw new MultiplayerError('Unknown game action');
  }
}
