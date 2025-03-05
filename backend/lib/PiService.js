const axios = require('axios');

class PiService {
    static async verifyToken(token) {
        const url = 'https://sandbox.minepi.com/api/verify-token';  // Pi Sandbox URL
        try {
            const response = await axios.post(url, { token });
            return response.data.verified;
        } catch (error) {
            console.error('Error verifying token:', error);
            return false;
        }
    }
}

module.exports = PiService;
