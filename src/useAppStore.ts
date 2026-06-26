import { create } from 'zustand';
import type { AppStore, BlindTestState, GamePhase, PixelMatchState, PuzzleState } from '../types';

const defaultBlindTest: BlindTestState = {
  phase: 'idle',
  photoDataUrl: null,
  zoomLevel: 1,
  buzzedPlayer: null,
  winner: null,
};

const defaultPuzzle: PuzzleState = {
  phase: 'idle',
  photoDataUrl: null,
  gridSize: 4,
  tiles: [],
  winner: null,
  startTime: null,
};

const defaultPixelMatch: PixelMatchState = {
  phase: 'idle',
  photos: [],
  answerIndex: null,
  revealLevel: 0,
  winner: null,
  myGuess: null,
};

export const useAppStore = create<AppStore>((set) => ({
  myId: null,
  myName: '',
  myEmoji: '😎',
  roomId: null,
  players: [],
  isHost: false,
  phase: 'lobby',
  masterIndex: 0,
  roundScores: {},
  blindTest: defaultBlindTest,
  puzzle: defaultPuzzle,
  pixelMatch: defaultPixelMatch,

  setMyName: (name) => set({ myName: name }),
  setMyEmoji: (emoji) => set({ myEmoji: emoji }),
  setRoomId: (id) => set({ roomId: id }),
  setMyId: (id) => set({ myId: id }),
  setPlayers: (players) => set({ players }),
  setIsHost: (v) => set({ isHost: v }),
  setPhase: (phase: GamePhase) => set({ phase }),
  setMasterIndex: (i) => set({ masterIndex: i }),

  addScore: (playerId, points) =>
    set((s) => ({
      roundScores: { ...s.roundScores, [playerId]: (s.roundScores[playerId] ?? 0) + points },
      players: s.players.map((p) =>
        p.id === playerId ? { ...p, score: p.score + points } : p
      ),
    })),

  resetRoundScores: () => set({ roundScores: {} }),

  updateBlindTest: (partial) =>
    set((s) => ({ blindTest: { ...s.blindTest, ...partial } })),

  updatePuzzle: (partial) =>
    set((s) => ({ puzzle: { ...s.puzzle, ...partial } })),

  updatePixelMatch: (partial) =>
    set((s) => ({ pixelMatch: { ...s.pixelMatch, ...partial } })),

  resetAll: () =>
    set({
      phase: 'lobby',
      roundScores: {},
      blindTest: defaultBlindTest,
      puzzle: defaultPuzzle,
      pixelMatch: defaultPixelMatch,
    }),
}));
