export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { paymentId, txid } = req.body;
    return res.status(200).json({ completed: true, paymentId, txid });
}
