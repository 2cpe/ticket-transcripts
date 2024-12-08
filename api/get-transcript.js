const crypto = require('crypto');

function decrypt(encrypted, iv, userId) {
    const algorithm = 'aes-256-ctr';
    const secretKey = process.env.ENCRYPTION_KEY || userId;
    
    const decipher = crypto.createDecipheriv(
        algorithm, 
        secretKey.slice(0, 32).padEnd(32, '0'), 
        Buffer.from(iv, 'hex')
    );
    
    const decrpyted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'hex')),
        decipher.final()
    ]);

    return decrpyted.toString();
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://2cpe.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Verify Discord token
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        const discordResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': authHeader }
        });

        if (!discordResponse.ok) {
            return res.status(401).json({ error: 'Invalid Discord token' });
        }

        const userData = await discordResponse.json();
        const { transcriptId } = req.query;

        // Fetch encrypted transcript
        const response = await fetch(
            `https://raw.githubusercontent.com/2cpe/ticket-transcripts/main/transcripts/${transcriptId}.json`
        );

        if (!response.ok) {
            return res.status(404).json({ error: 'Transcript not found' });
        }

        const encryptedData = await response.json();

        // Verify user has access to this transcript
        if (encryptedData.creatorId !== userData.id) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        // Decrypt the data
        const decryptedData = decrypt(encryptedData.data, encryptedData.iv, userData.id);
        const transcriptData = JSON.parse(decryptedData);

        res.json(transcriptData);
    } catch (error) {
        console.error('Error fetching transcript:', error);
        res.status(500).json({ error: 'Failed to fetch transcript' });
    }
}; 