// ─── Player & Room ────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  emoji: string;
  score: number;
  isHost: boolean;
}

export type GamePhase =
  | 'lobby'
  | 'blind-test'
  | 'puzzle'
  | 'pixel-match'
  | 'scoreboard';

export type GameId = 'blind-test' | 'puzzle' | 'pixel-match';

// ─── PeerJS Messages ─────────────────────────────────────────────────────────

export type PeerMessage =
  | { type: 'PLAYER_JOIN'; player: Player }
  | { type: 'PLAYER_LIST'; players: Player[] }
  | { type: 'PLAYER_LEAVE'; playerId: string }
  | { type: 'GAME_START'; game: GameId; masterIndex: number }
  | { type: 'GAME_END'; scores: Record<string, number> }
  | { type: 'CHAT'; from: string; text: string }
  // Blind Test
  | { type: 'BT_PHOTO'; dataUrl: string }
  | { type: 'BT_ZOOM_TICK'; level: number }
  | { type: 'BT_BUZZ'; playerId: string; playerName: string }
  | { type: 'BT_WINNER'; winnerId: string; winnerName: string }
  | { type: 'BT_NO_WINNER' }
  // Puzzle
  | { type: 'PUZZLE_PHOTO'; dataUrl: string; gridSize: number }
  | { type: 'PUZZLE_FINISHED'; playerId: string; playerName: string; timeMs: number }
  // Pixel Match
  | { type: 'PM_SETUP'; photos: string[]; answerIndex: number }
  | { type: 'PM_REVEAL_TICK'; level: number }
  | { type: 'PM_GUESS'; playerId: string; photoIndex: number }
  | { type: 'PM_RESULT'; correct: boolean; winnerId?: string; winnerName?: string; answerIndex: number };

// ─── Blind Test ───────────────────────────────────────────────────────────────

export interface BlindTestState {
  phase: 'idle' | 'uploading' | 'playing' | 'judging' | 'result';
  photoDataUrl: string | null;
  zoomLevel: number; // 1 = max zoom, 10 = full image
  buzzedPlayer: { id: string; name: string } | null;
  winner: { id: string; name: string } | null;
}

// ─── Puzzle ───────────────────────────────────────────────────────────────────

export interface PuzzleState {
  phase: 'idle' | 'playing' | 'finished';
  photoDataUrl: string | null;
  gridSize: number;
  tiles: number[]; // shuffled indices
  winner: { id: string; name: string; timeMs: number } | null;
  startTime: number | null;
}

// ─── Pixel Match ──────────────────────────────────────────────────────────────

export interface PixelMatchState {
  phase: 'idle' | 'selecting' | 'playing' | 'result';
  photos: string[]; // 5 dataUrls
  answerIndex: number | null;
  revealLevel: number; // 0 = fully pixelated, 10 = clear
  winner: { id: string; name: string } | null;
  myGuess: number | null;
}

// ─── App Store ────────────────────────────────────────────────────────────────

export interface AppStore {
  // Identity
  myId: string | null;
  myName: string;
  myEmoji: string;

  // Room
  roomId: string | null;
  players: Player[];
  isHost: boolean;

  // Game state
  phase: GamePhase;
  masterIndex: number; // index into players[] for current game master
  roundScores: Record<string, number>;

  // Sub-game states
  blindTest: BlindTestState;
  puzzle: PuzzleState;
  pixelMatch: PixelMatchState;

  // Setters
  setMyName: (name: string) => void;
  setMyEmoji: (emoji: string) => void;
  setRoomId: (id: string) => void;
  setMyId: (id: string) => void;
  setPlayers: (players: Player[]) => void;
  setIsHost: (v: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  setMasterIndex: (i: number) => void;
  addScore: (playerId: string, points: number) => void;
  resetRoundScores: () => void;

  // Sub-game updaters
  updateBlindTest: (partial: Partial<BlindTestState>) => void;
  updatePuzzle: (partial: Partial<PuzzleState>) => void;
  updatePixelMatch: (partial: Partial<PixelMatchState>) => void;
  resetAll: () => void;
}
