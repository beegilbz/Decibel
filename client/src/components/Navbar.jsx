import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/leagues" className="navbar-logo">
          🎵 <span>Decibel</span>
        </Link>

        <div className="navbar-links desktop-only">
          <Link to="/leagues" className={location.pathname === '/leagues' ? 'active' : ''}>
            Leagues
          </Link>
          <Link to="/leagues/new" className={location.pathname === '/leagues/new' ? 'active' : ''}>
            + New League
          </Link>
        </div>

        <div className="navbar-user desktop-only">
          {user?.avatar && <img src={user.avatar} alt={user.displayName} className="user-avatar" />}
          <span className="user-name">{user?.displayName}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>

        <button className="hamburger mobile-only" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/leagues" onClick={() => setMenuOpen(false)}>🏆 Leagues</Link>
          <Link to="/leagues/new" onClick={() => setMenuOpen(false)}>➕ New League</Link>
          <div className="mobile-menu-user">
            {user?.avatar && <img src={user.avatar} alt={user.displayName} className="user-avatar" />}
            <span>{user?.displayName}</span>
          </div>
          <button className="btn btn-ghost" onClick={() => { logout(); setMenuOpen(false); }}>Logout</button>
        </div>
      )}
    </nav>
  );
}
