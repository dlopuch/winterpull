const express = require('express');
const apiStays = require('./stays');
const apiUsers = require('./users');

const passport = requireApp('middleware/passport');

const router = express.Router();
const api = express.Router();

router.use('/api', api);

api.use('/stays', apiStays);
api.use('/users', apiUsers);

module.exports = router;


let passportAuthenticateMw = passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureMessage: true, // Sets any messages from validation callback onto req.session.messages
});

router.post('/login',
  passportAuthenticateMw
);
router.get('/login', (req, res, next) => {
  let messages = req.session.messages;
  delete req.session.messages;
  res.json({ toLogin: 'Please POST userId and password', messages });
});
router.get('/login/user', (req, res, next) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  // TODO: Make this a permission gate!
  res.json(req.user);
});
