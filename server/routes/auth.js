const express = require('express');
const passport = require('passport');
const router = express.Router();

// ── Spotify ───────────────────────────────────────────────────────────────────
router.get('/spotify', passport.authenticate('spotify', {
  scope: ['user-read-email', 'user-read-private', 'user-library-read'],
}));

router.get('/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: `${process.env.CLIENT_URL}/login?error=spotify` }),
  (req, res) => res.redirect(`${process.env.CLIENT_URL}/leagues`)
);

// ── Google (YouTube) ──────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login?error=google` }),
  (req, res) => res.redirect(`${process.env.CLIENT_URL}/leagues`)
);

// ── Session info ──────────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    const { id, displayName, email, avatar, provider } = req.user;
    return res.json({ id, displayName, email, avatar, provider });
  }
  return res.status(401).json({ error: 'Not authenticated' });
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
});

module.exports = router;
