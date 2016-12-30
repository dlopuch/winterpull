"use strict";

const assert = require('chai').assert;
const request = require('supertest');

const userContexts = require('./userContexts');

describe('Stays', function() {
  let hostUser = userContexts.dolores;
  let anotherHostUser = userContexts.bernard;
  let guestUser = userContexts.william;

  before('host should start logged-in'       , () => hostUser.promiseLogin());
  before('anotherHost should start logged-in', () => anotherHostUser.promiseLogin());
  before('guest should start logged-in'      , () => guestUser.promiseLogin());

  function assertDeepStayMinusDates(test, expected) {
    assert.isString(test.dateCreated);
    assert.isString(test.dateUpdated);
    delete test.dateCreated;
    delete test.dateUpdated;

    assert.deepEqual(test, expected);
  }

  describe('Creation', function() {
    it('starts with no stays', function() {
      return hostUser
      .get('/api/stays/2017/01/01')
      .expect(200)
      .expect(res => {
        assert.deepEqual(res.body, []);
      });
    });

    it('can create a stay for the host', function() {
      return hostUser
      .post('/api/stays/')
      .send({
        y: 2017,
        m: 1,
        d: 1
      })
      .expect(200)
      .expect(function(res) {
        assertDeepStayMinusDates(
          res.body,
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
      return guestUser
      .post('/api/stays/')
      .send({
        y: 2017,
        m: 1,
        d: 1
      })
      .expect(400)
      .expect(function(res) {
        assert.equal(res.body.message, 'Only hosts can create stays.  Ask your host to sponsor you on this day.');
      });
    });
    it('refuses to create a stay for a host by a non-host', function() {
      return guestUser
      .post('/api/stays/')
      .send({
        y: 2017,
        m: 1,
        d: 1,
        userId: hostUser.userId,
      })
      .expect(400)
      .expect(function(res) {
        assert.equal(res.body.message, 'Only hosts can create stays.  Ask your host to sponsor you on this day.');
      });
    });

    it('refuses to create stays for other hosts by hosts', function() {
      return hostUser
      .post('/api/stays/')
      .accept('application/json') // make API tests always request json responses (eg for errors)
      .send({
        y: 2017,
        m: 1,
        d: 1,
        userId: anotherHostUser.userId,
      })
      .expect(400)
      .expect(function(res) {
        assert.equal(res.body.message, 'Cannot create a stay for another host -- they must create their own stay.');
      });
    });

    it('creates a stay for a non-host by a host', function() {
      return hostUser
      .post('/api/stays/')
      .send({
        y: 2017,
        m: 1,
        d: 1,
        userId: guestUser.userId,
      })
      .expect(200)
      .expect(function(res) {
        assertDeepStayMinusDates(
          res.body,
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
      return hostUser
      .get('/api/stays/2017/1/1')
      .expect(200)
      .expect(res => {
        assert.lengthOf(res.body, 2);

        assert.equal(res.body[0].userId, hostUser.userId);

        assert.equal(res.body[1].userId, guestUser.userId);
      });
    });

    it('makes the stays appear in monthly search', function() {
      return hostUser
      .get('/api/stays/2017/1')
      .expect(200)
      .expect(res => {
        assert.lengthOf(res.body, 2);

        assert.equal(res.body[0].userId, hostUser.userId);
        assert.equal(res.body[0].stayDate, 20170101);

        assert.equal(res.body[1].userId, guestUser.userId);
        assert.equal(res.body[1].stayDate, 20170101);
      });
    });

  });
});
