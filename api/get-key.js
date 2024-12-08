const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

module.exports = async (req, res) => {
    // Verify Discord token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Verify with Discord
        const discordResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!discordResponse.ok) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Return the encryption key only to authenticated users
        res.json({ key: ENCRYPTION_KEY });
    } catch (error) {
        console.error('Error in key endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 