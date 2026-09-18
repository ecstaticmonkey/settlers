import { Hexagon } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><span className="brand-mark"><Hexagon size={28} strokeWidth={1.5} /><span>C</span></span><span>catan<span className="brand-period">.</span></span>{!compact && <span className="brand-caption">A WORLD TO BUILD</span>}</div>;
}
