const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors({
    origin: 'https://2cpe.github.io',
    credentials: true
}));
app.use(express.json());

const config = {
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    redirect_uri: 'https://2cpe.github.io/ticket-transcripts/callback.html'
};

app.post('/token', async (req, res) => {
    const { code } = req.body;
    
    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: config.client_id,
                client_secret: config.client_secret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: config.redirect_uri
            })
        });

        const tokenData = await tokenResponse.json();
        res.json(tokenData);
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
    }
});

app.listen(3000, () => {
    console.log('Auth server running on port 3000');
}); 