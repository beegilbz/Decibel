import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS = {
  submitting: { label: '📝 Submissions Open', color: '#f59e0b' },
  voting: { label: '🗳️ Voting Open', color: '#6C3BFF' },
  completed: { label: '✅ Completed', color: '#22c55e' },
};

export default function LeagueDetail() {
  const { leagueId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateRound, setShowCreateRound] = useState(false);
  const [roundForm, setRoundForm] = useState({ name: '', theme: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get(`/api/leagues/${leagueId}`, {})
      .then((res) => setLeague(res.data))
      .catch(() => navigate('/leagues'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [leagueId]);

  const handleJoin = async () => {
    try {
      await api.post(`/api/leagues/${leagueId}/join`, {}, {});
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join league');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Leave this league?')) return;
    try {
      await api.post(`/api/leagues/${leagueId}/leave`, {}, {});
      navigate('/leagues');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave league');
    }
  };

  const handleCreateRound = async (e) => {
    e.preventDefault();
    if (!roundForm.name.trim()) { setError('Round name is required'); return; }
    setCreating(true);
    try {
      await api.post(`/api/leagues/${leagueId}/rounds`, roundForm, {});
      setShowCreateRound(false);
      setRoundForm({ name: '', theme: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create round');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!league) return null;

  const isOwner = league.ownerId === user?.id;

  return (
    <div className="page league-detail-page">
      <div className="league-detail-header">
        <button className="back-btn" onClick={() => navigate('/leagues')}>← Leagues</button>
        <div className="league-detail-title">
          <h1>{league.name}</h1>
          {league.description && <p className="league-desc">{league.description}</p>}
          {league.theme && <p className="league-theme">🎵 Theme: {league.theme}</p>}
        </div>
        <div className="league-detail-meta">
          <span className="members-count">👥 {league.memberCount} / {league.maxMembers} members</span>
          {league.isPublic && <span className="badge badge-public">Public</span>}
          {isOwner && <span className="badge badge-owner">You own this</span>}
        </div>
        <div className="league-detail-actions">
          {!league.isMember && league.memberCount < league.maxMembers && (
            <button className="btn btn-primary" onClick={handleJoin}>Join League</button>
          )}
          {league.isMember && !isOwner && (
            <button className="btn btn-ghost btn-danger" onClick={handleLeave}>Leave</button>
          )}
          {isOwner && (
            <button className="btn btn-primary" onClick={() => setShowCreateRound(true)}>
              + New Round
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showCreateRound && (
        <div className="modal-overlay" onClick={() => setShowCreateRound(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Round</h2>
              <button className="modal-close" onClick={() => setShowCreateRound(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRound} className="form">
              <div className="form-group">
                <label>Round Name *</label>
                <input
                  type="text" placeholder="e.g. Round 1 — Best Bops"
                  value={roundForm.name}
                  onChange={(e) => setRoundForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Round Theme</label>
                <input
                  type="text" placeholder="e.g. Songs about the ocean"
                  value={roundForm.theme}
                  onChange={(e) => setRoundForm((f) => ({ ...f, theme: e.target.value }))}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateRound(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounds-section">
        <h2>Rounds</h2>
        {!league.rounds || league.rounds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🥁</div>
            <h3>No rounds yet</h3>
            <p>{isOwner ? 'Create the first round to get started!' : 'Waiting for the owner to start the first round.'}</p>
            {isOwner && (
              <button className="btn btn-primary" onClick={() => setShowCreateRound(true)}>
                Create First Round
              </button>
            )}
          </div>
        ) : (
          <div className="rounds-list">
            {league.rounds.slice().reverse().map((round) => {
              const statusInfo = STATUS_LABELS[round.status] || STATUS_LABELS.submitting;
              return (
                <Link
                  key={round.id}
                  to={`/leagues/${leagueId}/rounds/${round.id}`}
                  className="round-card"
                >
                  <div className="round-card-left">
                    <div className="round-name">{round.name}</div>
                    {round.theme && <div className="round-theme">🎵 {round.theme}</div>}
                    <div className="round-date">
                      Created {new Date(round.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="round-card-right">
                    <span className="round-status-pill" style={{ backgroundColor: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                    {round.status === 'completed' && round.winnerId && (
                      <span className="winner-label">🏆 Winner decided</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
