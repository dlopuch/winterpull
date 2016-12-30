"use strict";

const assert = require('chai').assert;
const request = require('supertest');

const userContexts = require('./userContexts');

describe('Stays', function() {
  let hostUser = userContexts.dolores;
  before('should start logged-in', () => hostUser.promiseLogin());

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
        assert.isString(res.body.dateCreated);
        assert.isString(res.body.dateUpdated);
        delete res.body.dateCreated;
        delete res.body.dateUpdated;

        assert.deepEqual(res.body, {
          userId: hostUser.userId,
          hostId: null,
          stayDate: 20170101,
          isHost: true,
        });
      });
    });

    it('fails to create a stay for a non-host');
    it('fails to create stays for other hosts');

    it('makes the stay appear in search', function() {
      return hostUser
      .get('/api/stays/2017/1/1')
      .expect(200)
      .expect(res => {
        assert.lengthOf(res.body, 1);
        assert.equal(res.body[0].userId, hostUser.userId);
      });
    });

  });
});
