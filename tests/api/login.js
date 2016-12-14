"use strict";

const assert = require('chai').assert;
const request = require('supertest');

const app = requireApp('app');

describe('Login', function() {
  let agent = request.agent(app);

  describe('Unsuccessful Login', function() {
    it('should redirect back to login on bad login', function() {
      return agent
      .post('/login')
      .send({ userId: 'new@user.com', password: '9990' })
      .redirects(0)
      .expect(302)
      .expect('Location', '/login');
    });

    it('should have session messages after failed attempt', function() {
      return agent
      .get('/login')
      .expect(200)
      .expect(function(res) {
        //assert.deepEqual(res.body, {foo: 'nope'});
        assert.isArray(res.body.messages);
        assert.lengthOf(res.body.messages, 1);
        assert.equal(res.body.messages[0], 'Username or password incorrect.');
      });
    });

    it('should clear session messages after retrieving them last request', function() {
      return agent
      .get('/login')
      .expect(200)
      .expect(function(res) {
        assert.isUndefined(res.body.messages, 'Session messages should be cleared second time');
      })
    });

    it('should block api routes when no login', function() {
      return agent
      .get('/login/user') // TODO: make better route
      .redirects(0)
      .expect(302)
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
      .get('/login/user') // TODO: make better route
      .redirects(0)
      .expect(200)
      .expect(function(res) {
        assert.equal(res.body.userId, 'new@user.com');
      });
    });
  });

  describe('Logouts', function() {
    it('should logout on request');
  });
  
});