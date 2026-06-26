import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { usePeer } from '../../hooks/usePeer';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PhotoUploader } from '../ui/PhotoUploader';
import type { PeerMessage } from '../../types';

const ZOOM_INTERVAL_MS = 2500;
const MAX_ZOOM_LEVEL = 10;

export function BlindTest() {
  const { myId, players, masterIndex, blindTest, updateBlindTest, addScore } = useAppStore();
  const { send } = usePeer();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const master = players[masterIndex];
  const isMaster = myId === master?.id;
  const { phase, photoDataUrl, zoomLevel, buzzedPlayer, winner } = blindTest;

  // ─── Auto zoom ticker (master drives it) ────────────────────────────────────
  const startZoomTicker = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const current = useAppStore.getState().blindTest;
      if (current.phase !== 'playing') { clearInterval(intervalRef.current!); return; }
      const next = Math.min(current.zoomLevel + 1, MAX_ZOOM_LEVEL);
      const msg: PeerMessage = { type: 'BT_ZOOM_TICK', level: next };
      send(msg);
      updateBlindTest({ zoomLevel: next });
      if (next >= MAX_ZOOM_LEVEL) {
        clearInterval(intervalRef.current!);
        updateBlindTest({ phase: 'judging' });
      }
    }, ZOOM_INTERVAL_MS);
  }, [send, updateBlindTest]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // ─── Send photo ──────────────────────────────────────────────────────────────
  const handlePhoto = (dataUrl: string) => {
    const msg: PeerMessage = { type: 'BT_PHOTO', dataUrl };
    send(msg);
    updateBlindTest({ photoDataUrl: dataUrl, phase: 'playing', zoomLevel: 1 });
    startZoomTicker();
  };

  // ─── Buzz ────────────────────────────────────────────────────────────────────
  const buzz = () => {
    const me = players.find((p) => p.id === myId);
    if (!me) return;
    const msg: PeerMessage = { type: 'BT_BUZZ', playerId: myId!, playerName: me.name };
    send(msg);
    updateBlindTest({ buzzedPlayer: { id: myId!, name: me.name }, phase: 'judging' });
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // ─── Master validates ────────────────────────────────────────────────────────
  const validate = (correct: boolean) => {
    if (correct && buzzedPlayer) {
      const msg: PeerMessage = { type: 'BT_WINNER', winnerId: buzzedPlayer.id, winnerName: buzzedPlayer.name };
      send(msg);
      updateBlindTest({ winner: buzzedPlayer, phase: 'result' });
      addScore(buzzedPlayer.id, 3);
    } else {
      const msg: PeerMessage = { type: 'BT_NO_WINNER' };
      send(msg);
      updateBlindTest({ phase: 'playing', buzzedPlayer: null });
      startZoomTicker();
    }
  };

  // ─── Compute CSS zoom transform ──────────────────────────────────────────────
  // zoomLevel 1 = 8x zoom, level 10 = 1x (full view)
  const scale = 1 + (MAX_ZOOM_LEVEL - zoomLevel) * 0.8;

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center p-4 gap-5">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-amber-400">🔍 Blind Test</h2>
          <span className="text-stone-500 text-sm">Maître : {master?.emoji} {master?.name}</span>
        </div>

        {/* Progress bar */}
        {phase === 'playing' && (
          <div className="mt-3 h-2 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-[2400ms]"
              style={{ width: `${(zoomLevel / MAX_ZOOM_LEVEL) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Phase: idle (master uploads) ── */}
      {phase === 'idle' && isMaster && (
        <Card className="w-full max-w-lg" glow>
          <h3 className="text-stone-200 font-semibold mb-4">Choisis une photo à faire deviner</h3>
          <PhotoUploader onPhoto={handlePhoto} label="Choisir la photo mystère" />
        </Card>
      )}

      {phase === 'idle' && !isMaster && (
        <Card className="w-full max-w-lg">
          <p className="text-stone-400 text-center py-8">⏳ En attente que {master?.name} choisisse une photo…</p>
        </Card>
      )}

      {/* ── Phase: playing — zoomed photo ── */}
      {(phase === 'playing' || phase === 'judging') && photoDataUrl && (
        <div className="w-full max-w-lg">
          <div className="relative overflow-hidden rounded-2xl aspect-square bg-stone-900 border border-stone-700">
            <img
              src={photoDataUrl}
              alt="mystery"
              className="w-full h-full object-cover transition-transform duration-[2400ms] ease-linear"
              style={{ transform: `scale(${scale})` }}
            />
            {!isMaster && phase === 'playing' && (
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-stone-950">
                <Button className="w-full" size="lg" onClick={buzz}>
                  🔔 BUZZ !
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Phase: judging (master validates) ── */}
      {phase === 'judging' && buzzedPlayer && (
        <Card className="w-full max-w-lg" glow>
          <p className="text-stone-300 font-medium text-center mb-4">
            🔔 <strong className="text-amber-400">{buzzedPlayer.name}</strong> a buzzé !
          </p>
          {isMaster ? (
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1" onClick={() => validate(true)}>✅ Correct !</Button>
              <Button variant="danger" className="flex-1" onClick={() => validate(false)}>❌ Faux</Button>
            </div>
          ) : (
            <p className="text-stone-500 text-center text-sm">En attente du verdict de {master?.name}…</p>
          )}
        </Card>
      )}

      {/* ── Phase: result ── */}
      {phase === 'result' && (
        <Card className="w-full max-w-lg" glow>
          {winner ? (
            <div className="text-center py-4">
              <div className="text-6xl mb-3">🏆</div>
              <p className="text-2xl font-black text-amber-400">{winner.name} a gagné !</p>
              <p className="text-stone-500 mt-1">+3 points</p>
            </div>
          ) : (
            <p className="text-stone-400 text-center py-4">Personne n'a trouvé… dommage !</p>
          )}
          {photoDataUrl && (
            <img src={photoDataUrl} alt="revealed" className="w-full rounded-xl mt-4 object-cover" />
          )}
        </Card>
      )}
    </div>
  );
}
