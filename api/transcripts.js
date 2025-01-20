const { Octokit } = require('@octokit/rest');
const config = require('../../config/config');

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
        return res.status(401).json({ error: 'No authorization header' });
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

        // Initialize Octokit
        const octokit = new Octokit({
            auth: config.github.token
        });

        // Get all transcript files
        const { data: files } = await octokit.repos.getContent({
            owner: config.github.owner,
            repo: config.github.repo,
            path: 'transcripts'
        });

        // Filter and process transcripts
        const userTranscripts = [];
        for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.json')) {
                const { data: content } = await octokit.repos.getContent({
                    owner: config.github.owner,
                    repo: config.github.repo,
                    path: file.path
                });

                const transcript = JSON.parse(Buffer.from(content.content, 'base64').toString());
                
                // Only include if it belongs to the user
                if (transcript.userId === discordUser.id) {
                    userTranscripts.push({
                        id: transcript.id,
                        channelName: transcript.channelName,
                        timestamp: transcript.timestamp,
                        fileName: file.name
                    });
                }
            }
        }

        res.json(userTranscripts);
    } catch (error) {
        console.error('Error fetching transcripts:', error);
        res.status(500).json({ error: 'Failed to fetch transcripts' });
    }
}; 