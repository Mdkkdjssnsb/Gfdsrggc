import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = '9138cee792884c20a60f993fb3175091';
const CLIENT_SECRET = '1aae4c1f70314388adffbcf40bd566c0';

// Middleware
app.use(express.json());

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Authentication function to get access token
async function authenticate() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
}

// Search for tracks
app.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    try {
        const accessToken = await authenticate();
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track`, {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        });
        const data = await response.json();

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
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        });
        const data = await response.json();

        // Check if the data contains the expected structure
        if (!data.items) {
            return res.status(500).json({ error: 'Unexpected response structure' });
        }

        // Extracting features data
        const features = {
            totalTracks: data.total,
            totalDuration: data.items.reduce((acc, curr) => acc + curr.track.duration_ms, 0)
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
        const response = await fetch(`https://joshweb.click/api/spotify2?q=${encodeURIComponent(q)}`);
        const data = await response.json();

        if (!data.result || !data.result.download_url) {
            return res.status(500).json({ error: 'Unexpected response structure' });
        }

    const url = data.result.download_url;
        res.json(url);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
