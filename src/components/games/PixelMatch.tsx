import React, { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { usePeer } from '../../hooks/usePeer';
import { Card } from '../ui/Card';
import { PhotoUploader } from '../ui/PhotoUploader';
import { drawPixelated } from '../../utils/imageUtils';
import type { PeerMessage } from '../../types';

const REVEAL_INTERVAL_MS = 2000;

export function PixelMatch() {
  const { myId, players, masterIndex, pixelMatch, updatePixelMatch } = useAppStore();
  const { send } = usePeer();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainImgRef = useRef<HTMLImageElement | null>(null);
  const photosRef = useRef<string[]>([]);

  const master = players[masterIndex];
  const isMaster = myId === master?.id;
  const { phase, photos, answerIndex, revealLevel, winner, myGuess } = pixelMatch;

  // ─── Draw pixelated main photo ──────────────────────────────────────────────
  const drawMain = useCallback(() => {
    const canvas = mainCanvasRef.current;
    const img = mainImgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPixelated(ctx, img, revealLevel, canvas.width, canvas.height);
  }, [revealLevel]);

  useEffect(() => {
    if (answerIndex === null || photos.length === 0) return;
    const img = new Image();
    img.onload = () => { mainImgRef.current = img; drawMain(); };
    img.src = photos[answerIndex];
  }, [photos, answerIndex, drawMain]);

  useEffect(() => { drawMain(); }, [drawMain]);

  // ─── Master: start reveal ticker ───────────────────────────────────────────
  const startReveal = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const cur = useAppStore.getState().pixelMatch;
      if (cur.phase !== 'playing') { clearInterval(intervalRef.current!); return; }
      const next = Math.min(cur.revealLevel + 1, 10);
      const msg: PeerMessage = { type: 'PM_REVEAL_TICK', level: next };
      send(msg);
      updatePixelMatch({ revealLevel: next });
      if (next >= 10) clearInterval(intervalRef.current!);
    }, REVEAL_INTERVAL_MS);
  }, [send, updatePixelMatch]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // ─── Master: setup game ─────────────────────────────────────────────────────
  const [pendingPhotos, setPendingPhotos] = React.useState<string[]>([]);

  const handlePhotoAdded = (dataUrl: string) => {
    setPendingPhotos((prev) => {
      const updated = [...prev, dataUrl];
      if (updated.length === 5) {
        const aIdx = Math.floor(Math.random() * 5);
        const msg: PeerMessage = { type: 'PM_SETUP', photos: updated, answerIndex: aIdx };
        send(msg);
        updatePixelMatch({ photos: updated, answerIndex: aIdx, phase: 'playing', revealLevel: 0, myGuess: null, winner: null });
        photosRef.current = updated;
        startReveal();
      }
      return updated;
    });
  };

  // ─── Guest: make a guess ────────────────────────────────────────────────────
  const guess = (idx: number) => {
    if (myGuess !== null || winner) return;
    updatePixelMatch({ myGuess: idx });
    const msg: PeerMessage = { type: 'PM_GUESS', playerId: myId!, photoIndex: idx };
    send(msg);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center p-4 gap-5">
      <div className="w-full max-w-lg flex items-center justify-between">
        <h2 className="text-2xl font-black text-amber-400">🎯 Pixel Match</h2>
        <span className="text-stone-500 text-sm">Maître : {master?.emoji} {master?.name}</span>
      </div>

      {/* Master: idle — pick 5 photos */}
      {phase === 'idle' && isMaster && (
        <Card className="w-full max-w-lg" glow>
          <h3 className="text-stone-200 font-semibold mb-1">Choisis 5 photos ({pendingPhotos.length}/5)</h3>
          <p className="text-stone-500 text-sm mb-4">La 1ère sélectionnée sera la photo mystère (non, c'est aléatoire 🎲)</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {pendingPhotos.map((p, i) => (
              <img key={i} src={p} className="w-14 h-14 rounded-xl object-cover ring-2 ring-amber-500/30" alt="" />
            ))}
          </div>
          {pendingPhotos.length < 5 && (
            <PhotoUploader
              onPhoto={handlePhotoAdded}
              label={`Ajouter la photo ${pendingPhotos.length + 1}/5`}
            />
          )}
        </Card>
      )}

      {phase === 'idle' && !isMaster && (
        <Card className="w-full max-w-lg">
          <p className="text-stone-400 text-center py-8">⏳ {master?.name} choisit 5 photos…</p>
        </Card>
      )}

      {/* Playing */}
      {phase !== 'idle' && photos.length === 5 && (
        <>
          {/* Pixelated mystery photo */}
          <div className="w-full max-w-lg">
            <p className="text-stone-400 text-sm text-center mb-2">Quelle photo est celle-ci ?</p>
            <canvas
              ref={mainCanvasRef}
              width={480}
              height={360}
              className="w-full rounded-2xl border border-stone-700"
            />
            {/* Reveal bar */}
            <div className="mt-2 h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-[1900ms]"
                style={{ width: `${revealLevel * 10}%` }}
              />
            </div>
          </div>

          {/* 5 thumbnails to choose from */}
          {!isMaster && (
            <div className="w-full max-w-lg">
              <p className="text-stone-400 text-sm mb-2 text-center">Clique sur la bonne photo</p>
              <div className="grid grid-cols-5 gap-2">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => guess(i)}
                    disabled={!!myGuess || !!winner}
                    className={`relative rounded-xl overflow-hidden aspect-square transition-all active:scale-95
                      ${myGuess === i ? 'ring-4 ring-amber-500' : 'ring-2 ring-stone-700 hover:ring-amber-500/50'}
                      ${winner && answerIndex === i ? 'ring-4 ring-green-500' : ''}
                      ${winner && myGuess === i && answerIndex !== i ? 'ring-4 ring-red-500' : ''}`}
                  >
                    <img src={p} alt={`option ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Master view of thumbnails */}
          {isMaster && (
            <div className="w-full max-w-lg">
              <p className="text-stone-500 text-sm mb-2 text-center">Tu vois les 5 options (la réponse est la n°{(answerIndex ?? 0) + 1})</p>
              <div className="grid grid-cols-5 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className={`rounded-xl overflow-hidden aspect-square ${answerIndex === i ? 'ring-4 ring-green-500' : 'ring-2 ring-stone-700'}`}>
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {winner && (
            <Card className="w-full max-w-lg" glow>
              <div className="text-center py-2">
                <div className="text-5xl mb-2">🎯</div>
                <p className="text-xl font-black text-amber-400">{winner.name} a trouvé !</p>
                <p className="text-stone-500 text-sm mt-1">+3 points</p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Scoreboard mini */}
      <Card className="w-full max-w-lg">
        <div className="flex flex-wrap gap-3">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 bg-stone-800 rounded-xl px-3 py-1.5">
              <span>{p.emoji}</span>
              <span className="text-stone-300 text-sm">{p.name}</span>
              <span className="text-amber-400 font-bold text-sm">{p.score}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
