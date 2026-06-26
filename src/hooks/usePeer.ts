import { useCallback, useEffect, useRef } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import { useAppStore } from '../store/useAppStore';
import type { GameId, PeerMessage, Player } from '../types';
import { generatePlayerId } from '../utils/peerUtils';
import { shuffle } from '../utils/imageUtils';

/**
 * Mesh P2P hook.
 * - Host keeps a map of all connections.
 * - Guests connect only to host; host relays broadcasts.
 */
export function usePeer() {
  const store = useAppStore();
  const peerRef = useRef<Peer | null>(null);
  const connsRef = useRef<Map<string, DataConnection>>(new Map());
  const hostConnRef = useRef<DataConnection | null>(null); // guest → host only

  // ─── Send helpers ──────────────────────────────────────────────────────────

  /** Host: send to all connected peers */
  const broadcast = useCallback((msg: PeerMessage, excludeId?: string) => {
    connsRef.current.forEach((conn, id) => {
      if (id !== excludeId && conn.open) conn.send(msg);
    });
  }, []);

  /** Guest → host; Host → broadcast */
  const send = useCallback(
    (msg: PeerMessage) => {
      if (store.isHost) {
        broadcast(msg);
        handleMessage(msg, store.myId!); // also apply locally
      } else {
        hostConnRef.current?.send(msg);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.isHost, store.myId]
  );

  // ─── Message handler ───────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function handleMessage(msg: PeerMessage, fromId: string) {
    const { updateBlindTest, updatePuzzle, updatePixelMatch, addScore, setPhase, setPlayers, setMasterIndex } = useAppStore.getState();

    switch (msg.type) {
      // ── Lobby ──────────────────────────────────────────────────────────────
      case 'PLAYER_JOIN': {
        const s = useAppStore.getState();
        if (s.isHost) {
          const already = s.players.find((p) => p.id === msg.player.id);
          if (!already) {
            const newList = [...s.players, msg.player];
            setPlayers(newList);
            // Send full list back to everyone
            const listMsg: PeerMessage = { type: 'PLAYER_LIST', players: newList };
            broadcast(listMsg);
            connsRef.current.get(fromId)?.send(listMsg);
          }
        }
        break;
      }
      case 'PLAYER_LIST':
        setPlayers(msg.players);
        break;

      case 'PLAYER_LEAVE': {
        const s = useAppStore.getState();
        const newList = s.players.filter((p) => p.id !== msg.playerId);
        setPlayers(newList);
        if (s.isHost) broadcast(msg);
        break;
      }

      // ── Game control ────────────────────────────────────────────────────────
      case 'GAME_START':
        setPhase(msg.game as 'blind-test' | 'puzzle' | 'pixel-match');
        setMasterIndex(msg.masterIndex);
        break;

      case 'GAME_END': {
        const s = useAppStore.getState();
        const updated = s.players.map((p) => ({
          ...p,
          score: (p.score ?? 0) + (msg.scores[p.id] ?? 0),
        }));
        setPlayers(updated);
        setPhase('scoreboard');
        break;
      }

      // ── Blind Test ──────────────────────────────────────────────────────────
      case 'BT_PHOTO':
        updateBlindTest({ photoDataUrl: msg.dataUrl, phase: 'playing', zoomLevel: 1 });
        break;

      case 'BT_ZOOM_TICK':
        updateBlindTest({ zoomLevel: msg.level });
        break;

      case 'BT_BUZZ':
        updateBlindTest({ buzzedPlayer: { id: msg.playerId, name: msg.playerName }, phase: 'judging' });
        break;

      case 'BT_WINNER':
        updateBlindTest({ winner: { id: msg.winnerId, name: msg.winnerName }, phase: 'result' });
        addScore(msg.winnerId, 3);
        break;

      case 'BT_NO_WINNER':
        updateBlindTest({ phase: 'playing', buzzedPlayer: null, zoomLevel: useAppStore.getState().blindTest.zoomLevel });
        break;

      // ── Puzzle ──────────────────────────────────────────────────────────────
      case 'PUZZLE_PHOTO': {
        const n = msg.gridSize * msg.gridSize;
        const tiles = shuffle(Array.from({ length: n }, (_, i) => i));
        updatePuzzle({
          photoDataUrl: msg.dataUrl,
          gridSize: msg.gridSize,
          tiles,
          phase: 'playing',
          startTime: Date.now(),
          winner: null,
        });
        break;
      }

      case 'PUZZLE_FINISHED':
        updatePuzzle({ winner: { id: msg.playerId, name: msg.playerName, timeMs: msg.timeMs }, phase: 'finished' });
        addScore(msg.playerId, 3);
        break;

      // ── Pixel Match ─────────────────────────────────────────────────────────
      case 'PM_SETUP':
        updatePixelMatch({
          photos: msg.photos,
          answerIndex: msg.answerIndex,
          revealLevel: 0,
          phase: 'playing',
          myGuess: null,
          winner: null,
        });
        break;

      case 'PM_REVEAL_TICK':
        updatePixelMatch({ revealLevel: msg.level });
        break;

      case 'PM_GUESS': {
        const s = useAppStore.getState();
        if (s.isHost) {
          const correct = msg.photoIndex === s.pixelMatch.answerIndex;
          const result: PeerMessage = {
            type: 'PM_RESULT',
            correct,
            winnerId: correct ? msg.playerId : undefined,
            winnerName: correct ? s.players.find((p) => p.id === msg.playerId)?.name : undefined,
            answerIndex: s.pixelMatch.answerIndex!,
          };
          broadcast(result);
          handleMessage(result, store.myId!);
        }
        break;
      }

      case 'PM_RESULT': {
        const s = useAppStore.getState();
        if (msg.correct && msg.winnerId) {
          updatePixelMatch({
            winner: { id: msg.winnerId, name: msg.winnerName! },
            phase: 'result',
            revealLevel: 10,
            answerIndex: msg.answerIndex,
          });
          if (s.myId === msg.winnerId || s.isHost) {
            addScore(msg.winnerId, 3);
          }
        }
        break;
      }

      default:
        break;
    }
  }

  // ─── Setup connection ──────────────────────────────────────────────────────

  function setupConn(conn: DataConnection, asHost: boolean) {
    conn.on('data', (raw) => {
      const msg = raw as PeerMessage;
      if (asHost) {
        // Relay to all others (broadcast excluding sender)
        broadcast(msg, conn.peer);
        // Apply locally on host
        handleMessage(msg, conn.peer);
      } else {
        handleMessage(msg, conn.peer);
      }
    });

    conn.on('close', () => {
      const s = useAppStore.getState();
      if (asHost) {
        connsRef.current.delete(conn.peer);
        const newList = s.players.filter((p) => p.id !== conn.peer);
        useAppStore.getState().setPlayers(newList);
        broadcast({ type: 'PLAYER_LEAVE', playerId: conn.peer });
      }
    });
  }

  // ─── Create room (host) ────────────────────────────────────────────────────

  const createRoom = useCallback(
    (roomId: string, playerName: string, emoji: string) => {
      const playerId = generatePlayerId(playerName);
      const peer = new Peer(roomId, { debug: 0 });
      peerRef.current = peer;

      peer.on('open', (id) => {
        store.setMyId(id);
        store.setRoomId(roomId);
        store.setIsHost(true);
        const me: Player = { id, name: playerName, emoji, score: 0, isHost: true };
        store.setPlayers([me]);
        store.setMyName(playerName);
        store.setMyEmoji(emoji);
      });

      peer.on('connection', (conn) => {
        connsRef.current.set(conn.peer, conn);
        conn.on('open', () => setupConn(conn, true));
      });

      peer.on('error', (err) => console.error('[Host] Peer error', err));
      // suppress unused var warning
      void playerId;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Join room (guest) ─────────────────────────────────────────────────────

  const joinRoom = useCallback(
    (roomId: string, playerName: string, emoji: string) => {
      const playerId = generatePlayerId(playerName);
      const peer = new Peer(playerId, { debug: 0 });
      peerRef.current = peer;

      peer.on('open', (id) => {
        store.setMyId(id);
        store.setMyName(playerName);
        store.setMyEmoji(emoji);

        const conn = peer.connect(roomId, { reliable: true });
        hostConnRef.current = conn;

        conn.on('open', () => {
          setupConn(conn, false);
          const me: Player = { id, name: playerName, emoji, score: 0, isHost: false };
          conn.send({ type: 'PLAYER_JOIN', player: me } as PeerMessage);
        });

        conn.on('error', (err) => console.error('[Guest] Conn error', err));
      });

      peer.on('error', (err) => console.error('[Guest] Peer error', err));
      store.setRoomId(roomId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Game actions ──────────────────────────────────────────────────────────

  const startGame = useCallback(
    (game: GameId) => {
      const s = useAppStore.getState();
      const nextMaster = (s.masterIndex + 1) % Math.max(1, s.players.length);
      const msg: PeerMessage = { type: 'GAME_START', game, masterIndex: nextMaster };
      broadcast(msg);
      handleMessage(msg, s.myId!);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [broadcast]
  );

  const endGame = useCallback(() => {
    const s = useAppStore.getState();
    const msg: PeerMessage = { type: 'GAME_END', scores: s.roundScores };
    broadcast(msg);
    handleMessage(msg, s.myId!);
  }, [broadcast]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  return { createRoom, joinRoom, send, broadcast, startGame, endGame };
}
