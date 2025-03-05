// piService.js

export class PiService {
  // Simulate the Pi Network authentication process
  static async authenticate() {
    try {
      // Check if the Pi SDK is available (assuming you have the Pi SDK included)
      if (typeof PiNetwork !== 'undefined' && PiNetwork) {
        const piUser = await PiNetwork.getUserInfo(); // Call Pi SDK to get user info

        if (piUser) {
          // Store the Pi user information locally (e.g., user ID, token)
          return {
            uid: piUser.uid,
            token: piUser.token,
          };
        } else {
          throw new Error('Failed to get Pi user information.');
        }
      } else {
        throw new Error('Pi SDK not found.');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Authentication failed. Please try again.');
    }
  }

  // Method to initiate payment (you can customize this for your payment system)
  static async createPayment(amount, description) {
    try {
      // Example logic to create a Pi payment (replace with actual API or SDK call)
      const paymentResult = await fetch('https://api.pi-network.com/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description }),
      });

      const paymentData = await paymentResult.json();
      return paymentData;
    } catch (error) {
      console.error('Payment error:', error);
      throw new Error('Payment initiation failed.');
    }
  }

  // Verify the Pi token with your server
  static async verifyToken(token) {
    try {
      const response = await fetch('/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (result.success) {
        return true;
      } else {
        throw new Error('Token verification failed');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Verification failed.');
    }
  }
}
