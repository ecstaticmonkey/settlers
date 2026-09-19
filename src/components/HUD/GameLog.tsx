'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameLogEvent } from '@/lib/catan/types';
import { Dices, Hammer, ArrowLeftRight, Flag, ChevronUp, ChevronDown } from 'lucide-react';

interface GameLogProps {
  logs: GameLogEvent[];
  onOpenRulebook?: () => void;
}

export function GameLog({ logs, onOpenRulebook }: GameLogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (ref.current && !isCollapsed) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  return (
    <section className={`game-chat-panel ${isCollapsed ? 'chat-collapsed' : ''}`} aria-label="Game chat and journal">
      {!isCollapsed && (
        <div className="chat-body">
          {/* Rulebook & Welcome Banner (Mirrored from Photo) */}
          <div className="chat-welcome-banner">
            <p>
              Happy settling! Learn how to play in the{' '}
              <button
                type="button"
                className="chat-rulebook-link"
                onClick={onOpenRulebook}
              >
                rulebook
              </button>
              .
            </p>
            <p className="chat-cmd-hint">
              List of commands: <code>/help</code>
            </p>
          </div>

          {/* Event entries */}
          <div className="chat-entries" ref={ref} role="log" aria-label="Game events">
            {logs.slice(-50).map((log, i) => (
              <div key={`${log.id}-${i}`} className="chat-entry">
                <span className="chat-entry-icon" aria-hidden="true">
                  {log.type === 'dice' ? (
                    <Dices size={13} />
                  ) : log.type === 'build' ? (
                    <Hammer size={13} />
                  ) : log.type === 'trade' ? (
                    <ArrowLeftRight size={13} />
                  ) : (
                    <Flag size={13} />
                  )}
                </span>
                <p className="chat-entry-text">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Chat Bar (Mirrored from Photo) */}
      <button
        type="button"
        className="chat-toggle-bar"
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Expand chat' : 'Collapse chat'}
      >
        <span className="chat-toggle-label">Chat</span>
        <span className="chat-toggle-arrow">
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </button>
    </section>
  );
}
