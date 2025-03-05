<<<<<<< HEAD
// backend/lib/PiService.js
import fetch from 'node-fetch';

export class PiService {
  static async verifyToken(token) {
    // Here you would use Pi Network's API or your own logic to verify the token.
    // This is a placeholder example that always returns true.

    try {
      // Simulated API call to verify the token with Pi Network (replace this with actual logic)
      const response = await fetch('https://api.pinetwork.com/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      // Assuming Pi API returns an object with a "valid" property
      return data.valid === true;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false; // Return false if token verification fails
    }
  }

  static async initiatePayment(paymentDetails) {
    // Implement payment initiation logic here
    console.log('Payment initiated:', paymentDetails);
  }
}
=======
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
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
