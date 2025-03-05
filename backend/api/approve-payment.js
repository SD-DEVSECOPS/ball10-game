// backend/api/approve-payment.js
import { approvePayment } from '../lib/piService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { paymentId } = req.body;

  try {
    const approval = await approvePayment(paymentId);
    res.status(200).json(approval);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
