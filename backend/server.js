const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse incoming requests
app.use(express.json());

// API routes
app.use('/api/verify-token', require('./api/verify-token'));
app.use('/api/create-payment', require('./api/create-payment'));
app.use('/api/approve-payment', require('./api/approve-payment'));
app.use('/api/complete-payment', require('./api/complete-payment'));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
