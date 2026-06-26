import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { usePeer } from '../../hooks/usePeer';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { generateRoomId } from '../../utils/peerUtils';

const EMOJIS = ['😎', '🦁', '🐼', '🦊', '🐸', '🦋', '🐙', '🦄', '🤠', '🧙', '👻', '🤖'];

export function Lobby() {
  const { myName, myEmoji, roomId, players, isHost, setMyName, setMyEmoji } = useAppStore();
  const { createRoom, joinRoom, startGame } = usePeer();

  const [joinId, setJoinId] = useState('');
  const [view, setView] = useState<'home' | 'create' | 'join' | 'room'>('home');
  const [localName, setLocalName] = useState(myName);
  const [localEmoji, setLocalEmoji] = useState(myEmoji);

  const inRoom = !!roomId;

  if (inRoom) {
    return <RoomView players={players} roomId={roomId} isHost={isHost} startGame={startGame} myId={useAppStore.getState().myId!} />;
  }

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center">
          <div className="text-7xl mb-4">📸</div>
          <h1 className="text-4xl font-black text-amber-400 tracking-tight">Family Photo Games</h1>
          <p className="text-stone-400 mt-2">Jeux photos en famille, en temps réel</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button size="lg" onClick={() => setView('create')}>🏠 Créer une partie</Button>
          <Button size="lg" variant="secondary" onClick={() => setView('join')}>🔗 Rejoindre une partie</Button>
        </div>
      </div>
    );
  }

  const handleCreate = () => {
    if (!localName.trim()) return;
    setMyName(localName.trim());
    setMyEmoji(localEmoji);
    createRoom(generateRoomId(), localName.trim(), localEmoji);
  };

  const handleJoin = () => {
    if (!localName.trim() || !joinId.trim()) return;
    setMyName(localName.trim());
    setMyEmoji(localEmoji);
    joinRoom(joinId.trim().toLowerCase(), localName.trim(), localEmoji);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-sm" glow>
        <button onClick={() => setView('home')} className="text-stone-500 hover:text-stone-300 mb-4 text-sm">← Retour</button>
        <h2 className="text-2xl font-bold text-amber-400 mb-5">
          {view === 'create' ? '🏠 Nouvelle partie' : '🔗 Rejoindre'}
        </h2>

        <label className="block mb-4">
          <span className="text-stone-400 text-sm font-medium">Ton prénom</span>
          <input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="ex : Marie"
            maxLength={18}
            className="mt-1 w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-stone-100 outline-none focus:border-amber-500 transition-colors"
          />
        </label>

        <label className="block mb-5">
          <span className="text-stone-400 text-sm font-medium">Ton emoji</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setLocalEmoji(e)}
                className={`text-2xl p-1 rounded-lg transition-all ${localEmoji === e ? 'bg-amber-500/30 ring-2 ring-amber-500 scale-110' : 'hover:bg-stone-700'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </label>

        {view === 'join' && (
          <label className="block mb-5">
            <span className="text-stone-400 text-sm font-medium">Code de la salle</span>
            <input
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="fpg-swift-panda-123"
              className="mt-1 w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-stone-100 font-mono text-sm outline-none focus:border-amber-500 transition-colors"
            />
          </label>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={view === 'create' ? handleCreate : handleJoin}
          disabled={!localName.trim() || (view === 'join' && !joinId.trim())}
        >
          {view === 'create' ? 'Créer 🚀' : 'Rejoindre 🎉'}
        </Button>
      </Card>
    </div>
  );
}

// ─── Room waiting screen ──────────────────────────────────────────────────────

function RoomView({
  players,
  roomId,
  isHost,
  startGame,
  myId,
}: {
  players: import('../../types').Player[];
  roomId: string;
  isHost: boolean;
  startGame: (game: 'blind-test' | 'puzzle' | 'pixel-match') => void;
  myId: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const GAMES: { id: 'blind-test' | 'puzzle' | 'pixel-match'; label: string; desc: string; emoji: string }[] = [
    { id: 'blind-test', label: 'Blind Test', desc: 'Photo zoomée qui dézoome', emoji: '🔍' },
    { id: 'puzzle', label: 'Puzzle Compétitif', desc: 'Le plus rapide gagne', emoji: '🧩' },
    { id: 'pixel-match', label: 'Pixel Match', desc: 'Photo floue parmi 5', emoji: '🎯' },
  ];

  return (
    <div className="min-h-screen bg-stone-950 p-6 flex flex-col gap-6 max-w-lg mx-auto">
      <div className="text-center">
        <p className="text-stone-500 text-sm">Code de la salle</p>
        <button
          onClick={copy}
          className="font-mono text-amber-400 text-lg font-bold tracking-wider hover:text-amber-300 transition-colors flex items-center gap-2 mx-auto mt-1"
        >
          {roomId}
          <span className="text-xs">{copied ? '✅' : '📋'}</span>
        </button>
      </div>

      <Card>
        <h3 className="text-stone-300 font-semibold mb-3">Joueurs ({players.length})</h3>
        <div className="flex flex-col gap-2">
          {players.map((p: import('../../types').Player) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-2xl">{p.emoji}</span>
              <span className="text-stone-200 font-medium">{p.name}</span>
              {p.isHost && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Hôte</span>}
              {p.id === myId && <span className="text-xs text-stone-500">(toi)</span>}
              <span className="ml-auto font-bold text-amber-400">{p.score} pts</span>
            </div>
          ))}
        </div>
        {players.length < 2 && (
          <p className="text-stone-600 text-sm mt-3">En attente d'autres joueurs…</p>
        )}
      </Card>

      {isHost && players.length >= 2 && (
        <Card>
          <h3 className="text-stone-300 font-semibold mb-3">Lancer un jeu</h3>
          <div className="flex flex-col gap-3">
            {GAMES.map((g) => (
              <button
                key={g.id}
                onClick={() => startGame(g.id)}
                className="flex items-center gap-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-amber-500/50 rounded-xl p-4 text-left transition-all active:scale-95"
              >
                <span className="text-3xl">{g.emoji}</span>
                <div>
                  <p className="text-stone-200 font-semibold">{g.label}</p>
                  <p className="text-stone-500 text-sm">{g.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {!isHost && <p className="text-center text-stone-600 text-sm">En attente que l'hôte lance une partie…</p>}
    </div>
  );
}
