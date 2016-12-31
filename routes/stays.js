"use strict";

const router = require('express').Router();
const userModel = requireApp('models/user');
const stayModel = requireApp('models/stay');
const UserError = requireApp('models/UserError');

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

});

module.exports = router;
