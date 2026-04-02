const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

// ── Spotify client credentials token (for non-Spotify users) ──────────────────
let spotifyAppToken = null;
let spotifyAppTokenExpiry = 0;

const getSpotifyAppToken = async () => {
  if (spotifyAppToken && Date.now() < spotifyAppTokenExpiry) return spotifyAppToken;
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  const res = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  spotifyAppToken = res.data.access_token;
  spotifyAppTokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return spotifyAppToken;
};

// ── Spotify Search ─────────────────────────────────────────────────────────────
router.get('/spotify/search', requireAuth, async (req, res) => {
  const { q, limit = 10 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query is required' });

  const user = req.user;
  const token = user.provider === 'spotify'
    ? user.accessToken
    : await getSpotifyAppToken();

  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q, type: 'track' },
    });

    const tracks = response.data.tracks.items.map((t) => ({
      id: t.id,
      title: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      album: t.album.name,
      duration: t.duration_ms,
      imageUrl: t.album.images[0]?.url || null,
      previewUrl: t.preview_url,
      source: 'spotify',
      sourceUrl: t.external_urls.spotify,
      sourceId: t.id,
    }));

    res.json(tracks);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error?.message || 'Spotify search failed';
    console.error('Spotify search error:', status, JSON.stringify(err.response?.data));
    res.status(status).json({ error: message });
  }
});

// ── Apple Music Search (via public catalog, no auth required) ─────────────────
router.get('/apple/search', requireAuth, async (req, res) => {
  const { q, limit = 10, storefront = 'us' } = req.query;
  if (!q) return res.status(400).json({ error: 'Query is required' });

  try {
    // Apple Music catalog search — requires a developer token (JWT)
    // For now we proxy through to avoid exposing the developer token to the client
    const devToken = process.env.APPLE_DEVELOPER_TOKEN;
    if (!devToken) {
      return res.status(503).json({ error: 'Apple Music developer token not configured' });
    }

    const response = await axios.get(
      `https://api.music.apple.com/v1/catalog/${storefront}/search`,
      {
        headers: { Authorization: `Bearer ${devToken}` },
        params: { term: q, types: 'songs', limit },
      }
    );

    const songs = response.data.results?.songs?.data || [];
    const tracks = songs.map((s) => ({
      id: s.id,
      title: s.attributes.name,
      artist: s.attributes.artistName,
      album: s.attributes.albumName,
      duration: s.attributes.durationInMillis,
      imageUrl: s.attributes.artwork?.url
        ? s.attributes.artwork.url.replace('{w}', '300').replace('{h}', '300')
        : null,
      previewUrl: s.attributes.previews?.[0]?.url || null,
      source: 'apple',
      sourceUrl: s.attributes.url,
      sourceId: s.id,
    }));

    res.json(tracks);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Apple Music search failed' });
  }
});

// ── YouTube Search ─────────────────────────────────────────────────────────────
router.get('/youtube/search', requireAuth, async (req, res) => {
  const { q, limit = 10 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query is required' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'YouTube API key not configured' });

  try {
    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: apiKey,
        q,
        part: 'snippet',
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults: limit,
      },
    });

    const tracks = searchRes.data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      album: null,
      duration: null,
      imageUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
      previewUrl: null,
      source: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      sourceId: item.id.videoId,
    }));

    res.json(tracks);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'YouTube search failed' });
  }
});

module.exports = router;
