// import React from 'react';
import { useAppStore } from './store/useAppStore';
import { Lobby } from './components/lobby/Lobby';
import { BlindTest } from './components/games/BlindTest';
import { Puzzle } from './components/games/Puzzle';
import { PixelMatch } from './components/games/PixelMatch';
import { Scoreboard } from './components/Scoreboard';
import { usePeer } from './hooks/usePeer';
import { Button } from './components/ui/Button';

function BackToLobbyButton() {
  const { isHost, resetAll } = useAppStore();
  const { endGame } = usePeer();
  if (!isHost) return null;
  return (
    <div className="fixed top-3 right-3 z-50">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => { endGame(); setTimeout(() => { resetAll(); }, 300); }}
      >
        🏠 Lobby
      </Button>
    </div>
  );
}

export default function App() {
  const { phase } = useAppStore();

  return (
    <div className="font-sans text-stone-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {phase !== 'lobby' && <BackToLobbyButton />}

      {phase === 'lobby' && <Lobby />}
      {phase === 'blind-test' && <BlindTest />}
      {phase === 'puzzle' && <Puzzle />}
      {phase === 'pixel-match' && <PixelMatch />}
      {phase === 'scoreboard' && <Scoreboard />}
    </div>
  );
}
