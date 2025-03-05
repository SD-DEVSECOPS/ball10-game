const express = require('express');  // Import express
const bodyParser = require('body-parser');  // Import body-parser to handle JSON requests
const createPaymentRoute = require('./api/create-payment');  // Import the create-payment API route

const app = express();  // Initialize the Express app
const port = process.env.PORT || 3000;  // Set the port to 3000 or use environment variable

app.use(bodyParser.json());  // Use body-parser to parse JSON requests

// Use the create-payment route for all requests starting with /api
app.use('/api', createPaymentRoute);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
