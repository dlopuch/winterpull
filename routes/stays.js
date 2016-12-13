"use strict";

const router = require('express').Router();
const stayModel = requireApp('models/stay');

/* GET stays listing. */
router.get('/:yearOrUser', function(req, res, next) {
  let params;

  if (isNaN(parseInt(req.params.yearOrUser))) {
    params = { userId: req.params.yearOrUser };
  } else {
    params = { y: req.params.yearOrUser };
  }

  stayModel.getStays(params)
  .then(stays => res.status(200).json(stays))
  .catch(next);
});

router.get('/:year/:month', function(req, res, next) {
  stayModel.getStays({ y: req.params.year, m: req.params.month })
  .then(stays => res.status(200).json(stays))
  .catch(next);
});

router.get('/:year/:month/:day', function(req, res, next) {
  stayModel.getStays({ y: req.params.year, m: req.params.month, d: req.params.day })
  .then(stays => res.status(200).json(stays))
  .catch(next);
});

router.get('/:year/:month/:day/:userId', function(req, res, next) {
  stayModel.getStays({ y: req.params.year, m: req.params.month, d: req.params.day, userId: req.params.userId })
  .then(stays => res.status(200).json(stays))
  .catch(next);
});

router.post('/', function(req, res, next) {
  let stayReq = req.body;
  let stay = req.body;
  let requestingUserId = req.user && req.user.id || 'TODO session user';

  if (!stayReq.userId) {
    stay.userId = requestingUserId;
    stay.hostId = null;
    stay.isHost = true; // TODO: Get user info
  } else {
    stay.userId = stayReq.userId;
    stay.hostId = requestingUserId; // TODO: Only if requesting user is a host
    stay.isHost = false; // TODO get user info
  }

  // TODO: Only hosts can create stays for guests, need to validate current user's host-status

  stayModel.createStay(stay.y, stay.m, stay.d, stay)
  .then((record) => res.status(200).json(record))
  .catch(next);
});

module.exports = router;
