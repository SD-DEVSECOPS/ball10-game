import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/complete', async (req, res) => {
  const { paymentId, uid } = req.body;
  
  try {
    // Approve payment with Pi Network
    const piResponse = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Key ${process.env.PI_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!piResponse.ok) {
      const error = await piResponse.json();
      throw new Error(error.message || 'Pi Network approval failed');
    }

    // TODO: Grant in-game items to user (uid)
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Server Payment Error:', error);
    res.status(500).json({ 
      error: error.message || 'Payment processing failed'
    });
  }
});

export default router;
