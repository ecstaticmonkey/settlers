'use client';

import React from 'react';
import { Dialog } from '../UI/Dialog';
import { Volume2, VolumeX, Maximize2, LogOut, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  roomCode: string;
  turnNumber: number;
  onLeaveGame: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isMuted,
  onToggleSound,
  roomCode,
  turnNumber,
  onLeaveGame,
}) => {
  if (!isOpen) return null;

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <Dialog title="Game Settings" onClose={onClose}>
      <div className="settings-modal-stack">
        <div className="settings-item">
          <div>
            <strong>Sound Effects</strong>
            <p>Audio cues for dice rolls, building, and trade events</p>
          </div>
          <button
            type="button"
            className="button button-small"
            onClick={onToggleSound}
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>
        </div>

        <div className="settings-item">
          <div>
            <strong>Display Mode</strong>
            <p>Switch between windowed and full-screen display</p>
          </div>
          <button
            type="button"
            className="button button-small"
            onClick={handleFullscreen}
          >
            <Maximize2 size={16} />
            <span>Toggle Fullscreen</span>
          </button>
        </div>

        <div className="settings-item">
          <div>
            <strong>Table Details</strong>
            <p>
              Table Code: <b>{roomCode}</b> · Turn: <b>{turnNumber}</b>
            </p>
          </div>
        </div>

        <div className="settings-actions">
          <button
            type="button"
            className="button full-width"
            onClick={() => {
              onClose();
              onLeaveGame();
            }}
          >
            <LogOut size={16} />
            <span>Leave Table & Return to Lobby</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};
