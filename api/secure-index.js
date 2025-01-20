async function generateSecureIndex() {
    const transcripts = {};
    
    // Group transcripts by user ID
    const files = await fs.readdir('./transcripts');
    for (const file of files) {
        const content = await fs.readFile(`./transcripts/${file}`, 'utf8');
        const transcript = JSON.parse(content);
        
        if (!transcripts[transcript.userId]) {
            transcripts[transcript.userId] = [];
        }
        
        // Only include necessary information
        transcripts[transcript.userId].push({
            id: transcript.id,
            channelName: transcript.channelName,
            timestamp: transcript.timestamp
        });
    }
    
    return transcripts;
} 