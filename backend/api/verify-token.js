// backend/api/verify-token.js
<<<<<<< HEAD
import { PiService } from '../../lib/PiService.js'; // Assuming PiService contains logic for token verification

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
=======
import { verifyToken } from '../lib/piService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
  }

  const { token } = req.body;

<<<<<<< HEAD
  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  try {
    // Verify the token using Pi SDK or custom verification logic
    const isValid = await PiService.verifyToken(token);

    if (isValid) {
      return res.status(200).json({ success: true, message: 'Authentication successful' });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
=======
  try {
    const result = await verifyToken(token);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
