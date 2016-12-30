const express = require('express');

const apiStays = require('./stays');
const apiUsers = require('./users');
const loginRoutes = require('./login');

const passportMw = requireApp('middleware/passport');

const router = express.Router();

// Mount login routes
router.use('/', loginRoutes);

// API routes
const api = express.Router();
router.use('/api', api);

api.use(passportMw.makeUserIsAuthenticatedGate('/login'));
api.get('/', (req, res) => res.json({ message: 'Welcome to the API', user: req.user }));
api.use('/stays', apiStays);
api.use('/users', apiUsers);

module.exports = router;


