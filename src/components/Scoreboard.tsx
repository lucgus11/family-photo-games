// import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePeer } from '../hooks/usePeer';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export function Scoreboard() {
  const { players, isHost, setPhase, resetRoundScores } = useAppStore();
  const { startGame } = usePeer();

  const sorted = [...players].sort((a, b) => b.score - a.score);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center p-6 gap-6">
      <div className="text-center">
        <div className="text-6xl mb-2">🏆</div>
        <h2 className="text-3xl font-black text-amber-400">Classement</h2>
      </div>

      <Card className="w-full max-w-sm" glow>
        <div className="flex flex-col gap-3">
          {sorted.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${i === 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-stone-800'}`}>
              <span className="text-2xl">{medals[i] ?? `${i + 1}`}</span>
              <span className="text-2xl">{p.emoji}</span>
              <span className="text-stone-200 font-semibold flex-1">{p.name}</span>
              <span className="text-amber-400 font-black text-xl">{p.score}</span>
            </div>
          ))}
        </div>
      </Card>

      {isHost && (
        <div className="w-full max-w-sm flex flex-col gap-3">
          <p className="text-stone-500 text-sm text-center">Lancer la prochaine manche :</p>
          <Button size="lg" className="w-full" onClick={() => { resetRoundScores(); startGame('blind-test'); }}>🔍 Blind Test</Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => { resetRoundScores(); startGame('puzzle'); }}>🧩 Puzzle</Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => { resetRoundScores(); startGame('pixel-match'); }}>🎯 Pixel Match</Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => { resetRoundScores(); setPhase('lobby'); }}>↩ Retour au lobby</Button>
        </div>
      )}

      {!isHost && (
        <p className="text-stone-600 text-sm">En attente de l'hôte…</p>
      )}
    </div>
  );
}
