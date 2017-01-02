"use strict";

const _ = require('lodash');
const moment = require('moment');

const dateUtils = requireApp('utils/dateUtils');
const userModel = requireApp('models/user');
const stayModel = requireApp('models/stay');
const UserError = requireApp('models/UserError');


const MAX_OCCUPANCY = 18;
const MAX_HOSTS = 13;
const MAX_GUESTS = 5;

/**
 * Guest signup business logic relies on events happening wednesday at noon.  Server thinks in UTC, this logic converts
 * a UTC wednesday midnight to PST's noon.
 * @param {moment} wednesdayMidnightUtc
 * @return {moment} The same time adjusted to local noon
 */
const utcMidnightToPstNoon = function(wednesdayMidnightUtc) {
  return moment(wednesdayMidnightUtc).startOf('day').add(8 + 12, 'h'); // +8 to do PST midnight, +12 to do noon
};



/**
 * Creates a new Stay record for a specific day.  Gets resolved with that Stay records from DB lookup.
 *
 * @param {Object} requestingUser User from session
 * @param {number} stayReq.y
 * @param {number} stayReq.m
 * @param {number} stayReq.d
 * @param {string} [stayReq.userId] Specify userId if creating a stay for a guest, otherwise will be created for requestingUser
 * @param {moment} [_curDate] Current date, defaults to Date.now().  Used only for testing.
 * @return {Promise.<Stay>} Gets resolved with newly-created Stay
 */
exports.createStay = function(requestingUser, stayReq, _curDate) {
  let now = _curDate ? moment(_curDate) : moment();

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

        // BUSINESS RULE: Guestlist must be open for guests
        if (!stayUser.isHost) {
          exports.validateGuestlistIsOpen(stayReq, now); // throws if not open
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
 * Calculates the guest queue state of a particular date.
 *   'notOpen': not yet open (>7 days in advance)
 *   'open': accepting guest reservations
 *   'fcfs': reservation time past, now first-come-first-serve
 *   'closed': In the past
 * @param {number} stayQuery.y Year of stay
 * @param {number} stayQuery.m Month of stay
 * @param {number} stayQuery.d Day of stay
 * @param {moment} [_curDate] current date (for testing only), defaults to Date.now()
 * @return {'notOpen' | 'open' | 'fcfs' | 'closed'} state
 */
exports.getGuestlistState = function(stayQuery, _curDate) {
  let now = _curDate ? moment(_curDate) : moment();

  if (!stayQuery.y || !stayQuery.m || !stayQuery.d) {
    throw new UserError('Invalid date specified. Must specify year, month, day');
  }

  let stayDate = moment.parseZone(`${stayQuery.y}-${stayQuery.m}-${stayQuery.d}-Z`, 'YYYY-M-D-Z'); // in UTC time

  if (now.isBefore( moment(stayDate).subtract(7, 'd')) ) {
    return 'notOpen';
  } else if (now.isBefore( utcMidnightToPstNoon(dateUtils.getPreviousWednesday(stayQuery)) )) {
    return 'open';
  } else if (now.isBefore(stayDate)) {
    return 'fcfs';
  } else {
    return 'closed';
  }
};

exports.validateGuestlistIsOpen = function(stayQuery, _curDate) {
  let state = exports.getGuestlistState(stayQuery, _curDate);

  if (state === 'notOpen') {
    throw new UserError('Guest signups not yet open -- try 7 days before the desired stay.');
  } else if (state === 'closed') {
    throw new UserError('This date is in the past -- not accepting anymore guest signups.');
  }

  return true;
};

/**
 * Gets all the stays and calculates metadata for a given day (eg what the hosts' guest priority numbers are so guests
 * can be ordered appropriately).
 *
 * @param {number} stayQuery.y Year of stay
 * @param {number} stayQuery.m Month of stay
 * @param {number} stayQuery.d Day of stay
 * @param {moment} [_curDate] Current time, defaults to Date.now().  Used only for testing.
 * @return {Promise.<object>}
 */
exports.getDayStaysAndStats = function(stayQuery, _curDate) {
  let now = _curDate ? moment(_curDate) : moment();

  if (!stayQuery.y || !stayQuery.m || !stayQuery.d) {
    return Promise.reject(new Error('Invalid stayQuery: missing y, m, or d'));
  }

  // Whitelist params
  stayQuery = {
    y: stayQuery.y,
    m: stayQuery.m,
    d: stayQuery.d,
  };

  let stats;

  return stayModel.getStays(stayQuery)
  .then(stays => {


    stats = {
      hostStays: _(stays).filter(s => s.isHost).sortBy('dateCreated').value(),
      guestStays: _(stays).filter(s => !s.isHost).value(), // Get sorted once guest-nights retrieved below

      guestlistState: exports.getGuestlistState(stayQuery, now),

      maxOccupancy: MAX_OCCUPANCY,
      maxHosts: MAX_HOSTS,
      maxGuestReservations: MAX_GUESTS,
    };

    stats.occupancy = stats.hostStays.length + stats.guestStays.length;


    // Now retrieve the guest-night counts for all hosts and stick them inside `stats`
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

    // HEYDAN TODO:
    //   Need to resolve guestlist.
    //   1. Calculate previous wednesday noon
    //   2. Guest stays before that wednesday noon get sorted by priority and dateCreated
    //   3. Guest stays after that wednesday noon get sorted by dateCreated

    return stats;
  });
};
