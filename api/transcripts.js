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

        try {
            // Try to get the index file first
            const { data: indexFile } = await octokit.repos.getContent({
                owner: '2cpe',
                repo: 'ticket-transcripts',
                path: 'processed/index.json',
                ref: 'protected'
            });

            const index = JSON.parse(Buffer.from(indexFile.content, 'base64').toString());
            const userTranscripts = index.filter(entry => entry.userId === userId);

            res.json(userTranscripts);
        } catch (error) {
            // If index file doesn't exist, fall back to direct file listing
            const { data: files } = await octokit.repos.getContent({
                owner: '2cpe',
                repo: 'ticket-transcripts',
                path: 'transcripts'
            });

            const userTranscripts = [];
            for (const file of files) {
                if (file.name.startsWith(`ticket_${userId}_`)) {
                    const { data: content } = await octokit.repos.getContent({
                        owner: '2cpe',
                        repo: 'ticket-transcripts',
                        path: file.path
                    });

                    const transcript = JSON.parse(Buffer.from(content.content, 'base64').toString());
                    userTranscripts.push({
                        id: transcript.id,
                        channelName: transcript.channelName,
                        timestamp: transcript.timestamp,
                        fileName: file.name
                    });
                }
            }

            res.json(userTranscripts);
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 