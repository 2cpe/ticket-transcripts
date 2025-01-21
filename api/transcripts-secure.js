const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Store this securely
const IV_LENGTH = 16;

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex'),
        tag: tag.toString('hex')
    };
}

module.exports = async (req, res) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        const { data } = await octokit.repos.getContent({
            owner: '2cpe',
            repo: 'ticket-transcripts',
            path: 'transcripts'
        });

        // Encrypt sensitive data
        const encryptedData = encrypt(JSON.stringify(data));
        
        res.json(encryptedData);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 