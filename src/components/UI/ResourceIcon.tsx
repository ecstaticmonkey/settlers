import { TreePine, BrickWall, Wheat, Mountain } from 'lucide-react';
import { Resource } from '@/lib/catan/types';

export const RESOURCE_NAMES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
export function ResourceIcon({ resource, size = 20 }: { resource: Resource; size?: number }) {
  const Icon = { wood: TreePine, brick: BrickWall, wheat: Wheat, ore: Mountain }[resource as Exclude<Resource, 'sheep'>];
  if (resource === 'sheep') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M5 15a4 4 0 0 1-2-7 4 4 0 0 1 7-3 4 4 0 0 1 6 3l3-1 2 3-1 5h-4a6 6 0 0 1-11 0Z"/><path d="M7 17v4m7-4v4m4-11h.01"/></svg>;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
