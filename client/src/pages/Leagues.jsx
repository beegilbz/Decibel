import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS = { active: '#22c55e', archived: '#94a3b8' };

export default function Leagues() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | mine | public

  useEffect(() => {
    api.get('/api/leagues')
      .then((res) => setLeagues(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = leagues.filter((l) => {
    if (filter === 'mine') return l.isMember;
    if (filter === 'public') return l.isPublic;
    return true;
  });

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page leagues-page">
      <div className="page-header">
        <div>
          <h1>Leagues</h1>
          <p>Join a league or create your own music competition</p>
        </div>
        <Link to="/leagues/new" className="btn btn-primary">
          + New League
        </Link>
      </div>

      <div className="filter-tabs">
        {['all', 'mine', 'public'].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Leagues' : f === 'mine' ? 'My Leagues' : 'Public'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <h3>No leagues here yet</h3>
          <p>{filter === 'mine' ? "You haven't joined any leagues." : 'No leagues found.'}</p>
          <Link to="/leagues/new" className="btn btn-primary">Create a League</Link>
        </div>
      ) : (
        <div className="leagues-grid">
          {filtered.map((league) => (
            <Link to={`/leagues/${league.id}`} key={league.id} className="league-card">
              <div className="league-card-header">
                <div className="league-icon">🏆</div>
                <div className="league-badges">
                  {league.isMember && <span className="badge badge-member">Member</span>}
                  {league.isOwner && <span className="badge badge-owner">Owner</span>}
                  {league.isPublic && <span className="badge badge-public">Public</span>}
                </div>
              </div>
              <h3 className="league-name">{league.name}</h3>
              {league.description && <p className="league-desc">{league.description}</p>}
              {league.theme && <p className="league-theme">🎵 Theme: {league.theme}</p>}
              <div className="league-card-footer">
                <span className="league-members">👥 {league.memberCount} / {league.maxMembers}</span>
                <span className="league-status" style={{ color: STATUS_COLORS[league.status] }}>
                  ● {league.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
