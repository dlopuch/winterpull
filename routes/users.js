"use strict";

const express = require('express');
const router = express.Router();

const user = requireApp('models/user');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
})

router.post('/invite', function(req, res, next) {
  req.body.inviteCode = 'INV_' + Math.random();
  user.createUser(
    { userId: 'TODO@session.user.com',
      isAdmin: true,
      isHost: true,
    },
    req.body
  )
  .then(() => user.getUser(req.body.userId))
  .then(user => res.json(user))
  .catch(next);
});

router.post('/verifyPw', function(req, res, next) {
  user.validatePassword(req.body.userId, req.body.password)
  .then(pwValid => res.json({ passwordWorks: pwValid }))
  .catch(next);
});

module.exports = router;
