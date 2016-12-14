const express = require('express');
const apiStays = require('./stays');
const apiUsers = require('./users');

const router = express.Router();
const api = express.Router();

router.use('/api', api);

api.use('/stays', apiStays);
api.use('/users', apiUsers);

module.exports = router;
