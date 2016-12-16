"use strict";

const assert = require('chai').assert;
const request = require('supertest');

const app = requireApp('app');

describe('Login', function() {
  let agent = request.agent(app); // creates new cookie jar for login cookies

  describe('Login permission gate', function() {
    it('should block all API requests', function() {
      return agent
      .post('/api')
      .redirects(0)
      .expect(401);
    });
  });

  describe('Unsuccessful Login', function() {
    it('should fail, no redirect', function() {
      return agent
      .post('/login')
      .send({ userId: 'new@user.com', password: '9990' })
      .expect(401);
    });

    it('should have session messages after failed attempt', function() {
      return agent
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
      return agent
      .get('/login')
      .set('Accept', 'application/json')
      .expect(200)
      .expect(function(res) {
        assert.isUndefined(res.body.messages, 'Session messages should be cleared second time');
      })
    });

    it('should block all API requests on failed login', function() {
      return agent
      .post('/api')
      .redirects(0)
      .expect(401)
      .expect('Location', '/login');
    });
  });

  describe('Successful Logins', function() {
    it('should redirect to main page on good login', function() {
      return agent
      .post('/login')
      .send({ userId: 'new@user.com', password: '999' })
      .redirects(0)
      .expect(302)
      .expect('Location', '/');
    });

    it('should succeed routes when session cookie logged in', function() {
      return agent
      .get('/api')
      .redirects(0)
      .expect(200)
      .expect(function(res) {
        assert.equal(res.body.user.userId, 'new@user.com');
      });
    });
  });

  describe('Logouts', function() {
    it('should logout request', function() {
      return agent
      .get('/logout')
      .redirects(0)
      .expect(302)
      .expect('Location', '/login');
    });

    it('should block all API requests on a logout', function() {
      return agent
      .post('/api')
      .redirects(0)
      .expect(401)
      .expect('Location', '/login');
    });
  });

});