const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth } = require('../middleware/auth');
const db = require('../store/inMemory');

// GET /api/leagues/:leagueId/rounds
router.get('/', requireAuth, (req, res) => {
  const league = db.getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  const rounds = db.getRoundsByLeague(req.params.leagueId);
  res.json(rounds);
});

// POST /api/leagues/:leagueId/rounds — create round (owner only)
router.post('/', requireAuth, (req, res) => {
  const league = db.getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { name, theme, submissionDeadline, votingDeadline } = req.body;
  if (!name) return res.status(400).json({ error: 'Round name is required' });
  const round = db.createRound({ leagueId: req.params.leagueId, name, theme, submissionDeadline, votingDeadline });
  res.status(201).json(round);
});

// GET /api/leagues/:leagueId/rounds/:roundId
router.get('/:roundId', requireAuth, (req, res) => {
  const round = db.getRoundById(req.params.roundId);
  if (!round || round.leagueId !== req.params.leagueId)
    return res.status(404).json({ error: 'Round not found' });
  const leaderboard = db.getLeaderboard(round.id);
  // Attach user's vote for each submission
  const userId = req.user.id;
  const enriched = leaderboard.map((sub) => {
    const userVote = db.getUserVoteForSubmission(userId, sub.id);
    return { ...sub, userVote: userVote ? userVote.value : 0 };
  });
  res.json({ ...round, submissions: enriched });
});

// PUT /api/leagues/:leagueId/rounds/:roundId — advance status or update
router.put('/:roundId', requireAuth, (req, res) => {
  const league = db.getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (league.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const round = db.getRoundById(req.params.roundId);
  if (!round) return res.status(404).json({ error: 'Round not found' });

  const updates = { ...req.body };

  // Auto-set winner when completing
  if (updates.status === 'completed') {
    const leaderboard = db.getLeaderboard(round.id);
    if (leaderboard.length > 0) {
      updates.winnerId = leaderboard[0].id;
    }
  }

  const updated = db.updateRound(req.params.roundId, updates);
  res.json(updated);
});

// POST /api/leagues/:leagueId/rounds/:roundId/submissions
router.post('/:roundId/submissions', requireAuth, (req, res) => {
  const league = db.getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (!league.members.includes(req.user.id))
    return res.status(403).json({ error: 'You must be a member to submit' });
  const round = db.getRoundById(req.params.roundId);
  if (!round) return res.status(404).json({ error: 'Round not found' });
  if (round.status !== 'submitting')
    return res.status(400).json({ error: 'Submissions are closed for this round' });
  const { track } = req.body;
  if (!track) return res.status(400).json({ error: 'Track data is required' });
  const submission = db.createSubmission({ roundId: round.id, userId: req.user.id, track });
  res.status(201).json(submission);
});

// DELETE /api/leagues/:leagueId/rounds/:roundId/submissions/:submissionId
router.delete('/:roundId/submissions/:submissionId', requireAuth, (req, res) => {
  const submission = db.getSubmissionById(req.params.submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  if (submission.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.deleteSubmission(req.params.submissionId);
  res.json({ success: true });
});

module.exports = router;
