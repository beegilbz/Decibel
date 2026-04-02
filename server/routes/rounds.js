const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth } = require('../middleware/auth');
const db = require('../store/postgres');

router.get('/', requireAuth, async (req, res) => {
  const league = await db.getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  const rounds = await db.getRoundsByLeague(req.params.leagueId);
  res.json(rounds);
});

router.post('/', requireAuth, async (req, res) => {
  const league = await db.getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { name, theme, submissionDeadline, votingDeadline } = req.body;
  if (!name) return res.status(400).json({ error: 'Round name is required' });
  const round = await db.createRound({ leagueId: req.params.leagueId, name, theme, submissionDeadline, votingDeadline });
  res.status(201).json(round);
});

router.get('/:roundId', requireAuth, async (req, res) => {
  const round = await db.getRoundById(req.params.roundId);
  if (!round || round.leagueId !== req.params.leagueId)
    return res.status(404).json({ error: 'Round not found' });
  const leaderboard = await db.getLeaderboard(round.id);
  const userId = req.user.id;
  const enriched = await Promise.all(leaderboard.map(async (sub) => {
    const userVote = await db.getUserVoteForSubmission(userId, sub.id);
    return { ...sub, userVote: userVote ? userVote.value : 0 };
  }));
  res.json({ ...round, submissions: enriched });
});

router.put('/:roundId', requireAuth, async (req, res) => {
  const league = await db.getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const round = await db.getRoundById(req.params.roundId);
  if (!round) return res.status(404).json({ error: 'Round not found' });
  const updates = { ...req.body };
  if (updates.status === 'completed') {
    const leaderboard = await db.getLeaderboard(round.id);
    if (leaderboard.length > 0) updates.winnerId = leaderboard[0].id;
  }
  const updated = await db.updateRound(req.params.roundId, updates);
  res.json(updated);
});

router.post('/:roundId/submissions', requireAuth, async (req, res) => {
  const league = await db.getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (!league.members.includes(req.user.id))
    return res.status(403).json({ error: 'You must be a member to submit' });
  const round = await db.getRoundById(req.params.roundId);
  if (!round) return res.status(404).json({ error: 'Round not found' });
  if (round.status !== 'submitting')
    return res.status(400).json({ error: 'Submissions are closed for this round' });
  const { track } = req.body;
  if (!track) return res.status(400).json({ error: 'Track data is required' });
  const submission = await db.createSubmission({ roundId: round.id, userId: req.user.id, track });
  res.status(201).json(submission);
});

router.delete('/:roundId/submissions/:submissionId', requireAuth, async (req, res) => {
  const submission = await db.getSubmissionById(req.params.submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  if (submission.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await db.deleteSubmission(req.params.submissionId);
  res.json({ success: true });
});

module.exports = router;
