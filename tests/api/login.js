"use strict";

const assert = require('chai').assert;
const request = require('supertest');

const userContexts = require('../common/userContexts');

describe('Login', function() {
  let userContext = userContexts.dolores;
  before('should start logged-out', () => userContext.promiseLogout());


  describe('Login permission gate', function() {
    before('should start logged-out', () => userContext.promiseLogout());

    it('should block all API requests', function() {
      return userContext
      .post('/api')
      .redirects(0)
      .expect(401);
    });
  });

  describe('Unsuccessful Login', function() {
    before('should start logged-out', () => userContext.promiseLogout());

    it('should fail, no redirect', function() {
      return userContext
      .post('/login')
      .send({ userId: 'new@user.com', password: '9990' })
      .expect(401);
    });

    it('should have session messages after failed attempt', function() {
      return userContext
      .get('/login')
      .set('Accept', 'application/json')
      .expect(200)
      .expect(function(res) {
        assert.isArray(res.body.messages);
        assert.lengthOf(res.body.messages, 1);
        assert.equal(res.body.messages[0], 'Username or password incorrect.');
      });
    });

    it('should clear session messages after retrieving them last request', function() {
      return userContext
      .get('/login')
      .set('Accept', 'application/json')
      .expect(200)
      .expect(function(res) {
        assert.isUndefined(res.body.messages, 'Session messages should be cleared second time');
      })
    });

    it('should block all API requests on failed login', function() {
      return userContext
      .post('/api')
      .redirects(0)
      .expect(401)
      .expect('Location', '/login');
    });
  });

  describe('Successful Logins', function() {
    before('should start logged-out', () => userContext.promiseLogout());

    it('should redirect to main page on good login', function() {
      return userContext.promiseLogin();
    });

    it('should succeed routes when session cookie logged in', function() {
      return userContext
      .get('/api')
      .redirects(0)
      .expect(200)
      .expect(function(res) {
        assert.equal(res.body.user.userId, 'dolores@hosts.com');
      });
    });
  });

  describe('Logouts', function() {
    before('should start logged-in', () => userContext.promiseLogin());

    it('should logout request', function() {
      return userContext.promiseLogout();
    });

    it('should block all API requests on a logout', function() {
      return userContext
      .post('/api')
      .redirects(0)
      .expect(401)
      .expect('Location', '/login');
    });
  });

});
