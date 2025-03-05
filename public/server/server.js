const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Pi API configuration
const PI_API_URL = 'https://api.minepi.com/v2'; // Use 'https://api.sandbox.minepi.com/v2' for sandbox
const PI_API_KEY = 'mc96poz1u0f2tv9ytsrpc2as3k3ufsg6nxdido6d4jfvygcxofwmnmgtuzxmlry0'; // Replace with your Pi API key

// Verify access token (used for authentication)
app.post('/api/verify-token', async (req, res) => {
    const { accessToken } = req.body;

    try {
        const response = await axios.get(`${PI_API_URL}/me`, {
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
app.post('/api/approve-payment', async (req, res) => {
    const { paymentId } = req.body;

    try {
        // Validate payment and user balance (add your logic here)
        const response = await axios.post(`${PI_API_URL}/payments/${paymentId}/approve`, {}, {
            headers: {
                'Authorization': `Key ${PI_API_KEY}`
            }
        });

        res.status(200).json({ approved: true, paymentId, data: response.data });
    } catch (error) {
        console.error('Payment approval error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Payment approval failed' });
    }
});

// Payment completion endpoint
app.post('/api/complete-payment', async (req, res) => {
    const { paymentId, txid } = req.body;

    try {
        // Verify transaction on Pi blockchain (add your logic here)
        const response = await axios.post(`${PI_API_URL}/payments/${paymentId}/complete`, { txid }, {
            headers: {
                'Authorization': `Key ${PI_API_KEY}`
            }
        });

        res.status(200).json({ completed: true, paymentId, txid, data: response.data });
    } catch (error) {
        console.error('Payment completion error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Payment completion failed' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
