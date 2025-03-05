const axios = require('axios');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { accessToken } = req.body;

    try {
        const response = await axios.get('https://api.sandbox.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Token verification error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Token verification failed' });
    }
}
