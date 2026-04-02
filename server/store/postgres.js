const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      provider VARCHAR(50) NOT NULL,
      provider_id VARCHAR(255) NOT NULL,
      display_name VARCHAR(255),
      email VARCHAR(255),
      avatar TEXT,
      access_token TEXT,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(provider, provider_id)
    );
    CREATE TABLE IF NOT EXISTS leagues (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      owner_id UUID REFERENCES users(id),
      is_public BOOLEAN DEFAULT true,
      theme VARCHAR(255),
      max_members INTEGER DEFAULT 10,
      status VARCHAR(50) DEFAULT 'active',
      current_round UUID,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS league_members (
      league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (league_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS rounds (
      id UUID PRIMARY KEY,
      league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      theme VARCHAR(255),
      status VARCHAR(50) DEFAULT 'submitting',
      winner_id UUID,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id UUID PRIMARY KEY,
      round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      track JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS votes (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
      value INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, submission_id)
    );
  `);
  console.log('✅ Database ready');
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const toUser = (row) => ({
  id: row.id,
  provider: row.provider,
  providerId: row.provider_id,
  displayName: row.display_name,
  email: row.email,
  avatar: row.avatar,
  accessToken: row.access_token,
  refreshToken: row.refresh_token,
  createdAt: row.created_at,
});

const toLeague = async (row) => {
  const { rows: memberRows } = await pool.query(
    'SELECT user_id FROM league_members WHERE league_id = $1', [row.id]
  );
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    isPublic: row.is_public,
    theme: row.theme,
    maxMembers: row.max_members,
    status: row.status,
    currentRound: row.current_round,
    createdAt: row.created_at,
    members: memberRows.map((r) => r.user_id),
  };
};

const toRound = (row) => ({
  id: row.id,
  leagueId: row.league_id,
  name: row.name,
  theme: row.theme,
  status: row.status,
  winnerId: row.winner_id,
  createdAt: row.created_at,
});

const toSubmission = (row) => ({
  id: row.id,
  roundId: row.round_id,
  userId: row.user_id,
  track: row.track,
  createdAt: row.created_at,
});

const toVote = (row) => ({
  id: row.id,
  userId: row.user_id,
  submissionId: row.submission_id,
  value: row.value,
  createdAt: row.created_at,
});

// ── Users ─────────────────────────────────────────────────────────────────────

const findUserById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows.length ? toUser(rows[0]) : null;
};

const findUserByProvider = async (provider, providerId) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
    [provider, providerId]
  );
  return rows.length ? toUser(rows[0]) : null;
};

const createUser = async ({ provider, providerId, displayName, email, avatar, accessToken, refreshToken }) => {
  const id = uuidv4();
  const { rows } = await pool.query(
    `INSERT INTO users (id, provider, provider_id, display_name, email, avatar, access_token, refresh_token)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [id, provider, providerId, displayName || null, email || null, avatar || null, accessToken, refreshToken]
  );
  return toUser(rows[0]);
};

const updateUserTokens = async (id, accessToken, refreshToken) => {
  const { rows } = await pool.query(
    `UPDATE users SET access_token = $1, refresh_token = COALESCE($2, refresh_token) WHERE id = $3 RETURNING *`,
    [accessToken, refreshToken || null, id]
  );
  return rows.length ? toUser(rows[0]) : null;
};

// ── Leagues ───────────────────────────────────────────────────────────────────

const getLeagues = async () => {
  const { rows } = await pool.query('SELECT * FROM leagues ORDER BY created_at DESC');
  return Promise.all(rows.map(toLeague));
};

const getLeagueById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM leagues WHERE id = $1', [id]);
  return rows.length ? toLeague(rows[0]) : null;
};

const createLeague = async ({ name, description, ownerId, isPublic, theme, maxMembers }) => {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO leagues (id, name, description, owner_id, is_public, theme, max_members)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, name, description || '', ownerId, isPublic !== false, theme || null, maxMembers || 10]
  );
  await pool.query('INSERT INTO league_members (league_id, user_id) VALUES ($1, $2)', [id, ownerId]);
  return getLeagueById(id);
};

const updateLeague = async (id, updates) => {
  const fields = [];
  const values = [];
  let i = 1;
  const map = { name: 'name', description: 'description', isPublic: 'is_public', theme: 'theme', maxMembers: 'max_members', status: 'status', currentRound: 'current_round' };
  for (const [key, col] of Object.entries(map)) {
    if (updates[key] !== undefined) { fields.push(`${col} = $${i++}`); values.push(updates[key]); }
  }
  if (!fields.length) return getLeagueById(id);
  values.push(id);
  await pool.query(`UPDATE leagues SET ${fields.join(', ')} WHERE id = $${i}`, values);
  return getLeagueById(id);
};

const joinLeague = async (leagueId, userId) => {
  await pool.query(
    'INSERT INTO league_members (league_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [leagueId, userId]
  );
  return getLeagueById(leagueId);
};

const leaveLeague = async (leagueId, userId) => {
  await pool.query('DELETE FROM league_members WHERE league_id = $1 AND user_id = $2', [leagueId, userId]);
  return getLeagueById(leagueId);
};

// ── Rounds ────────────────────────────────────────────────────────────────────

const getRoundsByLeague = async (leagueId) => {
  const { rows } = await pool.query('SELECT * FROM rounds WHERE league_id = $1 ORDER BY created_at ASC', [leagueId]);
  return rows.map(toRound);
};

const getRoundById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM rounds WHERE id = $1', [id]);
  return rows.length ? toRound(rows[0]) : null;
};

const createRound = async ({ leagueId, name, theme }) => {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO rounds (id, league_id, name, theme) VALUES ($1, $2, $3, $4)',
    [id, leagueId, name, theme || null]
  );
  await pool.query('UPDATE leagues SET current_round = $1 WHERE id = $2', [id, leagueId]);
  return getRoundById(id);
};

const updateRound = async (id, updates) => {
  const fields = [];
  const values = [];
  let i = 1;
  if (updates.status !== undefined) { fields.push(`status = $${i++}`); values.push(updates.status); }
  if (updates.winnerId !== undefined) { fields.push(`winner_id = $${i++}`); values.push(updates.winnerId); }
  if (!fields.length) return getRoundById(id);
  values.push(id);
  await pool.query(`UPDATE rounds SET ${fields.join(', ')} WHERE id = $${i}`, values);
  return getRoundById(id);
};

// ── Submissions ───────────────────────────────────────────────────────────────

const getSubmissionsByRound = async (roundId) => {
  const { rows } = await pool.query('SELECT * FROM submissions WHERE round_id = $1', [roundId]);
  return rows.map(toSubmission);
};

const getSubmissionById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
  return rows.length ? toSubmission(rows[0]) : null;
};

const createSubmission = async ({ roundId, userId, track }) => {
  const id = uuidv4();
  const { rows } = await pool.query(
    'INSERT INTO submissions (id, round_id, user_id, track) VALUES ($1, $2, $3, $4) RETURNING *',
    [id, roundId, userId, JSON.stringify(track)]
  );
  return toSubmission(rows[0]);
};

const deleteSubmission = async (id) => {
  await pool.query('DELETE FROM submissions WHERE id = $1', [id]);
  return true;
};

// ── Votes ─────────────────────────────────────────────────────────────────────

const getVotesBySubmission = async (submissionId) => {
  const { rows } = await pool.query('SELECT * FROM votes WHERE submission_id = $1', [submissionId]);
  return rows.map(toVote);
};

const getUserVoteForSubmission = async (userId, submissionId) => {
  const { rows } = await pool.query(
    'SELECT * FROM votes WHERE user_id = $1 AND submission_id = $2', [userId, submissionId]
  );
  return rows.length ? toVote(rows[0]) : null;
};

const castVote = async ({ userId, submissionId, value }) => {
  const existing = await getUserVoteForSubmission(userId, submissionId);
  if (existing) {
    if (existing.value === value) {
      await pool.query('DELETE FROM votes WHERE user_id = $1 AND submission_id = $2', [userId, submissionId]);
      return null;
    }
    const { rows } = await pool.query(
      'UPDATE votes SET value = $1 WHERE user_id = $2 AND submission_id = $3 RETURNING *',
      [value, userId, submissionId]
    );
    return toVote(rows[0]);
  }
  const id = uuidv4();
  const { rows } = await pool.query(
    'INSERT INTO votes (id, user_id, submission_id, value) VALUES ($1, $2, $3, $4) RETURNING *',
    [id, userId, submissionId, value]
  );
  return toVote(rows[0]);
};

const getLeaderboard = async (roundId) => {
  const submissions = await getSubmissionsByRound(roundId);
  const enriched = await Promise.all(submissions.map(async (sub) => {
    const votes = await getVotesBySubmission(sub.id);
    const score = votes.reduce((acc, v) => acc + v.value, 0);
    const upvotes = votes.filter((v) => v.value === 1).length;
    const downvotes = votes.filter((v) => v.value === -1).length;
    return { ...sub, score, upvotes, downvotes };
  }));
  return enriched.sort((a, b) => b.score - a.score);
};

module.exports = {
  initDb,
  findUserById, findUserByProvider, createUser, updateUserTokens,
  getLeagues, getLeagueById, createLeague, updateLeague, joinLeague, leaveLeague,
  getRoundsByLeague, getRoundById, createRound, updateRound,
  getSubmissionsByRound, getSubmissionById, createSubmission, deleteSubmission,
  getVotesBySubmission, getUserVoteForSubmission, castVote, getLeaderboard,
};
