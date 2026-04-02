const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../store/postgres');

router.post('/', requireAuth, async (req, res) => {
  const { submissionId, value } = req.body;
  if (!submissionId) return res.status(400).json({ error: 'submissionId is required' });
  if (value !== 1 && value !== -1)
    return res.status(400).json({ error: 'value must be 1 (upvote) or -1 (downvote)' });
  const submission = await db.getSubmissionById(submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  const round = await db.getRoundById(submission.roundId);
  if (!round) return res.status(404).json({ error: 'Round not found' });
  if (round.status !== 'voting')
    return res.status(400).json({ error: 'Voting is not open for this round' });
  if (submission.userId === req.user.id)
    return res.status(400).json({ error: "You can't vote on your own submission" });
  const vote = await db.castVote({ userId: req.user.id, submissionId, value });
  const allVotes = await db.getVotesBySubmission(submissionId);
  const score = allVotes.reduce((acc, v) => acc + v.value, 0);
  res.json({ vote, score, removed: vote === null });
});

module.exports = router;
