/**
 * In-memory data store for Decibel
 * Replace with PostgreSQL/MongoDB in production
 */

const { v4: uuidv4 } = require('uuid');

const store = {
  users: [],
  leagues: [],
  rounds: [],
  submissions: [],
  votes: [],
};

// ─── Users ────────────────────────────────────────────────────────────────────

const findUserById = (id) => store.users.find((u) => u.id === id);

const findUserByProvider = (provider, providerId) =>
  store.users.find((u) => u.provider === provider && u.providerId === providerId);

const createUser = ({ provider, providerId, displayName, email, avatar, accessToken, refreshToken }) => {
  const user = {
    id: uuidv4(),
    provider,
    providerId,
    displayName,
    email: email || null,
    avatar: avatar || null,
    accessToken,
    refreshToken,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  return user;
};

const updateUserTokens = (id, accessToken, refreshToken) => {
  const user = findUserById(id);
  if (user) {
    user.accessToken = accessToken;
    if (refreshToken) user.refreshToken = refreshToken;
  }
  return user;
};

// ─── Leagues ──────────────────────────────────────────────────────────────────

const getLeagues = () => store.leagues;

const getLeagueById = (id) => store.leagues.find((l) => l.id === id);

const createLeague = ({ name, description, ownerId, isPublic, theme, maxMembers }) => {
  const league = {
    id: uuidv4(),
    name,
    description: description || '',
    ownerId,
    isPublic: isPublic !== false,
    theme: theme || null,
    maxMembers: maxMembers || 10,
    members: [ownerId],
    currentRound: null,
    status: 'active', // active | archived
    createdAt: new Date().toISOString(),
  };
  store.leagues.push(league);
  return league;
};

const updateLeague = (id, updates) => {
  const league = getLeagueById(id);
  if (!league) return null;
  Object.assign(league, updates, { updatedAt: new Date().toISOString() });
  return league;
};

const joinLeague = (leagueId, userId) => {
  const league = getLeagueById(leagueId);
  if (!league) return null;
  if (!league.members.includes(userId)) {
    league.members.push(userId);
  }
  return league;
};

const leaveLeague = (leagueId, userId) => {
  const league = getLeagueById(leagueId);
  if (!league) return null;
  league.members = league.members.filter((m) => m !== userId);
  return league;
};

// ─── Rounds ───────────────────────────────────────────────────────────────────

const getRoundsByLeague = (leagueId) => store.rounds.filter((r) => r.leagueId === leagueId);

const getRoundById = (id) => store.rounds.find((r) => r.id === id);

const createRound = ({ leagueId, name, theme, submissionDeadline, votingDeadline }) => {
  const round = {
    id: uuidv4(),
    leagueId,
    name,
    theme: theme || null,
    submissionDeadline: submissionDeadline || null,
    votingDeadline: votingDeadline || null,
    status: 'submitting', // submitting | voting | completed
    winnerId: null,
    createdAt: new Date().toISOString(),
  };
  store.rounds.push(round);
  // Set as current round on league
  const league = getLeagueById(leagueId);
  if (league) league.currentRound = round.id;
  return round;
};

const updateRound = (id, updates) => {
  const round = getRoundById(id);
  if (!round) return null;
  Object.assign(round, updates, { updatedAt: new Date().toISOString() });
  return round;
};

// ─── Submissions ──────────────────────────────────────────────────────────────

const getSubmissionsByRound = (roundId) => store.submissions.filter((s) => s.roundId === roundId);

const getSubmissionById = (id) => store.submissions.find((s) => s.id === id);

const createSubmission = ({ roundId, userId, track }) => {
  const submission = {
    id: uuidv4(),
    roundId,
    userId,
    track, // { id, title, artist, album, duration, imageUrl, previewUrl, source: 'spotify'|'apple'|'youtube', sourceUrl }
    createdAt: new Date().toISOString(),
  };
  store.submissions.push(submission);
  return submission;
};

const deleteSubmission = (id) => {
  const idx = store.submissions.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  store.submissions.splice(idx, 1);
  return true;
};

// ─── Votes ────────────────────────────────────────────────────────────────────

const getVotesByRound = (roundId) =>
  store.votes.filter((v) => {
    const submission = getSubmissionById(v.submissionId);
    return submission && submission.roundId === roundId;
  });

const getVotesBySubmission = (submissionId) =>
  store.votes.filter((v) => v.submissionId === submissionId);

const getUserVoteForSubmission = (userId, submissionId) =>
  store.votes.find((v) => v.userId === userId && v.submissionId === submissionId);

const castVote = ({ userId, submissionId, value }) => {
  // value: 1 (upvote) or -1 (downvote)
  const existing = getUserVoteForSubmission(userId, submissionId);
  if (existing) {
    if (existing.value === value) {
      // Remove vote (toggle off)
      store.votes = store.votes.filter((v) => !(v.userId === userId && v.submissionId === submissionId));
      return null;
    }
    existing.value = value;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }
  const vote = {
    id: uuidv4(),
    userId,
    submissionId,
    value,
    createdAt: new Date().toISOString(),
  };
  store.votes.push(vote);
  return vote;
};

const getLeaderboard = (roundId) => {
  const submissions = getSubmissionsByRound(roundId);
  return submissions
    .map((sub) => {
      const votes = getVotesBySubmission(sub.id);
      const score = votes.reduce((acc, v) => acc + v.value, 0);
      const upvotes = votes.filter((v) => v.value === 1).length;
      const downvotes = votes.filter((v) => v.value === -1).length;
      return { ...sub, score, upvotes, downvotes };
    })
    .sort((a, b) => b.score - a.score);
};

module.exports = {
  // Users
  findUserById,
  findUserByProvider,
  createUser,
  updateUserTokens,
  // Leagues
  getLeagues,
  getLeagueById,
  createLeague,
  updateLeague,
  joinLeague,
  leaveLeague,
  // Rounds
  getRoundsByLeague,
  getRoundById,
  createRound,
  updateRound,
  // Submissions
  getSubmissionsByRound,
  getSubmissionById,
  createSubmission,
  deleteSubmission,
  // Votes
  getVotesByRound,
  getUserVoteForSubmission,
  castVote,
  getLeaderboard,
  // Direct store access (for admin/debug)
  _store: store,
};
