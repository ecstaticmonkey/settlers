'use client';
import { Anchor } from 'lucide-react';
import { Resource } from '@/lib/catan/types';
import Image from 'next/image';
import { RESOURCE_NAMES } from '../UI/ResourceIcon';
export function ResourceHand({ resources,onOpenBankTrade,canTrade }: {resources:Record<Resource,number>;onOpenBankTrade?:()=>void;canTrade?:boolean}) {
 return <div className="resource-hand"><div className="hand-heading"><span className="eyebrow">YOUR RESOURCES</span><span>{Object.values(resources).reduce((a,b)=>a+b,0)} cards</span></div><div className="resource-cards">{RESOURCE_NAMES.map(r=><div key={r} className={`resource-card resource-${r} ${resources[r] === 0 ? 'resource-empty' : ''}`}><Image className="resource-card-art" src={`/images/resources/${r}.webp`} alt={`CATAN ${r} resource card`} width={240} height={360} unoptimized/><span className="resource-card-name">{r}</span><strong className="resource-count" key={resources[r]} aria-label={`${resources[r]} ${r} cards`}>{resources[r]}</strong></div>)}<button className="bank-card" disabled={!canTrade} onClick={onOpenBankTrade} title={canTrade?'Exchange resources at your best harbor rate':'Bank trading is available during your action phase'}><Anchor size={21}/><span>Bank</span><small>Trade ↗</small></button></div></div>;
}
