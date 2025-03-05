import React from 'react';
import Pi from '@pi-apps/pi-sdk';

const PaymentButton = ({ amount, memo, userId }) => {
  const handlePayment = async () => {
    try {
      // Initialize with testnet
      await Pi.init({ sandbox: true });
      
      // Create payment
      const payment = await Pi.createPayment({
        amount: amount,
        memo: memo,
        metadata: { userId: userId },
        redirectURL: `${window.location.origin}/payment-callback`
      });

      // Complete payment via backend
      const response = await fetch('/api/payments/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: payment.identifier,
          uid: userId
        })
      });

      if (!response.ok) throw new Error('Payment approval failed');
      
      alert('Payment successful!');
      
    } catch (error) {
      console.error('Payment Error:', error);
      alert(`Payment failed: ${error.message}`);
    }
  };

  return (
    <button onClick={handlePayment}>
      Purchase {amount} PI
    </button>
  );
};

export default PaymentButton;
