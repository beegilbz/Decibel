import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import TrackCard from '../components/TrackCard';
import MusicSearch from '../components/MusicSearch';

const STATUS_NEXT = { submitting: 'voting', voting: 'completed' };
const STATUS_BTN_LABELS = {
  submitting: 'Open Voting →',
  voting: 'Complete Round & Crown Winner →',
};

export default function Round() {
  const { leagueId, roundId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [round, setRound] = useState(null);
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([
      api.get(`/api/leagues/${leagueId}/rounds/${roundId}`, {}),
      api.get(`/api/leagues/${leagueId}`, {}),
    ])
      .then(([rRes, lRes]) => {
        setRound(rRes.data);
        setLeague(lRes.data);
      })
      .catch(() => navigate(`/leagues/${leagueId}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [leagueId, roundId]);

  const handleAddTrack = async (track) => {
    setShowSearch(false);
    try {
      await api.post(
        `/api/leagues/${leagueId}/rounds/${roundId}/submissions`,
        { track },
        {}
      );
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add track');
    }
  };

  const handleAdvanceStatus = async () => {
    const nextStatus = STATUS_NEXT[round.status];
    if (!nextStatus) return;
    const confirmMsg = nextStatus === 'completed'
      ? 'Complete this round and crown the winner? This cannot be undone.'
      : 'Close submissions and open voting? Members can no longer add tracks.';
    if (!window.confirm(confirmMsg)) return;
    setAdvancing(true);
    try {
      await api.put(
        `/api/leagues/${leagueId}/rounds/${roundId}`,
        { status: nextStatus },
        {}
      );
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to advance round');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!round) return null;

  const isOwner = league?.ownerId === user?.id;
  const isMember = league?.members?.includes(user?.id);
  const mySubmission = round.submissions?.find((s) => s.userId === user?.id);
  const canSubmit = round.status === 'submitting' && isMember && !mySubmission;

  // Enrich submissions with winner flag
  const submissions = (round.submissions || []).map((s, i) => ({
    ...s,
    isWinner: round.status === 'completed' && round.winnerId === s.id,
  }));

  const winnerSubmission = submissions.find((s) => s.isWinner);

  return (
    <div className="page round-page">
      {showSearch && (
        <MusicSearch onSelect={handleAddTrack} onClose={() => setShowSearch(false)} />
      )}

      <div className="round-page-header">
        <button className="back-btn" onClick={() => navigate(`/leagues/${leagueId}`)}>
          ← {league?.name}
        </button>
        <div className="round-title-section">
          <h1>{round.name}</h1>
          {round.theme && <p className="round-theme-label">🎵 {round.theme}</p>}
          <div className="round-status-section">
            <span className={`round-status-chip status-${round.status}`}>
              {round.status === 'submitting' && '📝 Submissions Open'}
              {round.status === 'voting' && '🗳️ Voting Open'}
              {round.status === 'completed' && '✅ Completed'}
            </span>
          </div>
        </div>

        <div className="round-actions">
          {canSubmit && (
            <button className="btn btn-primary" onClick={() => setShowSearch(true)}>
              + Add Your Track
            </button>
          )}
          {isOwner && STATUS_NEXT[round.status] && (
            <button
              className={`btn ${round.status === 'voting' ? 'btn-success' : 'btn-secondary'}`}
              onClick={handleAdvanceStatus}
              disabled={advancing}
            >
              {advancing ? 'Updating…' : STATUS_BTN_LABELS[round.status]}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {round.status === 'completed' && winnerSubmission && (
        <div className="winner-announcement">
          <div className="winner-trophy">🏆</div>
          <div className="winner-info">
            <h2>Winner!</h2>
            <p className="winner-track">{winnerSubmission.track.title}</p>
            <p className="winner-artist">by {winnerSubmission.track.artist}</p>
            <p className="winner-score">Score: +{winnerSubmission.score}</p>
          </div>
          {winnerSubmission.track.imageUrl && (
            <img src={winnerSubmission.track.imageUrl} alt="winner" className="winner-art" />
          )}
        </div>
      )}

      <div className="round-content">
        {submissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎶</div>
            <h3>No tracks submitted yet</h3>
            {canSubmit && (
              <button className="btn btn-primary" onClick={() => setShowSearch(true)}>
                Be the first to add a track
              </button>
            )}
            {!canSubmit && round.status === 'submitting' && (
              <p>Waiting for members to submit their tracks.</p>
            )}
          </div>
        ) : (
          <div className="submissions-grid">
            {submissions.map((submission) => (
              <TrackCard
                key={submission.id}
                submission={submission}
                roundStatus={round.status}
                onVoteChange={() => load()}
              />
            ))}
          </div>
        )}
      </div>

      <div className="round-info-bar">
        <span>📊 {submissions.length} track{submissions.length !== 1 ? 's' : ''} submitted</span>
        {round.status === 'voting' && (
          <span>🗳️ Cast your votes!</span>
        )}
      </div>
    </div>
  );
}
