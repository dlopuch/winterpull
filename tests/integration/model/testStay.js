"use strict";

const _ = require('lodash');
const assert = require('chai').assert;

const resetAndPopulateDb = requireApp('tests/common/resetAndPopulateDb');
const userContexts = requireApp('tests/common/userContexts');
const staysBusiness = requireApp('business/staysBusiness');
const stayModel = requireApp('models/stay');
const userModel = requireApp('models/user');

function makeStayReq(forUser, host) {
  return {
    userId: forUser.userId,
    isHost: !!forUser.isHost,
    hostId: host && host.userId || null
  };
}

describe('Stay Model', function() {
  before('DB is cleared', resetAndPopulateDb);

  let hostUser;
  let anotherHostUser;
  let guest1User;
  let guest2User;
  let guest3User;

  before('loads hostUser', () => userModel.getUser(userContexts.dolores.userId).then(user => hostUser = user));
  before('loads anotherHostUser', () => userModel.getUser(userContexts.bernard.userId).then(user => anotherHostUser = user));
  before('loads guestUser', () => userModel.getUser(userContexts.william.userId).then(user => guest1User = user));
  before('loads guestUser2', () => userModel.getUser(userContexts.guest2.userId).then(user => guest2User = user));
  before('loads guestUser3', () => userModel.getUser(userContexts.guest3.userId).then(user => guest3User = user));

  describe('#createStay', function() {
    it('creates a stay for a guest', function() {
      return stayModel.createStay(2017, 1, 1, makeStayReq(guest1User, hostUser))
      .then(data => assert.isTrue(data) );
    });

    it('creates a stay for a host', function() {
      return stayModel.createStay(2017, 1, 1, makeStayReq(hostUser))
      .then(data => assert.isTrue(data) );
    });

    describe('verified with #getStays', function() {
      it('returns guest stay', function() {
        return stayModel.getStays({ y: 2017, m: 1, d: 1, userId: guest1User.userId })
        .then(data => {
          assert.lengthOf(data, 1);
          assert.equal(data[0].userId, guest1User.userId);
          assert.equal(data[0].hostId, hostUser.userId);
          assert.equal(data[0].stayDate, 20170101);
        });
      });

      it('returns host stay', function() {
        return stayModel.getStays({ y: 2017, m: 1, d: 1, userId: hostUser.userId })
        .then(data => {
          assert.lengthOf(data, 1);
          assert.equal(data[0].userId, hostUser.userId);
          assert.isNull(data[0].hostId);
          assert.equal(data[0].stayDate, 20170101);
        });
      });
    });
  });


  describe('#getStays', function() {
    before('DB is cleared', resetAndPopulateDb);

    before('creates stays', function() {
      // two different users on jan 1
      return stayModel.createStay(2017, 1, 1, makeStayReq(hostUser))
      .then(() => stayModel.createStay(2017, 1, 1, makeStayReq(anotherHostUser)))

      // next day
      .then(() => stayModel.createStay(2017, 1, 2, makeStayReq(hostUser)))

      // next week
      .then(() => stayModel.createStay(2017, 1, 8, makeStayReq(hostUser)))

      // next 2 weeks
      .then(() => stayModel.createStay(2017, 1, 15, makeStayReq(anotherHostUser)))

      // next months
      .then(() => stayModel.createStay(2017, 2, 1, makeStayReq(anotherHostUser)))
      .then(() => stayModel.createStay(2017, 3, 1, makeStayReq(anotherHostUser)))

      // next year
      .then(() => stayModel.createStay(2018, 1, 1, makeStayReq(hostUser)))
    });

    it('searches by userId', function() {
      return stayModel.getStays({ userId: hostUser.userId })
      .then(stays => {
        assert.deepEqual(
          stays.map(s => s.stayDate),
          [20170101, 20170102, 20170108, 20180101]
        );
      });
    });

    it('searches by year', function() {
      return stayModel.getStays({ y: 2018 })
      .then(stays => {
        assert.lengthOf(stays, 1);
        assert.equal(stays[0].stayDate, 20180101);
        assert.equal(stays[0].userId, hostUser.userId);
      });
    });

    it('searches by year, month', function() {
      return stayModel.getStays({ y: 2017, m: 1 })
      .then(stays => {
        assert.deepEqual(
          stays.map(s => s.stayDate),
          [20170101, 20170101, 20170102, 20170108, 20170115]
        );
      })
      .then(() => stayModel.getStays({ y: 2017, m: 2 }))
      .then(stays => {
        assert.lengthOf(stays, 1);
        assert.equal(stays[0].stayDate, 20170201);
        assert.equal(stays[0].userId, anotherHostUser.userId);
      });
    });

    it('searches by year, month, day', function() {
      return stayModel.getStays({ y: 2017, m: 1, d: 1 })
      .then(stays => {
        assert.deepEqual(
          stays.map(s => s.stayDate),
          [20170101, 20170101]
        );
      })
      .then(() => stayModel.getStays({ y: 2017, m: 1, d: 15 }))
      .then(stays => {
        assert.lengthOf(stays, 1);
        assert.equal(stays[0].stayDate, 20170115);
        assert.equal(stays[0].userId, anotherHostUser.userId);
      });
    });

    it('searches by year, month, day, numDays', function() {
      return stayModel.getStays({ y: 2017, m: 1, d: 1, numDays: 1 })
      .then(stays => {
        assert.deepEqual(
          stays.map(s => s.stayDate),
          [20170101, 20170101]
        );
      })
      .then(() => stayModel.getStays({ y: 2017, m: 1, d: 1, numDays: 7 }))
      .then(stays => {
        assert.deepEqual(
          stays.map(s => s.stayDate),
          [20170101, 20170101, 20170102]
        );
      })
      .then(() => stayModel.getStays({ y: 2017, m: 1, d: 1, numDays: 8 }))
      .then(stays => {
        assert.deepEqual(
          stays.map(s => s.stayDate),
          [20170101, 20170101, 20170102, 20170108]
        );
      });
    });

    it('searches by year, month, numDays', function() {
      return stayModel.getStays({ y: 2017, m: 1, numDays: 8 })
      .then(stays => {
        assert.deepEqual(
          stays.map(s => s.stayDate),
          [20170101, 20170101, 20170102, 20170108]
        );
      });
    });

    it('searches by year, month, day, numDays with correct numDays-month-rollover', function() {
      return stayModel.getStays({ y: 2017, m: 1, d: 31, numDays: 1 })
      .then(stays => assert.lengthOf(stays, 0))
      .then(() => stayModel.getStays({ y: 2017, m: 1, d: 31, numDays: 2 }))
      .then(stays => {
        assert.deepEqual(
          stays.map(s => s.stayDate),
          [20170201]
        );
      });
    });

    it ('searches by year, month, and userId', function() {
      return stayModel.getStays({ y: 2017, m: 1, userId: anotherHostUser.userId })
      .then(stays => {
        assert.deepEqual(
          stays.map(s => s.stayDate),
          [20170101, 20170115]
        );
      });
    });
  })

});