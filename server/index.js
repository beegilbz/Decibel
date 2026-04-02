require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./store/inMemory');

const app = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'decibel-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax',
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Passport: Spotify ──────────────────────────────────────────────────────────
passport.use(new SpotifyStrategy(
  {
    clientID: process.env.SPOTIFY_CLIENT_ID || 'placeholder',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || 'placeholder',
    callbackURL: process.env.SPOTIFY_CALLBACK_URL || 'http://localhost:5000/auth/spotify/callback',
  },
  (accessToken, refreshToken, expires_in, profile, done) => {
    let user = db.findUserByProvider('spotify', profile.id);
    if (user) {
      db.updateUserTokens(user.id, accessToken, refreshToken);
    } else {
      user = db.createUser({
        provider: 'spotify',
        providerId: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        avatar: profile.photos?.[0]?.value,
        accessToken,
        refreshToken,
      });
    }
    return done(null, user);
  }
));

// ── Passport: Google ───────────────────────────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
  },
  (accessToken, refreshToken, profile, done) => {
    let user = db.findUserByProvider('google', profile.id);
    if (user) {
      db.updateUserTokens(user.id, accessToken, refreshToken);
    } else {
      user = db.createUser({
        provider: 'google',
        providerId: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        avatar: profile.photos?.[0]?.value,
        accessToken,
        refreshToken,
      });
    }
    return done(null, user);
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = db.findUserById(id);
  done(null, user || false);
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/auth', require('./routes/auth'));
app.use('/api/leagues', require('./routes/leagues'));
app.use('/api/leagues/:leagueId/rounds', require('./routes/rounds'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/music', require('./routes/music'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎵 Decibel server running on http://localhost:${PORT}`);
});
