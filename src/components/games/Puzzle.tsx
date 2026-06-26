import React, { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { usePeer } from '../../hooks/usePeer';
import { Card } from '../ui/Card';
import { PhotoUploader } from '../ui/PhotoUploader';
import { isSolved, shuffle } from '../../utils/imageUtils';
import type { PeerMessage } from '../../types';

const GRID = 4; // 4×4 = 16 tiles

export function Puzzle() {
  const { myId, players, masterIndex, puzzle, updatePuzzle, addScore } = useAppStore();
  const { send } = usePeer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const master = players[masterIndex];
  const isMaster = myId === master?.id;
  const { phase, photoDataUrl, tiles, winner, startTime } = puzzle;

  const sz = GRID;

  // ─── Draw tiles onto canvas ─────────────────────────────────────────────────
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || tiles.length === 0) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const tileW = W / sz;
    const tileH = canvas.height / sz;
    ctx.clearRect(0, 0, W, canvas.height);

    tiles.forEach((srcIdx, destIdx) => {
      const srcCol = srcIdx % sz;
      const srcRow = Math.floor(srcIdx / sz);
      const destCol = destIdx % sz;
      const destRow = Math.floor(destIdx / sz);

      ctx.drawImage(
        img,
        srcCol * (img.naturalWidth / sz),
        srcRow * (img.naturalHeight / sz),
        img.naturalWidth / sz,
        img.naturalHeight / sz,
        destCol * tileW,
        destRow * tileH,
        tileW,
        tileH
      );

      // tile border
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(destCol * tileW, destRow * tileH, tileW, tileH);
    });
  }, [tiles, sz]);

  useEffect(() => {
    if (!photoDataUrl) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      drawBoard();
    };
    img.src = photoDataUrl;
  }, [photoDataUrl, drawBoard]);

  useEffect(() => { drawBoard(); }, [drawBoard]);

  // ─── Tile click — swap with neighbor ───────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing' || winner) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor((x / rect.width) * sz);
    const row = Math.floor((y / rect.height) * sz);
    const clickedIdx = row * sz + col;

    // Find adjacent tile to swap (simple: swap with any clicked neighbor — use slide mechanic with blank)
    // For simplicity: click swaps the tile with its horizontally/vertically adjacent tile
    // We use a "swap clicked with random adjacent" approach — actually let's do proper sliding:
    // No blank tile here; instead clicking a tile swaps it with an adjacent random one.
    // Better UX: clicking tile selects it, second click on adjacent swaps them.
    const newTiles = [...tiles];
    const neighbors = [clickedIdx - 1, clickedIdx + 1, clickedIdx - sz, clickedIdx + sz].filter(
      (n) => n >= 0 && n < sz * sz && !(clickedIdx % sz === 0 && n === clickedIdx - 1) && !(clickedIdx % sz === sz - 1 && n === clickedIdx + 1)
    );
    if (neighbors.length === 0) return;
    // swap with first valid neighbor
    const swapWith = neighbors[0];
    [newTiles[clickedIdx], newTiles[swapWith]] = [newTiles[swapWith], newTiles[clickedIdx]];
    updatePuzzle({ tiles: newTiles });

    if (isSolved(newTiles) && startTime) {
      const timeMs = Date.now() - startTime;
      const me = players.find((p) => p.id === myId)!;
      const msg: PeerMessage = { type: 'PUZZLE_FINISHED', playerId: myId!, playerName: me.name, timeMs };
      send(msg);
      updatePuzzle({ winner: { id: myId!, name: me.name, timeMs }, phase: 'finished' });
      addScore(myId!, 3);
    }
  };

  // ─── Master sends photo ─────────────────────────────────────────────────────
  const handlePhoto = (dataUrl: string) => {
    const n = sz * sz;
    const shuffled = shuffle(Array.from({ length: n }, (_, i) => i));
    const msg: PeerMessage = { type: 'PUZZLE_PHOTO', dataUrl, gridSize: sz };
    send(msg);
    updatePuzzle({ photoDataUrl: dataUrl, gridSize: sz, tiles: shuffled, phase: 'playing', startTime: Date.now(), winner: null });
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center p-4 gap-5">
      <div className="w-full max-w-lg flex items-center justify-between">
        <h2 className="text-2xl font-black text-amber-400">🧩 Puzzle</h2>
        <span className="text-stone-500 text-sm">Maître : {master?.emoji} {master?.name}</span>
      </div>

      {phase === 'idle' && isMaster && (
        <Card className="w-full max-w-lg" glow>
          <h3 className="text-stone-200 font-semibold mb-4">Envoie une photo à reconstituer</h3>
          <PhotoUploader onPhoto={handlePhoto} label="Choisir la photo puzzle" />
        </Card>
      )}

      {phase === 'idle' && !isMaster && (
        <Card className="w-full max-w-lg">
          <p className="text-stone-400 text-center py-8">⏳ En attente que {master?.name} choisisse une photo…</p>
        </Card>
      )}

      {phase !== 'idle' && (
        <div className="w-full max-w-lg">
          <canvas
            ref={canvasRef}
            width={480}
            height={480}
            onClick={handleCanvasClick}
            className="w-full rounded-2xl border border-stone-700 cursor-pointer touch-none"
            style={{ aspectRatio: '1' }}
          />

          {phase === 'playing' && !winner && (
            <p className="text-center text-stone-500 mt-3 text-sm">Clique sur une pièce pour l'échanger avec son voisin</p>
          )}

          {winner && (
            <Card className="mt-4" glow>
              <div className="text-center py-2">
                <div className="text-5xl mb-2">🏆</div>
                <p className="text-xl font-black text-amber-400">{winner.name} a terminé !</p>
                <p className="text-stone-500 text-sm mt-1">En {(winner.timeMs / 1000).toFixed(1)}s — +3 points</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Scoreboard mini */}
      <Card className="w-full max-w-lg">
        <h3 className="text-stone-400 text-sm font-medium mb-2">Joueurs</h3>
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
