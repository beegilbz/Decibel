# 🎵 Decibel — Setup Guide

## Overview
Decibel is a music league app where users create leagues, submit songs from **Spotify**, **Apple Music**, and **YouTube**, vote up or down on each track, and crown a winner each round.

---

## Quick Start

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure your API keys
Copy the server env example and fill in your credentials:
```bash
cp server/.env.example server/.env
```

Fill in `server/.env`:

| Variable | How to get it |
|---|---|
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → Create App → set Redirect URI to `http://localhost:5000/auth/spotify/callback` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 → set Redirect URI to `http://localhost:5000/auth/google/callback` |
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → Enable YouTube Data API v3 → Create API Key |
| `APPLE_DEVELOPER_TOKEN` | [Apple Developer](https://developer.apple.com) → MusicKit → Generate a JWT developer token |
| `SESSION_SECRET` | Any long random string |

### 3. Run the app
```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## App Structure

```
Decibel/
├── client/              # React frontend
│   └── src/
│       ├── pages/       # Login, Leagues, CreateLeague, LeagueDetail, Round
│       ├── components/  # Navbar, TrackCard, MusicSearch
│       ├── contexts/    # AuthContext (session management)
│       └── styles/      # Global CSS design system
└── server/              # Node.js/Express backend
    ├── routes/          # auth, leagues, rounds, votes, music
    ├── middleware/       # requireAuth
    └── store/           # inMemory.js (swap for Postgres later)
```

---

## How Leagues Work

1. **Create a league** — give it a name, theme, and set public/private
2. **Invite friends** to join (share the league link)
3. **Owner starts a round** — set a name and optional theme
4. **Members submit tracks** — search Spotify, Apple Music, or YouTube
5. **Owner opens voting** — advances round from "Submitting" → "Voting"
6. **Everyone votes** — upvote (▲) or downvote (▼) on any track (not your own)
7. **Owner completes the round** — the highest-scored track wins 🏆

---

## Mobile
The app is fully mobile-responsive and works great on Android and iOS browsers.
To build a native app, wrap the React client with [Capacitor](https://capacitorjs.com):
```bash
cd client && npm run build
npx cap init Decibel com.yourname.decibel
npx cap add android
npx cap add ios
npx cap copy && npx cap open android
```

---

## Production Database
The in-memory store resets on server restart. To persist data, replace `server/store/inMemory.js` with a PostgreSQL or MongoDB adapter. Recommended: [Prisma](https://prisma.io) with PostgreSQL.
