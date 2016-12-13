"use strict";

const router = require('express').Router();
const stayModel = requireApp('models/stay');

/* GET stays listing. */
router.get('/:year/:month', function(req, res, next) {
  stayModel.getMonthStays(parseInt(req.params.year, 10), parseInt(req.params.month, 10))
  .then(stays => res.status(200).json(stays));
});

module.exports = router;
