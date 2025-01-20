const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const config = require('./config/config');
const app = express();

app.use(cors({
    origin: 'https://2cpe.github.io',
    credentials: true
}));
app.use(express.json());

const octokit = new Octokit({
    auth: config.github.token
});

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

app.get('/api/tickets/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        // Verify the auth token from headers
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        // Verify the token with Discord
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': authHeader }
        });

        if (!userResponse.ok) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const userData = await userResponse.json();
        if (userData.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        // Fetch tickets from GitHub repository
        const tickets = await fetchUserTickets(userId);
        res.json(tickets);

    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

async function fetchUserTickets(userId) {
    try {
        // Fetch all files in the transcripts directory
        const { data: contents } = await octokit.repos.getContent({
            owner: config.github.owner,
            repo: config.github.repo,
            path: 'transcripts'
        });

        // Filter and process transcript files
        const tickets = await Promise.all(
            contents
                .filter(file => file.name.endsWith('.json'))
                .map(async file => {
                    try {
                        // Get file content
                        const { data: fileData } = await octokit.repos.getContent({
                            owner: config.github.owner,
                            repo: config.github.repo,
                            path: file.path
                        });

                        // Decode content from base64
                        const content = JSON.parse(
                            Buffer.from(fileData.content, 'base64').toString()
                        );

                        // Check if this ticket belongs to the user
                        if (content.userId === userId) {
                            // Calculate ticket duration
                            const firstMessage = content.messages[0];
                            const lastMessage = content.messages[content.messages.length - 1];
                            const duration = calculateDuration(
                                new Date(firstMessage.timestamp),
                                new Date(lastMessage.timestamp)
                            );

                            // Extract rating from messages if available
                            const rating = extractRating(content.messages);

                            return {
                                transcriptId: content.id,
                                channelName: content.channelName,
                                closedAt: lastMessage.timestamp,
                                rating: rating,
                                duration: duration,
                                messageCount: content.messages.length
                            };
                        }
                        return null;
                    } catch (error) {
                        console.error(`Error processing file ${file.name}:`, error);
                        return null;
                    }
                })
        );

        // Filter out null values and sort by closedAt date
        return tickets
            .filter(ticket => ticket !== null)
            .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));

    } catch (error) {
        console.error('Error fetching tickets from GitHub:', error);
        throw new Error('Failed to fetch tickets');
    }
}

function calculateDuration(startDate, endDate) {
    const diff = endDate - startDate;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function extractRating(messages) {
    // Look for rating in the last few messages
    for (let i = messages.length - 1; i >= Math.max(0, messages.length - 5); i--) {
        const message = messages[i];
        if (message.content.includes('Rating:')) {
            // Extract number of stars from the message
            const match = message.content.match(/Rating: (\d+)/);
            if (match) {
                return parseInt(match[1]);
            }
        }
    }
    return 0; // Default if no rating found
}

app.listen(3000, () => {
    console.log('Auth server running on port 3000');
}); 