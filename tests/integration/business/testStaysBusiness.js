"use strict";

const _ = require('lodash');
const assert = require('chai').assert;
const moment = require('moment');

const resetAndPopulateDb = requireApp('tests/common/resetAndPopulateDb');
const userContexts = requireApp('tests/common/userContexts');
const staysBusiness = requireApp('business/staysBusiness');
const stayModel = requireApp('models/stay');
const UserError = requireApp('models/UserError');
const userModel = requireApp('models/user');


describe('Stays Business', function() {

  before('DB is cleared', resetAndPopulateDb);

  let hostUser;
  let anotherHostUser;
  let guestUser;
  let guest2User;
  let guest3User;

  before('loads hostUser', () => userModel.getUser(userContexts.dolores.userId).then(user => hostUser = user));
  before('loads anotherHostUser', () => userModel.getUser(userContexts.bernard.userId).then(user => anotherHostUser = user));
  before('loads guestUser', () => userModel.getUser(userContexts.william.userId).then(user => guestUser = user));
  before('loads guestUser2', () => userModel.getUser(userContexts.guest2.userId).then(user => guest2User = user));
  before('loads guestUser3', () => userModel.getUser(userContexts.guest3.userId).then(user => guest3User = user));

  function assertDeepStayMinusDates(test, expected) {
    assert.isString(test.dateCreated);
    assert.isString(test.dateUpdated);
    delete test.dateCreated;
    delete test.dateUpdated;

    assert.deepEqual(test, expected);
  }

  const stayDateQueryJan = {
    y: 2017,
    m: 1,
    d: 1,
  };
  const stayDateQueryDec31 = {
    y: 2016,
    m: 12,
    d: 31,
  };
  const stayDateQueryDec20 = {
    y: 2016,
    m: 12,
    d: 20,
  };

  describe('#createStay', function() {
    let now = new moment.parseZone('2016-12-31T00:00:00.000Z');

    before('starts with no stays', function() {
      return stayModel.getStays(stayDateQueryJan)
      .then(stays => {
        assert.deepEqual(stays, []);
      });
    });

    it('can create a stay for a host', function() {
      return staysBusiness.createStay(hostUser, stayDateQueryJan, now)
      .then(stay => {
        assertDeepStayMinusDates(
          stay,
          {
            userId: hostUser.userId,
            hostId: null,
            stayDate: 20170101,
            isHost: true,
          }
        );
      });
    });

    it('refuses to create a stay for a non-host by a non-host', function() {
      return staysBusiness.createStay(guestUser, stayDateQueryJan, now)
      .then(() => { throw new Error('should have failed'); })
      .catch(error => {
        assert.equal(error.message, 'Only hosts can create stays.  Ask your host to sponsor you on this day.');
      });
    });

    it('refuses to create a stay for a host by a non-host', function() {
      return staysBusiness.createStay(guestUser, _.extend(stayDateQueryJan, { userId: hostUser.userId }), now)
      .then(() => { throw new Error('should have failed'); })
      .catch(error => {
        assert.equal(error.message, 'Only hosts can create stays.  Ask your host to sponsor you on this day.');
      });
    });

    it('refuses to create stays for other hosts by hosts', function() {
      return staysBusiness.createStay(hostUser, _.extend(stayDateQueryJan, { userId: anotherHostUser.userId }), now)
      .then(() => { throw new Error('should have failed'); })
      .catch(error => {
        assert.equal(error.message, 'Cannot create a stay for another host -- they must create their own stay.');
      });
    });

    it('creates a stay for a non-host by a host', function() {
      return staysBusiness.createStay(hostUser, _.extend(stayDateQueryJan, { userId: guestUser.userId }), now)
      .then(stay => {
        assertDeepStayMinusDates(
          stay,
          {
            userId: guestUser.userId,
            hostId: hostUser.userId,
            stayDate: 20170101,
            isHost: false,
          }
        );
      });
    });

    it('makes the stays appear in daily search', function() {
      return stayModel.getStays({ y: stayDateQueryJan.y, m: stayDateQueryJan.m, d: stayDateQueryJan.d })
      .then(stays => {
        assert.lengthOf(stays, 2);

        assert.equal(stays[0].userId, hostUser.userId);
        assert.equal(stays[0].stayDate, 20170101);

        assert.equal(stays[1].userId, guestUser.userId);
        assert.equal(stays[1].stayDate, 20170101);
      });
    });

    it('makes the stays appear in monthly search', function() {
      return stayModel.getStays({ y: stayDateQueryJan.y, m: stayDateQueryJan.m })
      .then(stays => {
        assert.lengthOf(stays, 2);

        assert.equal(stays[0].userId, hostUser.userId);
        assert.equal(stays[0].stayDate, 20170101);

        assert.equal(stays[1].userId, guestUser.userId);
        assert.equal(stays[1].stayDate, 20170101);
      });
    });

  });

  describe('#getGuestlistState and #validateGuestlistIsOpen', function() {
    let stayQuery = {
      y: 2017,
      m: 1,
      d: 14, // saturday
    };

    it("calculates 'notOpen' state", function() {
      let now = moment.parseZone('2017-01-06T23:59:59.000Z');
      assert.equal(staysBusiness.getGuestlistState(stayQuery, now), 'notOpen');
      assert.throws(
        staysBusiness.validateGuestlistIsOpen.bind(this, stayQuery, now),
        UserError, 'Guest signups not yet open -- try 7 days before the desired stay.'
      );
    });

    it("calculates 'open' state", function() {
      let now = moment.parseZone('2017-01-07T00:00:00.000Z');
      assert.equal(staysBusiness.getGuestlistState(stayQuery, now), 'open');
      staysBusiness.validateGuestlistIsOpen(stayQuery, now);

      // here we add 8 hours for PST offset, then +12 to get to noon. 8 + 12 = 20.
      now = moment.parseZone('2017-01-11T19:59:59.000Z');
      assert.equal(staysBusiness.getGuestlistState(stayQuery, now), 'open');
      staysBusiness.validateGuestlistIsOpen(stayQuery, now);
    });

    it("calculates 'fcfs' state", function() {
      let now = moment.parseZone('2017-01-11T20:00:00.000Z');
      assert.equal(staysBusiness.getGuestlistState(stayQuery, now), 'fcfs');
      staysBusiness.validateGuestlistIsOpen(stayQuery, now);

      now = moment.parseZone('2017-01-13T23:59:59.000Z');
      assert.equal(staysBusiness.getGuestlistState(stayQuery, now), 'fcfs');
      staysBusiness.validateGuestlistIsOpen(stayQuery, now);
    });

    it("calculates 'closed' state", function() {
      let now = moment.parseZone('2017-01-14T00:00:00.000Z');
      assert.equal(staysBusiness.getGuestlistState(stayQuery, now), 'closed');
      assert.throws(
        staysBusiness.validateGuestlistIsOpen.bind(this, stayQuery, now),
        UserError, 'This date is in the past -- not accepting anymore guest signups.'
      );
    });
  });

  describe('#getDayStaysAndStats', function() {
    let now = new moment.parseZone('2016-12-30T00:00:00.000Z');
    let nowDec19 = new moment.parseZone('2016-12-19T00:00:00.000Z');

    before('starts with two stays from prev suite', function() {
      return stayModel.getStays({ y: stayDateQueryJan.y, m: stayDateQueryJan.m })
      .then(stays => {
        assert.lengthOf(stays, 2);

        assert.equal(stays[0].userId, hostUser.userId);
        assert.equal(stays[0].stayDate, 20170101);

        assert.equal(stays[1].userId, guestUser.userId);
        assert.equal(stays[1].stayDate, 20170101);
      });
    });

    before('creates a few previous guest stays', function() {
      // anotherHostUser has a guest staying tonight
      return staysBusiness.createStay(anotherHostUser, _.extend(stayDateQueryJan, { userId: guest3User.userId }), now)

      // hostUser has three previous guest-nights from 2 guests
      .then(() => staysBusiness.createStay(hostUser, _.extend(stayDateQueryDec31, { userId: guestUser.userId }), now))
      .then(() => staysBusiness.createStay(hostUser, _.extend(stayDateQueryDec31, { userId: guest2User.userId }), now))
      .then(() => staysBusiness.createStay(hostUser, _.extend(stayDateQueryDec20, { userId: guest2User.userId }), nowDec19))

      // anotherHostUser has one previous guest-night
      .then(() => staysBusiness.createStay(anotherHostUser, _.extend(stayDateQueryDec31, { userId: guest3User.userId }), now));
    });

    it('calculates prior guest-night stays correctly', function() {
      return staysBusiness.getDayStaysAndStats({ y: 2017, m: 1, d: 1 }, moment.parseZone('2016-12-31T23:59:59.000Z'))
      .then(staysAndStats => {
        let expectedGuestNightsByHost = {};
        expectedGuestNightsByHost[hostUser.userId] = 3;
        expectedGuestNightsByHost[anotherHostUser.userId] = 1;

        assert.deepEqual(staysAndStats.guestNightsByHost, expectedGuestNightsByHost);

        let expectedGuestStays = [
          { stayDate: 20170101,
            userId: guest3User.userId, // note lower priority is first even though created second
            isHost: false,
            hostId: anotherHostUser.userId,
            priority: 1, // 1 previous guest-night
          },
          { stayDate: 20170101,
            userId: guestUser.userId,
            isHost: false,
            hostId: hostUser.userId,
            priority: 3, // 3 previous guest-night
          },
        ];
        staysAndStats.guestStays.forEach((stay, i) => assertDeepStayMinusDates(stay, expectedGuestStays[i]));


        assert.lengthOf(staysAndStats.hostStays, 1);
        assertDeepStayMinusDates(staysAndStats.hostStays[0], {
          stayDate: 20170101,
          userId: hostUser.userId,
          isHost: true,
          hostId: null
        });

        let remaining = _.clone(staysAndStats);
        delete remaining.guestNightsByHost;
        delete remaining.guestStays;
        delete remaining.hostStays;
        assert.deepEqual(remaining, {
          maxGuestReservations: 5,
          maxOccupancy: 18,
          maxHosts: 13,
          occupancy: 3,
          guestlistState: 'fcfs', // from time param
        });
      });
    });

  });

});
