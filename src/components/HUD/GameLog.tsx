'use client';
import { useEffect, useRef } from 'react';
import { GameLogEvent } from '@/lib/catan/types';
import { Dices, Hammer, ArrowLeftRight, Flag } from 'lucide-react';
export function GameLog({logs}:{logs:GameLogEvent[]}) {const ref=useRef<HTMLDivElement>(null);useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[logs]);return <section className="game-journal"><div className="journal-heading"><span className="eyebrow">ISLAND JOURNAL</span><span>{logs.length} events</span></div><div className="journal-entries" ref={ref} role="log" aria-label="Game events">{logs.slice(-60).map((log,i)=><div key={`${log.id}-${i}`}><span>{log.type==='dice'?<Dices size={14}/>:log.type==='build'?<Hammer size={14}/>:log.type==='trade'?<ArrowLeftRight size={14}/>:<Flag size={14}/>}</span><p>{log.message}</p></div>)}</div></section>}
