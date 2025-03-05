const express = require('express');  // Import Express for routing
const PiService = require('../lib/PiService');  // Import PiService to call the Pi Network API
const router = express.Router();  // Create an Express router

// POST endpoint to create a payment
router.post('/create-payment', async (req, res) => {
  const { amount, memo, metadata } = req.body;  // Extract the payment details from the request body

  try {
    // Call PiService to create a payment
    const paymentResponse = await PiService.createPayment(amount, memo, metadata);

    // Send back the response from the Pi Network API
    res.json(paymentResponse);
  } catch (error) {
    // If there was an error, send a 500 error response with the error details
    res.status(500).json({ error: 'Failed to create payment', details: error.message });
  }
});

module.exports = router;  // Export the router to be used in the main app
