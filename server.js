const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Enable CORS for your frontend domain
app.use(cors({
    origin: 'https://ball10-game.vercel.app', // Replace with your frontend domain
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Verify access token
app.post('/api/verify-token', async (req, res) => {
    const { accessToken } = req.body;

    try {
        const response = await axios.get('https://api.sandbox.minepi.com/v2/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Token verification error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Token verification failed' });
    }
});

// Payment approval endpoint
app.post('/api/approve-payment', (req, res) => {
    const { paymentId } = req.body;
    // Validate payment and user balance (add your logic here)
    res.status(200).json({ approved: true, paymentId });
});

// Payment completion endpoint
app.post('/api/complete-payment', (req, res) => {
    const { paymentId, txid } = req.body;
    // Verify transaction on Pi blockchain (add your logic here)
    res.status(200).json({ completed: true, paymentId, txid });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
