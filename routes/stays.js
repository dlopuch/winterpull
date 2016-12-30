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
  let stayReq = req.body;
  let isStayForSelf = !stayReq.userId;

  // BUSINESS RULE: Only hosts can create stays (guests need a host to create it for them).
  // Validate current user is host
  if (!req.user.isHost) {
    return next(new UserError('Only hosts can create stays.  Ask your host to sponsor you on this day.'));
  }

  let stayUser;

  return (new Promise(function promiseStayUser(resolve, reject) {
    if (isStayForSelf) {
      // Assume reserving a stay for self -- use session user
      return resolve(req.user);
    }

    return resolve(
      userModel.getUser(stayReq.userId)
      .catch((error) => {
        if (error.code === 'UserNotFound') {
          let e = new UserError('Unknown user specified for stay');
          e.prevError = error;
          throw e;
        }

        throw error;
      })
      .then(stayUser => {
        // BUSINESS RULE: If creating stay for someone else, the someone else must not be a host themselves
        if (stayUser.isHost) {
          throw new UserError('Cannot create a stay for another host -- they must create their own stay.');
        }

        return stayUser;
      })
    );
  }))
  .then((theStayUser) => {
    stayUser = theStayUser;

    let stay = {
      userId: stayUser.userId,
      hostId: isStayForSelf ? null : req.user.userId,
      isHost: stayUser.isHost
    };

    return stayModel.createStay(stayReq.y, stayReq.m, stayReq.d, stay);
  })
  .then(() => stayModel.getStays({y: stayReq.y, m: stayReq.m, d: stayReq.d, userId: stayUser.userId}))
  .then(stays => {
    if (!stays.length) {
      throw new Error('Unexpected case: could not find newly-created stay!');
    }

    res.json(stays[0]);
  })
  .catch(error => next(error));
});

module.exports = router;
