import React, { useState, useRef } from 'react';
import api from '../api';

const SOURCE_ICONS = {
  spotify: '🟢',
  apple: '🍎',
  youtube: '▶️',
};

const SOURCE_LABELS = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  youtube: 'YouTube',
};

export default function MusicSearch({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('spotify');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  const search = async (q, src) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/music/${src}/search`, {
        params: { q, limit: 12 },
      });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val, source), 400);
  };

  const handleSourceChange = (src) => {
    setSource(src);
    if (query.trim()) search(query, src);
  };

  const formatDuration = (ms) => {
    if (!ms) return '';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal music-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add a Track</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="source-tabs">
          {['spotify', 'apple', 'youtube'].map((src) => (
            <button
              key={src}
              className={`source-tab ${source === src ? 'active' : ''}`}
              onClick={() => handleSourceChange(src)}
            >
              {SOURCE_ICONS[src]} {SOURCE_LABELS[src]}
            </button>
          ))}
        </div>

        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={`Search ${SOURCE_LABELS[source]}…`}
            value={query}
            onChange={handleInput}
            autoFocus
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); setResults([]); }}>✕</button>
          )}
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="search-results">
          {loading && (
            <div className="search-loading">
              <div className="spinner" />
            </div>
          )}
          {!loading && results.length === 0 && query && (
            <p className="no-results">No results found. Try a different search.</p>
          )}
          {!loading && results.map((track) => (
            <div key={`${track.source}-${track.id}`} className="track-result" onClick={() => onSelect(track)}>
              {track.imageUrl
                ? <img src={track.imageUrl} alt={track.title} className="track-thumb" />
                : <div className="track-thumb-placeholder">{SOURCE_ICONS[track.source]}</div>
              }
              <div className="track-info">
                <span className="track-title">{track.title}</span>
                <span className="track-artist">{track.artist}</span>
                {track.album && <span className="track-album">{track.album}</span>}
              </div>
              <div className="track-meta">
                <span className="track-source-badge">{SOURCE_ICONS[track.source]}</span>
                {track.duration && <span className="track-duration">{formatDuration(track.duration)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
