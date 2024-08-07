const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.CLIENT_ID || '9138cee792884c20a60f993fb3175091';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '1aae4c1f70314388adffbcf40bd566c0';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('CLIENT_ID and CLIENT_SECRET must be set');
    process.exit(1);
}

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Authentication function to get access token
async function authenticate() {
    const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
        grant_type: 'client_credentials'
    }), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        }
    });
    return response.data.access_token;
}

// Search for tracks
app.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    try {
        const accessToken = await authenticate();
        const response = await axios.get(`https://api.spotify.com/v1/search`, {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            },
            params: {
                q: q,
                type: 'track'
            }
        });
        const data = response.data;

        // Check if the data contains the expected structure
        if (!data.tracks || !data.tracks.items) {
            return res.status(500).json({ error: 'Unexpected response structure' });
        }

        // Extract relevant information for each track
        const tracks = data.tracks.items.map(item => ({
            id: item.id,
            name: item.name || 'Unknown',
            artists: item.artists ? item.artists.map(artist => artist.name) : ['Unknown'],
            album: item.album ? item.album.name : 'Unknown',
            release_date: item.album ? item.album.release_date : 'Unknown',
            duration_ms: item.duration_ms || 0,
            preview_url: item.preview_url || null,
            external_url: item.external_urls ? item.external_urls.spotify : null
        }));
        res.json(tracks);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Get playlist features data
app.get('/playlist/:playlistId/features', async (req, res) => {
    const { playlistId } = req.params;
    try {
        const accessToken = await authenticate();
        const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        });
        const data = response.data;

        // Check if the data contains the expected structure
        if (!data.items) {
            return res.status(500).json({ error: 'Unexpected response structure' });
        }

        // Extracting features data
        const features = {
            totalTracks: data.total,
            totalDuration: data.items.reduce((acc, curr) => acc + (curr.track ? curr.track.duration_ms : 0), 0)
        };
        res.json(features);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Download track by query
app.get('/download', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    try {
        const response = await axios.get(`https://www.samirxpikachu.run.place/spotifydl`, {
            params: {
                url: q
            }
        });
        const data = response.data;

        if (!data|| !data.link) {
            return res.status(500).json({ error: 'Unexpected response structure or missing link' });
        }

        const link = data.link;

        res.json({ link });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
