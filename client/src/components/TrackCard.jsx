import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const SOURCE_ICONS = { spotify: '🟢', apple: '🍎', youtube: '▶️' };
const SOURCE_COLORS = { spotify: '#1DB954', apple: '#FC3C44', youtube: '#FF0000' };

export default function TrackCard({ submission, roundStatus, onVoteChange }) {
  const { user } = useAuth();
  const { track, score, upvotes, downvotes, userVote, userId, id: submissionId } = submission;
  const [localScore, setLocalScore] = useState(score || 0);
  const [localUserVote, setLocalUserVote] = useState(userVote || 0);
  const [voting, setVoting] = useState(false);
  const [preview, setPreview] = useState(null);

  const isOwner = userId === user?.id;
  const canVote = roundStatus === 'voting' && !isOwner;

  const vote = async (value) => {
    if (!canVote || voting) return;
    setVoting(true);
    try {
      const res = await api.post('/api/votes', { submissionId, value });
      const newVote = res.data.removed ? 0 : value;
      const diff = newVote - localUserVote;
      setLocalScore((s) => s + diff);
      setLocalUserVote(newVote);
      if (onVoteChange) onVoteChange(submissionId, newVote, localScore + diff);
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setVoting(false);
    }
  };

  const togglePreview = () => {
    if (!track.previewUrl) return;
    if (preview) {
      preview.pause();
      setPreview(null);
    } else {
      const audio = new Audio(track.previewUrl);
      audio.play();
      audio.onended = () => setPreview(null);
      setPreview(audio);
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`track-card ${roundStatus === 'completed' && submission.isWinner ? 'winner' : ''}`}>
      {submission.isWinner && (
        <div className="winner-badge">🏆 Winner</div>
      )}

      <div className="track-card-main">
        <div className="track-card-art" onClick={togglePreview} style={{ cursor: track.previewUrl ? 'pointer' : 'default' }}>
          {track.imageUrl
            ? <img src={track.imageUrl} alt={track.title} />
            : <div className="art-placeholder">{SOURCE_ICONS[track.source]}</div>
          }
          {track.previewUrl && (
            <div className="play-overlay">{preview ? '⏸' : '▶'}</div>
          )}
        </div>

        <div className="track-card-info">
          <div className="track-card-title">{track.title}</div>
          <div className="track-card-artist">{track.artist}</div>
          {track.album && <div className="track-card-album">{track.album}</div>}
          <div className="track-card-meta">
            <span
              className="source-pill"
              style={{ backgroundColor: SOURCE_COLORS[track.source] }}
            >
              {SOURCE_ICONS[track.source]} {track.source}
            </span>
            {track.duration && <span className="track-card-duration">{formatDuration(track.duration)}</span>}
            <a href={track.sourceUrl} target="_blank" rel="noopener noreferrer" className="open-link">
              Open ↗
            </a>
          </div>
        </div>
      </div>

      <div className="track-card-footer">
        <div className="vote-section">
          <button
            className={`vote-btn upvote ${localUserVote === 1 ? 'active' : ''}`}
            onClick={() => vote(1)}
            disabled={!canVote || voting}
            title={isOwner ? "Can't vote on your own track" : 'Upvote'}
          >
            ▲
          </button>
          <span className={`vote-score ${localScore > 0 ? 'positive' : localScore < 0 ? 'negative' : ''}`}>
            {localScore > 0 ? '+' : ''}{localScore}
          </span>
          <button
            className={`vote-btn downvote ${localUserVote === -1 ? 'active' : ''}`}
            onClick={() => vote(-1)}
            disabled={!canVote || voting}
            title={isOwner ? "Can't vote on your own track" : 'Downvote'}
          >
            ▼
          </button>
        </div>

        {roundStatus !== 'submitting' && (
          <div className="vote-breakdown">
            <span className="upvote-count">▲ {upvotes || 0}</span>
            <span className="downvote-count">▼ {downvotes || 0}</span>
          </div>
        )}

        {isOwner && <span className="your-track-badge">Your track</span>}
      </div>
    </div>
  );
}
