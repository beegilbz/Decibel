import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function CreateLeague() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    theme: '',
    isPublic: true,
    maxMembers: 10,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('League name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/leagues', form);
      navigate(`/leagues/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page form-page">
      <div className="form-card">
        <div className="form-card-header">
          <button className="back-btn" onClick={() => navigate('/leagues')}>← Back</button>
          <h1>Create a League</h1>
          <p>Set up your music competition</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="name">League Name *</label>
            <input
              id="name" name="name" type="text"
              placeholder="e.g. Office Playlist Wars"
              value={form.name} onChange={handleChange}
              maxLength={60} required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description" name="description"
              placeholder="What's this league about?"
              value={form.description} onChange={handleChange}
              rows={3} maxLength={300}
            />
          </div>

          <div className="form-group">
            <label htmlFor="theme">Default Theme</label>
            <input
              id="theme" name="theme" type="text"
              placeholder="e.g. 90s Hip-Hop, Sad Indie, Pump-Up Bangers"
              value={form.theme} onChange={handleChange}
              maxLength={80}
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxMembers">Max Members</label>
            <input
              id="maxMembers" name="maxMembers" type="number"
              min={2} max={50}
              value={form.maxMembers} onChange={handleChange}
            />
          </div>

          <div className="form-group form-group-checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox" name="isPublic"
                checked={form.isPublic} onChange={handleChange}
              />
              <span className="checkbox-text">
                <strong>Public league</strong>
                <small>Anyone can find and join this league</small>
              </span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/leagues')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create League 🏆'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
