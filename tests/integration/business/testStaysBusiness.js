"use strict";

const _ = require('lodash');
const assert = require('chai').assert;

const userContexts = requireApp('tests/common/userContexts');
const staysBusiness = requireApp('business/staysBusiness');
const stayModel = requireApp('models/stay');
const userModel = requireApp('models/user');


describe('Stays Business', function() {

  let hostUser;
  let anotherHostUser;
  let guestUser;

  before('loads hostUser', () => userModel.getUser(userContexts.dolores.userId).then(user => hostUser = user));
  before('loads anotherHostUser', () => userModel.getUser(userContexts.bernard.userId).then(user => anotherHostUser = user));
  before('loads guestUser', () => userModel.getUser(userContexts.william.userId).then(user => guestUser = user));

  function assertDeepStayMinusDates(test, expected) {
    assert.isString(test.dateCreated);
    assert.isString(test.dateUpdated);
    delete test.dateCreated;
    delete test.dateUpdated;

    assert.deepEqual(test, expected);
  }

  describe('#createStay', function() {
    const stayDateQuery = {
      y: 2017,
      m: 1,
      d: 1,
    };

    before('starts with no stays', function() {
      return stayModel.getStays(stayDateQuery)
      .then(stays => {
        assert.deepEqual(stays, []);
      });
    });

    it('can create a stay for a host', function() {
      return staysBusiness.createStay(hostUser, stayDateQuery)
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
      return staysBusiness.createStay(guestUser, stayDateQuery)
      .then(() => { throw new Error('should have failed'); })
      .catch(error => {
        assert.equal(error.message, 'Only hosts can create stays.  Ask your host to sponsor you on this day.');
      });
    });

    it('refuses to create a stay for a host by a non-host', function() {
      return staysBusiness.createStay(guestUser, _.extend(stayDateQuery, { userId: hostUser.userId }))
      .then(() => { throw new Error('should have failed'); })
      .catch(error => {
        assert.equal(error.message, 'Only hosts can create stays.  Ask your host to sponsor you on this day.');
      });
    });

    it('refuses to create stays for other hosts by hosts', function() {
      return staysBusiness.createStay(hostUser, _.extend(stayDateQuery, { userId: anotherHostUser.userId }))
      .then(() => { throw new Error('should have failed'); })
      .catch(error => {
        assert.equal(error.message, 'Cannot create a stay for another host -- they must create their own stay.');
      });
    });

    it('creates a stay for a non-host by a host', function() {
      return staysBusiness.createStay(hostUser, _.extend(stayDateQuery, { userId: guestUser.userId }))
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
      return stayModel.getStays({ y: stayDateQuery.y, m: stayDateQuery.m, d: stayDateQuery.d })
      .then(stays => {
        assert.lengthOf(stays, 2);

        assert.equal(stays[0].userId, hostUser.userId);
        assert.equal(stays[0].stayDate, 20170101);

        assert.equal(stays[1].userId, guestUser.userId);
        assert.equal(stays[1].stayDate, 20170101);
      });
    });

    it('makes the stays appear in monthly search', function() {
      return stayModel.getStays({ y: stayDateQuery.y, m: stayDateQuery.m })
      .then(stays => {
        assert.lengthOf(stays, 2);

        assert.equal(stays[0].userId, hostUser.userId);
        assert.equal(stays[0].stayDate, 20170101);

        assert.equal(stays[1].userId, guestUser.userId);
        assert.equal(stays[1].stayDate, 20170101);
      });
    });

  });

  describe('#getDayStaysAndStats', function() {
    it('grabs stats', function() {
      return staysBusiness.getDayStaysAndStats({ y: 2017, m: 1, d: 1 })
      .then(staysAndStats => {
        assert.deepEqual(staysAndStats, {});
      });
    });

    // HEYDAN! ABOVE LOOKS GOOD.  Fix the deep-equal, then test other scenarios.

  });

});
