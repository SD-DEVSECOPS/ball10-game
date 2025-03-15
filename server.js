require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PI_API_URL = process.env.PI_API_URL || 'https://api.minepi.com/v2';
const SERVER_API_KEY = process.env.PI_SERVER_KEY;

// CORS Configuration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8080');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Authentication Endpoint
app.post('/api/verify-auth', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No auth token' });

        const response = await axios.get(`${PI_API_URL}/me`, {
            headers: { 'Authorization': authHeader }
        });

        res.json({
            uid: response.data.uid,
            username: response.data.username,
            wallet_address: response.data.wallet_address
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid authentication' });
    }
});

// Payment Approval
app.post('/api/approve-payment', async (req, res) => {
    try {
        const { paymentId } = req.body;
        const response = await axios.post(
            `${PI_API_URL}/payments/${paymentId}/approve`,
            {},
            { headers: { 'Authorization': `Key ${SERVER_API_KEY}` } }
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Payment approval failed' });
    }
});

// Payment Completion
app.post('/api/complete-payment', async (req, res) => {
    try {
        const { paymentId, txid } = req.body;
        const response = await axios.post(
            `${PI_API_URL}/payments/${paymentId}/complete`,
            { txid },
            { headers: { 'Authorization': `Key ${SERVER_API_KEY}` } }
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Payment completion failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
