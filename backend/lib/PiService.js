require('dotenv').config();  // Load environment variables from .env file
const fetch = require('node-fetch');  // Import fetch for making HTTP requests

class PiService {
  // Function to create a payment
  static async createPayment(amount, memo, metadata) {
    const piApiKey = process.env.PI_API_KEY;  // Access the Pi API key from environment variables

    const response = await fetch('https://api.pi.network/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${piApiKey}`,  // Include the API key in the authorization header
      },
      body: JSON.stringify({ amount, memo, metadata })  // Send the payment details in the body of the request
    });

    if (!response.ok) {
      throw new Error('Failed to create payment');
    }

    return response.json();  // Return the JSON response from the Pi Network API
  }
}

module.exports = PiService;  // Export the PiService class to use it in other files
