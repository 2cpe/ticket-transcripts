const { Octokit } = require('@octokit/rest');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://2cpe.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify Discord token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization token provided' });
    }

    try {
        // Verify user with Discord
        const discordResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': authHeader }
        });

        if (!discordResponse.ok) {
            return res.status(401).json({ error: 'Invalid Discord token' });
        }

        const discordUser = await discordResponse.json();
        const userId = discordUser.id;

        // Initialize Octokit
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // Get the index file from protected branch
        const { data: indexFile } = await octokit.repos.getContent({
            owner: '2cpe',
            repo: 'ticket-transcripts',
            path: 'processed/index.json',
            ref: 'protected'
        });

        // Decode and parse index
        const index = Buffer.from(indexFile.content, 'base64').toString();
        const entries = index.split('\n').filter(Boolean).map(line => JSON.parse(line));

        // Filter transcripts for this user
        const userTranscripts = entries.filter(entry => entry.userId === userId);

        // Return only necessary information
        res.json(userTranscripts.map(entry => ({
            id: entry.id,
            channelName: entry.channelName,
            timestamp: entry.timestamp
        })));

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 