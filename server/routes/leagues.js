const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../store/postgres');

router.get('/', requireAuth, async (req, res) => {
  const all = await db.getLeagues();
  const userId = req.user.id;
  const visible = all.filter((l) => l.isPublic || l.members.includes(userId));
  const enriched = visible.map((l) => ({
    ...l,
    memberCount: l.members.length,
    isMember: l.members.includes(userId),
    isOwner: l.ownerId === userId,
  }));
  res.json(enriched);
});

router.post('/', requireAuth, async (req, res) => {
  const { name, description, isPublic, theme, maxMembers } = req.body;
  if (!name) return res.status(400).json({ error: 'League name is required' });
  const league = await db.createLeague({ name, description, ownerId: req.user.id, isPublic, theme, maxMembers });
  res.status(201).json(league);
});

router.get('/:id', requireAuth, async (req, res) => {
  const league = await db.getLeagueById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  const userId = req.user.id;
  const rounds = await db.getRoundsByLeague(league.id);
  res.json({
    ...league,
    memberCount: league.members.length,
    isMember: league.members.includes(userId),
    isOwner: league.ownerId === userId,
    rounds,
  });
});

router.put('/:id', requireAuth, async (req, res) => {
  const league = await db.getLeagueById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const updated = await db.updateLeague(req.params.id, req.body);
  res.json(updated);
});

router.post('/:id/join', requireAuth, async (req, res) => {
  const league = await db.getLeagueById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.members.length >= league.maxMembers)
    return res.status(400).json({ error: 'League is full' });
  const updated = await db.joinLeague(req.params.id, req.user.id);
  res.json(updated);
});

router.post('/:id/leave', requireAuth, async (req, res) => {
  const league = await db.getLeagueById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.ownerId === req.user.id)
    return res.status(400).json({ error: 'Owner cannot leave — transfer ownership first' });
  const updated = await db.leaveLeague(req.params.id, req.user.id);
  res.json(updated);
});

module.exports = router;
