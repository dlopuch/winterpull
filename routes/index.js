const express = require('express');
const apiStays = require('./stays');

const router = express.Router();
const api = express.Router();

router.use('/api', api);

api.use('/stays', apiStays);

module.exports = router;
