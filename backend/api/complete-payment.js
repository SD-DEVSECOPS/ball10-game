// backend/api/complete-payment.js
import { completePayment } from '../lib/piService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { paymentId } = req.body;

  try {
    const completion = await completePayment(paymentId);
    res.status(200).json(completion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
