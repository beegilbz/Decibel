const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../store/inMemory');

// GET /api/leagues — list all public leagues + user's leagues
router.get('/', requireAuth, (req, res) => {
  const all = db.getLeagues();
  const userId = req.user.id;
  const visible = all.filter((l) => l.isPublic || l.members.includes(userId));
  // Enrich with member count
  const enriched = visible.map((l) => ({
    ...l,
    memberCount: l.members.length,
    isMember: l.members.includes(userId),
    isOwner: l.ownerId === userId,
  }));
  res.json(enriched);
});

// POST /api/leagues — create a league
router.post('/', requireAuth, (req, res) => {
  const { name, description, isPublic, theme, maxMembers } = req.body;
  if (!name) return res.status(400).json({ error: 'League name is required' });
  const league = db.createLeague({
    name,
    description,
    ownerId: req.user.id,
    isPublic,
    theme,
    maxMembers,
  });
  res.status(201).json(league);
});

// GET /api/leagues/:id
router.get('/:id', requireAuth, (req, res) => {
  const league = db.getLeagueById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  const userId = req.user.id;
  const rounds = db.getRoundsByLeague(league.id);
  res.json({
    ...league,
    memberCount: league.members.length,
    isMember: league.members.includes(userId),
    isOwner: league.ownerId === userId,
    rounds,
  });
});

// PUT /api/leagues/:id — update (owner only)
router.put('/:id', requireAuth, (req, res) => {
  const league = db.getLeagueById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const updated = db.updateLeague(req.params.id, req.body);
  res.json(updated);
});

// POST /api/leagues/:id/join
router.post('/:id/join', requireAuth, (req, res) => {
  const league = db.getLeagueById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.members.length >= league.maxMembers)
    return res.status(400).json({ error: 'League is full' });
  const updated = db.joinLeague(req.params.id, req.user.id);
  res.json(updated);
});

// POST /api/leagues/:id/leave
router.post('/:id/leave', requireAuth, (req, res) => {
  const league = db.getLeagueById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.ownerId === req.user.id)
    return res.status(400).json({ error: 'Owner cannot leave — transfer ownership first' });
  const updated = db.leaveLeague(req.params.id, req.user.id);
  res.json(updated);
});

module.exports = router;
