const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors({ 
    origin: 'https://2cpe.github.io',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// In-memory storage (replace with a database in production)
const transcripts = new Map();

// Endpoint to save transcript
app.post('/api/transcripts', (req, res) => {
    const { id, title, messages } = req.body;
    transcripts.set(id, { title, messages });
    // Delete after 24 hours
    setTimeout(() => transcripts.delete(id), 24 * 60 * 60 * 1000);
    res.json({ success: true });
});

// Endpoint to view transcript
app.get('/api/transcripts/:id', (req, res) => {
    const transcript = transcripts.get(req.params.id);
    if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found or expired' });
    }
    res.json(transcript);
});

app.listen(port, () => {
    console.log(`Transcript server running on port ${port}`);
}); 
