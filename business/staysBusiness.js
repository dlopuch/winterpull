"use strict";

const _ = require('lodash');

const userModel = requireApp('models/user');
const stayModel = requireApp('models/stay');
const UserError = requireApp('models/UserError');


const MAX_OCCUPANCY = 18;
const MAX_HOSTS = 13;
const MAX_GUESTS = 5;



/**
 * Creates a new Stay record for a specific day.  Gets resolved with that Stay records from DB lookup.
 *
 * @param {Object} requestingUser User from session
 * @param {number} stayReq.y
 * @param {number} stayReq.m
 * @param {number} stayReq.d
 * @param {string} [stayReq.userId] Specify userId if creating a stay for a guest, otherwise will be created for requestingUser
 * @return {Promise.<Stay>} Gets resolved with newly-created Stay
 */
exports.createStay = function(requestingUser, stayReq) {
  let isStayForSelf = !stayReq.userId || stayReq.userId === requestingUser.userId;

  // BUSINESS RULE: Only hosts can create stays (guests need a host to create it for them).
  // Validate current user is host
  if (!requestingUser.isHost) {
    return Promise.reject(new UserError('Only hosts can create stays.  Ask your host to sponsor you on this day.'));
  }

  let stayUser;

  return (new Promise(function promiseStayUser(resolve, reject) {
    if (isStayForSelf) {
      // Assume reserving a stay for self -- use session user
      return resolve(requestingUser);
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
      hostId: isStayForSelf ? null : requestingUser.userId,
      isHost: stayUser.isHost
    };

    return stayModel.createStay(stayReq.y, stayReq.m, stayReq.d, stay);
  })
  .then(() => stayModel.getStays({y: stayReq.y, m: stayReq.m, d: stayReq.d, userId: stayUser.userId}))
  .then(stays => {
    if (!stays.length) {
      throw new Error('Unexpected case: could not find newly-created stay!');
    }

    return stays[0];
  });
};

/**
 * Gets all the stays and calculates metadata for a given day (eg what the hosts' guest priority numbers are so guests
 * can be ordered appropriately).
 *
 * @param {number} stayQuery.y Year of stay
 * @param {number} stayQuery.m Month of stay
 * @param {number} stayQuery.d Day of stay
 * @return {Promise.<object>}
 */
exports.getDayStaysAndStats = function(stayQuery, _curDate) {
  if (!_curDate) {
    _curDate = Date.now();
  }

  if (!stayQuery.y || !stayQuery.m || !stayQuery.d) {
    return Promise.reject(new Error('Invalid stayQuery: missing y, m, or d'));
  }

  let stats;

  return stayModel.getStays(stayQuery)
  .then(stays => {
    stats = {
      hostStays: _(stays).filter(s => s.isHost).sortBy('dateCreated').value(),
      guestStays: _(stays).filter(s => !s.isHost).value(), // Get sorted once guest-nights retrieved below

      maxOccupancy: MAX_OCCUPANCY,
      maxHosts: MAX_HOSTS,
      maxGuestReservations: MAX_GUESTS,
    };

    stats.occupancy = stats.hostStays.length + stats.guestStays.length;


    // Now retrieve the guest-night counts for all hosts
    stats.guestNightsByHost = {};

    let hosts = _(stats.guestStays).map('hostId').uniq().value();
    let promiseHostCounts = hosts.map(hostId =>
      stayModel.countHostGuestNights(hostId, stayQuery)
      .then(guestNightCount => stats.guestNightsByHost[hostId] = guestNightCount)
    );

    return Promise.all(promiseHostCounts)
    .then(() => stats);
  })
  .then(stats => {
    // Now add host guest-nights to the guest stays and sort them appropriately
    stats.guestStays.forEach(guestStay => {
      guestStay.priority = stats.guestNightsByHost[guestStay.hostId];
    });

    // Order guest stays by their hosts' priority numbers
    stats.guestStays = _.sortBy(stats.guestStays, ['priority', 'dateCreated']);

    return stats;
  });
};
