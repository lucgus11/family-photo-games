# 📸 Family Photo Games

Jeux photos **P2P** pour les vacances en famille — sans serveur, sans base de données, entièrement dans le navigateur grâce à [PeerJS](https://peerjs.com/).

## 🎮 Les 3 mini-jeux

### 🔍 Blind Test
Le **Maître de manche** choisit une photo depuis son appareil. Celle-ci s'affiche très zoomée sur les autres écrans et dézoome progressivement toutes les 2,5 secondes. Le premier à reconnaître la photo appuie sur **BUZZ !**. Le Maître valide ou invalide la réponse. **+3 pts** pour le bon répondant.

### 🧩 Puzzle Compétitif
Le Maître envoie une photo découpée en grille 4×4. Chaque joueur résout son propre puzzle sur son écran (clic pour échanger les pièces). Le premier à terminer notifie tous les autres en temps réel. **+3 pts** pour le gagnant.

### 🎯 Pixel Match
Le Maître sélectionne 5 photos depuis sa galerie. L'une d'elles est choisie aléatoirement comme photo mystère et s'affiche très pixelisée. Elle s'éclaircit progressivement. Les joueurs cliquent sur la miniature correspondante parmi les 5. **+3 pts** pour le premier à trouver.

---

## 🚀 Lancer le projet en local

```bash
npm install
npm run dev
```

Ouvrir `http://localhost:5173` dans le navigateur.

## 🌐 Déploiement

### GitHub
```bash
git init
git add .
git commit -m "init: family photo games"
gh repo create family-photo-games --public --push
```

### Vercel
```bash
npm i -g vercel
vercel --prod
```
Ou connecter le dépôt GitHub à [vercel.com](https://vercel.com) pour un déploiement automatique à chaque push.

> Le fichier `vercel.json` est déjà configuré pour le routing SPA.

---

## 🏗️ Architecture

```
src/
├── types/index.ts          # Types TypeScript partagés + messages PeerJS
├── store/useAppStore.ts    # Store Zustand (état global)
├── hooks/usePeer.ts        # Logique PeerJS mesh (hôte + invités)
├── utils/
│   ├── imageUtils.ts       # Resize, pixelisation Canvas, shuffle
│   └── peerUtils.ts        # Génération roomId / playerId
├── components/
│   ├── lobby/Lobby.tsx     # Écran d'accueil, création/join de salle
│   ├── games/
│   │   ├── BlindTest.tsx   # Jeu 1
│   │   ├── Puzzle.tsx      # Jeu 2
│   │   └── PixelMatch.tsx  # Jeu 3
│   ├── ui/                 # Button, Card, PhotoUploader
│   └── Scoreboard.tsx      # Classement inter-manches
└── App.tsx                 # Routeur principal par phase
```

## 🔌 Communication P2P (Mesh simplifié)

```
Invité A ──────┐
Invité B ──────┤──── Hôte (PeerJS broker) ──── relay ──── tous
Invité C ──────┘
```

- L'**hôte** ouvre un `Peer` avec l'ID = `roomId`.
- Les **invités** se connectent directement à l'hôte.
- L'hôte **relaie** tous les messages vers tous les autres (mesh via hub central).
- **Aucun serveur** : le broker PeerJS public sert uniquement à l'échange d'adresses ICE/SDP.

## 🎨 Stack

| Outil | Usage |
|---|---|
| React 18 + TypeScript | UI |
| Vite | Bundler |
| Tailwind CSS v4 | Styles |
| Zustand | État global |
| PeerJS | WebRTC P2P |
| vite-plugin-pwa | PWA / offline |
| Vercel | Hébergement |

## 🔄 Rotation du Maître de manche

À chaque nouveau jeu lancé depuis le lobby, l'index du Maître avance de 1 dans la liste des joueurs (`masterIndex = (masterIndex + 1) % nbPlayers`). Tout le monde voit le même Maître affiché en temps réel.

## 📱 PWA

L'application est installable sur iOS et Android. Elle fonctionne hors-ligne pour la partie UI, mais les jeux nécessitent la connexion P2P entre joueurs.
